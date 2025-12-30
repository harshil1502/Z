"""
Analytics service - Calculations for GEX, PCR, and other analytics.
"""

import math
from datetime import date
from decimal import Decimal
from typing import Optional

from scipy.stats import norm  # type: ignore


class AnalyticsService:
    """Service for analytics calculations."""

    @staticmethod
    def calculate_black_scholes_greeks(
        spot: float,
        strike: float,
        time_to_expiry: float,  # in years
        volatility: float,
        risk_free_rate: float = 0.07,  # 7% default for India
        option_type: str = "CE",
    ) -> dict:
        """
        Calculate Black-Scholes Greeks.

        Args:
            spot: Current underlying price
            strike: Strike price
            time_to_expiry: Time to expiry in years
            volatility: Implied volatility (as decimal, e.g., 0.20 for 20%)
            risk_free_rate: Risk-free rate (as decimal)
            option_type: "CE" for call, "PE" for put

        Returns:
            Dictionary with delta, gamma, theta, vega, and option price
        """
        if time_to_expiry <= 0 or volatility <= 0:
            return {
                "delta": 0,
                "gamma": 0,
                "theta": 0,
                "vega": 0,
                "price": 0,
            }

        # Calculate d1 and d2
        d1 = (
            math.log(spot / strike)
            + (risk_free_rate + 0.5 * volatility**2) * time_to_expiry
        ) / (volatility * math.sqrt(time_to_expiry))

        d2 = d1 - volatility * math.sqrt(time_to_expiry)

        # Standard normal CDF and PDF
        nd1 = norm.cdf(d1)
        nd2 = norm.cdf(d2)
        n_prime_d1 = norm.pdf(d1)

        # Greeks
        gamma = n_prime_d1 / (spot * volatility * math.sqrt(time_to_expiry))
        vega = spot * n_prime_d1 * math.sqrt(time_to_expiry) / 100  # Per 1% IV change

        if option_type == "CE":
            delta = nd1
            theta = (
                -(spot * n_prime_d1 * volatility) / (2 * math.sqrt(time_to_expiry))
                - risk_free_rate * strike * math.exp(-risk_free_rate * time_to_expiry) * nd2
            ) / 365  # Per day
            price = (
                spot * nd1
                - strike * math.exp(-risk_free_rate * time_to_expiry) * nd2
            )
        else:  # PE
            delta = nd1 - 1
            n_minus_d1 = norm.cdf(-d1)
            n_minus_d2 = norm.cdf(-d2)
            theta = (
                -(spot * n_prime_d1 * volatility) / (2 * math.sqrt(time_to_expiry))
                + risk_free_rate * strike * math.exp(-risk_free_rate * time_to_expiry) * n_minus_d2
            ) / 365
            price = (
                strike * math.exp(-risk_free_rate * time_to_expiry) * n_minus_d2
                - spot * n_minus_d1
            )

        return {
            "delta": round(delta, 6),
            "gamma": round(gamma, 10),
            "theta": round(theta, 4),
            "vega": round(vega, 4),
            "price": round(max(price, 0), 2),
        }

    @staticmethod
    def calculate_gamma_exposure(
        gamma: float,
        oi: int,
        spot: float,
        lot_size: int = 50,
        option_type: str = "CE",
    ) -> float:
        """
        Calculate Gamma Exposure (GEX) for a single strike.

        GEX = Gamma × OI × 100 × Spot × 0.01

        Assumes dealers are net short options.

        Args:
            gamma: Option gamma
            oi: Open interest
            spot: Current underlying price
            lot_size: Contract lot size
            option_type: "CE" or "PE"

        Returns:
            GEX value (positive for calls, negative for puts)
        """
        gex = gamma * oi * lot_size * spot * 0.01

        # Puts have negative gamma effect (dealers get shorter as price falls)
        if option_type == "PE":
            gex = -gex

        return gex

    @staticmethod
    def calculate_max_pain(
        chain_data: list[dict],
        spot: float,
    ) -> Optional[float]:
        """
        Calculate Max Pain level for an options chain.

        Max Pain is the strike price at which option buyers would lose
        the maximum amount of money (option writers profit the most).

        Args:
            chain_data: List of dicts with strike, ce_oi, pe_oi
            spot: Current underlying price

        Returns:
            Max pain strike price
        """
        if not chain_data:
            return None

        strikes = [d["strike"] for d in chain_data]
        min_pain = float("inf")
        max_pain_strike = None

        for target_strike in strikes:
            total_pain = 0

            for data in chain_data:
                strike = data["strike"]
                ce_oi = data.get("ce_oi", 0) or 0
                pe_oi = data.get("pe_oi", 0) or 0

                # Call pain: If price is above strike, call buyers gain
                if target_strike > strike:
                    call_intrinsic = target_strike - strike
                    total_pain += call_intrinsic * ce_oi

                # Put pain: If price is below strike, put buyers gain
                if target_strike < strike:
                    put_intrinsic = strike - target_strike
                    total_pain += put_intrinsic * pe_oi

            if total_pain < min_pain:
                min_pain = total_pain
                max_pain_strike = target_strike

        return max_pain_strike

    @staticmethod
    def calculate_pcr(
        total_pe_oi: int,
        total_ce_oi: int,
        total_pe_volume: int = 0,
        total_ce_volume: int = 0,
    ) -> dict:
        """
        Calculate Put-Call Ratio.

        Args:
            total_pe_oi: Total put open interest
            total_ce_oi: Total call open interest
            total_pe_volume: Total put volume (optional)
            total_ce_volume: Total call volume (optional)

        Returns:
            Dictionary with OI PCR and Volume PCR
        """
        oi_pcr = total_pe_oi / total_ce_oi if total_ce_oi > 0 else 0
        volume_pcr = total_pe_volume / total_ce_volume if total_ce_volume > 0 else 0

        return {
            "oi_pcr": round(oi_pcr, 4),
            "volume_pcr": round(volume_pcr, 4),
        }

    @staticmethod
    def days_to_expiry(expiry_date: date) -> int:
        """Calculate days to expiry from today."""
        today = date.today()
        return max((expiry_date - today).days, 0)

    @staticmethod
    def time_to_expiry_years(expiry_date: date) -> float:
        """Calculate time to expiry in years (for Black-Scholes)."""
        days = AnalyticsService.days_to_expiry(expiry_date)
        return days / 365.0
