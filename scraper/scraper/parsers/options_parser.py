"""
Options data parser.

Handles parsing and validation of options chain data from various sources.
"""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class OptionRecord:
    """Structured option data record."""

    symbol: str
    strike_price: Decimal
    expiry_date: date
    option_type: str  # CE or PE
    timestamp: datetime

    # Price data
    ltp: Optional[Decimal] = None
    bid_price: Optional[Decimal] = None
    ask_price: Optional[Decimal] = None
    bid_qty: Optional[int] = None
    ask_qty: Optional[int] = None

    # Volume and OI
    volume: Optional[int] = None
    oi: Optional[int] = None
    oi_change: Optional[int] = None
    total_traded_value: Optional[Decimal] = None

    # Greeks
    iv: Optional[Decimal] = None
    delta: Optional[Decimal] = None
    gamma: Optional[Decimal] = None
    theta: Optional[Decimal] = None
    vega: Optional[Decimal] = None

    # Underlying
    underlying_price: Optional[Decimal] = None

    def is_valid(self) -> bool:
        """Check if record has minimum required fields."""
        return (
            self.symbol is not None
            and self.strike_price is not None
            and self.expiry_date is not None
            and self.option_type in ("CE", "PE")
        )


class OptionsChainParser:
    """
    Parser for options chain data from NSE/BSE.

    Handles data validation, type conversion, and normalization.
    """

    # NSE date formats
    DATE_FORMATS = [
        "%d-%b-%Y",  # 28-Dec-2024
        "%d-%m-%Y",  # 28-12-2024
        "%Y-%m-%d",  # 2024-12-28
    ]

    TIMESTAMP_FORMATS = [
        "%d-%b-%Y %H:%M:%S",  # 28-Dec-2024 15:30:00
        "%Y-%m-%d %H:%M:%S",  # 2024-12-28 15:30:00
    ]

    def __init__(self):
        self.errors: list[str] = []

    def parse_nse_chain(self, data: dict) -> list[OptionRecord]:
        """
        Parse NSE options chain response.

        Args:
            data: Raw NSE API response

        Returns:
            List of validated OptionRecord objects
        """
        records = []
        self.errors = []

        if not data or "records" not in data:
            self.errors.append("Invalid response structure: missing 'records'")
            return records

        record_data = data.get("records", {})
        underlying_value = record_data.get("underlyingValue")
        timestamp_str = record_data.get("timestamp", "")

        timestamp = self._parse_timestamp(timestamp_str)

        for item in record_data.get("data", []):
            try:
                strike_price = self._parse_decimal(item.get("strikePrice"))
                expiry_date = self._parse_date(item.get("expiryDate"))

                if strike_price is None or expiry_date is None:
                    continue

                # Parse CE data
                ce_data = item.get("CE")
                if ce_data:
                    record = self._parse_option_item(
                        ce_data, strike_price, expiry_date, "CE",
                        underlying_value, timestamp
                    )
                    if record and record.is_valid():
                        records.append(record)

                # Parse PE data
                pe_data = item.get("PE")
                if pe_data:
                    record = self._parse_option_item(
                        pe_data, strike_price, expiry_date, "PE",
                        underlying_value, timestamp
                    )
                    if record and record.is_valid():
                        records.append(record)

            except Exception as e:
                self.errors.append(f"Error parsing item: {str(e)}")

        logger.info(
            "Parsed options chain",
            total_records=len(records),
            errors=len(self.errors),
        )

        return records

    def _parse_option_item(
        self,
        data: dict,
        strike_price: Decimal,
        expiry_date: date,
        option_type: str,
        underlying_value: Any,
        timestamp: datetime,
    ) -> Optional[OptionRecord]:
        """Parse single option item."""
        try:
            return OptionRecord(
                symbol=data.get("underlying", "UNKNOWN"),
                strike_price=strike_price,
                expiry_date=expiry_date,
                option_type=option_type,
                timestamp=timestamp,
                ltp=self._parse_decimal(data.get("lastPrice")),
                bid_price=self._parse_decimal(data.get("bidprice")),
                ask_price=self._parse_decimal(data.get("askPrice")),
                bid_qty=self._parse_int(data.get("bidQty")),
                ask_qty=self._parse_int(data.get("askQty")),
                volume=self._parse_int(data.get("totalTradedVolume")),
                oi=self._parse_int(data.get("openInterest")),
                oi_change=self._parse_int(data.get("changeinOpenInterest")),
                iv=self._parse_decimal(data.get("impliedVolatility")),
                underlying_price=self._parse_decimal(underlying_value),
            )
        except Exception as e:
            self.errors.append(f"Error creating record: {str(e)}")
            return None

    def _parse_decimal(self, value: Any) -> Optional[Decimal]:
        """Safely parse value to Decimal."""
        if value is None:
            return None

        try:
            if isinstance(value, (int, float)):
                return Decimal(str(value))
            if isinstance(value, str):
                # Handle strings like "1,234.56"
                cleaned = value.replace(",", "").strip()
                if cleaned == "" or cleaned == "-":
                    return None
                return Decimal(cleaned)
            return Decimal(str(value))
        except (InvalidOperation, ValueError):
            return None

    def _parse_int(self, value: Any) -> Optional[int]:
        """Safely parse value to int."""
        if value is None:
            return None

        try:
            if isinstance(value, int):
                return value
            if isinstance(value, float):
                return int(value)
            if isinstance(value, str):
                cleaned = value.replace(",", "").strip()
                if cleaned == "" or cleaned == "-":
                    return None
                return int(float(cleaned))
            return int(value)
        except (ValueError, TypeError):
            return None

    def _parse_date(self, value: Any) -> Optional[date]:
        """Parse date string to date object."""
        if value is None:
            return None

        if isinstance(value, date):
            return value

        if isinstance(value, datetime):
            return value.date()

        if isinstance(value, str):
            for fmt in self.DATE_FORMATS:
                try:
                    return datetime.strptime(value.strip(), fmt).date()
                except ValueError:
                    continue

        return None

    def _parse_timestamp(self, value: Any) -> datetime:
        """Parse timestamp string to datetime object."""
        if value is None:
            return datetime.utcnow()

        if isinstance(value, datetime):
            return value

        if isinstance(value, str):
            for fmt in self.TIMESTAMP_FORMATS:
                try:
                    return datetime.strptime(value.strip(), fmt)
                except ValueError:
                    continue

        return datetime.utcnow()

    def validate_records(self, records: list[OptionRecord]) -> list[OptionRecord]:
        """
        Validate and filter records.

        Removes records with invalid/suspicious data.
        """
        validated = []

        for record in records:
            # Basic validation
            if not record.is_valid():
                continue

            # Strike price validation (should be positive)
            if record.strike_price <= 0:
                continue

            # OI should be non-negative
            if record.oi is not None and record.oi < 0:
                continue

            # LTP should be non-negative
            if record.ltp is not None and record.ltp < 0:
                continue

            validated.append(record)

        return validated
