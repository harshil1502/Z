"""
SQLAlchemy models for scraper storage.
Mirrors the backend models for database access.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


class Symbol(Base):
    """Tradable symbol."""

    __tablename__ = "symbols"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(100))
    exchange: Mapped[str] = mapped_column(String(10), nullable=False)
    segment: Mapped[Optional[str]] = mapped_column(String(20))
    lot_size: Mapped[Optional[int]] = mapped_column(Integer)
    tick_size: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class OptionsContract(Base):
    """Options contract."""

    __tablename__ = "options_contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol_id: Mapped[int] = mapped_column(Integer, ForeignKey("symbols.id"), nullable=False)
    strike_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    option_type: Mapped[str] = mapped_column(String(2), nullable=False)
    contract_symbol: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class OptionsFlow(Base):
    """Options flow data point."""

    __tablename__ = "options_flow"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    contract_id: Mapped[int] = mapped_column(Integer, ForeignKey("options_contracts.id"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ltp: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    bid_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    ask_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    bid_qty: Mapped[Optional[int]] = mapped_column(BigInteger)
    ask_qty: Mapped[Optional[int]] = mapped_column(BigInteger)
    volume: Mapped[Optional[int]] = mapped_column(BigInteger)
    oi: Mapped[Optional[int]] = mapped_column(BigInteger)
    oi_change: Mapped[Optional[int]] = mapped_column(BigInteger)
    total_traded_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2))
    iv: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    delta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 6))
    gamma: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 10))
    theta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    vega: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    underlying_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    is_unusual: Mapped[bool] = mapped_column(Boolean, default=False)
    unusual_flags: Mapped[Optional[dict]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class FIIDIIData(Base):
    """FII/DII flow data."""

    __tablename__ = "fii_dii_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(String(10), nullable=False)
    segment: Mapped[str] = mapped_column(String(20), nullable=False)
    buy_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2))
    sell_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2))
    net_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2))
    long_contracts: Mapped[Optional[int]] = mapped_column(BigInteger)
    short_contracts: Mapped[Optional[int]] = mapped_column(BigInteger)
    net_contracts: Mapped[Optional[int]] = mapped_column(BigInteger)
    is_provisional: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
