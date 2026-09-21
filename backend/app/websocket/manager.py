"""
WebSocket connection manager.

Each active interview session has a "room" identified by session_id.
Both the candidate and any number of interviewers connect to the same room.

Message types flowing through the WebSocket:
  candidate → server → interviewer:
    code_update      — every keystroke debounced 500ms
    signal           — proctoring event
    snapshot         — periodic code snapshot
    code_run         — after Run Code pressed (results)
    cursor_move      — cursor position (optional, nice-to-have)

  interviewer → server → candidate:
    hint             — interviewer sends a hint
    chat             — chat message
    end_session      — interviewer ends the session early

  server → all:
    user_joined      — someone connected
    user_left        — someone disconnected
    similarity_alert — high-similarity detected by background task
"""

import asyncio
import json
import logging
from collections import defaultdict
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # session_id -> list of WebSocket connections
        self._rooms: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, session_id: str, user_id: str, role: str):
        await websocket.accept()
        self._rooms[session_id].append(websocket)
        logger.info(f"WS connected: session={session_id} user={user_id} role={role}")
        await self.broadcast_to_session(
            session_id,
            {"type": "user_joined", "user_id": user_id, "role": role},
            exclude=websocket,
        )

    def disconnect(self, websocket: WebSocket, session_id: str, user_id: str, role: str):
        room = self._rooms.get(session_id, [])
        if websocket in room:
            room.remove(websocket)
        if not room:
            self._rooms.pop(session_id, None)
        logger.info(f"WS disconnected: session={session_id} user={user_id} role={role}")
        # Fire-and-forget broadcast (can't await in sync disconnect)
        asyncio.create_task(
            self.broadcast_to_session(
                session_id,
                {"type": "user_left", "user_id": user_id, "role": role},
            )
        )

    async def broadcast_to_session(
        self,
        session_id: str,
        message: dict,
        exclude: WebSocket | None = None,
    ):
        room = list(self._rooms.get(session_id, []))
        dead = []
        payload = json.dumps(message)
        for ws in room:
            if ws is exclude:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        # Prune dead connections
        for ws in dead:
            if ws in self._rooms.get(session_id, []):
                self._rooms[session_id].remove(ws)

    async def send_to(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception:
            pass

    def room_size(self, session_id: str) -> int:
        return len(self._rooms.get(session_id, []))


# Singleton
manager = ConnectionManager()
