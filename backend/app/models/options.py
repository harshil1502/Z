"""
Database models for options and market data.
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
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Symbol(Base):
    """
    Represents a tradable symbol (index or stock).
    """

    __tablename__ = "symbols"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(100))
    exchange: Mapped[str] = mapped_column(String(10), nullable=False)  # NSE, BSE
    segment: Mapped[Optional[str]] = mapped_column(String(20))  # INDEX, EQUITY
    lot_size: Mapped[Optional[int]] = mapped_column(Integer)
    tick_size: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    contracts: Mapped[list["OptionsContract"]] = relationship(
        "OptionsContract", back_populates="symbol_ref", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Symbol(symbol={self.symbol}, exchange={self.exchange})>"


class OptionsContract(Base):
    """
    Represents an individual options contract.
    """

    __tablename__ = "options_contracts"
    __table_args__ = (
        Index("idx_contract_lookup", "symbol_id", "strike_price", "expiry_date", "option_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("symbols.id"), nullable=False, index=True
    )
    strike_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    option_type: Mapped[str] = mapped_column(String(2), nullable=False)  # CE, PE
    contract_symbol: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    symbol_ref: Mapped["Symbol"] = relationship("Symbol", back_populates="contracts")
    flows: Mapped[list["OptionsFlow"]] = relationship(
        "OptionsFlow", back_populates="contract", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<OptionsContract(strike={self.strike_price}, type={self.option_type}, expiry={self.expiry_date})>"


class OptionsFlow(Base):
    """
    Represents a single options flow data point (snapshot in time).
    This is the core data model for real-time options tracking.
    """

    __tablename__ = "options_flow"
    __table_args__ = (
        Index("idx_flow_timestamp", "timestamp", postgresql_using="btree"),
        Index("idx_flow_unusual", "is_unusual", postgresql_where=("is_unusual = true")),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("options_contracts.id"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Price Data
    ltp: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))  # Last Traded Price
    bid_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    ask_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    bid_qty: Mapped[Optional[int]] = mapped_column(BigInteger)
    ask_qty: Mapped[Optional[int]] = mapped_column(BigInteger)

    # Volume & OI
    volume: Mapped[Optional[int]] = mapped_column(BigInteger)
    oi: Mapped[Optional[int]] = mapped_column(BigInteger)  # Open Interest
    oi_change: Mapped[Optional[int]] = mapped_column(BigInteger)
    total_traded_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2))

    # Greeks
    iv: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))  # Implied Volatility
    delta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 6))
    gamma: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 10))
    theta: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))
    vega: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4))

    # Underlying Info
    underlying_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))

    # Unusual Activity Flags
    is_unusual: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    unusual_flags: Mapped[Optional[dict]] = mapped_column(JSONB)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    contract: Mapped["OptionsContract"] = relationship("OptionsContract", back_populates="flows")

    def __repr__(self) -> str:
        return f"<OptionsFlow(contract_id={self.contract_id}, ltp={self.ltp}, volume={self.volume})>"


class FIIDIIData(Base):
    """
    Represents Foreign Institutional Investor (FII) and
    Domestic Institutional Investor (DII) flow data.
    """

    __tablename__ = "fii_dii_data"
    __table_args__ = (
        Index("idx_fii_dii_date", "date", postgresql_using="btree"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(String(10), nullable=False)  # FII, DII
    segment: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # CASH, INDEX_FUTURES, INDEX_OPTIONS, STOCK_FUTURES, STOCK_OPTIONS

    buy_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2))
    sell_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2))
    net_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2))

    # For futures/options specific data
    long_contracts: Mapped[Optional[int]] = mapped_column(BigInteger)
    short_contracts: Mapped[Optional[int]] = mapped_column(BigInteger)
    net_contracts: Mapped[Optional[int]] = mapped_column(BigInteger)

    is_provisional: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<FIIDIIData(date={self.date}, category={self.category}, net={self.net_value})>"


class BulkBlockDeal(Base):
    """
    Represents bulk and block deals reported to exchanges.
    """

    __tablename__ = "bulk_block_deals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    symbol_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("symbols.id"), nullable=False, index=True
    )
    deal_type: Mapped[str] = mapped_column(String(10), nullable=False)  # BULK, BLOCK
    client_name: Mapped[Optional[str]] = mapped_column(String(200))
    buy_sell: Mapped[Optional[str]] = mapped_column(String(1))  # B, S
    quantity: Mapped[Optional[int]] = mapped_column(BigInteger)
    price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    remarks: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    symbol_ref: Mapped["Symbol"] = relationship("Symbol")

    def __repr__(self) -> str:
        return f"<BulkBlockDeal(date={self.date}, type={self.deal_type}, qty={self.quantity})>"
