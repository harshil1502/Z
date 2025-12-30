"""
Main entry point for the scraper service.
"""

import asyncio
import signal
import sys
from datetime import datetime

import pytz
import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from scraper.config import settings
from scraper.sources.nse import NSEOptionsScraper
from scraper.processors.unusual_detector import UnusualActivityDetector

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Timezone
IST = pytz.timezone("Asia/Kolkata")

# Global scheduler
scheduler = AsyncIOScheduler(timezone=IST)


def is_market_hours() -> bool:
    """Check if current time is within market hours (IST)."""
    now = datetime.now(IST)
    market_open = now.replace(
        hour=settings.market_open_hour,
        minute=settings.market_open_minute,
        second=0,
        microsecond=0,
    )
    market_close = now.replace(
        hour=settings.market_close_hour,
        minute=settings.market_close_minute,
        second=0,
        microsecond=0,
    )

    # Check if weekday (Monday = 0, Sunday = 6)
    if now.weekday() >= 5:
        return False

    return market_open <= now <= market_close


async def scrape_nse_options():
    """Scrape NSE options data."""
    if not is_market_hours():
        logger.info("Outside market hours, skipping scrape")
        return

    logger.info("Starting NSE options scrape")

    try:
        async with NSEOptionsScraper() as scraper:
            # Scrape index options
            for symbol in settings.index_symbols:
                try:
                    logger.info(f"Scraping options for {symbol}")
                    data = await scraper.fetch_options_chain(symbol)

                    if data:
                        # Process and store data
                        await scraper.process_and_store(data)
                        logger.info(f"Successfully scraped {symbol}", records=len(data.get("records", {}).get("data", [])))
                    else:
                        logger.warning(f"No data returned for {symbol}")

                except Exception as e:
                    logger.error(f"Error scraping {symbol}", error=str(e))

                # Rate limiting
                await asyncio.sleep(settings.rate_limit_delay_between_requests)

    except Exception as e:
        logger.error("Scraper error", error=str(e))


async def scrape_fii_dii():
    """Scrape FII/DII data (runs daily after market close)."""
    logger.info("Starting FII/DII data scrape")

    try:
        async with NSEOptionsScraper() as scraper:
            data = await scraper.fetch_fii_dii_data()
            if data:
                await scraper.store_fii_dii_data(data)
                logger.info("Successfully scraped FII/DII data")
            else:
                logger.warning("No FII/DII data returned")

    except Exception as e:
        logger.error("FII/DII scraper error", error=str(e))


async def detect_unusual_activity():
    """Run unusual activity detection on recent data."""
    logger.info("Running unusual activity detection")

    try:
        detector = UnusualActivityDetector()
        await detector.process_recent_flows()
        logger.info("Unusual activity detection completed")

    except Exception as e:
        logger.error("Unusual activity detection error", error=str(e))


def setup_scheduler():
    """Set up the APScheduler jobs."""
    # Options scrape every minute during market hours
    scheduler.add_job(
        scrape_nse_options,
        trigger=IntervalTrigger(seconds=settings.scraper_interval_seconds),
        id="nse_options_scrape",
        name="NSE Options Scraper",
        replace_existing=True,
    )

    # FII/DII scrape daily at 6 PM IST
    scheduler.add_job(
        scrape_fii_dii,
        trigger=CronTrigger(hour=18, minute=0, timezone=IST),
        id="fii_dii_scrape",
        name="FII/DII Scraper",
        replace_existing=True,
    )

    # Unusual activity detection every 5 minutes
    scheduler.add_job(
        detect_unusual_activity,
        trigger=IntervalTrigger(minutes=5),
        id="unusual_detection",
        name="Unusual Activity Detector",
        replace_existing=True,
    )

    logger.info(
        "Scheduler configured",
        jobs=[job.name for job in scheduler.get_jobs()],
    )


async def startup():
    """Startup routine."""
    logger.info(
        "Starting Z - Financial Intel Scraper",
        version="0.1.0",
        symbols=settings.index_symbols + settings.stock_symbols,
    )

    # Initialize browser for scraping
    from playwright.async_api import async_playwright

    # Setup scheduler
    setup_scheduler()
    scheduler.start()

    # Run initial scrape
    await scrape_nse_options()


async def shutdown():
    """Shutdown routine."""
    logger.info("Shutting down scraper")
    scheduler.shutdown(wait=False)


def signal_handler(sig, frame):
    """Handle shutdown signals."""
    logger.info("Received shutdown signal")
    asyncio.create_task(shutdown())
    sys.exit(0)


async def main():
    """Main entry point."""
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        await startup()

        # Keep running
        while True:
            await asyncio.sleep(1)

    except KeyboardInterrupt:
        await shutdown()
    except Exception as e:
        logger.error("Fatal error", error=str(e))
        await shutdown()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
