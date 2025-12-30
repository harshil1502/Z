"""
Options data service - Business logic for options flow and chain data.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.options import Symbol, OptionsContract, OptionsFlow


class OptionsService:
    """Service for options-related operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_symbol(self, symbol: str) -> Optional[Symbol]:
        """Get symbol by name."""
        result = await self.db.execute(
            select(Symbol).where(Symbol.symbol == symbol.upper())
        )
        return result.scalar_one_or_none()

    async def get_or_create_symbol(
        self,
        symbol: str,
        exchange: str = "NSE",
        segment: str = "INDEX",
        lot_size: Optional[int] = None,
    ) -> Symbol:
        """Get existing symbol or create new one."""
        existing = await self.get_symbol(symbol)
        if existing:
            return existing

        new_symbol = Symbol(
            symbol=symbol.upper(),
            exchange=exchange,
            segment=segment,
            lot_size=lot_size,
            is_active=True,
        )
        self.db.add(new_symbol)
        await self.db.commit()
        await self.db.refresh(new_symbol)
        return new_symbol

    async def get_or_create_contract(
        self,
        symbol_id: int,
        strike_price: Decimal,
        expiry_date: date,
        option_type: str,
    ) -> OptionsContract:
        """Get existing contract or create new one."""
        result = await self.db.execute(
            select(OptionsContract).where(
                and_(
                    OptionsContract.symbol_id == symbol_id,
                    OptionsContract.strike_price == strike_price,
                    OptionsContract.expiry_date == expiry_date,
                    OptionsContract.option_type == option_type.upper(),
                )
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        new_contract = OptionsContract(
            symbol_id=symbol_id,
            strike_price=strike_price,
            expiry_date=expiry_date,
            option_type=option_type.upper(),
        )
        self.db.add(new_contract)
        await self.db.commit()
        await self.db.refresh(new_contract)
        return new_contract

    async def insert_flow_data(
        self,
        contract_id: int,
        timestamp: datetime,
        ltp: Optional[Decimal] = None,
        volume: Optional[int] = None,
        oi: Optional[int] = None,
        oi_change: Optional[int] = None,
        bid_price: Optional[Decimal] = None,
        ask_price: Optional[Decimal] = None,
        iv: Optional[Decimal] = None,
        underlying_price: Optional[Decimal] = None,
        **kwargs,
    ) -> OptionsFlow:
        """Insert new options flow data point."""
        flow = OptionsFlow(
            contract_id=contract_id,
            timestamp=timestamp,
            ltp=ltp,
            volume=volume,
            oi=oi,
            oi_change=oi_change,
            bid_price=bid_price,
            ask_price=ask_price,
            iv=iv,
            underlying_price=underlying_price,
            **kwargs,
        )
        self.db.add(flow)
        await self.db.commit()
        await self.db.refresh(flow)
        return flow

    async def get_historical_baseline(
        self,
        contract_id: int,
        lookback_days: int = 20,
    ) -> dict:
        """
        Get historical baseline statistics for unusual activity detection.

        Returns average and standard deviation for volume and OI.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=lookback_days)

        result = await self.db.execute(
            select(
                func.avg(OptionsFlow.volume).label("avg_volume"),
                func.stddev(OptionsFlow.volume).label("std_volume"),
                func.avg(OptionsFlow.oi).label("avg_oi"),
                func.stddev(OptionsFlow.oi).label("std_oi"),
            ).where(
                and_(
                    OptionsFlow.contract_id == contract_id,
                    OptionsFlow.timestamp >= cutoff_date,
                )
            )
        )

        row = result.one()
        return {
            "avg_volume": float(row.avg_volume or 0),
            "std_volume": float(row.std_volume or 0),
            "avg_oi": float(row.avg_oi or 0),
            "std_oi": float(row.std_oi or 0),
        }

    async def detect_unusual_activity(
        self,
        flow: OptionsFlow,
        baseline: dict,
    ) -> Optional[dict]:
        """
        Detect unusual activity in a flow data point.

        Returns unusual flags if detected, None otherwise.
        """
        unusual_flags = []

        # Volume spike detection
        if flow.volume and baseline["avg_volume"] > 0:
            volume_multiplier = flow.volume / baseline["avg_volume"]
            if volume_multiplier >= settings.unusual_volume_multiplier:
                z_score = (
                    (flow.volume - baseline["avg_volume"]) / baseline["std_volume"]
                    if baseline["std_volume"] > 0
                    else 0
                )
                unusual_flags.append({
                    "type": "VOLUME_SPIKE",
                    "severity": self._calculate_severity(volume_multiplier, [3, 5, 10]),
                    "current_value": flow.volume,
                    "baseline_value": baseline["avg_volume"],
                    "multiplier": volume_multiplier,
                    "z_score": z_score,
                })

        # Large premium detection
        if flow.ltp and flow.volume:
            # Get lot size from contract -> symbol
            lot_size = 50  # Default, should be fetched from symbol
            premium_value = float(flow.ltp) * flow.volume * lot_size

            if premium_value >= settings.unusual_premium_threshold:
                unusual_flags.append({
                    "type": "LARGE_PREMIUM",
                    "severity": self._calculate_severity(
                        premium_value / 10_000_000, [1, 5, 10]
                    ),
                    "current_value": premium_value,
                    "baseline_value": settings.unusual_premium_threshold,
                    "premium_value": premium_value,
                })

        # OI spike detection
        if flow.oi and flow.oi_change:
            if baseline["avg_oi"] > 0:
                oi_change_pct = abs(flow.oi_change) / baseline["avg_oi"]
                if oi_change_pct >= settings.unusual_oi_spike_threshold:
                    unusual_flags.append({
                        "type": "OI_SPIKE",
                        "severity": self._calculate_severity(oi_change_pct, [0.5, 1.0, 2.0]),
                        "current_value": flow.oi_change,
                        "baseline_value": baseline["avg_oi"],
                        "change_pct": oi_change_pct,
                        "direction": "LONG_BUILD" if flow.oi_change > 0 else "LONG_UNWINDING",
                    })

        if unusual_flags:
            # Return the most severe flag
            unusual_flags.sort(
                key=lambda x: {"LOW": 0, "MEDIUM": 1, "HIGH": 2}[x["severity"]],
                reverse=True,
            )
            return unusual_flags[0]

        return None

    def _calculate_severity(self, value: float, thresholds: list[float]) -> str:
        """Calculate severity based on value and thresholds."""
        if value >= thresholds[2]:
            return "HIGH"
        elif value >= thresholds[1]:
            return "MEDIUM"
        elif value >= thresholds[0]:
            return "LOW"
        return "LOW"
