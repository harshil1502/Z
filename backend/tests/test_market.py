"""
Tests for market status and indices API routes.
"""

from datetime import date, time, datetime
from unittest.mock import patch
import pytest
import pytz

from app.api.routes.market import (
    get_market_status,
    MARKET_OPEN,
    MARKET_CLOSE,
    PRE_OPEN_START,
    PRE_OPEN_END,
    TRADING_HOLIDAYS,
    IST,
)


class TestMarketStatus:
    """Tests for market status logic."""

    def test_market_open_during_trading_hours(self):
        """Test that market is OPEN during normal trading hours."""
        # Mock a weekday at 10:00 AM IST
        mock_time = datetime(2024, 12, 23, 10, 0, 0, tzinfo=IST)  # Monday

        with patch("app.api.routes.market.datetime") as mock_datetime:
            mock_datetime.now.return_value = mock_time
            mock_datetime.combine = datetime.combine

            status = get_market_status()

            assert status["status"] == "OPEN"
            assert status["is_trading_day"] is True
            assert "Normal trading session" in status["reason"]

    def test_market_closed_after_hours(self):
        """Test that market is CLOSED after trading hours."""
        # Mock a weekday at 5:00 PM IST
        mock_time = datetime(2024, 12, 23, 17, 0, 0, tzinfo=IST)  # Monday

        with patch("app.api.routes.market.datetime") as mock_datetime:
            mock_datetime.now.return_value = mock_time
            mock_datetime.combine = datetime.combine

            status = get_market_status()

            assert status["status"] == "CLOSED"
            assert status["is_trading_day"] is True
            assert "After market hours" in status["reason"]

    def test_market_closed_before_preopen(self):
        """Test that market is CLOSED before pre-open session."""
        # Mock a weekday at 8:30 AM IST
        mock_time = datetime(2024, 12, 23, 8, 30, 0, tzinfo=IST)  # Monday

        with patch("app.api.routes.market.datetime") as mock_datetime:
            mock_datetime.now.return_value = mock_time
            mock_datetime.combine = datetime.combine

            status = get_market_status()

            assert status["status"] == "CLOSED"
            assert status["is_trading_day"] is True
            assert "Pre-market" in status["reason"]

    def test_market_preopen_session(self):
        """Test that market is PRE_OPEN during pre-open session."""
        # Mock a weekday at 9:05 AM IST
        mock_time = datetime(2024, 12, 23, 9, 5, 0, tzinfo=IST)  # Monday

        with patch("app.api.routes.market.datetime") as mock_datetime:
            mock_datetime.now.return_value = mock_time
            mock_datetime.combine = datetime.combine

            status = get_market_status()

            assert status["status"] == "PRE_OPEN"
            assert status["is_trading_day"] is True

    def test_market_closed_on_weekend(self):
        """Test that market is CLOSED on weekends."""
        # Mock a Saturday
        mock_time = datetime(2024, 12, 21, 10, 0, 0, tzinfo=IST)  # Saturday

        with patch("app.api.routes.market.datetime") as mock_datetime:
            mock_datetime.now.return_value = mock_time

            status = get_market_status()

            assert status["status"] == "CLOSED"
            assert status["is_trading_day"] is False
            assert "Weekend" in status["reason"]

    def test_market_closed_on_holiday(self):
        """Test that market is CLOSED on trading holidays."""
        # Mock Republic Day
        mock_time = datetime(2024, 1, 26, 10, 0, 0, tzinfo=IST)

        with patch("app.api.routes.market.datetime") as mock_datetime:
            mock_datetime.now.return_value = mock_time

            status = get_market_status()

            assert status["status"] == "CLOSED"
            assert status["is_trading_day"] is False
            assert "Trading Holiday" in status["reason"]


class TestMarketRoutes:
    """Integration tests for market API routes."""

    @pytest.mark.asyncio
    async def test_market_status_endpoint(self, client):
        """Test the /market/status endpoint."""
        response = await client.get("/api/v1/market/status")

        assert response.status_code == 200
        data = response.json()

        assert "status" in data
        assert "timestamp" in data
        assert "timezone" in data
        assert "market_hours" in data
        assert data["timezone"] == "Asia/Kolkata"

    @pytest.mark.asyncio
    async def test_indices_endpoint(self, client):
        """Test the /market/indices endpoint."""
        response = await client.get("/api/v1/market/indices")

        assert response.status_code == 200
        data = response.json()

        assert "timestamp" in data
        assert "indices" in data
        assert isinstance(data["indices"], list)

        # Should have NIFTY, BANKNIFTY, FINNIFTY
        symbols = [idx["symbol"] for idx in data["indices"]]
        assert "NIFTY" in symbols
        assert "BANKNIFTY" in symbols

    @pytest.mark.asyncio
    async def test_holidays_endpoint(self, client):
        """Test the /market/holidays endpoint."""
        response = await client.get("/api/v1/market/holidays")

        assert response.status_code == 200
        data = response.json()

        assert "year" in data
        assert "holidays" in data
        assert "total" in data
        assert isinstance(data["holidays"], list)

    @pytest.mark.asyncio
    async def test_holidays_with_year_param(self, client):
        """Test the /market/holidays endpoint with year parameter."""
        response = await client.get("/api/v1/market/holidays?year=2024")

        assert response.status_code == 200
        data = response.json()

        assert data["year"] == 2024
        # Check that all holidays are from 2024
        for holiday in data["holidays"]:
            assert holiday["date"].startswith("2024")

    @pytest.mark.asyncio
    async def test_expiries_endpoint(self, client):
        """Test the /market/expiries endpoint."""
        response = await client.get("/api/v1/market/expiries")

        assert response.status_code == 200
        data = response.json()

        assert "timestamp" in data
        assert "expiries" in data
        assert isinstance(data["expiries"], list)

        # Should have at least some upcoming expiries
        if data["expiries"]:
            expiry = data["expiries"][0]
            assert "date" in expiry
            assert "day" in expiry
            assert "type" in expiry
            assert "days_to_expiry" in expiry


class TestTradingHolidays:
    """Tests for trading holidays data."""

    def test_trading_holidays_structure(self):
        """Test that trading holidays are properly defined."""
        assert len(TRADING_HOLIDAYS) > 0

        for holiday in TRADING_HOLIDAYS:
            assert isinstance(holiday, date)

    def test_republic_day_is_holiday(self):
        """Test that Republic Day is a trading holiday."""
        republic_day_2024 = date(2024, 1, 26)
        republic_day_2025 = date(2025, 1, 26)

        assert republic_day_2024 in TRADING_HOLIDAYS
        assert republic_day_2025 in TRADING_HOLIDAYS

    def test_independence_day_is_holiday(self):
        """Test that Independence Day is a trading holiday."""
        independence_day_2024 = date(2024, 8, 15)
        independence_day_2025 = date(2025, 8, 15)

        assert independence_day_2024 in TRADING_HOLIDAYS
        assert independence_day_2025 in TRADING_HOLIDAYS


class TestMarketTimings:
    """Tests for market timing constants."""

    def test_market_hours(self):
        """Test that market hours are correctly defined."""
        assert MARKET_OPEN == time(9, 15)
        assert MARKET_CLOSE == time(15, 30)
        assert PRE_OPEN_START == time(9, 0)
        assert PRE_OPEN_END == time(9, 8)

    def test_preopen_before_market_open(self):
        """Test that pre-open session is before market open."""
        assert PRE_OPEN_START < MARKET_OPEN
        assert PRE_OPEN_END < MARKET_OPEN

    def test_ist_timezone(self):
        """Test that IST timezone is correctly defined."""
        assert str(IST) == "Asia/Kolkata"
