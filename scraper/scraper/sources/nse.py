"""
NSE (National Stock Exchange) data scraper.

Fetches options chain, FII/DII data, and market statistics from NSE website.
Uses a combination of API endpoints and page scraping.
"""

import asyncio
import random
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

import httpx
import structlog
from bs4 import BeautifulSoup

from scraper.config import settings

logger = structlog.get_logger(__name__)


class NSEOptionsScraper:
    """
    Scraper for NSE options data.

    NSE provides JSON APIs that can be accessed with proper session handling.
    The key is to first visit the main page to get cookies, then access API endpoints.
    """

    # Known NSE API endpoints
    ENDPOINTS = {
        "options_chain_indices": "/api/option-chain-indices",
        "options_chain_equities": "/api/option-chain-equities",
        "quote_derivative": "/api/quote-derivative",
        "market_status": "/api/marketStatus",
        "fii_dii": "/api/fiidiiTradeReact",
        "market_data_pre_open": "/api/market-data-pre-open",
    }

    def __init__(self):
        self.base_url = settings.nse_base_url
        self.api_base_url = settings.nse_api_base_url
        self.client: Optional[httpx.AsyncClient] = None
        self.cookies: dict = {}
        self._session_initialized = False

    async def __aenter__(self):
        """Async context manager entry."""
        await self._init_session()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self._close_session()

    async def _init_session(self):
        """Initialize HTTP session with proper headers and cookies."""
        if self._session_initialized:
            return

        # Select random user agent
        user_agent = random.choice(settings.user_agents)

        headers = {
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

        self.client = httpx.AsyncClient(
            headers=headers,
            timeout=settings.scraper_request_timeout,
            follow_redirects=True,
        )

        # Visit main page to get session cookies
        try:
            logger.debug("Initializing NSE session")
            response = await self.client.get(self.base_url)
            response.raise_for_status()

            # Store cookies
            self.cookies = dict(response.cookies)

            # Update headers for API requests
            self.client.headers.update({
                "Accept": "application/json",
                "Referer": self.base_url,
            })

            self._session_initialized = True
            logger.info("NSE session initialized successfully")

        except Exception as e:
            logger.error("Failed to initialize NSE session", error=str(e))
            raise

    async def _close_session(self):
        """Close HTTP session."""
        if self.client:
            await self.client.aclose()
            self.client = None
            self._session_initialized = False

    async def _make_request(
        self,
        endpoint: str,
        params: Optional[dict] = None,
        retry_count: int = 0,
    ) -> Optional[dict]:
        """
        Make HTTP request to NSE API with retry logic.

        Args:
            endpoint: API endpoint path
            params: Query parameters
            retry_count: Current retry attempt

        Returns:
            JSON response data or None on failure
        """
        if not self._session_initialized:
            await self._init_session()

        url = f"{self.base_url}{endpoint}"

        try:
            # Add jitter to request timing
            await asyncio.sleep(random.uniform(0.5, 1.5))

            response = await self.client.get(
                url,
                params=params,
                cookies=self.cookies,
            )

            # Handle rate limiting
            if response.status_code == 429:
                if retry_count < settings.scraper_retry_attempts:
                    wait_time = settings.scraper_retry_delay * (2 ** retry_count)
                    logger.warning(f"Rate limited, waiting {wait_time}s before retry")
                    await asyncio.sleep(wait_time)
                    return await self._make_request(endpoint, params, retry_count + 1)
                else:
                    logger.error("Max retries exceeded for rate limiting")
                    return None

            response.raise_for_status()

            return response.json()

        except httpx.HTTPStatusError as e:
            logger.error(
                "HTTP error",
                status_code=e.response.status_code,
                url=url,
            )
            if retry_count < settings.scraper_retry_attempts:
                await asyncio.sleep(settings.scraper_retry_delay)
                return await self._make_request(endpoint, params, retry_count + 1)
            return None

        except Exception as e:
            logger.error("Request error", error=str(e), url=url)
            if retry_count < settings.scraper_retry_attempts:
                await asyncio.sleep(settings.scraper_retry_delay)
                return await self._make_request(endpoint, params, retry_count + 1)
            return None

    async def fetch_options_chain(
        self,
        symbol: str,
        is_index: bool = True,
    ) -> Optional[dict]:
        """
        Fetch complete options chain for a symbol.

        Args:
            symbol: Trading symbol (e.g., "NIFTY", "BANKNIFTY")
            is_index: True for indices, False for stocks

        Returns:
            Options chain data as dictionary
        """
        endpoint = (
            self.ENDPOINTS["options_chain_indices"]
            if is_index
            else self.ENDPOINTS["options_chain_equities"]
        )

        data = await self._make_request(
            endpoint,
            params={"symbol": symbol.upper()},
        )

        if data:
            logger.debug(
                "Fetched options chain",
                symbol=symbol,
                records=len(data.get("records", {}).get("data", [])),
            )

        return data

    async def fetch_fii_dii_data(self) -> Optional[dict]:
        """
        Fetch FII/DII trading data.

        Returns:
            FII/DII data as dictionary
        """
        return await self._make_request(self.ENDPOINTS["fii_dii"])

    async def fetch_market_status(self) -> Optional[dict]:
        """
        Fetch current market status.

        Returns:
            Market status data
        """
        return await self._make_request(self.ENDPOINTS["market_status"])

    def parse_options_chain(self, data: dict) -> list[dict]:
        """
        Parse options chain data into structured records.

        Args:
            data: Raw options chain response from NSE

        Returns:
            List of parsed option records
        """
        records = []

        if not data or "records" not in data:
            return records

        underlying_value = data.get("records", {}).get("underlyingValue", 0)
        timestamp = data.get("records", {}).get("timestamp", "")
        expiry_dates = data.get("records", {}).get("expiryDates", [])

        for item in data.get("records", {}).get("data", []):
            strike_price = item.get("strikePrice")
            expiry_date = item.get("expiryDate")

            # Parse CE (Call) data
            ce_data = item.get("CE", {})
            if ce_data:
                records.append(self._parse_option_data(
                    ce_data,
                    strike_price,
                    expiry_date,
                    "CE",
                    underlying_value,
                    timestamp,
                ))

            # Parse PE (Put) data
            pe_data = item.get("PE", {})
            if pe_data:
                records.append(self._parse_option_data(
                    pe_data,
                    strike_price,
                    expiry_date,
                    "PE",
                    underlying_value,
                    timestamp,
                ))

        return records

    def _parse_option_data(
        self,
        data: dict,
        strike_price: float,
        expiry_date: str,
        option_type: str,
        underlying_value: float,
        timestamp: str,
    ) -> dict:
        """Parse individual option data."""
        return {
            "symbol": data.get("underlying", ""),
            "strike_price": Decimal(str(strike_price)) if strike_price else None,
            "expiry_date": self._parse_date(expiry_date),
            "option_type": option_type,
            "timestamp": self._parse_timestamp(timestamp),
            "ltp": Decimal(str(data.get("lastPrice", 0))),
            "volume": data.get("totalTradedVolume", 0),
            "oi": data.get("openInterest", 0),
            "oi_change": data.get("changeinOpenInterest", 0),
            "bid_price": Decimal(str(data.get("bidprice", 0))),
            "ask_price": Decimal(str(data.get("askPrice", 0))),
            "bid_qty": data.get("bidQty", 0),
            "ask_qty": data.get("askQty", 0),
            "iv": Decimal(str(data.get("impliedVolatility", 0))),
            "underlying_price": Decimal(str(underlying_value)),
            "total_traded_value": Decimal(str(data.get("totalBuyQuantity", 0) * data.get("lastPrice", 0))),
        }

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse NSE date format (DD-Mon-YYYY)."""
        if not date_str:
            return None

        try:
            return datetime.strptime(date_str, "%d-%b-%Y").date()
        except ValueError:
            logger.warning(f"Failed to parse date: {date_str}")
            return None

    def _parse_timestamp(self, timestamp_str: str) -> Optional[datetime]:
        """Parse NSE timestamp format."""
        if not timestamp_str:
            return datetime.utcnow()

        try:
            # NSE format: "28-Dec-2024 15:30:00"
            return datetime.strptime(timestamp_str, "%d-%b-%Y %H:%M:%S")
        except ValueError:
            return datetime.utcnow()

    async def process_and_store(self, data: dict) -> int:
        """
        Process scraped data and store in database.

        Args:
            data: Raw options chain data

        Returns:
            Number of records stored
        """
        # Parse the data
        records = self.parse_options_chain(data)

        if not records:
            logger.warning("No records to store")
            return 0

        # Get symbol from first record
        symbol = records[0].get("symbol", "UNKNOWN")

        # Store to database
        try:
            from scraper.storage.database import DatabaseStorage

            storage = DatabaseStorage()
            await storage.initialize()
            count = await storage.store_options_flow(records, symbol)
            await storage.close()

            logger.info(
                "Stored options flow to database",
                symbol=symbol,
                count=count,
            )
            return count

        except Exception as e:
            logger.error(
                "Failed to store to database",
                error=str(e),
                symbol=symbol,
            )
            # Fall back to just logging
            logger.info(f"Processed {len(records)} option records (not stored)")
            return 0

    async def store_fii_dii_data(self, data: dict) -> None:
        """
        Store FII/DII data in database.

        Args:
            data: FII/DII data from NSE
        """
        if not data:
            logger.warning("No FII/DII data to store")
            return

        try:
            from scraper.storage.database import DatabaseStorage

            storage = DatabaseStorage()
            await storage.initialize()
            await storage.store_fii_dii_data(data)
            await storage.close()

            logger.info("Stored FII/DII data to database")

        except Exception as e:
            logger.error("Failed to store FII/DII data", error=str(e))
