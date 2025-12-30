"""
Alert management routes.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User, UserAlert
from app.schemas.user import (
    UserAlertCreate,
    UserAlertResponse,
    UserAlertUpdate,
)

router = APIRouter()


@router.get("", response_model=list[UserAlertResponse])
async def get_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_only: bool = Query(False, description="Show only active alerts"),
) -> list[UserAlertResponse]:
    """
    Get all alerts for the current user.
    """
    query = select(UserAlert).where(UserAlert.user_id == current_user.id)

    if active_only:
        query = query.where(UserAlert.is_active == True)

    query = query.order_by(UserAlert.created_at.desc())

    result = await db.execute(query)
    alerts = result.scalars().all()

    return [UserAlertResponse.model_validate(a) for a in alerts]


@router.post("", response_model=UserAlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_data: UserAlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserAlert:
    """
    Create a new alert.

    Alert types:
    - VOLUME_SPIKE: Triggered when volume exceeds threshold multiplier
    - PREMIUM_THRESHOLD: Triggered when premium value exceeds threshold
    - OI_CHANGE: Triggered on significant OI changes
    - PRICE_LEVEL: Triggered when underlying reaches price level
    - UNUSUAL_ACTIVITY: Triggered on any unusual activity detection
    """
    # Check subscription limits
    # Free tier: 3 alerts, Pro: 20, Elite: unlimited
    tier_limits = {"free": 3, "pro": 20, "elite": 100, "institutional": 1000}
    max_alerts = tier_limits.get(current_user.subscription_tier, 3)

    existing_count_query = select(UserAlert).where(UserAlert.user_id == current_user.id)
    existing_result = await db.execute(existing_count_query)
    existing_count = len(existing_result.scalars().all())

    if existing_count >= max_alerts:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Alert limit reached for {current_user.subscription_tier} tier ({max_alerts} alerts)",
        )

    alert = UserAlert(
        user_id=current_user.id,
        name=alert_data.name,
        symbol=alert_data.symbol.upper() if alert_data.symbol else None,
        alert_type=alert_data.alert_type,
        conditions=alert_data.conditions,
        notification_channels=alert_data.notification_channels,
        is_active=True,
    )

    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    return alert


@router.get("/{alert_id}", response_model=UserAlertResponse)
async def get_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserAlert:
    """
    Get a specific alert by ID.
    """
    result = await db.execute(
        select(UserAlert).where(
            UserAlert.id == alert_id,
            UserAlert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    return alert


@router.put("/{alert_id}", response_model=UserAlertResponse)
async def update_alert(
    alert_id: int,
    alert_data: UserAlertUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserAlert:
    """
    Update an existing alert.
    """
    result = await db.execute(
        select(UserAlert).where(
            UserAlert.id == alert_id,
            UserAlert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    # Update fields
    update_data = alert_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if field == "symbol" and value:
                value = value.upper()
            setattr(alert, field, value)

    await db.commit()
    await db.refresh(alert)

    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Delete an alert.
    """
    result = await db.execute(
        select(UserAlert).where(
            UserAlert.id == alert_id,
            UserAlert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    await db.delete(alert)
    await db.commit()


@router.post("/{alert_id}/toggle", response_model=UserAlertResponse)
async def toggle_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserAlert:
    """
    Toggle alert active status.
    """
    result = await db.execute(
        select(UserAlert).where(
            UserAlert.id == alert_id,
            UserAlert.user_id == current_user.id,
        )
    )
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    alert.is_active = not alert.is_active
    await db.commit()
    await db.refresh(alert)

    return alert
