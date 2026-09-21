"""
WebSocket endpoint: /ws/{session_id}?token=<jwt>

Both candidates and interviewers connect here.
The JWT is passed as a query param (can't set Authorization header from browser WS API).
"""
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import decode_token
from app.db.base import get_db, AsyncSessionLocal
from app.models.user import User
from app.models.session import InterviewSession
from app.websocket.manager import manager
from app.models.signal import ProctoringSignal, RISK_MAP, SignalType

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)


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
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload.get("sub")
    role    = payload.get("role", "candidate")

    # Validate session exists
    async with AsyncSessionLocal() as db:
        sess = (await db.execute(
            select(InterviewSession).where(InterviewSession.id == session_id)
        )).scalar_one_or_none()
        if not sess:
            await websocket.close(code=4004, reason="Session not found")
            return

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

                # Persist asynchronously
                async with AsyncSessionLocal() as db:
                    record = ProctoringSignal(
                        session_id=session_id,
                        candidate_id=user_id,
                        signal_type=sig_type,
                        risk_level=risk,
                        detail=json.dumps(msg.get("detail")) if msg.get("detail") else None,
                        elapsed_seconds=msg.get("elapsed_seconds"),
                    )
                    db.add(record)
                    await db.commit()

                # Broadcast to all (mainly the interviewer)
                await manager.broadcast_to_session(
                    session_id,
                    {
                        "type":            "signal",
                        "signal_type":     sig_type_str,
                        "risk_level":      str(risk),
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

            # ── ping / keepalive ──
            elif msg_type == "ping":
                await manager.send_to(websocket, {"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id, user_id, role)
