"""
WebSocket endpoint: /ws/{session_id}?token=<jwt>

Both candidates and interviewers connect here.
The JWT is passed as a query param (can't set Authorization header from browser WS API).
"""
import json
import logging
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError
from sqlalchemy import select

from app.core.security import decode_token
from app.db.base import AsyncSessionLocal
from app.models.session import InterviewSession
from app.websocket.manager import manager
from app.models.signal import ProctoringSignal, RISK_MAP, SignalType

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)

# Signaling messages relayed verbatim (minus "type") to everyone else in the room
WEBRTC_RELAY = {"webrtc_offer", "webrtc_answer", "webrtc_ice_candidate", "webrtc_request"}


async def _reject(websocket: WebSocket, code: int, reason: str):
    # Accept first so the browser receives our close code; closing before the
    # handshake surfaces only as a generic 1006 and the client would keep retrying.
    await websocket.accept()
    await websocket.close(code=code, reason=reason)


async def _auth_ws(token: str) -> dict | None:
    try:
        return decode_token(token)
    except JWTError:
        return None


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
):
    payload = await _auth_ws(token)
    if not payload:
        await _reject(websocket, 4001, "Invalid token")
        return

    user_id = payload.get("sub")
    role    = payload.get("role", "candidate")

    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        await _reject(websocket, 4004, "Session not found")
        return

    # Validate session exists and the user belongs to it
    async with AsyncSessionLocal() as db:
        sess = (await db.execute(
            select(InterviewSession).where(InterviewSession.id == session_uuid)
        )).scalar_one_or_none()
    if not sess:
        await _reject(websocket, 4004, "Session not found")
        return
    if role != "admin" and user_id not in (str(sess.interviewer_id), str(sess.candidate_id)):
        await _reject(websocket, 4003, "Not a participant of this session")
        return

    logger.info(f"WebSocket connection: user_id={user_id}, role={role}, session={session_id}")
    await manager.connect(websocket, session_id, user_id, role)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")

            # ── code_update: candidate typing → broadcast to interviewer ──
            if msg_type == "code_update":
                await manager.broadcast_to_session(
                    session_id,
                    {
                        "type":       "code_update",
                        "language":   msg.get("language"),
                        "code":       msg.get("code"),
                        "problem_id": msg.get("problem_id"),
                        "sender":     user_id,
                    },
                    exclude=websocket,
                )

            # ── proctoring signal from candidate ──
            elif msg_type == "signal":
                sig_type_str = msg.get("signal_type", "")
                try:
                    sig_type = SignalType(sig_type_str)
                except ValueError:
                    continue

                risk = RISK_MAP.get(sig_type)

                async with AsyncSessionLocal() as db:
                    record = ProctoringSignal(
                        session_id=session_uuid,
                        candidate_id=user_id,
                        signal_type=sig_type,
                        risk_level=risk,
                        detail=json.dumps(msg.get("detail")) if msg.get("detail") else None,
                        elapsed_seconds=msg.get("elapsed_seconds"),
                    )
                    db.add(record)
                    await db.commit()

                await manager.broadcast_to_session(
                    session_id,
                    {
                        "type":            "signal",
                        "signal_type":     sig_type_str,
                        "risk_level":      risk.value,
                        "elapsed_seconds": msg.get("elapsed_seconds"),
                        "detail":          msg.get("detail"),
                        "sender":          user_id,
                    },
                    exclude=websocket,
                )

            # ── chat message ──
            elif msg_type == "chat":
                await manager.broadcast_to_session(
                    session_id,
                    {
                        "type":    "chat",
                        "text":    msg.get("text", ""),
                        "sender":  user_id,
                        "role":    role,
                    },
                    exclude=websocket,
                )

            # ── end_session (interviewer) ──
            elif msg_type == "end_session" and role in ("interviewer", "admin"):
                await manager.broadcast_to_session(
                    session_id,
                    {"type": "session_ended", "by": user_id},
                )

            # ── candidate pressed "Submit All" ──
            elif msg_type == "candidate_submitted" and role == "candidate":
                await manager.broadcast_to_session(
                    session_id,
                    {"type": "candidate_submitted", "sender": user_id},
                    exclude=websocket,
                )

            # ── ping / keepalive ──
            elif msg_type == "ping":
                await manager.send_to(websocket, {"type": "pong"})

            # ── WebRTC signaling for video streaming ──
            elif msg_type in WEBRTC_RELAY:
                relayed = {k: v for k, v in msg.items() if k != "type"}
                await manager.broadcast_to_session(
                    session_id,
                    {"type": msg_type, **relayed, "sender": user_id, "role": role},
                    exclude=websocket,
                )

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception(f"WebSocket error in session {session_id}")
    finally:
        manager.disconnect(websocket, session_id, user_id, role)
