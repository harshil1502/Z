"""
WebSocket connection manager for real-time updates.
Handles client connections, subscriptions, and message broadcasting.
"""

import asyncio
import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional, Set

import structlog
from fastapi import WebSocket, WebSocketDisconnect

logger = structlog.get_logger(__name__)


class ChannelType(str, Enum):
    """Types of WebSocket channels."""
    FLOW = "flow"  # Options flow updates
    UNUSUAL = "unusual"  # Unusual activity alerts
    MARKET = "market"  # Market status updates
    ALERTS = "alerts"  # User-specific alerts


@dataclass
class Subscription:
    """Represents a client's channel subscription."""
    channel_type: ChannelType
    symbol: Optional[str] = None  # None means all symbols

    def matches(self, channel_type: ChannelType, symbol: Optional[str] = None) -> bool:
        """Check if this subscription matches the given channel and symbol."""
        if self.channel_type != channel_type:
            return False
        if self.symbol is None:
            return True
        return self.symbol == symbol

    def to_channel_name(self) -> str:
        """Convert to channel name string."""
        if self.symbol:
            return f"{self.channel_type.value}:{self.symbol}"
        return self.channel_type.value


@dataclass
class ClientConnection:
    """Represents a connected WebSocket client."""
    websocket: WebSocket
    user_id: Optional[int] = None
    subscriptions: Set[str] = field(default_factory=set)
    connected_at: datetime = field(default_factory=datetime.utcnow)

    def is_subscribed(self, channel: str) -> bool:
        """Check if client is subscribed to a channel."""
        return channel in self.subscriptions


class WebSocketManager:
    """
    Manages WebSocket connections and message broadcasting.
    Thread-safe singleton for managing all connections.
    """

    _instance: Optional["WebSocketManager"] = None
    _lock = asyncio.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._connections: dict[str, ClientConnection] = {}
        self._channel_subscribers: dict[str, set[str]] = {}  # channel -> set of connection_ids
        self._initialized = True
        logger.info("WebSocket manager initialized")

    @property
    def connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self._connections)

    def _generate_connection_id(self, websocket: WebSocket) -> str:
        """Generate a unique connection ID."""
        return f"{id(websocket)}_{datetime.utcnow().timestamp()}"

    async def connect(
        self,
        websocket: WebSocket,
        user_id: Optional[int] = None,
    ) -> str:
        """
        Accept a new WebSocket connection.

        Returns:
            Connection ID for the new connection
        """
        await websocket.accept()
        connection_id = self._generate_connection_id(websocket)

        self._connections[connection_id] = ClientConnection(
            websocket=websocket,
            user_id=user_id,
        )

        logger.info(
            "WebSocket connected",
            connection_id=connection_id,
            user_id=user_id,
            total_connections=self.connection_count,
        )

        # Send welcome message
        await self.send_personal(
            connection_id,
            {
                "type": "connected",
                "connection_id": connection_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

        return connection_id

    async def disconnect(self, connection_id: str) -> None:
        """
        Handle client disconnection.
        Cleans up subscriptions and connection state.
        """
        if connection_id not in self._connections:
            return

        connection = self._connections[connection_id]

        # Remove from all channel subscriptions
        for channel in connection.subscriptions:
            if channel in self._channel_subscribers:
                self._channel_subscribers[channel].discard(connection_id)
                if not self._channel_subscribers[channel]:
                    del self._channel_subscribers[channel]

        # Remove connection
        del self._connections[connection_id]

        logger.info(
            "WebSocket disconnected",
            connection_id=connection_id,
            total_connections=self.connection_count,
        )

    async def subscribe(
        self,
        connection_id: str,
        channel: str,
    ) -> bool:
        """
        Subscribe a connection to a channel.

        Returns:
            True if subscription was successful
        """
        if connection_id not in self._connections:
            return False

        connection = self._connections[connection_id]
        connection.subscriptions.add(channel)

        if channel not in self._channel_subscribers:
            self._channel_subscribers[channel] = set()
        self._channel_subscribers[channel].add(connection_id)

        logger.debug(
            "Client subscribed",
            connection_id=connection_id,
            channel=channel,
        )

        # Acknowledge subscription
        await self.send_personal(
            connection_id,
            {
                "type": "subscribed",
                "channel": channel,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

        return True

    async def unsubscribe(
        self,
        connection_id: str,
        channel: str,
    ) -> bool:
        """
        Unsubscribe a connection from a channel.

        Returns:
            True if unsubscription was successful
        """
        if connection_id not in self._connections:
            return False

        connection = self._connections[connection_id]
        connection.subscriptions.discard(channel)

        if channel in self._channel_subscribers:
            self._channel_subscribers[channel].discard(connection_id)
            if not self._channel_subscribers[channel]:
                del self._channel_subscribers[channel]

        logger.debug(
            "Client unsubscribed",
            connection_id=connection_id,
            channel=channel,
        )

        # Acknowledge unsubscription
        await self.send_personal(
            connection_id,
            {
                "type": "unsubscribed",
                "channel": channel,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

        return True

    async def send_personal(
        self,
        connection_id: str,
        message: dict[str, Any],
    ) -> bool:
        """
        Send a message to a specific connection.

        Returns:
            True if message was sent successfully
        """
        if connection_id not in self._connections:
            return False

        try:
            await self._connections[connection_id].websocket.send_json(message)
            return True
        except Exception as e:
            logger.error(
                "Failed to send personal message",
                connection_id=connection_id,
                error=str(e),
            )
            return False

    async def broadcast_to_channel(
        self,
        channel: str,
        message: dict[str, Any],
    ) -> int:
        """
        Broadcast a message to all subscribers of a channel.

        Returns:
            Number of clients that received the message
        """
        if channel not in self._channel_subscribers:
            return 0

        sent_count = 0
        failed_connections = []

        for connection_id in self._channel_subscribers[channel].copy():
            try:
                if connection_id in self._connections:
                    await self._connections[connection_id].websocket.send_json(message)
                    sent_count += 1
            except Exception as e:
                logger.warning(
                    "Failed to send to subscriber",
                    connection_id=connection_id,
                    channel=channel,
                    error=str(e),
                )
                failed_connections.append(connection_id)

        # Clean up failed connections
        for connection_id in failed_connections:
            await self.disconnect(connection_id)

        return sent_count

    async def broadcast_all(
        self,
        message: dict[str, Any],
    ) -> int:
        """
        Broadcast a message to all connected clients.

        Returns:
            Number of clients that received the message
        """
        sent_count = 0
        failed_connections = []

        for connection_id, connection in list(self._connections.items()):
            try:
                await connection.websocket.send_json(message)
                sent_count += 1
            except Exception as e:
                logger.warning(
                    "Failed to broadcast",
                    connection_id=connection_id,
                    error=str(e),
                )
                failed_connections.append(connection_id)

        # Clean up failed connections
        for connection_id in failed_connections:
            await self.disconnect(connection_id)

        return sent_count

    async def send_flow_update(
        self,
        symbol: str,
        data: dict[str, Any],
    ) -> int:
        """
        Send options flow update to relevant subscribers.

        Broadcasts to both symbol-specific and general flow channels.
        """
        message = {
            "type": "flow_update",
            "symbol": symbol,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Send to symbol-specific channel
        symbol_channel = f"flow:{symbol}"
        count1 = await self.broadcast_to_channel(symbol_channel, message)

        # Send to general flow channel
        count2 = await self.broadcast_to_channel("flow", message)

        return count1 + count2

    async def send_unusual_alert(
        self,
        symbol: str,
        data: dict[str, Any],
    ) -> int:
        """
        Send unusual activity alert to subscribers.
        """
        message = {
            "type": "unusual_alert",
            "symbol": symbol,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }

        count1 = await self.broadcast_to_channel(f"unusual:{symbol}", message)
        count2 = await self.broadcast_to_channel("unusual", message)

        return count1 + count2

    async def send_market_status(
        self,
        status: str,
        data: dict[str, Any],
    ) -> int:
        """
        Send market status update to all subscribers.
        """
        message = {
            "type": "market_status",
            "status": status,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }

        return await self.broadcast_to_channel("market", message)

    def get_channel_stats(self) -> dict[str, int]:
        """Get subscriber counts for all channels."""
        return {
            channel: len(subscribers)
            for channel, subscribers in self._channel_subscribers.items()
        }


# Global WebSocket manager instance
ws_manager = WebSocketManager()


async def handle_websocket_message(
    connection_id: str,
    message: dict[str, Any],
) -> None:
    """
    Handle incoming WebSocket message from client.
    """
    message_type = message.get("type")

    if message_type == "subscribe":
        channel = message.get("channel")
        if channel:
            await ws_manager.subscribe(connection_id, channel)

    elif message_type == "unsubscribe":
        channel = message.get("channel")
        if channel:
            await ws_manager.unsubscribe(connection_id, channel)

    elif message_type == "ping":
        await ws_manager.send_personal(
            connection_id,
            {"type": "pong", "timestamp": datetime.utcnow().isoformat()},
        )

    else:
        logger.warning(
            "Unknown message type",
            connection_id=connection_id,
            message_type=message_type,
        )
