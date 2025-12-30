"""
Database storage for scraped data.
Handles storing options flow data, FII/DII data, and publishing updates.
"""

import asyncio
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from scraper.config import settings

logger = structlog.get_logger(__name__)


class DatabaseStorage:
    """
    Handles database operations for storing scraped data.
    """

    def __init__(self):
        self.engine = create_async_engine(
            settings.database_url,
            echo=False,
            pool_size=5,
            max_overflow=10,
        )
        self.async_session = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize database connection."""
        if self._initialized:
            return

        # Test connection
        async with self.async_session() as session:
            await session.execute(select(1))

        self._initialized = True
        logger.info("Database storage initialized")

    async def close(self) -> None:
        """Close database connection."""
        await self.engine.dispose()
        self._initialized = False

    async def get_or_create_symbol(
        self,
        session: AsyncSession,
        symbol: str,
        exchange: str = "NSE",
        segment: str = "INDEX",
        lot_size: Optional[int] = None,
    ) -> int:
        """
        Get existing symbol or create new one.
        Returns symbol ID.
        """
        # Import here to avoid circular imports
        from scraper.storage.models import Symbol

        result = await session.execute(
            select(Symbol).where(Symbol.symbol == symbol.upper())
        )
        existing = result.scalar_one_or_none()

        if existing:
            return existing.id

        new_symbol = Symbol(
            symbol=symbol.upper(),
            exchange=exchange,
            segment=segment,
            lot_size=lot_size,
            is_active=True,
        )
        session.add(new_symbol)
        await session.flush()
        return new_symbol.id

    async def get_or_create_contract(
        self,
        session: AsyncSession,
        symbol_id: int,
        strike_price: Decimal,
        expiry_date: date,
        option_type: str,
    ) -> int:
        """
        Get existing contract or create new one.
        Returns contract ID.
        """
        from scraper.storage.models import OptionsContract

        result = await session.execute(
            select(OptionsContract).where(
                and_(
                    OptionsContract.symbol_id == symbol_id,
                    OptionsContract.strike_price == strike_price,
                    OptionsContract.expiry_date == expiry_date,
                    OptionsContract.option_type == option_type.upper(),
                )
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            return existing.id

        new_contract = OptionsContract(
            symbol_id=symbol_id,
            strike_price=strike_price,
            expiry_date=expiry_date,
            option_type=option_type.upper(),
        )
        session.add(new_contract)
        await session.flush()
        return new_contract.id

    async def store_options_flow(
        self,
        parsed_records: list[dict],
        symbol: str,
    ) -> int:
        """
        Store parsed options flow records to database.

        Args:
            parsed_records: List of parsed option records
            symbol: Symbol name

        Returns:
            Number of records stored
        """
        from scraper.storage.models import OptionsFlow

        if not parsed_records:
            return 0

        stored_count = 0

        async with self.async_session() as session:
            try:
                # Get or create symbol
                symbol_id = await self.get_or_create_symbol(
                    session,
                    symbol,
                    segment="INDEX" if symbol in settings.index_symbols else "EQUITY",
                )

                for record in parsed_records:
                    try:
                        # Get or create contract
                        contract_id = await self.get_or_create_contract(
                            session,
                            symbol_id,
                            record["strike_price"],
                            record["expiry_date"],
                            record["option_type"],
                        )

                        # Create flow record
                        flow = OptionsFlow(
                            contract_id=contract_id,
                            timestamp=record.get("timestamp", datetime.utcnow()),
                            ltp=record.get("ltp"),
                            bid_price=record.get("bid_price"),
                            ask_price=record.get("ask_price"),
                            bid_qty=record.get("bid_qty"),
                            ask_qty=record.get("ask_qty"),
                            volume=record.get("volume"),
                            oi=record.get("oi"),
                            oi_change=record.get("oi_change"),
                            iv=record.get("iv"),
                            underlying_price=record.get("underlying_price"),
                            is_unusual=record.get("is_unusual", False),
                            unusual_flags=record.get("unusual_flags"),
                        )
                        session.add(flow)
                        stored_count += 1

                    except Exception as e:
                        logger.warning(
                            "Failed to store record",
                            error=str(e),
                            record=record,
                        )

                await session.commit()
                logger.info(
                    "Stored options flow",
                    symbol=symbol,
                    count=stored_count,
                )

            except Exception as e:
                await session.rollback()
                logger.error(
                    "Failed to store options flow",
                    error=str(e),
                    symbol=symbol,
                )
                raise

        return stored_count

    async def store_fii_dii_data(
        self,
        data: dict[str, Any],
    ) -> None:
        """
        Store FII/DII data to database.
        """
        from scraper.storage.models import FIIDIIData

        async with self.async_session() as session:
            try:
                today = date.today()

                # Parse and store FII/DII data
                # NSE returns data in a specific format
                if "data" in data:
                    for entry in data["data"]:
                        fii_dii = FIIDIIData(
                            date=today,
                            category=entry.get("category", "FII"),
                            segment=entry.get("segment", "CASH"),
                            buy_value=Decimal(str(entry.get("buyValue", 0))),
                            sell_value=Decimal(str(entry.get("sellValue", 0))),
                            net_value=Decimal(str(entry.get("netValue", 0))),
                            is_provisional=True,
                        )
                        session.add(fii_dii)

                await session.commit()
                logger.info("Stored FII/DII data")

            except Exception as e:
                await session.rollback()
                logger.error("Failed to store FII/DII data", error=str(e))
                raise

    async def get_historical_baseline(
        self,
        contract_id: int,
        lookback_days: int = 20,
    ) -> dict:
        """
        Get historical baseline for unusual activity detection.
        """
        from scraper.storage.models import OptionsFlow
        from sqlalchemy import func
        from datetime import timedelta

        async with self.async_session() as session:
            cutoff = datetime.utcnow() - timedelta(days=lookback_days)

            result = await session.execute(
                select(
                    func.avg(OptionsFlow.volume).label("avg_volume"),
                    func.stddev(OptionsFlow.volume).label("std_volume"),
                    func.avg(OptionsFlow.oi).label("avg_oi"),
                    func.stddev(OptionsFlow.oi).label("std_oi"),
                ).where(
                    and_(
                        OptionsFlow.contract_id == contract_id,
                        OptionsFlow.timestamp >= cutoff,
                    )
                )
            )

            row = result.one()
            return {
                "avg_volume": float(row.avg_volume or 0),
                "std_volume": float(row.std_volume or 0),
                "avg_oi": float(row.avg_oi or 0),
                "std_oi": float(row.std_oi or 0),
            }
