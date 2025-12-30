"""
APScheduler-based task scheduler for scraping jobs.
"""

import logging
from datetime import datetime, time
from typing import Callable, Optional
import pytz

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

from app.core.config import settings

logger = logging.getLogger(__name__)

# Indian Standard Time
IST = pytz.timezone("Asia/Kolkata")

# Market hours (IST)
MARKET_OPEN = time(9, 15)
MARKET_CLOSE = time(15, 30)
PRE_OPEN_START = time(9, 0)


class ScraperScheduler:
    """
    Manages scheduled scraping tasks.
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler(timezone=IST)
        self._setup_event_listeners()
        self._jobs = {}

    def _setup_event_listeners(self):
        """Set up event listeners for job monitoring."""
        self.scheduler.add_listener(
            self._on_job_executed,
            EVENT_JOB_EXECUTED
        )
        self.scheduler.add_listener(
            self._on_job_error,
            EVENT_JOB_ERROR
        )

    def _on_job_executed(self, event):
        """Called when a job is successfully executed."""
        job_id = event.job_id
        logger.info(f"Job executed successfully: {job_id}")

    def _on_job_error(self, event):
        """Called when a job fails."""
        job_id = event.job_id
        exception = event.exception
        logger.error(f"Job failed: {job_id} - {exception}")

    def _is_market_hours(self) -> bool:
        """Check if current time is within market hours."""
        now = datetime.now(IST).time()
        # Include pre-open session
        return PRE_OPEN_START <= now <= MARKET_CLOSE

    def _is_trading_day(self) -> bool:
        """Check if today is a trading day (not weekend)."""
        today = datetime.now(IST)
        return today.weekday() < 5  # Monday = 0, Friday = 4

    def add_options_flow_job(
        self,
        scrape_func: Callable,
        interval_seconds: int = 60
    ):
        """
        Add job to scrape options flow data.
        Runs every minute during market hours.
        """
        job = self.scheduler.add_job(
            self._run_with_market_check(scrape_func),
            IntervalTrigger(seconds=interval_seconds),
            id="options_flow_scraper",
            name="Options Flow Scraper",
            replace_existing=True,
            max_instances=1,
        )
        self._jobs["options_flow"] = job
        logger.info(f"Added options flow scraper job: every {interval_seconds}s")
        return job

    def add_fii_dii_job(
        self,
        scrape_func: Callable,
    ):
        """
        Add job to scrape FII/DII data.
        Runs at 6:00 PM IST daily (after market close when data is published).
        """
        job = self.scheduler.add_job(
            scrape_func,
            CronTrigger(hour=18, minute=0, timezone=IST),
            id="fii_dii_scraper",
            name="FII/DII Data Scraper",
            replace_existing=True,
        )
        self._jobs["fii_dii"] = job
        logger.info("Added FII/DII scraper job: daily at 18:00 IST")
        return job

    def add_indices_job(
        self,
        scrape_func: Callable,
        interval_seconds: int = 10
    ):
        """
        Add job to scrape index data.
        Runs every 10 seconds during market hours.
        """
        job = self.scheduler.add_job(
            self._run_with_market_check(scrape_func),
            IntervalTrigger(seconds=interval_seconds),
            id="indices_scraper",
            name="Indices Scraper",
            replace_existing=True,
            max_instances=1,
        )
        self._jobs["indices"] = job
        logger.info(f"Added indices scraper job: every {interval_seconds}s")
        return job

    def add_bulk_deals_job(
        self,
        scrape_func: Callable,
    ):
        """
        Add job to scrape bulk/block deals.
        Runs at 4:30 PM IST daily (after market close).
        """
        job = self.scheduler.add_job(
            scrape_func,
            CronTrigger(hour=16, minute=30, timezone=IST),
            id="bulk_deals_scraper",
            name="Bulk/Block Deals Scraper",
            replace_existing=True,
        )
        self._jobs["bulk_deals"] = job
        logger.info("Added bulk deals scraper job: daily at 16:30 IST")
        return job

    def add_cleanup_job(
        self,
        cleanup_func: Callable,
    ):
        """
        Add job to clean up old data.
        Runs at 1:00 AM IST daily.
        """
        job = self.scheduler.add_job(
            cleanup_func,
            CronTrigger(hour=1, minute=0, timezone=IST),
            id="data_cleanup",
            name="Data Cleanup",
            replace_existing=True,
        )
        self._jobs["cleanup"] = job
        logger.info("Added data cleanup job: daily at 01:00 IST")
        return job

    def _run_with_market_check(self, func: Callable) -> Callable:
        """
        Wrapper that only runs the function during market hours.
        """
        async def wrapper():
            if not self._is_trading_day():
                logger.debug("Skipping scrape: not a trading day")
                return

            if not self._is_market_hours():
                logger.debug("Skipping scrape: outside market hours")
                return

            try:
                await func()
            except Exception as e:
                logger.error(f"Scraper error: {e}")
                raise

        return wrapper

    def start(self):
        """Start the scheduler."""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scraper scheduler started")

    def stop(self):
        """Stop the scheduler."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scraper scheduler stopped")

    def pause_job(self, job_id: str):
        """Pause a specific job."""
        if job_id in self._jobs:
            self.scheduler.pause_job(job_id)
            logger.info(f"Paused job: {job_id}")

    def resume_job(self, job_id: str):
        """Resume a specific job."""
        if job_id in self._jobs:
            self.scheduler.resume_job(job_id)
            logger.info(f"Resumed job: {job_id}")

    def get_job_status(self) -> dict:
        """Get status of all jobs."""
        status = {}
        for job_id, job in self._jobs.items():
            job_info = self.scheduler.get_job(job_id)
            if job_info:
                status[job_id] = {
                    "name": job_info.name,
                    "next_run": str(job_info.next_run_time) if job_info.next_run_time else None,
                    "pending": job_info.pending,
                }
            else:
                status[job_id] = {"status": "not found"}
        return status


# Global scheduler instance
scheduler = ScraperScheduler()


async def init_scheduler():
    """Initialize and configure the scheduler with scraping jobs."""
    from scraper.scraper.sources.nse import NSEScraper

    # Create scraper instance
    nse_scraper = NSEScraper()

    # Add jobs
    scheduler.add_options_flow_job(
        nse_scraper.scrape_and_process,
        interval_seconds=60
    )

    scheduler.add_fii_dii_job(
        nse_scraper.scrape_fii_dii
    )

    # Start scheduler
    scheduler.start()

    return scheduler


async def shutdown_scheduler():
    """Shutdown the scheduler."""
    scheduler.stop()
