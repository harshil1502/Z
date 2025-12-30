"""
Utility helper functions.
"""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Union

import pytz

# Indian Standard Time
IST = pytz.timezone("Asia/Kolkata")

# Market hours
MARKET_OPEN = time(9, 15)
MARKET_CLOSE = time(15, 30)

# Trading holidays (partial list - should be updated annually)
TRADING_HOLIDAYS_2024 = {
    date(2024, 1, 26),   # Republic Day
    date(2024, 3, 8),    # Maha Shivaratri
    date(2024, 3, 25),   # Holi
    date(2024, 3, 29),   # Good Friday
    date(2024, 4, 11),   # Eid-ul-Fitr
    date(2024, 4, 17),   # Ram Navami
    date(2024, 4, 21),   # Mahavir Jayanti
    date(2024, 5, 23),   # Buddha Purnima
    date(2024, 6, 17),   # Eid-ul-Adha
    date(2024, 7, 17),   # Muharram
    date(2024, 8, 15),   # Independence Day
    date(2024, 10, 2),   # Gandhi Jayanti
    date(2024, 11, 1),   # Diwali
    date(2024, 11, 15),  # Guru Nanak Jayanti
    date(2024, 12, 25),  # Christmas
}


def get_ist_now() -> datetime:
    """Get current time in IST."""
    return datetime.now(IST)


def is_market_hours(dt: datetime = None) -> bool:
    """
    Check if given datetime is within market hours.

    Args:
        dt: Datetime to check (defaults to current IST time)

    Returns:
        True if within market hours, False otherwise
    """
    if dt is None:
        dt = get_ist_now()

    # Convert to IST if not already
    if dt.tzinfo is None:
        dt = IST.localize(dt)
    elif dt.tzinfo != IST:
        dt = dt.astimezone(IST)

    # Check if weekend
    if dt.weekday() >= 5:  # Saturday = 5, Sunday = 6
        return False

    # Check if trading holiday
    if dt.date() in TRADING_HOLIDAYS_2024:
        return False

    # Check time
    current_time = dt.time()
    return MARKET_OPEN <= current_time <= MARKET_CLOSE


def get_next_market_open() -> datetime:
    """
    Get the next market opening time.

    Returns:
        Datetime of next market open
    """
    now = get_ist_now()
    target = now.replace(hour=9, minute=15, second=0, microsecond=0)

    # If market is currently open or it's after market hours today
    if now.time() >= MARKET_OPEN:
        target = target + timedelta(days=1)

    # Skip weekends
    while target.weekday() >= 5 or target.date() in TRADING_HOLIDAYS_2024:
        target = target + timedelta(days=1)

    return target


def calculate_time_to_expiry(expiry_date: date, from_date: date = None) -> int:
    """
    Calculate days to expiry.

    Args:
        expiry_date: Option expiry date
        from_date: Reference date (defaults to today)

    Returns:
        Number of days to expiry
    """
    if from_date is None:
        from_date = get_ist_now().date()

    return max((expiry_date - from_date).days, 0)


def calculate_time_to_expiry_years(expiry_date: date, from_date: date = None) -> float:
    """
    Calculate time to expiry in years (for Black-Scholes).

    Args:
        expiry_date: Option expiry date
        from_date: Reference date (defaults to today)

    Returns:
        Time to expiry in years
    """
    days = calculate_time_to_expiry(expiry_date, from_date)
    return days / 365.0


def format_currency_inr(
    amount: Union[int, float, Decimal],
    include_symbol: bool = True,
    abbreviate: bool = False,
) -> str:
    """
    Format amount as Indian currency.

    Args:
        amount: Amount to format
        include_symbol: Include ₹ symbol
        abbreviate: Use L/Cr abbreviations for large numbers

    Returns:
        Formatted currency string
    """
    amount = float(amount)
    symbol = "₹" if include_symbol else ""

    if abbreviate:
        if abs(amount) >= 10_000_000:  # 1 Crore
            return f"{symbol}{amount / 10_000_000:.2f} Cr"
        elif abs(amount) >= 100_000:  # 1 Lakh
            return f"{symbol}{amount / 100_000:.2f} L"

    # Indian number formatting (with commas)
    is_negative = amount < 0
    amount = abs(amount)

    # Split into parts
    integer_part = int(amount)
    decimal_part = amount - integer_part

    # Format integer part with Indian comma system
    s = str(integer_part)
    if len(s) > 3:
        last_three = s[-3:]
        rest = s[:-3]
        # Add commas every 2 digits after first 3
        formatted_rest = ",".join([rest[max(0, i-2):i] for i in range(len(rest), 0, -2)][::-1])
        s = formatted_rest + "," + last_three
    else:
        s = s

    # Add decimal part
    if decimal_part > 0:
        s = s + f".{int(decimal_part * 100):02d}"

    # Add sign and symbol
    if is_negative:
        return f"-{symbol}{s}"
    return f"{symbol}{s}"


def parse_nse_date(date_str: str) -> date:
    """
    Parse NSE date format.

    Args:
        date_str: Date string in NSE format (e.g., "28-Dec-2024")

    Returns:
        Parsed date object
    """
    from datetime import datetime

    formats = ["%d-%b-%Y", "%d-%m-%Y", "%Y-%m-%d"]

    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue

    raise ValueError(f"Unable to parse date: {date_str}")


def get_lot_size(symbol: str) -> int:
    """
    Get lot size for a symbol.

    Args:
        symbol: Trading symbol

    Returns:
        Lot size
    """
    # Standard lot sizes (as of 2024 - should be updated)
    lot_sizes = {
        "NIFTY": 50,
        "BANKNIFTY": 15,
        "FINNIFTY": 40,
        "MIDCPNIFTY": 75,
        # Add stock lot sizes as needed
        "RELIANCE": 250,
        "TCS": 150,
        "INFY": 300,
        "HDFCBANK": 550,
        "ICICIBANK": 700,
    }

    return lot_sizes.get(symbol.upper(), 1)


# Import timedelta for get_next_market_open
from datetime import timedelta
