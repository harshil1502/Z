"""
Tests for WebSocket functionality.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import WebSocket

from app.core.websocket import WebSocketManager, ConnectionInfo


class TestWebSocketManager:
    """Tests for WebSocket manager."""

    @pytest.fixture
    def manager(self):
        """Create a WebSocket manager instance."""
        return WebSocketManager()

    @pytest.fixture
    def mock_websocket(self):
        """Create a mock WebSocket."""
        ws = AsyncMock(spec=WebSocket)
        ws.accept = AsyncMock()
        ws.send_json = AsyncMock()
        ws.close = AsyncMock()
        return ws

    @pytest.mark.asyncio
    async def test_connect(self, manager, mock_websocket):
        """Test connecting a WebSocket."""
        connection_id = await manager.connect(mock_websocket, user_id=1)

        assert connection_id is not None
        assert len(manager.active_connections) == 1
        mock_websocket.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_connect_anonymous(self, manager, mock_websocket):
        """Test connecting an anonymous WebSocket."""
        connection_id = await manager.connect(mock_websocket)

        assert connection_id is not None
        assert len(manager.active_connections) == 1

    @pytest.mark.asyncio
    async def test_disconnect(self, manager, mock_websocket):
        """Test disconnecting a WebSocket."""
        connection_id = await manager.connect(mock_websocket, user_id=1)
        await manager.disconnect(connection_id)

        assert len(manager.active_connections) == 0

    @pytest.mark.asyncio
    async def test_subscribe_to_channel(self, manager, mock_websocket):
        """Test subscribing to a channel."""
        connection_id = await manager.connect(mock_websocket, user_id=1)
        await manager.subscribe(connection_id, "market_status")

        assert "market_status" in manager.channels
        assert connection_id in manager.channels["market_status"]

    @pytest.mark.asyncio
    async def test_unsubscribe_from_channel(self, manager, mock_websocket):
        """Test unsubscribing from a channel."""
        connection_id = await manager.connect(mock_websocket, user_id=1)
        await manager.subscribe(connection_id, "market_status")
        await manager.unsubscribe(connection_id, "market_status")

        # Channel might be empty or removed
        if "market_status" in manager.channels:
            assert connection_id not in manager.channels["market_status"]

    @pytest.mark.asyncio
    async def test_broadcast_to_channel(self, manager, mock_websocket):
        """Test broadcasting to a channel."""
        connection_id = await manager.connect(mock_websocket, user_id=1)
        await manager.subscribe(connection_id, "test_channel")

        message = {"type": "test", "data": "hello"}
        await manager.broadcast_to_channel("test_channel", message)

        mock_websocket.send_json.assert_called()

    @pytest.mark.asyncio
    async def test_broadcast_to_empty_channel(self, manager):
        """Test broadcasting to a channel with no subscribers."""
        # Should not raise an error
        message = {"type": "test", "data": "hello"}
        await manager.broadcast_to_channel("nonexistent_channel", message)

    @pytest.mark.asyncio
    async def test_multiple_connections(self, manager):
        """Test multiple WebSocket connections."""
        ws1 = AsyncMock(spec=WebSocket)
        ws1.accept = AsyncMock()
        ws1.send_json = AsyncMock()

        ws2 = AsyncMock(spec=WebSocket)
        ws2.accept = AsyncMock()
        ws2.send_json = AsyncMock()

        id1 = await manager.connect(ws1, user_id=1)
        id2 = await manager.connect(ws2, user_id=2)

        assert len(manager.active_connections) == 2
        assert id1 != id2

    @pytest.mark.asyncio
    async def test_send_flow_update(self, manager, mock_websocket):
        """Test sending flow update to subscribed connections."""
        connection_id = await manager.connect(mock_websocket, user_id=1)
        await manager.subscribe(connection_id, "flow:NIFTY")

        data = {"ltp": 150.50, "volume": 1000}
        await manager.send_flow_update("NIFTY", data)

        mock_websocket.send_json.assert_called()

    @pytest.mark.asyncio
    async def test_send_unusual_alert(self, manager, mock_websocket):
        """Test sending unusual activity alert."""
        connection_id = await manager.connect(mock_websocket, user_id=1)
        await manager.subscribe(connection_id, "unusual:NIFTY")

        data = {"symbol": "NIFTY", "severity": "high", "score": 0.95}
        await manager.send_unusual_alert("NIFTY", data)

        mock_websocket.send_json.assert_called()


class TestConnectionInfo:
    """Tests for ConnectionInfo dataclass."""

    def test_connection_info_creation(self):
        """Test creating a ConnectionInfo instance."""
        mock_ws = MagicMock(spec=WebSocket)
        info = ConnectionInfo(
            websocket=mock_ws,
            user_id=1,
            subscriptions={"channel1", "channel2"}
        )

        assert info.websocket == mock_ws
        assert info.user_id == 1
        assert "channel1" in info.subscriptions
        assert "channel2" in info.subscriptions

    def test_connection_info_default_subscriptions(self):
        """Test ConnectionInfo with default subscriptions."""
        mock_ws = MagicMock(spec=WebSocket)
        info = ConnectionInfo(websocket=mock_ws, user_id=None)

        assert info.subscriptions == set()
