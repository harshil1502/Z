"""
Pydantic schemas for options and market data.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ============== Symbol Schemas ==============


class SymbolBase(BaseModel):
    """Base schema for symbol data."""

    symbol: str = Field(..., max_length=20, description="Trading symbol (e.g., NIFTY, BANKNIFTY)")
    name: Optional[str] = Field(None, max_length=100, description="Full name of the symbol")
    exchange: str = Field(..., pattern="^(NSE|BSE)$", description="Exchange (NSE or BSE)")
    segment: Optional[str] = Field(None, description="Market segment (INDEX, EQUITY)")
    lot_size: Optional[int] = Field(None, ge=1, description="Contract lot size")
    tick_size: Optional[Decimal] = Field(None, description="Minimum price movement")


class SymbolCreate(SymbolBase):
    """Schema for creating a new symbol."""

    pass


class SymbolResponse(SymbolBase):
    """Schema for symbol response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime


# ============== Options Contract Schemas ==============


class OptionsContractResponse(BaseModel):
    """Schema for options contract response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol_id: int
    strike_price: Decimal
    expiry_date: date
    option_type: str = Field(..., pattern="^(CE|PE)$")
    contract_symbol: Optional[str] = None


# ============== Options Flow Schemas ==============


class OptionsFlowBase(BaseModel):
    """Base schema for options flow data."""

    timestamp: datetime
    ltp: Optional[Decimal] = Field(None, description="Last Traded Price")
    volume: Optional[int] = Field(None, ge=0, description="Trading volume")
    oi: Optional[int] = Field(None, ge=0, description="Open Interest")
    oi_change: Optional[int] = Field(None, description="Change in Open Interest")
    iv: Optional[Decimal] = Field(None, description="Implied Volatility")
    underlying_price: Optional[Decimal] = Field(None, description="Underlying asset price")


class OptionsFlowResponse(OptionsFlowBase):
    """Schema for options flow response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    contract_id: int

    # Additional price data
    bid_price: Optional[Decimal] = None
    ask_price: Optional[Decimal] = None
    bid_qty: Optional[int] = None
    ask_qty: Optional[int] = None
    total_traded_value: Optional[Decimal] = None

    # Greeks
    delta: Optional[Decimal] = None
    gamma: Optional[Decimal] = None
    theta: Optional[Decimal] = None
    vega: Optional[Decimal] = None

    # Unusual flags
    is_unusual: bool = False
    unusual_flags: Optional[dict[str, Any]] = None

    # Contract info (populated via join)
    symbol: Optional[str] = None
    strike_price: Optional[Decimal] = None
    expiry_date: Optional[date] = None
    option_type: Optional[str] = None


class OptionsFlowListResponse(BaseModel):
    """Schema for paginated options flow list."""

    items: list[OptionsFlowResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


# ============== Unusual Activity Schemas ==============


class UnusualActivityResponse(BaseModel):
    """Schema for unusual activity alerts."""

    id: int
    symbol: str
    strike_price: Decimal
    expiry_date: date
    option_type: str
    timestamp: datetime

    # Activity details
    activity_type: str = Field(
        ..., description="Type: VOLUME_SPIKE, LARGE_PREMIUM, OI_SPIKE"
    )
    severity: str = Field(..., pattern="^(LOW|MEDIUM|HIGH)$")

    # Metrics
    current_value: Decimal
    baseline_value: Decimal
    change_percentage: Optional[Decimal] = None
    z_score: Optional[Decimal] = None

    # Additional context
    ltp: Optional[Decimal] = None
    underlying_price: Optional[Decimal] = None
    premium_value: Optional[Decimal] = None


# ============== Options Chain Schemas ==============


class StrikeData(BaseModel):
    """Schema for a single strike in the options chain."""

    strike_price: Decimal

    # Call data
    ce_ltp: Optional[Decimal] = None
    ce_volume: Optional[int] = None
    ce_oi: Optional[int] = None
    ce_oi_change: Optional[int] = None
    ce_iv: Optional[Decimal] = None
    ce_bid: Optional[Decimal] = None
    ce_ask: Optional[Decimal] = None
    ce_delta: Optional[Decimal] = None
    ce_gamma: Optional[Decimal] = None

    # Put data
    pe_ltp: Optional[Decimal] = None
    pe_volume: Optional[int] = None
    pe_oi: Optional[int] = None
    pe_oi_change: Optional[int] = None
    pe_iv: Optional[Decimal] = None
    pe_bid: Optional[Decimal] = None
    pe_ask: Optional[Decimal] = None
    pe_delta: Optional[Decimal] = None
    pe_gamma: Optional[Decimal] = None


class OptionsChainResponse(BaseModel):
    """Schema for full options chain response."""

    symbol: str
    expiry_date: date
    underlying_price: Decimal
    timestamp: datetime

    # Summary stats
    total_ce_oi: int
    total_pe_oi: int
    pcr: Decimal = Field(..., description="Put-Call Ratio")
    max_pain: Optional[Decimal] = None

    # Strike data
    strikes: list[StrikeData]


# ============== FII/DII Schemas ==============


class FIIDIIResponse(BaseModel):
    """Schema for FII/DII flow data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date
    category: str = Field(..., pattern="^(FII|DII)$")
    segment: str

    buy_value: Optional[Decimal] = None
    sell_value: Optional[Decimal] = None
    net_value: Optional[Decimal] = None

    long_contracts: Optional[int] = None
    short_contracts: Optional[int] = None
    net_contracts: Optional[int] = None

    is_provisional: bool = False


class FIIDIISummaryResponse(BaseModel):
    """Schema for summarized FII/DII data."""

    date: date

    # FII
    fii_cash_net: Optional[Decimal] = None
    fii_index_futures_net: Optional[int] = None
    fii_index_options_net: Optional[int] = None

    # DII
    dii_cash_net: Optional[Decimal] = None

    # Trends
    fii_5d_avg: Optional[Decimal] = None
    fii_20d_avg: Optional[Decimal] = None


# ============== Analytics Schemas ==============


class GammaExposureLevel(BaseModel):
    """Schema for a single gamma exposure level."""

    strike_price: Decimal
    call_gex: Decimal
    put_gex: Decimal
    total_gex: Decimal


class GammaExposureResponse(BaseModel):
    """Schema for gamma exposure analysis."""

    symbol: str
    expiry_date: date
    underlying_price: Decimal
    timestamp: datetime

    # Summary
    total_gex: Decimal = Field(..., description="Net gamma exposure")
    gex_flip_level: Optional[Decimal] = Field(
        None, description="Price level where GEX flips sign"
    )
    major_positive_strikes: list[Decimal] = Field(
        default_factory=list, description="Strikes with highest positive GEX"
    )
    major_negative_strikes: list[Decimal] = Field(
        default_factory=list, description="Strikes with highest negative GEX"
    )

    # Per-strike data
    levels: list[GammaExposureLevel]


class PCRResponse(BaseModel):
    """Schema for Put-Call Ratio analysis."""

    symbol: str
    expiry_date: Optional[date] = None
    timestamp: datetime

    # Current PCR
    oi_pcr: Decimal = Field(..., description="OI-based PCR")
    volume_pcr: Decimal = Field(..., description="Volume-based PCR")

    # Historical
    pcr_5d_avg: Optional[Decimal] = None
    pcr_20d_avg: Optional[Decimal] = None
    pcr_percentile: Optional[Decimal] = Field(
        None, description="Current PCR percentile vs 20-day history"
    )
