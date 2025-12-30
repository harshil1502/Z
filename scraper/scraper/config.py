"""
Scraper configuration.
"""

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ScraperSettings(BaseSettings):
    """Scraper configuration settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/z_financial_intel"
    )

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0")

    # NSE Configuration
    nse_base_url: str = "https://www.nseindia.com"
    nse_api_base_url: str = "https://www.nseindia.com/api"

    # BSE Configuration
    bse_base_url: str = "https://www.bseindia.com"

    # Scraper Settings
    scraper_interval_seconds: int = 60
    scraper_request_timeout: int = 30
    scraper_retry_attempts: int = 3
    scraper_retry_delay: float = 2.0

    # Rate Limiting
    rate_limit_requests_per_minute: int = 30
    rate_limit_delay_between_requests: float = 2.0

    # Symbols to scrape
    index_symbols: List[str] = Field(default=["NIFTY", "BANKNIFTY", "FINNIFTY"])
    stock_symbols: List[str] = Field(
        default=["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"]
    )

    # User Agent Rotation
    user_agents: List[str] = Field(
        default=[
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        ]
    )

    # Unusual Activity Thresholds
    unusual_volume_multiplier: float = 3.0
    unusual_premium_threshold: float = 10_000_000.0  # ₹1 crore
    unusual_oi_spike_threshold: float = 0.5  # 50%

    # Market Hours (IST)
    market_open_hour: int = 9
    market_open_minute: int = 15
    market_close_hour: int = 15
    market_close_minute: int = 30

    # Logging
    log_level: str = "INFO"


@lru_cache()
def get_settings() -> ScraperSettings:
    """Get cached settings instance."""
    return ScraperSettings()


settings = get_settings()
