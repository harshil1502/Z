"""
User management routes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User, UserWatchlist
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    UserWatchlistCreate,
    UserWatchlistResponse,
)

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current user's profile.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Update current user's profile.
    """
    update_data = user_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    return current_user


# ============== Watchlist Routes ==============


@router.get("/me/watchlists", response_model=list[UserWatchlistResponse])
async def get_watchlists(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserWatchlistResponse]:
    """
    Get all watchlists for the current user.
    """
    result = await db.execute(
        select(UserWatchlist)
        .where(UserWatchlist.user_id == current_user.id)
        .order_by(UserWatchlist.created_at.desc())
    )
    watchlists = result.scalars().all()

    return [UserWatchlistResponse.model_validate(w) for w in watchlists]


@router.post("/me/watchlists", response_model=UserWatchlistResponse, status_code=status.HTTP_201_CREATED)
async def create_watchlist(
    watchlist_data: UserWatchlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserWatchlist:
    """
    Create a new watchlist.
    """
    # Check limits (5 watchlists for free, 20 for pro)
    tier_limits = {"free": 5, "pro": 20, "elite": 50, "institutional": 100}
    max_watchlists = tier_limits.get(current_user.subscription_tier, 5)

    existing_result = await db.execute(
        select(UserWatchlist).where(UserWatchlist.user_id == current_user.id)
    )
    existing_count = len(existing_result.scalars().all())

    if existing_count >= max_watchlists:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Watchlist limit reached ({max_watchlists})",
        )

    watchlist = UserWatchlist(
        user_id=current_user.id,
        name=watchlist_data.name,
        symbols=[s.upper() for s in watchlist_data.symbols],
        settings=watchlist_data.settings,
    )

    db.add(watchlist)
    await db.commit()
    await db.refresh(watchlist)

    return watchlist


@router.get("/me/watchlists/{watchlist_id}", response_model=UserWatchlistResponse)
async def get_watchlist(
    watchlist_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserWatchlist:
    """
    Get a specific watchlist.
    """
    result = await db.execute(
        select(UserWatchlist).where(
            UserWatchlist.id == watchlist_id,
            UserWatchlist.user_id == current_user.id,
        )
    )
    watchlist = result.scalar_one_or_none()

    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found",
        )

    return watchlist


@router.put("/me/watchlists/{watchlist_id}", response_model=UserWatchlistResponse)
async def update_watchlist(
    watchlist_id: int,
    watchlist_data: UserWatchlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserWatchlist:
    """
    Update a watchlist.
    """
    result = await db.execute(
        select(UserWatchlist).where(
            UserWatchlist.id == watchlist_id,
            UserWatchlist.user_id == current_user.id,
        )
    )
    watchlist = result.scalar_one_or_none()

    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found",
        )

    watchlist.name = watchlist_data.name
    watchlist.symbols = [s.upper() for s in watchlist_data.symbols]
    if watchlist_data.settings:
        watchlist.settings = watchlist_data.settings

    await db.commit()
    await db.refresh(watchlist)

    return watchlist


@router.delete("/me/watchlists/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watchlist(
    watchlist_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Delete a watchlist.
    """
    result = await db.execute(
        select(UserWatchlist).where(
            UserWatchlist.id == watchlist_id,
            UserWatchlist.user_id == current_user.id,
        )
    )
    watchlist = result.scalar_one_or_none()

    if not watchlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found",
        )

    await db.delete(watchlist)
    await db.commit()
