"""
Unusual Activity Detection.

Analyzes options flow data to identify unusual trading patterns
that may indicate informed trading or significant market moves.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

import structlog

from scraper.config import settings

logger = structlog.get_logger(__name__)


class UnusualType(Enum):
    """Types of unusual activity."""

    VOLUME_SPIKE = "VOLUME_SPIKE"
    LARGE_PREMIUM = "LARGE_PREMIUM"
    OI_SPIKE = "OI_SPIKE"
    OI_BUILDUP = "OI_BUILDUP"
    OI_UNWINDING = "OI_UNWINDING"
    BLOCK_DEAL = "BLOCK_DEAL"


class Severity(Enum):
    """Severity levels for unusual activity."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    EXTREME = "EXTREME"


@dataclass
class UnusualActivity:
    """Represents a detected unusual activity."""

    activity_type: UnusualType
    severity: Severity
    symbol: str
    strike_price: Decimal
    expiry_date: Any  # date
    option_type: str
    timestamp: datetime

    # Metrics
    current_value: float
    baseline_value: float
    change_percentage: Optional[float] = None
    z_score: Optional[float] = None

    # Additional context
    ltp: Optional[Decimal] = None
    underlying_price: Optional[Decimal] = None
    premium_value: Optional[float] = None
    volume: Optional[int] = None
    oi: Optional[int] = None
    oi_change: Optional[int] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for storage/serialization."""
        return {
            "type": self.activity_type.value,
            "severity": self.severity.value,
            "symbol": self.symbol,
            "strike_price": float(self.strike_price),
            "expiry_date": str(self.expiry_date),
            "option_type": self.option_type,
            "timestamp": self.timestamp.isoformat(),
            "current_value": self.current_value,
            "baseline_value": self.baseline_value,
            "change_pct": self.change_percentage,
            "z_score": self.z_score,
            "ltp": float(self.ltp) if self.ltp else None,
            "underlying_price": float(self.underlying_price) if self.underlying_price else None,
            "premium_value": self.premium_value,
            "volume": self.volume,
            "oi": self.oi,
            "oi_change": self.oi_change,
        }


@dataclass
class Baseline:
    """Historical baseline statistics for comparison."""

    avg_volume: float = 0
    std_volume: float = 0
    avg_oi: float = 0
    std_oi: float = 0
    avg_premium: float = 0
    std_premium: float = 0
    lookback_days: int = 20


class UnusualActivityDetector:
    """
    Detects unusual activity in options flow data.

    Uses statistical methods to identify significant deviations
    from historical baselines.
    """

    def __init__(self):
        self.thresholds = {
            "volume_multiplier": settings.unusual_volume_multiplier,
            "premium_threshold": settings.unusual_premium_threshold,
            "oi_spike_threshold": settings.unusual_oi_spike_threshold,
        }

    async def process_recent_flows(self) -> list[UnusualActivity]:
        """
        Process recent flow data and detect unusual activity.

        Returns:
            List of detected unusual activities
        """
        # TODO: Fetch recent flows from database
        # For now, this is a placeholder
        logger.info("Processing recent flows for unusual activity")
        return []

    def detect(
        self,
        current: dict,
        baseline: Baseline,
        lot_size: int = 50,
    ) -> list[UnusualActivity]:
        """
        Detect unusual activity in current data point.

        Args:
            current: Current flow data
            baseline: Historical baseline statistics
            lot_size: Contract lot size

        Returns:
            List of detected unusual activities
        """
        activities = []

        # Volume spike detection
        volume_activity = self._detect_volume_spike(current, baseline)
        if volume_activity:
            activities.append(volume_activity)

        # Large premium detection
        premium_activity = self._detect_large_premium(current, lot_size)
        if premium_activity:
            activities.append(premium_activity)

        # OI spike detection
        oi_activity = self._detect_oi_spike(current, baseline)
        if oi_activity:
            activities.append(oi_activity)

        return activities

    def _detect_volume_spike(
        self,
        current: dict,
        baseline: Baseline,
    ) -> Optional[UnusualActivity]:
        """Detect volume spikes."""
        volume = current.get("volume", 0)
        if not volume or baseline.avg_volume <= 0:
            return None

        multiplier = volume / baseline.avg_volume

        if multiplier < self.thresholds["volume_multiplier"]:
            return None

        # Calculate Z-score
        z_score = (
            (volume - baseline.avg_volume) / baseline.std_volume
            if baseline.std_volume > 0
            else 0
        )

        severity = self._calculate_severity(multiplier, [3, 5, 10, 20])

        return UnusualActivity(
            activity_type=UnusualType.VOLUME_SPIKE,
            severity=severity,
            symbol=current.get("symbol", ""),
            strike_price=Decimal(str(current.get("strike_price", 0))),
            expiry_date=current.get("expiry_date"),
            option_type=current.get("option_type", ""),
            timestamp=current.get("timestamp", datetime.utcnow()),
            current_value=volume,
            baseline_value=baseline.avg_volume,
            change_percentage=(multiplier - 1) * 100,
            z_score=z_score,
            ltp=current.get("ltp"),
            underlying_price=current.get("underlying_price"),
            volume=volume,
            oi=current.get("oi"),
        )

    def _detect_large_premium(
        self,
        current: dict,
        lot_size: int,
    ) -> Optional[UnusualActivity]:
        """Detect large premium trades."""
        ltp = current.get("ltp")
        volume = current.get("volume", 0)

        if not ltp or not volume:
            return None

        premium_value = float(ltp) * volume * lot_size

        if premium_value < self.thresholds["premium_threshold"]:
            return None

        # Severity based on premium size (in crores)
        crore_value = premium_value / 10_000_000
        severity = self._calculate_severity(crore_value, [1, 5, 10, 25])

        return UnusualActivity(
            activity_type=UnusualType.LARGE_PREMIUM,
            severity=severity,
            symbol=current.get("symbol", ""),
            strike_price=Decimal(str(current.get("strike_price", 0))),
            expiry_date=current.get("expiry_date"),
            option_type=current.get("option_type", ""),
            timestamp=current.get("timestamp", datetime.utcnow()),
            current_value=premium_value,
            baseline_value=self.thresholds["premium_threshold"],
            premium_value=premium_value,
            ltp=ltp,
            underlying_price=current.get("underlying_price"),
            volume=volume,
            oi=current.get("oi"),
        )

    def _detect_oi_spike(
        self,
        current: dict,
        baseline: Baseline,
    ) -> Optional[UnusualActivity]:
        """Detect OI spikes (buildup or unwinding)."""
        oi = current.get("oi", 0)
        oi_change = current.get("oi_change", 0)

        if not oi_change or baseline.avg_oi <= 0:
            return None

        change_pct = abs(oi_change) / baseline.avg_oi

        if change_pct < self.thresholds["oi_spike_threshold"]:
            return None

        # Determine if buildup or unwinding
        if oi_change > 0:
            activity_type = UnusualType.OI_BUILDUP
        else:
            activity_type = UnusualType.OI_UNWINDING

        severity = self._calculate_severity(change_pct, [0.5, 1.0, 2.0, 5.0])

        return UnusualActivity(
            activity_type=activity_type,
            severity=severity,
            symbol=current.get("symbol", ""),
            strike_price=Decimal(str(current.get("strike_price", 0))),
            expiry_date=current.get("expiry_date"),
            option_type=current.get("option_type", ""),
            timestamp=current.get("timestamp", datetime.utcnow()),
            current_value=oi_change,
            baseline_value=baseline.avg_oi,
            change_percentage=change_pct * 100,
            ltp=current.get("ltp"),
            underlying_price=current.get("underlying_price"),
            volume=current.get("volume"),
            oi=oi,
            oi_change=oi_change,
        )

    def _calculate_severity(
        self,
        value: float,
        thresholds: list[float],
    ) -> Severity:
        """
        Calculate severity based on value and thresholds.

        Args:
            value: The value to evaluate
            thresholds: [low, medium, high, extreme] thresholds

        Returns:
            Severity level
        """
        if len(thresholds) != 4:
            raise ValueError("Thresholds must have 4 values")

        if value >= thresholds[3]:
            return Severity.EXTREME
        elif value >= thresholds[2]:
            return Severity.HIGH
        elif value >= thresholds[1]:
            return Severity.MEDIUM
        elif value >= thresholds[0]:
            return Severity.LOW
        return Severity.LOW
