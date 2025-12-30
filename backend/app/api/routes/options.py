"""
Options data routes - Options chain and contract data.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.options import Symbol, OptionsContract, OptionsFlow
from app.schemas.options import (
    OptionsChainResponse,
    StrikeData,
    SymbolResponse,
)

router = APIRouter()


@router.get("/symbols", response_model=list[SymbolResponse])
async def get_symbols(
    db: AsyncSession = Depends(get_db),
    exchange: Optional[str] = Query(None, pattern="^(NSE|BSE)$"),
    segment: Optional[str] = Query(None, pattern="^(INDEX|EQUITY)$"),
    active_only: bool = Query(True, description="Show only active symbols"),
) -> list[SymbolResponse]:
    """
    Get list of available symbols.

    Returns all tradable symbols with their metadata (lot size, tick size, etc.).
    """
    query = select(Symbol)

    conditions = []
    if exchange:
        conditions.append(Symbol.exchange == exchange)
    if segment:
        conditions.append(Symbol.segment == segment)
    if active_only:
        conditions.append(Symbol.is_active == True)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(Symbol.symbol)

    result = await db.execute(query)
    symbols = result.scalars().all()

    return [SymbolResponse.model_validate(s) for s in symbols]


@router.get("/chain/{symbol}", response_model=OptionsChainResponse)
async def get_options_chain(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    expiry: Optional[date] = Query(None, description="Expiry date (defaults to nearest)"),
) -> OptionsChainResponse:
    """
    Get full options chain for a symbol.

    Returns all strikes with call and put data including LTP, volume, OI, and Greeks.
    Calculates PCR (Put-Call Ratio) and Max Pain levels.
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

    # Get available expiries if not specified
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

    # Get all contracts for this symbol and expiry
    contracts_query = (
        select(OptionsContract)
        .where(
            and_(
                OptionsContract.symbol_id == symbol_record.id,
                OptionsContract.expiry_date == expiry,
            )
        )
        .order_by(OptionsContract.strike_price)
    )
    contracts_result = await db.execute(contracts_query)
    contracts = contracts_result.scalars().all()

    # Organize by strike price
    strikes_data: dict[float, StrikeData] = {}
    total_ce_oi = 0
    total_pe_oi = 0
    underlying_price = None

    for contract in contracts:
        strike = float(contract.strike_price)

        if strike not in strikes_data:
            strikes_data[strike] = StrikeData(strike_price=contract.strike_price)

        # Get latest flow data for this contract
        flow_query = (
            select(OptionsFlow)
            .where(OptionsFlow.contract_id == contract.id)
            .order_by(OptionsFlow.timestamp.desc())
            .limit(1)
        )
        flow_result = await db.execute(flow_query)
        flow = flow_result.scalar_one_or_none()

        if flow:
            if underlying_price is None and flow.underlying_price:
                underlying_price = flow.underlying_price

            if contract.option_type == "CE":
                strikes_data[strike].ce_ltp = flow.ltp
                strikes_data[strike].ce_volume = flow.volume
                strikes_data[strike].ce_oi = flow.oi
                strikes_data[strike].ce_oi_change = flow.oi_change
                strikes_data[strike].ce_iv = flow.iv
                strikes_data[strike].ce_bid = flow.bid_price
                strikes_data[strike].ce_ask = flow.ask_price
                strikes_data[strike].ce_delta = flow.delta
                strikes_data[strike].ce_gamma = flow.gamma
                if flow.oi:
                    total_ce_oi += flow.oi
            else:  # PE
                strikes_data[strike].pe_ltp = flow.ltp
                strikes_data[strike].pe_volume = flow.volume
                strikes_data[strike].pe_oi = flow.oi
                strikes_data[strike].pe_oi_change = flow.oi_change
                strikes_data[strike].pe_iv = flow.iv
                strikes_data[strike].pe_bid = flow.bid_price
                strikes_data[strike].pe_ask = flow.ask_price
                strikes_data[strike].pe_delta = flow.delta
                strikes_data[strike].pe_gamma = flow.gamma
                if flow.oi:
                    total_pe_oi += flow.oi

    # Calculate PCR
    pcr = total_pe_oi / total_ce_oi if total_ce_oi > 0 else 0

    # TODO: Calculate max pain (requires more complex calculation)
    max_pain = None

    from datetime import datetime

    return OptionsChainResponse(
        symbol=symbol,
        expiry_date=expiry,
        underlying_price=underlying_price or 0,
        timestamp=datetime.utcnow(),
        total_ce_oi=total_ce_oi,
        total_pe_oi=total_pe_oi,
        pcr=pcr,
        max_pain=max_pain,
        strikes=sorted(strikes_data.values(), key=lambda x: x.strike_price),
    )


@router.get("/expiries/{symbol}")
async def get_expiries(
    symbol: str,
    db: AsyncSession = Depends(get_db),
) -> list[date]:
    """
    Get available expiry dates for a symbol.

    Returns list of expiry dates (future only) sorted ascending.
    """
    symbol = symbol.upper()

    result = await db.execute(select(Symbol).where(Symbol.symbol == symbol))
    symbol_record = result.scalar_one_or_none()

    if not symbol_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Symbol {symbol} not found",
        )

    expiry_query = (
        select(OptionsContract.expiry_date)
        .where(OptionsContract.symbol_id == symbol_record.id)
        .where(OptionsContract.expiry_date >= date.today())
        .distinct()
        .order_by(OptionsContract.expiry_date)
    )

    result = await db.execute(expiry_query)
    expiries = result.scalars().all()

    return list(expiries)
