"""
Pydantic schemas for user management.
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ============== User Schemas ==============


class UserBase(BaseModel):
    """Base schema for user data."""

    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=100)


class UserCreate(UserBase):
    """Schema for creating a new user."""

    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    full_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    telegram_chat_id: Optional[str] = Field(None, max_length=50)
    preferences: Optional[dict[str, Any]] = None


class UserResponse(UserBase):
    """Schema for user response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    subscription_tier: str
    subscription_expires_at: Optional[datetime] = None
    is_active: bool
    is_verified: bool
    phone: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    preferences: Optional[dict[str, Any]] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None


class UserPublicResponse(BaseModel):
    """Schema for public user info (minimal)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: Optional[str] = None
    subscription_tier: str


# ============== Alert Schemas ==============


class AlertCondition(BaseModel):
    """Schema for alert condition configuration."""

    field: str = Field(..., description="Field to monitor (volume, oi, ltp, etc.)")
    comparison: str = Field(
        ..., pattern="^(gt|gte|lt|lte|eq|pct_change)$", description="Comparison operator"
    )
    value: float = Field(..., description="Threshold value")
    value_type: str = Field(
        default="absolute", pattern="^(absolute|multiplier|percentage)$"
    )


class UserAlertCreate(BaseModel):
    """Schema for creating a new alert."""

    name: str = Field(..., min_length=1, max_length=100)
    symbol: Optional[str] = Field(None, max_length=20, description="Symbol to monitor (None = all)")
    alert_type: str = Field(
        ...,
        pattern="^(VOLUME_SPIKE|PREMIUM_THRESHOLD|OI_CHANGE|PRICE_LEVEL|UNUSUAL_ACTIVITY)$",
    )
    conditions: dict[str, Any] = Field(..., description="Alert conditions")
    notification_channels: dict[str, bool] = Field(
        default_factory=lambda: {"email": True, "telegram": False, "push": False}
    )


class UserAlertUpdate(BaseModel):
    """Schema for updating an alert."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    symbol: Optional[str] = Field(None, max_length=20)
    conditions: Optional[dict[str, Any]] = None
    notification_channels: Optional[dict[str, bool]] = None
    is_active: Optional[bool] = None


class UserAlertResponse(BaseModel):
    """Schema for alert response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    symbol: Optional[str] = None
    alert_type: str
    conditions: dict[str, Any]
    notification_channels: dict[str, bool]
    is_active: bool
    trigger_count: int
    last_triggered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ============== Watchlist Schemas ==============


class UserWatchlistCreate(BaseModel):
    """Schema for creating a new watchlist."""

    name: str = Field(..., min_length=1, max_length=100)
    symbols: list[str] = Field(default_factory=list, max_length=50)
    settings: Optional[dict[str, Any]] = None


class UserWatchlistUpdate(BaseModel):
    """Schema for updating a watchlist."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    symbols: Optional[list[str]] = Field(None, max_length=50)
    settings: Optional[dict[str, Any]] = None


class UserWatchlistResponse(BaseModel):
    """Schema for watchlist response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    symbols: list[str]
    settings: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
