"""
Options flow routes - Core real-time flow data endpoints.
"""

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.options import OptionsFlow, OptionsContract, Symbol
from app.schemas.options import (
    OptionsFlowListResponse,
    OptionsFlowResponse,
    UnusualActivityResponse,
)

router = APIRouter()


@router.get("", response_model=OptionsFlowListResponse)
async def get_options_flow(
    db: AsyncSession = Depends(get_db),
    symbol: Optional[str] = Query(None, description="Filter by symbol (e.g., NIFTY)"),
    expiry: Optional[date] = Query(None, description="Filter by expiry date"),
    option_type: Optional[str] = Query(None, pattern="^(CE|PE)$", description="Filter by option type"),
    unusual_only: bool = Query(False, description="Show only unusual activity"),
    min_volume: Optional[int] = Query(None, ge=0, description="Minimum volume filter"),
    min_oi: Optional[int] = Query(None, ge=0, description="Minimum OI filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page"),
) -> OptionsFlowListResponse:
    """
    Get real-time options flow data with filtering.

    Returns paginated list of options flow entries, sorted by timestamp (newest first).
    Each entry includes contract details, price data, volume, OI, and Greeks.
    """
    # Build base query with joins
    query = (
        select(OptionsFlow)
        .join(OptionsContract)
        .join(Symbol)
        .options(selectinload(OptionsFlow.contract).selectinload(OptionsContract.symbol_ref))
    )

    # Apply filters
    conditions = []

    if symbol:
        conditions.append(Symbol.symbol == symbol.upper())

    if expiry:
        conditions.append(OptionsContract.expiry_date == expiry)

    if option_type:
        conditions.append(OptionsContract.option_type == option_type.upper())

    if unusual_only:
        conditions.append(OptionsFlow.is_unusual == True)

    if min_volume:
        conditions.append(OptionsFlow.volume >= min_volume)

    if min_oi:
        conditions.append(OptionsFlow.oi >= min_oi)

    if conditions:
        query = query.where(and_(*conditions))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination and ordering
    query = (
        query
        .order_by(OptionsFlow.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(query)
    flows = result.scalars().all()

    # Transform to response format
    items = []
    for flow in flows:
        contract = flow.contract
        symbol_ref = contract.symbol_ref

        items.append(
            OptionsFlowResponse(
                id=flow.id,
                contract_id=flow.contract_id,
                timestamp=flow.timestamp,
                ltp=flow.ltp,
                volume=flow.volume,
                oi=flow.oi,
                oi_change=flow.oi_change,
                iv=flow.iv,
                underlying_price=flow.underlying_price,
                bid_price=flow.bid_price,
                ask_price=flow.ask_price,
                bid_qty=flow.bid_qty,
                ask_qty=flow.ask_qty,
                total_traded_value=flow.total_traded_value,
                delta=flow.delta,
                gamma=flow.gamma,
                theta=flow.theta,
                vega=flow.vega,
                is_unusual=flow.is_unusual,
                unusual_flags=flow.unusual_flags,
                symbol=symbol_ref.symbol if symbol_ref else None,
                strike_price=contract.strike_price,
                expiry_date=contract.expiry_date,
                option_type=contract.option_type,
            )
        )

    return OptionsFlowListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/unusual", response_model=list[UnusualActivityResponse])
async def get_unusual_activity(
    db: AsyncSession = Depends(get_db),
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    severity: Optional[str] = Query(None, pattern="^(LOW|MEDIUM|HIGH)$"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results"),
) -> list[UnusualActivityResponse]:
    """
    Get unusual options activity alerts.

    Returns recent unusual activity including volume spikes, large premiums,
    and significant OI changes. Useful for identifying potential informed trading.
    """
    query = (
        select(OptionsFlow)
        .join(OptionsContract)
        .join(Symbol)
        .where(OptionsFlow.is_unusual == True)
        .options(selectinload(OptionsFlow.contract).selectinload(OptionsContract.symbol_ref))
    )

    if symbol:
        query = query.where(Symbol.symbol == symbol.upper())

    if severity:
        # Filter by severity in unusual_flags JSON
        query = query.where(
            OptionsFlow.unusual_flags["severity"].astext == severity
        )

    query = query.order_by(OptionsFlow.timestamp.desc()).limit(limit)

    result = await db.execute(query)
    flows = result.scalars().all()

    items = []
    for flow in flows:
        contract = flow.contract
        symbol_ref = contract.symbol_ref
        flags = flow.unusual_flags or {}

        items.append(
            UnusualActivityResponse(
                id=flow.id,
                symbol=symbol_ref.symbol if symbol_ref else "UNKNOWN",
                strike_price=contract.strike_price,
                expiry_date=contract.expiry_date,
                option_type=contract.option_type,
                timestamp=flow.timestamp,
                activity_type=flags.get("type", "UNKNOWN"),
                severity=flags.get("severity", "LOW"),
                current_value=flags.get("current_value", 0),
                baseline_value=flags.get("baseline_value", 0),
                change_percentage=flags.get("change_pct"),
                z_score=flags.get("z_score"),
                ltp=flow.ltp,
                underlying_price=flow.underlying_price,
                premium_value=flags.get("premium_value"),
            )
        )

    return items


@router.get("/summary")
async def get_flow_summary(
    db: AsyncSession = Depends(get_db),
    symbol: str = Query(..., description="Symbol (e.g., NIFTY, BANKNIFTY)"),
) -> dict:
    """
    Get summary statistics for options flow.

    Includes total volume, OI, sentiment indicators, and key levels.
    """
    # This would aggregate data from recent flow entries
    # Placeholder implementation - full implementation would query and aggregate
    return {
        "symbol": symbol.upper(),
        "timestamp": datetime.utcnow(),
        "total_ce_volume": 0,
        "total_pe_volume": 0,
        "total_ce_oi": 0,
        "total_pe_oi": 0,
        "volume_pcr": 0.0,
        "oi_pcr": 0.0,
        "net_ce_oi_change": 0,
        "net_pe_oi_change": 0,
        "top_ce_strikes": [],
        "top_pe_strikes": [],
        "unusual_count_today": 0,
    }
