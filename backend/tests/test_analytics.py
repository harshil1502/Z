"""
Tests for analytics calculations and API routes.
"""

import pytest
from decimal import Decimal
from datetime import date
from unittest.mock import patch, MagicMock

from app.services.analytics import AnalyticsService


class TestAnalyticsService:
    """Tests for analytics service calculations."""

    @pytest.fixture
    def analytics_service(self):
        """Create an analytics service instance."""
        return AnalyticsService()

    def test_calculate_pcr_from_oi(self, analytics_service):
        """Test PCR calculation from open interest."""
        put_oi = 1000000
        call_oi = 800000

        pcr = analytics_service.calculate_pcr(put_oi, call_oi)

        assert pcr == pytest.approx(1.25, rel=0.01)

    def test_calculate_pcr_zero_call_oi(self, analytics_service):
        """Test PCR calculation when call OI is zero."""
        put_oi = 1000000
        call_oi = 0

        pcr = analytics_service.calculate_pcr(put_oi, call_oi)

        assert pcr == 0.0  # Should handle division by zero

    def test_calculate_iv_percentile(self, analytics_service):
        """Test IV percentile calculation."""
        current_iv = Decimal("20.5")
        historical_ivs = [
            Decimal("15"), Decimal("18"), Decimal("22"),
            Decimal("25"), Decimal("20"), Decimal("17"),
            Decimal("19"), Decimal("21"), Decimal("23"),
            Decimal("16")
        ]

        percentile = analytics_service.calculate_iv_percentile(
            current_iv,
            historical_ivs
        )

        assert 0 <= percentile <= 100

    def test_calculate_max_pain(self, analytics_service):
        """Test max pain calculation."""
        options_data = [
            {"strike": 23000, "ce_oi": 500000, "pe_oi": 200000},
            {"strike": 23100, "ce_oi": 400000, "pe_oi": 300000},
            {"strike": 23200, "ce_oi": 300000, "pe_oi": 400000},
            {"strike": 23300, "ce_oi": 200000, "pe_oi": 500000},
            {"strike": 23400, "ce_oi": 100000, "pe_oi": 600000},
        ]

        max_pain = analytics_service.calculate_max_pain(options_data)

        assert max_pain is not None
        assert 23000 <= max_pain <= 23400

    def test_calculate_gamma_exposure(self, analytics_service):
        """Test gamma exposure calculation."""
        options_data = [
            {
                "strike": 23000,
                "ce_oi": 500000,
                "pe_oi": 200000,
                "ce_gamma": 0.002,
                "pe_gamma": 0.0015,
            },
        ]
        spot_price = Decimal("23100")
        lot_size = 50

        gex = analytics_service.calculate_gamma_exposure(
            options_data,
            spot_price,
            lot_size
        )

        assert gex is not None
        assert "total_gex" in gex
        assert "strike_gex" in gex

    def test_detect_unusual_activity(self, analytics_service):
        """Test unusual activity detection."""
        current_data = {
            "volume": 100000,
            "oi": 500000,
            "oi_change": 50000,
        }
        baseline = {
            "avg_volume": 20000,
            "std_volume": 5000,
            "avg_oi": 300000,
            "std_oi": 50000,
        }

        is_unusual, score, flags = analytics_service.detect_unusual_activity(
            current_data,
            baseline
        )

        assert isinstance(is_unusual, bool)
        assert 0 <= score <= 1
        assert isinstance(flags, list)


class TestAnalyticsRoutes:
    """Tests for analytics API routes."""

    @pytest.mark.asyncio
    async def test_get_pcr(self, client):
        """Test PCR endpoint."""
        response = await client.get("/api/v1/analytics/pcr/NIFTY")

        # Might return 404 if no data, or 200 with data
        assert response.status_code in [200, 404]

        if response.status_code == 200:
            data = response.json()
            assert "oi_pcr" in data
            assert "volume_pcr" in data

    @pytest.mark.asyncio
    async def test_get_gex(self, client):
        """Test GEX endpoint."""
        response = await client.get("/api/v1/analytics/gex/NIFTY")

        assert response.status_code in [200, 404]

        if response.status_code == 200:
            data = response.json()
            assert "symbol" in data

    @pytest.mark.asyncio
    async def test_get_fii_dii(self, client):
        """Test FII/DII endpoint."""
        response = await client.get("/api/v1/analytics/fii-dii")

        assert response.status_code in [200, 404]

    @pytest.mark.asyncio
    async def test_get_max_pain(self, client):
        """Test max pain endpoint."""
        response = await client.get("/api/v1/analytics/max-pain/NIFTY")

        assert response.status_code in [200, 404]


class TestBlackScholes:
    """Tests for Black-Scholes calculations."""

    def test_calculate_call_price(self):
        """Test Black-Scholes call price calculation."""
        from app.services.greeks import BlackScholes

        bs = BlackScholes()
        price = bs.call_price(
            spot=100,
            strike=100,
            time_to_expiry=0.25,  # 3 months
            rate=0.05,
            volatility=0.2
        )

        assert price > 0
        # ATM call should be roughly around 5-10% of spot
        assert 2 < price < 15

    def test_calculate_put_price(self):
        """Test Black-Scholes put price calculation."""
        from app.services.greeks import BlackScholes

        bs = BlackScholes()
        price = bs.put_price(
            spot=100,
            strike=100,
            time_to_expiry=0.25,
            rate=0.05,
            volatility=0.2
        )

        assert price > 0

    def test_put_call_parity(self):
        """Test put-call parity relationship."""
        from app.services.greeks import BlackScholes
        import math

        bs = BlackScholes()
        spot = 100
        strike = 100
        time_to_expiry = 0.25
        rate = 0.05
        volatility = 0.2

        call = bs.call_price(spot, strike, time_to_expiry, rate, volatility)
        put = bs.put_price(spot, strike, time_to_expiry, rate, volatility)

        # Put-Call Parity: C - P = S - K*e^(-rT)
        pv_strike = strike * math.exp(-rate * time_to_expiry)
        parity_diff = call - put - (spot - pv_strike)

        assert abs(parity_diff) < 0.01  # Should be very close to 0

    def test_calculate_delta(self):
        """Test delta calculation."""
        from app.services.greeks import BlackScholes

        bs = BlackScholes()
        delta = bs.delta(
            spot=100,
            strike=100,
            time_to_expiry=0.25,
            rate=0.05,
            volatility=0.2,
            is_call=True
        )

        # ATM call delta should be around 0.5
        assert 0.4 < delta < 0.6

    def test_calculate_gamma(self):
        """Test gamma calculation."""
        from app.services.greeks import BlackScholes

        bs = BlackScholes()
        gamma = bs.gamma(
            spot=100,
            strike=100,
            time_to_expiry=0.25,
            rate=0.05,
            volatility=0.2
        )

        # Gamma should be positive
        assert gamma > 0

    def test_calculate_theta(self):
        """Test theta calculation."""
        from app.services.greeks import BlackScholes

        bs = BlackScholes()
        theta = bs.theta(
            spot=100,
            strike=100,
            time_to_expiry=0.25,
            rate=0.05,
            volatility=0.2,
            is_call=True
        )

        # Theta should be negative (time decay)
        assert theta < 0

    def test_calculate_vega(self):
        """Test vega calculation."""
        from app.services.greeks import BlackScholes

        bs = BlackScholes()
        vega = bs.vega(
            spot=100,
            strike=100,
            time_to_expiry=0.25,
            rate=0.05,
            volatility=0.2
        )

        # Vega should be positive
        assert vega > 0

    def test_calculate_implied_volatility(self):
        """Test implied volatility calculation."""
        from app.services.greeks import BlackScholes

        bs = BlackScholes()

        # First calculate a price with known volatility
        known_vol = 0.2
        price = bs.call_price(100, 100, 0.25, 0.05, known_vol)

        # Now reverse engineer the IV
        iv = bs.implied_volatility(
            price=price,
            spot=100,
            strike=100,
            time_to_expiry=0.25,
            rate=0.05,
            is_call=True
        )

        assert abs(iv - known_vol) < 0.01  # Should be close to original
