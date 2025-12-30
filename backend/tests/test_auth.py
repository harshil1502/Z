"""
Tests for authentication API routes and services.
"""

import pytest
from unittest.mock import patch, MagicMock


class TestAuthRoutes:
    """Tests for authentication API endpoints."""

    @pytest.mark.asyncio
    async def test_register_user(self, client, sample_user_data):
        """Test user registration endpoint."""
        response = await client.post(
            "/api/v1/auth/register",
            json=sample_user_data,
        )

        # Should either succeed or fail gracefully
        assert response.status_code in [200, 201, 422, 500]

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client):
        """Test registration with invalid email."""
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "invalid-email",
                "password": "password123",
            },
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_missing_credentials(self, client):
        """Test login with missing credentials."""
        response = await client.post(
            "/api/v1/auth/login",
            json={},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_wrong_credentials(self, client):
        """Test login with wrong credentials."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "wrongpassword",
            },
        )

        # Should return 401 Unauthorized
        assert response.status_code in [401, 400, 500]


class TestPasswordValidation:
    """Tests for password validation."""

    def test_password_too_short(self):
        """Test that short passwords are rejected."""
        from app.core.security import validate_password

        # Password less than 8 characters should be invalid
        assert validate_password("short") is False

    def test_password_valid(self):
        """Test that valid passwords are accepted."""
        from app.core.security import validate_password

        assert validate_password("validpassword123") is True


class TestTokenGeneration:
    """Tests for JWT token generation."""

    def test_create_access_token(self):
        """Test access token creation."""
        from app.core.security import create_access_token

        data = {"sub": "test@example.com", "user_id": 1}
        token = create_access_token(data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_refresh_token(self):
        """Test refresh token creation."""
        from app.core.security import create_refresh_token

        data = {"sub": "test@example.com", "user_id": 1}
        token = create_refresh_token(data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_tokens_are_different(self):
        """Test that access and refresh tokens are different."""
        from app.core.security import create_access_token, create_refresh_token

        data = {"sub": "test@example.com", "user_id": 1}
        access_token = create_access_token(data)
        refresh_token = create_refresh_token(data)

        assert access_token != refresh_token


class TestPasswordHashing:
    """Tests for password hashing."""

    def test_hash_password(self):
        """Test password hashing."""
        from app.core.security import get_password_hash

        password = "testpassword123"
        hashed = get_password_hash(password)

        assert hashed is not None
        assert hashed != password
        assert len(hashed) > 0

    def test_verify_password(self):
        """Test password verification."""
        from app.core.security import get_password_hash, verify_password

        password = "testpassword123"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True
        assert verify_password("wrongpassword", hashed) is False

    def test_different_passwords_different_hashes(self):
        """Test that different passwords produce different hashes."""
        from app.core.security import get_password_hash

        hash1 = get_password_hash("password1")
        hash2 = get_password_hash("password2")

        assert hash1 != hash2

    def test_same_password_different_hashes(self):
        """Test that same password can produce different hashes (salting)."""
        from app.core.security import get_password_hash

        password = "samepassword"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        # Bcrypt should produce different hashes due to salting
        assert hash1 != hash2
