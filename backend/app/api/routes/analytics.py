"""
Analytics routes - Advanced analytics and calculations.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.options import Symbol, OptionsContract, OptionsFlow, FIIDIIData
from app.schemas.options import (
    GammaExposureResponse,
    GammaExposureLevel,
    FIIDIIResponse,
    FIIDIISummaryResponse,
    PCRResponse,
)

router = APIRouter()


@router.get("/gex/{symbol}", response_model=GammaExposureResponse)
async def get_gamma_exposure(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    expiry: Optional[date] = Query(None, description="Expiry date"),
) -> GammaExposureResponse:
    """
    Calculate Gamma Exposure (GEX) for a symbol.

    GEX measures the hedging impact of options market makers.
    - Positive GEX = Market dampening (mean reversion)
    - Negative GEX = Market amplifying (momentum)

    Returns per-strike gamma exposure and key levels.
    """
    symbol = symbol.upper()

    # Get symbol record
    result = await db.execute(select(Symbol).where(Symbol.symbol == symbol))
    symbol_record = result.scalar_one_or_none()

    if not symbol_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Symbol {symbol} not found",
        )

    # Get nearest expiry if not specified
    if not expiry:
        expiry_query = (
            select(OptionsContract.expiry_date)
            .where(OptionsContract.symbol_id == symbol_record.id)
            .where(OptionsContract.expiry_date >= date.today())
            .order_by(OptionsContract.expiry_date)
            .limit(1)
        )
        expiry_result = await db.execute(expiry_query)
        expiry = expiry_result.scalar_one_or_none()

    if not expiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active expiries found for {symbol}",
        )

    # Get contracts and their latest flow data
    contracts_query = (
        select(OptionsContract)
        .where(
            and_(
                OptionsContract.symbol_id == symbol_record.id,
                OptionsContract.expiry_date == expiry,
            )
        )
    )
    contracts_result = await db.execute(contracts_query)
    contracts = contracts_result.scalars().all()

    # Calculate GEX per strike
    gex_by_strike: dict[float, dict] = {}
    underlying_price = None
    lot_size = symbol_record.lot_size or 1

    for contract in contracts:
        strike = float(contract.strike_price)

        # Get latest flow data
        flow_query = (
            select(OptionsFlow)
            .where(OptionsFlow.contract_id == contract.id)
            .order_by(OptionsFlow.timestamp.desc())
            .limit(1)
        )
        flow_result = await db.execute(flow_query)
        flow = flow_result.scalar_one_or_none()

        if not flow or not flow.gamma or not flow.oi:
            continue

        if underlying_price is None and flow.underlying_price:
            underlying_price = float(flow.underlying_price)

        if strike not in gex_by_strike:
            gex_by_strike[strike] = {"call_gex": 0, "put_gex": 0}

        # GEX = Gamma × OI × 100 × Spot × 0.01
        # Assumes dealers are short options (negative gamma)
        spot = underlying_price or float(contract.strike_price)
        gex_value = float(flow.gamma) * flow.oi * lot_size * spot * 0.01

        if contract.option_type == "CE":
            # Calls have positive gamma for dealers who are short
            gex_by_strike[strike]["call_gex"] = gex_value
        else:
            # Puts have negative gamma (dealers get shorter as price falls)
            gex_by_strike[strike]["put_gex"] = -gex_value

    # Build response
    levels = []
    total_gex = Decimal(0)
    positive_strikes = []
    negative_strikes = []

    for strike, gex_data in sorted(gex_by_strike.items()):
        call_gex = Decimal(str(gex_data["call_gex"]))
        put_gex = Decimal(str(gex_data["put_gex"]))
        strike_total = call_gex + put_gex
        total_gex += strike_total

        levels.append(
            GammaExposureLevel(
                strike_price=Decimal(str(strike)),
                call_gex=call_gex,
                put_gex=put_gex,
                total_gex=strike_total,
            )
        )

        if strike_total > 0:
            positive_strikes.append((strike, strike_total))
        else:
            negative_strikes.append((strike, strike_total))

    # Find GEX flip level (approximate)
    gex_flip_level = None
    sorted_levels = sorted(levels, key=lambda x: x.strike_price)
    for i in range(len(sorted_levels) - 1):
        if (sorted_levels[i].total_gex > 0) != (sorted_levels[i + 1].total_gex > 0):
            # Flip occurs between these strikes
            gex_flip_level = (sorted_levels[i].strike_price + sorted_levels[i + 1].strike_price) / 2
            break

    # Top positive and negative strikes
    positive_strikes.sort(key=lambda x: x[1], reverse=True)
    negative_strikes.sort(key=lambda x: x[1])

    return GammaExposureResponse(
        symbol=symbol,
        expiry_date=expiry,
        underlying_price=Decimal(str(underlying_price or 0)),
        timestamp=datetime.utcnow(),
        total_gex=total_gex,
        gex_flip_level=gex_flip_level,
        major_positive_strikes=[Decimal(str(s[0])) for s in positive_strikes[:5]],
        major_negative_strikes=[Decimal(str(s[0])) for s in negative_strikes[:5]],
        levels=levels,
    )


@router.get("/pcr/{symbol}", response_model=PCRResponse)
async def get_put_call_ratio(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    expiry: Optional[date] = Query(None, description="Expiry date (None = all expiries)"),
) -> PCRResponse:
    """
    Calculate Put-Call Ratio for a symbol.

    Returns OI-based and volume-based PCR with historical context.
    - PCR > 1: More puts than calls (bearish sentiment)
    - PCR < 1: More calls than puts (bullish sentiment)
    """
    symbol = symbol.upper()

    # Get symbol record
    result = await db.execute(select(Symbol).where(Symbol.symbol == symbol))
    symbol_record = result.scalar_one_or_none()

    if not symbol_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Symbol {symbol} not found",
        )

    # Build query for contracts
    contracts_query = select(OptionsContract.id, OptionsContract.option_type).where(
        OptionsContract.symbol_id == symbol_record.id
    )

    if expiry:
        contracts_query = contracts_query.where(OptionsContract.expiry_date == expiry)
    else:
        contracts_query = contracts_query.where(OptionsContract.expiry_date >= date.today())

    contracts_result = await db.execute(contracts_query)
    contracts = contracts_result.all()

    # Aggregate OI and volume
    ce_contracts = [c[0] for c in contracts if c[1] == "CE"]
    pe_contracts = [c[0] for c in contracts if c[1] == "PE"]

    total_ce_oi = 0
    total_pe_oi = 0
    total_ce_volume = 0
    total_pe_volume = 0

    # Get latest flow for CE contracts
    if ce_contracts:
        ce_flow_query = (
            select(func.sum(OptionsFlow.oi), func.sum(OptionsFlow.volume))
            .where(OptionsFlow.contract_id.in_(ce_contracts))
        )
        ce_result = await db.execute(ce_flow_query)
        ce_data = ce_result.one()
        total_ce_oi = ce_data[0] or 0
        total_ce_volume = ce_data[1] or 0

    if pe_contracts:
        pe_flow_query = (
            select(func.sum(OptionsFlow.oi), func.sum(OptionsFlow.volume))
            .where(OptionsFlow.contract_id.in_(pe_contracts))
        )
        pe_result = await db.execute(pe_flow_query)
        pe_data = pe_result.one()
        total_pe_oi = pe_data[0] or 0
        total_pe_volume = pe_data[1] or 0

    # Calculate PCR
    oi_pcr = Decimal(str(total_pe_oi / total_ce_oi)) if total_ce_oi > 0 else Decimal(0)
    volume_pcr = Decimal(str(total_pe_volume / total_ce_volume)) if total_ce_volume > 0 else Decimal(0)

    return PCRResponse(
        symbol=symbol,
        expiry_date=expiry,
        timestamp=datetime.utcnow(),
        oi_pcr=oi_pcr,
        volume_pcr=volume_pcr,
        pcr_5d_avg=None,  # TODO: Implement historical
        pcr_20d_avg=None,
        pcr_percentile=None,
    )


@router.get("/fii-dii", response_model=list[FIIDIIResponse])
async def get_fii_dii_data(
    db: AsyncSession = Depends(get_db),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    category: Optional[str] = Query(None, pattern="^(FII|DII)$"),
) -> list[FIIDIIResponse]:
    """
    Get FII/DII flow data.

    Returns institutional investor activity across cash and derivatives segments.
    """
    query = select(FIIDIIData)

    conditions = []
    if start_date:
        conditions.append(FIIDIIData.date >= start_date)
    if end_date:
        conditions.append(FIIDIIData.date <= end_date)
    if category:
        conditions.append(FIIDIIData.category == category)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(FIIDIIData.date.desc())

    result = await db.execute(query)
    data = result.scalars().all()

    return [FIIDIIResponse.model_validate(d) for d in data]


@router.get("/fii-dii/summary", response_model=FIIDIISummaryResponse)
async def get_fii_dii_summary(
    db: AsyncSession = Depends(get_db),
    target_date: Optional[date] = Query(None, description="Date (defaults to today)"),
) -> FIIDIISummaryResponse:
    """
    Get summarized FII/DII data for a specific date.

    Aggregates data across segments for quick overview.
    """
    if not target_date:
        target_date = date.today()

    # Query data for the date
    query = select(FIIDIIData).where(FIIDIIData.date == target_date)
    result = await db.execute(query)
    data = result.scalars().all()

    # Aggregate
    fii_cash_net = None
    fii_index_futures_net = None
    fii_index_options_net = None
    dii_cash_net = None

    for row in data:
        if row.category == "FII":
            if row.segment == "CASH":
                fii_cash_net = row.net_value
            elif row.segment == "INDEX_FUTURES":
                fii_index_futures_net = row.net_contracts
            elif row.segment == "INDEX_OPTIONS":
                fii_index_options_net = row.net_contracts
        elif row.category == "DII":
            if row.segment == "CASH":
                dii_cash_net = row.net_value

    return FIIDIISummaryResponse(
        date=target_date,
        fii_cash_net=fii_cash_net,
        fii_index_futures_net=fii_index_futures_net,
        fii_index_options_net=fii_index_options_net,
        dii_cash_net=dii_cash_net,
        fii_5d_avg=None,  # TODO: Implement
        fii_20d_avg=None,
    )
