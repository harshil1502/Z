"""
Application configuration using Pydantic Settings.
Loads configuration from environment variables and .env files.
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Z - Financial Intel"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = Field(default="development", pattern="^(development|staging|production)$")

    # API Configuration
    api_prefix: str = "/api/v1"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # CORS
    cors_origins: List[str] = Field(default=["http://localhost:3000", "http://localhost:5173"])
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["*"]
    cors_allow_headers: List[str] = ["*"]

    # Database
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/z_financial_intel"
    )
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_echo: bool = False

    # Redis
    redis_url: RedisDsn = Field(default="redis://localhost:6379/0")
    redis_cache_ttl: int = 60  # seconds

    # JWT Authentication
    jwt_secret_key: str = Field(default="your-super-secret-key-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7

    # Rate Limiting
    rate_limit_requests: int = 100  # requests per minute
    rate_limit_window: int = 60  # seconds

    # Scraper Configuration
    scraper_enabled: bool = True
    scraper_interval_seconds: int = 60
    scraper_user_agent: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    scraper_request_timeout: int = 30
    scraper_retry_attempts: int = 3

    # NSE Configuration
    nse_base_url: str = "https://www.nseindia.com"
    nse_api_base_url: str = "https://www.nseindia.com/api"

    # BSE Configuration
    bse_base_url: str = "https://www.bseindia.com"

    # Unusual Activity Detection Thresholds
    unusual_volume_multiplier: float = 3.0  # 3x average volume
    unusual_premium_threshold: float = 10000000.0  # ₹1 crore
    unusual_oi_spike_threshold: float = 0.5  # 50% change

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"

    @property
    def async_database_url(self) -> str:
        """Get async database URL."""
        return str(self.database_url)

    @property
    def sync_database_url(self) -> str:
        """Get sync database URL for migrations."""
        return str(self.database_url).replace("+asyncpg", "")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience export
settings = get_settings()
