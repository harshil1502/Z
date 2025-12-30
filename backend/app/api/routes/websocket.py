"""
WebSocket routes for real-time updates.
"""

import json
from typing import Optional

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from fastapi.security import HTTPBearer

from app.core.websocket import ws_manager, handle_websocket_message
from app.core.security import verify_token

logger = structlog.get_logger(__name__)

router = APIRouter()


async def get_user_from_token(token: Optional[str]) -> Optional[int]:
    """
    Extract user ID from token if provided.
    Returns None for anonymous connections.
    """
    if not token:
        return None

    payload = verify_token(token, token_type="access")
    if payload:
        return int(payload.get("sub"))
    return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """
    Main WebSocket endpoint for real-time updates.

    Clients can subscribe to channels:
    - flow: All options flow updates
    - flow:{symbol}: Flow updates for specific symbol (e.g., flow:NIFTY)
    - unusual: All unusual activity alerts
    - unusual:{symbol}: Unusual activity for specific symbol
    - market: Market status updates
    - alerts: User-specific alerts (requires authentication)

    Message format:
    {
        "type": "subscribe" | "unsubscribe" | "ping",
        "channel": "flow:NIFTY"
    }
    """
    # Authenticate if token provided
    user_id = await get_user_from_token(token)

    # Accept connection
    connection_id = await ws_manager.connect(websocket, user_id)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                await handle_websocket_message(connection_id, message)
            except json.JSONDecodeError:
                await ws_manager.send_personal(
                    connection_id,
                    {"type": "error", "message": "Invalid JSON"},
                )

    except WebSocketDisconnect:
        await ws_manager.disconnect(connection_id)
    except Exception as e:
        logger.error(
            "WebSocket error",
            connection_id=connection_id,
            error=str(e),
        )
        await ws_manager.disconnect(connection_id)


@router.get("/ws/stats")
async def websocket_stats():
    """
    Get WebSocket connection statistics.
    Useful for monitoring and debugging.
    """
    return {
        "total_connections": ws_manager.connection_count,
        "channel_stats": ws_manager.get_channel_stats(),
    }
