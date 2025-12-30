#!/usr/bin/env python3
"""
Database seeder script for Z - Financial Intel.

Populates the database with sample data for development and testing.
Run with: python -m scripts.seed_database
"""

import asyncio
import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Add parent directory to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.core.database import Base
from app.models.options import Symbol, OptionsContract, OptionsFlow, FIIDIIData
from app.models.user import User, UserAlert, UserWatchlist
from app.core.security import get_password_hash


# Sample data definitions
INDEX_SYMBOLS = [
    {"symbol": "NIFTY", "name": "NIFTY 50", "exchange": "NSE", "segment": "INDEX", "lot_size": 50},
    {"symbol": "BANKNIFTY", "name": "NIFTY BANK", "exchange": "NSE", "segment": "INDEX", "lot_size": 15},
    {"symbol": "FINNIFTY", "name": "NIFTY FINANCIAL SERVICES", "exchange": "NSE", "segment": "INDEX", "lot_size": 40},
    {"symbol": "MIDCPNIFTY", "name": "NIFTY MIDCAP SELECT", "exchange": "NSE", "segment": "INDEX", "lot_size": 75},
]

STOCK_SYMBOLS = [
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "exchange": "NSE", "segment": "EQUITY", "lot_size": 250},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "exchange": "NSE", "segment": "EQUITY", "lot_size": 150},
    {"symbol": "INFY", "name": "Infosys Ltd", "exchange": "NSE", "segment": "EQUITY", "lot_size": 300},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "exchange": "NSE", "segment": "EQUITY", "lot_size": 550},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "exchange": "NSE", "segment": "EQUITY", "lot_size": 700},
    {"symbol": "SBIN", "name": "State Bank of India", "exchange": "NSE", "segment": "EQUITY", "lot_size": 750},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "exchange": "NSE", "segment": "EQUITY", "lot_size": 475},
    {"symbol": "ITC", "name": "ITC Ltd", "exchange": "NSE", "segment": "EQUITY", "lot_size": 1600},
]

# Current approximate prices
CURRENT_PRICES = {
    "NIFTY": 23500,
    "BANKNIFTY": 51000,
    "FINNIFTY": 22000,
    "MIDCPNIFTY": 12500,
    "RELIANCE": 2450,
    "TCS": 3900,
    "INFY": 1850,
    "HDFCBANK": 1700,
    "ICICIBANK": 1050,
    "SBIN": 810,
    "BHARTIARTL": 1680,
    "ITC": 475,
}


def get_strike_range(symbol: str, price: float) -> list[float]:
    """Generate appropriate strike prices for a symbol."""
    if symbol in ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"]:
        # Index options have specific strike intervals
        if symbol == "NIFTY":
            interval = 50
            num_strikes = 40  # 20 each side
        elif symbol == "BANKNIFTY":
            interval = 100
            num_strikes = 40
        else:
            interval = 50
            num_strikes = 30

        # Round to nearest strike
        atm_strike = round(price / interval) * interval
        strikes = []
        for i in range(-num_strikes // 2, num_strikes // 2 + 1):
            strikes.append(atm_strike + (i * interval))
        return strikes
    else:
        # Stock options
        interval = max(10, round(price * 0.01))  # ~1% intervals
        num_strikes = 20
        atm_strike = round(price / interval) * interval
        strikes = []
        for i in range(-num_strikes // 2, num_strikes // 2 + 1):
            strikes.append(atm_strike + (i * interval))
        return strikes


def get_expiry_dates() -> list[date]:
    """Generate next few expiry dates (Thursdays for weekly, last Thursday for monthly)."""
    today = date.today()
    expiries = []

    # Find next 8 Thursdays (weekly expiries)
    current = today
    while len(expiries) < 8:
        days_until_thursday = (3 - current.weekday()) % 7
        if days_until_thursday == 0 and current <= today:
            days_until_thursday = 7
        next_thursday = current + timedelta(days=days_until_thursday)
        if next_thursday not in expiries:
            expiries.append(next_thursday)
        current = next_thursday + timedelta(days=1)

    return sorted(expiries)


def generate_option_price(
    strike: float,
    spot: float,
    option_type: str,
    days_to_expiry: int,
) -> dict:
    """Generate realistic option price data."""
    # Basic intrinsic value
    if option_type == "CE":
        intrinsic = max(0, spot - strike)
        moneyness = spot / strike
    else:
        intrinsic = max(0, strike - spot)
        moneyness = strike / spot

    # Time value (decays with time)
    time_value = max(0, spot * 0.02 * (days_to_expiry / 30) ** 0.5)

    # Adjust based on moneyness
    if 0.95 <= moneyness <= 1.05:  # ATM
        premium_multiplier = 1.0
        iv = random.uniform(12, 18)
    elif option_type == "CE" and moneyness > 1.05:  # ITM Call
        premium_multiplier = 0.9
        iv = random.uniform(10, 14)
    elif option_type == "PE" and moneyness > 1.05:  # ITM Put
        premium_multiplier = 0.9
        iv = random.uniform(10, 14)
    else:  # OTM
        premium_multiplier = 0.7
        iv = random.uniform(14, 22)

    ltp = max(0.5, intrinsic + time_value * premium_multiplier + random.uniform(-2, 2))

    # Volume and OI generation
    base_volume = random.randint(100, 50000)
    base_oi = random.randint(1000, 500000)

    # ATM options have higher volume/OI
    if 0.97 <= moneyness <= 1.03:
        base_volume *= 3
        base_oi *= 2

    # Calculate Greeks (simplified)
    if option_type == "CE":
        delta = max(0.01, min(0.99, 0.5 + (spot - strike) / (spot * 0.1)))
    else:
        delta = max(-0.99, min(-0.01, -0.5 + (spot - strike) / (spot * 0.1)))

    gamma = 0.001 * (1 - abs(delta - 0.5) * 2)
    theta = -ltp * 0.02 / max(1, days_to_expiry)
    vega = ltp * 0.01

    return {
        "ltp": round(ltp, 2),
        "bid_price": round(ltp * 0.98, 2),
        "ask_price": round(ltp * 1.02, 2),
        "volume": base_volume,
        "oi": base_oi,
        "oi_change": random.randint(-base_oi // 10, base_oi // 10),
        "iv": round(iv, 2),
        "delta": round(delta, 4),
        "gamma": round(gamma, 6),
        "theta": round(theta, 4),
        "vega": round(vega, 4),
    }


async def seed_symbols(session: AsyncSession) -> dict[str, Symbol]:
    """Seed symbol data."""
    print("Seeding symbols...")
    symbols = {}

    for symbol_data in INDEX_SYMBOLS + STOCK_SYMBOLS:
        # Check if exists
        result = await session.execute(
            select(Symbol).where(Symbol.symbol == symbol_data["symbol"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            symbols[symbol_data["symbol"]] = existing
        else:
            symbol = Symbol(**symbol_data, is_active=True)
            session.add(symbol)
            symbols[symbol_data["symbol"]] = symbol

    await session.commit()

    # Refresh to get IDs
    for symbol in symbols.values():
        await session.refresh(symbol)

    print(f"  Created/loaded {len(symbols)} symbols")
    return symbols


async def seed_contracts(
    session: AsyncSession,
    symbols: dict[str, Symbol],
) -> dict[str, list[OptionsContract]]:
    """Seed options contracts."""
    print("Seeding options contracts...")
    contracts = {}
    expiries = get_expiry_dates()
    total_contracts = 0

    for symbol_name, symbol in symbols.items():
        if symbol_name not in CURRENT_PRICES:
            continue

        price = CURRENT_PRICES[symbol_name]
        strikes = get_strike_range(symbol_name, price)
        contracts[symbol_name] = []

        for expiry in expiries[:4]:  # Use first 4 expiries
            for strike in strikes:
                for option_type in ["CE", "PE"]:
                    # Check if exists
                    result = await session.execute(
                        select(OptionsContract).where(
                            OptionsContract.symbol_id == symbol.id,
                            OptionsContract.strike_price == Decimal(str(strike)),
                            OptionsContract.expiry_date == expiry,
                            OptionsContract.option_type == option_type,
                        )
                    )
                    existing = result.scalar_one_or_none()

                    if existing:
                        contracts[symbol_name].append(existing)
                    else:
                        contract = OptionsContract(
                            symbol_id=symbol.id,
                            strike_price=Decimal(str(strike)),
                            expiry_date=expiry,
                            option_type=option_type,
                            contract_symbol=f"{symbol_name}{expiry.strftime('%d%b%y').upper()}{int(strike)}{option_type}",
                        )
                        session.add(contract)
                        contracts[symbol_name].append(contract)
                        total_contracts += 1

    await session.commit()
    print(f"  Created {total_contracts} contracts")
    return contracts


async def seed_flow_data(
    session: AsyncSession,
    symbols: dict[str, Symbol],
    contracts: dict[str, list[OptionsContract]],
) -> None:
    """Seed options flow data."""
    print("Seeding options flow data...")
    total_flows = 0
    today = date.today()

    for symbol_name, contract_list in contracts.items():
        if symbol_name not in CURRENT_PRICES:
            continue

        spot = CURRENT_PRICES[symbol_name]

        # Generate flow data for recent timestamps
        for contract in contract_list[:50]:  # Limit to avoid too much data
            await session.refresh(contract)

            days_to_expiry = (contract.expiry_date - today).days
            if days_to_expiry < 0:
                continue

            # Generate price data
            price_data = generate_option_price(
                float(contract.strike_price),
                spot,
                contract.option_type,
                days_to_expiry,
            )

            # Check if unusual
            is_unusual = random.random() < 0.05  # 5% chance
            unusual_flags = None
            if is_unusual:
                unusual_flags = {
                    "type": random.choice(["VOLUME_SPIKE", "LARGE_PREMIUM", "OI_SPIKE"]),
                    "severity": random.choice(["LOW", "MEDIUM", "HIGH"]),
                    "current_value": price_data["volume"],
                    "baseline_value": price_data["volume"] // 3,
                }

            flow = OptionsFlow(
                contract_id=contract.id,
                timestamp=datetime.utcnow() - timedelta(minutes=random.randint(0, 60)),
                ltp=Decimal(str(price_data["ltp"])),
                bid_price=Decimal(str(price_data["bid_price"])),
                ask_price=Decimal(str(price_data["ask_price"])),
                bid_qty=random.randint(100, 10000),
                ask_qty=random.randint(100, 10000),
                volume=price_data["volume"],
                oi=price_data["oi"],
                oi_change=price_data["oi_change"],
                iv=Decimal(str(price_data["iv"])),
                delta=Decimal(str(price_data["delta"])),
                gamma=Decimal(str(price_data["gamma"])),
                theta=Decimal(str(price_data["theta"])),
                vega=Decimal(str(price_data["vega"])),
                underlying_price=Decimal(str(spot)),
                is_unusual=is_unusual,
                unusual_flags=unusual_flags,
            )
            session.add(flow)
            total_flows += 1

    await session.commit()
    print(f"  Created {total_flows} flow entries")


async def seed_fii_dii_data(session: AsyncSession) -> None:
    """Seed FII/DII data."""
    print("Seeding FII/DII data...")
    today = date.today()

    for days_ago in range(30):
        current_date = today - timedelta(days=days_ago)

        # Skip weekends
        if current_date.weekday() >= 5:
            continue

        # FII Cash
        session.add(FIIDIIData(
            date=current_date,
            category="FII",
            segment="CASH",
            buy_value=Decimal(str(random.randint(8000, 15000))),
            sell_value=Decimal(str(random.randint(8000, 15000))),
            net_value=Decimal(str(random.randint(-3000, 3000))),
            is_provisional=days_ago == 0,
        ))

        # DII Cash
        session.add(FIIDIIData(
            date=current_date,
            category="DII",
            segment="CASH",
            buy_value=Decimal(str(random.randint(5000, 10000))),
            sell_value=Decimal(str(random.randint(5000, 10000))),
            net_value=Decimal(str(random.randint(-2000, 2000))),
            is_provisional=days_ago == 0,
        ))

        # FII Index Futures
        session.add(FIIDIIData(
            date=current_date,
            category="FII",
            segment="INDEX_FUTURES",
            long_contracts=random.randint(50000, 150000),
            short_contracts=random.randint(50000, 150000),
            net_contracts=random.randint(-30000, 30000),
            is_provisional=days_ago == 0,
        ))

    await session.commit()
    print("  Created 30 days of FII/DII data")


async def seed_users(session: AsyncSession) -> list[User]:
    """Seed sample users."""
    print("Seeding users...")

    users = []
    user_data = [
        {"email": "admin@magnificentcompany.com", "full_name": "Admin User", "tier": "institutional", "superuser": True},
        {"email": "trader@example.com", "full_name": "Demo Trader", "tier": "pro", "superuser": False},
        {"email": "user@example.com", "full_name": "Free User", "tier": "free", "superuser": False},
    ]

    for data in user_data:
        result = await session.execute(
            select(User).where(User.email == data["email"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            users.append(existing)
        else:
            user = User(
                email=data["email"],
                password_hash=get_password_hash("password123"),
                full_name=data["full_name"],
                subscription_tier=data["tier"],
                is_active=True,
                is_verified=True,
                is_superuser=data["superuser"],
            )
            session.add(user)
            users.append(user)

    await session.commit()

    for user in users:
        await session.refresh(user)

    print(f"  Created/loaded {len(users)} users")
    return users


async def seed_alerts(session: AsyncSession, users: list[User]) -> None:
    """Seed sample alerts."""
    print("Seeding alerts...")

    # Create alerts for the pro user
    pro_user = next((u for u in users if u.subscription_tier == "pro"), None)
    if not pro_user:
        return

    alerts = [
        {
            "name": "NIFTY Volume Spike",
            "symbol": "NIFTY",
            "alert_type": "VOLUME_SPIKE",
            "conditions": {"field": "volume", "comparison": "gt", "value": 3, "value_type": "multiplier"},
            "notification_channels": {"email": True, "telegram": False},
        },
        {
            "name": "BANKNIFTY Large Premium",
            "symbol": "BANKNIFTY",
            "alert_type": "PREMIUM_THRESHOLD",
            "conditions": {"field": "premium", "comparison": "gt", "value": 10000000},
            "notification_channels": {"email": True, "telegram": True},
        },
        {
            "name": "All Unusual Activity",
            "symbol": None,
            "alert_type": "UNUSUAL_ACTIVITY",
            "conditions": {"severity": "HIGH"},
            "notification_channels": {"email": True},
        },
    ]

    for alert_data in alerts:
        alert = UserAlert(
            user_id=pro_user.id,
            name=alert_data["name"],
            symbol=alert_data["symbol"],
            alert_type=alert_data["alert_type"],
            conditions=alert_data["conditions"],
            notification_channels=alert_data["notification_channels"],
            is_active=True,
        )
        session.add(alert)

    await session.commit()
    print("  Created 3 sample alerts")


async def seed_watchlists(session: AsyncSession, users: list[User]) -> None:
    """Seed sample watchlists."""
    print("Seeding watchlists...")

    for user in users:
        watchlist = UserWatchlist(
            user_id=user.id,
            name="Default Watchlist",
            symbols=["NIFTY", "BANKNIFTY", "RELIANCE", "TCS", "HDFCBANK"],
        )
        session.add(watchlist)

    await session.commit()
    print(f"  Created {len(users)} watchlists")


async def main():
    """Main seeding function."""
    print("\n" + "=" * 60)
    print("Z - Financial Intel Database Seeder")
    print("=" * 60 + "\n")

    # Create engine and session
    engine = create_async_engine(settings.async_database_url, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # Seed data
            symbols = await seed_symbols(session)
            contracts = await seed_contracts(session, symbols)
            await seed_flow_data(session, symbols, contracts)
            await seed_fii_dii_data(session)
            users = await seed_users(session)
            await seed_alerts(session, users)
            await seed_watchlists(session, users)

            print("\n" + "=" * 60)
            print("Database seeding completed successfully!")
            print("=" * 60)
            print("\nSample login credentials:")
            print("  Email: trader@example.com")
            print("  Password: password123")
            print("=" * 60 + "\n")

        except Exception as e:
            print(f"\nError during seeding: {e}")
            raise

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
