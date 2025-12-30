"""
Pytest configuration and fixtures for backend tests.
"""

import asyncio
from datetime import date, datetime
from decimal import Decimal
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import get_db
from app.db.models import Base


# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def test_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def client(test_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with overridden database dependency."""

    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sync_client() -> TestClient:
    """Create a synchronous test client for simple tests."""
    return TestClient(app)


# Sample test data fixtures
@pytest.fixture
def sample_symbol_data():
    """Sample symbol data for tests."""
    return {
        "symbol": "NIFTY",
        "exchange": "NSE",
        "segment": "INDEX",
        "lot_size": 50,
        "is_active": True,
    }


@pytest.fixture
def sample_options_flow_data():
    """Sample options flow data for tests."""
    return {
        "symbol": "NIFTY",
        "strike_price": Decimal("23500"),
        "expiry_date": date(2024, 12, 26),
        "option_type": "CE",
        "ltp": Decimal("150.50"),
        "volume": 50000,
        "oi": 1000000,
        "oi_change": 25000,
        "iv": Decimal("15.5"),
        "underlying_price": Decimal("23450"),
    }


@pytest.fixture
def sample_user_data():
    """Sample user data for tests."""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User",
    }
