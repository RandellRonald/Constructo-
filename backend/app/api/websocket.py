"""WebSocket manager for real-time communication."""
import json
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        # Channel -> Set of WebSocket connections
        self.connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.connections:
            self.connections[channel] = set()
        self.connections[channel].add(websocket)
        logger.info(f"WebSocket connected: {channel}")

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.connections:
            self.connections[channel].discard(websocket)
            if not self.connections[channel]:
                del self.connections[channel]
        logger.info(f"WebSocket disconnected: {channel}")

    async def send_to_channel(self, channel: str, data: dict):
        if channel in self.connections:
            dead = set()
            for ws in self.connections[channel]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.connections[channel].discard(ws)

    async def broadcast(self, data: dict):
        for channel in self.connections:
            await self.send_to_channel(channel, data)


manager = ConnectionManager()


@router.websocket("/ws/tracking/{booking_id}")
async def tracking_websocket(websocket: WebSocket, booking_id: int):
    channel = f"tracking_{booking_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            # Broadcast tracking updates to all watchers
            await manager.send_to_channel(channel, message)
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


@router.websocket("/ws/customer/{customer_id}")
async def customer_websocket(websocket: WebSocket, customer_id: int):
    channel = f"customer_{customer_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


@router.websocket("/ws/provider/{provider_id}")
async def provider_websocket(websocket: WebSocket, provider_id: int):
    channel = f"provider_{provider_id}"
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
