"""
Market status and indices routes.
"""

from datetime import datetime, date, time
from typing import Optional

import pytz
from fastapi import APIRouter

router = APIRouter()

# Indian Standard Time
IST = pytz.timezone("Asia/Kolkata")

# Market hours
MARKET_OPEN = time(9, 15)
MARKET_CLOSE = time(15, 30)
PRE_OPEN_START = time(9, 0)
PRE_OPEN_END = time(9, 8)

# Trading holidays 2024-2025 (partial list)
TRADING_HOLIDAYS = {
    date(2024, 1, 26),   # Republic Day
    date(2024, 3, 8),    # Maha Shivaratri
    date(2024, 3, 25),   # Holi
    date(2024, 3, 29),   # Good Friday
    date(2024, 8, 15),   # Independence Day
    date(2024, 10, 2),   # Gandhi Jayanti
    date(2024, 11, 1),   # Diwali
    date(2024, 12, 25),  # Christmas
    date(2025, 1, 26),   # Republic Day
    date(2025, 3, 14),   # Holi
    date(2025, 4, 18),   # Good Friday
    date(2025, 8, 15),   # Independence Day
    date(2025, 10, 2),   # Gandhi Jayanti
    date(2025, 12, 25),  # Christmas
}


def get_market_status() -> dict:
    """
    Get current market status based on IST time.
    """
    now = datetime.now(IST)
    current_date = now.date()
    current_time = now.time()

    # Check if weekend
    if now.weekday() >= 5:
        return {
            "status": "CLOSED",
            "reason": "Weekend",
            "is_trading_day": False,
        }

    # Check if holiday
    if current_date in TRADING_HOLIDAYS:
        return {
            "status": "CLOSED",
            "reason": "Trading Holiday",
            "is_trading_day": False,
        }

    # Check time-based status
    if current_time < PRE_OPEN_START:
        return {
            "status": "CLOSED",
            "reason": "Pre-market",
            "is_trading_day": True,
            "next_event": "Pre-open session",
            "next_event_time": datetime.combine(current_date, PRE_OPEN_START).isoformat(),
        }
    elif PRE_OPEN_START <= current_time < PRE_OPEN_END:
        return {
            "status": "PRE_OPEN",
            "reason": "Pre-open session",
            "is_trading_day": True,
            "next_event": "Market open",
            "next_event_time": datetime.combine(current_date, MARKET_OPEN).isoformat(),
        }
    elif PRE_OPEN_END <= current_time < MARKET_OPEN:
        return {
            "status": "PRE_OPEN_END",
            "reason": "Pre-open session ended, waiting for market open",
            "is_trading_day": True,
            "next_event": "Market open",
            "next_event_time": datetime.combine(current_date, MARKET_OPEN).isoformat(),
        }
    elif MARKET_OPEN <= current_time <= MARKET_CLOSE:
        return {
            "status": "OPEN",
            "reason": "Normal trading session",
            "is_trading_day": True,
            "next_event": "Market close",
            "next_event_time": datetime.combine(current_date, MARKET_CLOSE).isoformat(),
        }
    else:
        return {
            "status": "CLOSED",
            "reason": "After market hours",
            "is_trading_day": True,
            "next_event": "Next trading day",
        }


@router.get("/status")
async def market_status():
    """
    Get current market status.

    Returns market state (OPEN, CLOSED, PRE_OPEN) with timing information.
    """
    now = datetime.now(IST)
    status = get_market_status()

    return {
        **status,
        "timestamp": now.isoformat(),
        "timezone": "Asia/Kolkata",
        "market_hours": {
            "pre_open_start": "09:00",
            "pre_open_end": "09:08",
            "market_open": "09:15",
            "market_close": "15:30",
        },
    }


@router.get("/indices")
async def get_indices():
    """
    Get current index values.

    Note: This returns mock data. In production, this would fetch from NSE.
    """
    return {
        "timestamp": datetime.now(IST).isoformat(),
        "indices": [
            {
                "symbol": "NIFTY",
                "name": "NIFTY 50",
                "last_price": 23500.25,
                "change": 125.50,
                "change_percent": 0.54,
                "open": 23400.00,
                "high": 23550.00,
                "low": 23380.00,
                "prev_close": 23374.75,
            },
            {
                "symbol": "BANKNIFTY",
                "name": "NIFTY BANK",
                "last_price": 51000.50,
                "change": -150.25,
                "change_percent": -0.29,
                "open": 51100.00,
                "high": 51200.00,
                "low": 50900.00,
                "prev_close": 51150.75,
            },
            {
                "symbol": "FINNIFTY",
                "name": "NIFTY FINANCIAL SERVICES",
                "last_price": 22000.00,
                "change": 85.00,
                "change_percent": 0.39,
                "open": 21950.00,
                "high": 22050.00,
                "low": 21900.00,
                "prev_close": 21915.00,
            },
        ],
    }


@router.get("/holidays")
async def get_trading_holidays(year: Optional[int] = None):
    """
    Get trading holidays for a given year.
    """
    if year is None:
        year = date.today().year

    holidays = [h for h in TRADING_HOLIDAYS if h.year == year]

    return {
        "year": year,
        "holidays": [
            {
                "date": h.isoformat(),
                "day": h.strftime("%A"),
            }
            for h in sorted(holidays)
        ],
        "total": len(holidays),
    }


@router.get("/expiries")
async def get_upcoming_expiries():
    """
    Get upcoming options expiry dates.

    Returns weekly and monthly expiry dates.
    """
    from datetime import timedelta

    today = date.today()
    expiries = []

    # Find upcoming Thursdays (weekly expiries)
    current = today
    while len(expiries) < 12:
        days_until_thursday = (3 - current.weekday()) % 7
        if days_until_thursday == 0 and current <= today:
            days_until_thursday = 7
        next_thursday = current + timedelta(days=days_until_thursday)

        # Skip holidays
        if next_thursday not in TRADING_HOLIDAYS:
            expiries.append({
                "date": next_thursday.isoformat(),
                "day": next_thursday.strftime("%A"),
                "type": "weekly",
                "days_to_expiry": (next_thursday - today).days,
            })

        current = next_thursday + timedelta(days=1)

    return {
        "timestamp": datetime.now(IST).isoformat(),
        "expiries": expiries,
    }
