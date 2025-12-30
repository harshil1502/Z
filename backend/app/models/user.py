"""
Database models for user management.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    """
    Represents a platform user.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(100))

    # Subscription
    subscription_tier: Mapped[str] = mapped_column(
        String(20), default="free"
    )  # free, pro, elite, institutional
    subscription_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Account Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)

    # Profile
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    telegram_chat_id: Mapped[Optional[str]] = mapped_column(String(50))
    preferences: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    alerts: Mapped[list["UserAlert"]] = relationship(
        "UserAlert", back_populates="user", cascade="all, delete-orphan"
    )
    watchlists: Mapped[list["UserWatchlist"]] = relationship(
        "UserWatchlist", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(email={self.email}, tier={self.subscription_tier})>"


class UserAlert(Base):
    """
    Represents a custom alert configured by a user.
    """

    __tablename__ = "user_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Alert Configuration
    symbol: Mapped[Optional[str]] = mapped_column(String(20))  # None = all symbols
    alert_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # VOLUME_SPIKE, PREMIUM_THRESHOLD, OI_CHANGE, PRICE_LEVEL

    # Conditions stored as JSON for flexibility
    # Example: {"threshold": 3.0, "comparison": "gt", "value_type": "multiplier"}
    conditions: Mapped[dict] = mapped_column(JSONB, nullable=False)

    # Notification preferences
    # Example: {"email": true, "telegram": true, "push": false}
    notification_channels: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    trigger_count: Mapped[int] = mapped_column(Integer, default=0)
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<UserAlert(name={self.name}, type={self.alert_type})>"


class UserWatchlist(Base):
    """
    Represents a user's custom watchlist of symbols.
    """

    __tablename__ = "user_watchlists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    # List of symbols as JSON array
    # Example: ["NIFTY", "BANKNIFTY", "RELIANCE", "TCS"]
    symbols: Mapped[list] = mapped_column(JSONB, default=list)

    # Display preferences
    settings: Mapped[Optional[dict]] = mapped_column(JSONB)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="watchlists")

    def __repr__(self) -> str:
        return f"<UserWatchlist(name={self.name}, count={len(self.symbols)})>"
