"""
Unit tests for Core Authentication Module
Testing authentication dependencies and user retrieval
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.auth import (
    AuthenticationError,
    get_current_user,
    get_current_active_user,
    get_admin_user,
    get_user_company,
    verify_company_access,
    require_company_access,
    get_optional_user,
)
from app.infrastructure.database.models import User, Company


class TestAuthenticationError:
    """Test custom authentication error"""

    def test_authentication_error_default_message(self):
        """Test authentication error with default message"""
        error = AuthenticationError()

        assert error.status_code == status.HTTP_401_UNAUTHORIZED
        assert error.detail == "Authentication failed"
        assert error.headers == {"WWW-Authenticate": "Bearer"}

    def test_authentication_error_custom_message(self):
        """Test authentication error with custom message"""
        custom_message = "Invalid token provided"
        error = AuthenticationError(custom_message)

        assert error.status_code == status.HTTP_401_UNAUTHORIZED
        assert error.detail == custom_message
        assert error.headers == {"WWW-Authenticate": "Bearer"}


class TestGetCurrentUser:
    """Test get_current_user dependency"""

    @pytest.mark.asyncio
    async def test_get_current_user_success(self):
        """Test successful user retrieval"""
        mock_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_user.id = "user-123"
        mock_user.is_active = True

        with patch("app.core.auth.verify_token") as mock_verify, patch.object(
            mock_db, "query"
        ) as mock_query:

            mock_verify.return_value = "user-123"
            mock_query.return_value.filter.return_value.first.return_value = mock_user

            result = await get_current_user(mock_credentials, mock_db)

            assert result == mock_user
            mock_verify.assert_called_once_with("valid_token")
            mock_query.assert_called_once_with(User)

    @pytest.mark.asyncio
    async def test_get_current_user_no_credentials(self):
        """Test user retrieval without credentials"""
        mock_db = Mock(spec=Session)

        with pytest.raises(AuthenticationError) as exc_info:
            await get_current_user(None, mock_db)

        assert "No authorization header provided" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self):
        """Test user retrieval with invalid token"""
        mock_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="invalid_token"
        )
        mock_db = Mock(spec=Session)

        with patch("app.core.auth.verify_token") as mock_verify:
            mock_verify.return_value = None

            with pytest.raises(AuthenticationError) as exc_info:
                await get_current_user(mock_credentials, mock_db)

            assert "Invalid authentication token" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_current_user_user_not_found(self):
        """Test user retrieval when user doesn't exist"""
        mock_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_db = Mock(spec=Session)

        with patch("app.core.auth.verify_token") as mock_verify, patch.object(
            mock_db, "query"
        ) as mock_query:

            mock_verify.return_value = "user-123"
            mock_query.return_value.filter.return_value.first.return_value = None

            with pytest.raises(AuthenticationError) as exc_info:
                await get_current_user(mock_credentials, mock_db)

            assert "User not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_current_user_inactive_user(self):
        """Test user retrieval with inactive user"""
        mock_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_user.id = "user-123"
        mock_user.is_active = False

        with patch("app.core.auth.verify_token") as mock_verify, patch.object(
            mock_db, "query"
        ) as mock_query:

            mock_verify.return_value = "user-123"
            mock_query.return_value.filter.return_value.first.return_value = mock_user

            with pytest.raises(AuthenticationError) as exc_info:
                await get_current_user(mock_credentials, mock_db)

            assert "Inactive user" in str(exc_info.value.detail)


class TestGetCurrentActiveUser:
    """Test get_current_active_user dependency"""

    @pytest.mark.asyncio
    async def test_get_current_active_user(self):
        """Test getting current active user"""
        mock_user = Mock(spec=User)
        mock_user.is_active = True

        with patch("app.core.auth.get_current_user") as mock_get_user:
            mock_get_user.return_value = mock_user

            result = await get_current_active_user(mock_user)

            assert result == mock_user


class TestGetAdminUser:
    """Test get_admin_user dependency"""

    @pytest.mark.asyncio
    async def test_get_admin_user_success(self):
        """Test getting admin user successfully"""
        mock_user = Mock(spec=User)
        mock_user.is_admin = True

        result = await get_admin_user(mock_user)

        assert result == mock_user

    @pytest.mark.asyncio
    async def test_get_admin_user_not_admin(self):
        """Test getting admin user when user is not admin"""
        mock_user = Mock(spec=User)
        mock_user.is_admin = False

        with pytest.raises(HTTPException) as exc_info:
            await get_admin_user(mock_user)

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Admin privileges required" in str(exc_info.value.detail)


class TestGetUserCompany:
    """Test get_user_company dependency"""

    @pytest.mark.asyncio
    async def test_get_user_company_success(self):
        """Test getting user's company successfully"""
        mock_user = Mock(spec=User)
        mock_user.company_id = "company-123"

        mock_company = Mock(spec=Company)
        mock_company.id = "company-123"

        mock_db = Mock(spec=Session)

        with patch.object(mock_db, "query") as mock_query:
            mock_query.return_value.filter.return_value.first.return_value = (
                mock_company
            )

            result = await get_user_company(mock_user, mock_db)

            assert result == mock_company
            mock_query.assert_called_once_with(Company)

    @pytest.mark.asyncio
    async def test_get_user_company_no_company_id(self):
        """Test getting user's company when user has no company"""
        mock_user = Mock(spec=User)
        mock_user.company_id = None

        mock_db = Mock(spec=Session)

        with pytest.raises(HTTPException) as exc_info:
            await get_user_company(mock_user, mock_db)

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "User is not associated with a company" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_get_user_company_company_not_found(self):
        """Test getting user's company when company doesn't exist"""
        mock_user = Mock(spec=User)
        mock_user.company_id = "company-123"

        mock_db = Mock(spec=Session)

        with patch.object(mock_db, "query") as mock_query:
            mock_query.return_value.filter.return_value.first.return_value = None

            with pytest.raises(HTTPException) as exc_info:
                await get_user_company(mock_user, mock_db)

            assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
            assert "Company not found" in str(exc_info.value.detail)


class TestCompanyAccess:
    """Test company access verification functions"""

    def test_verify_company_access_same_company(self):
        """Test company access for user in same company"""
        mock_user = Mock(spec=User)
        mock_user.company_id = "company-123"
        mock_user.is_admin = False

        result = verify_company_access(mock_user, "company-123")

        assert result is True

    def test_verify_company_access_different_company_regular_user(self):
        """Test company access for regular user accessing different company"""
        mock_user = Mock(spec=User)
        mock_user.company_id = "company-123"
        mock_user.is_admin = False

        result = verify_company_access(mock_user, "company-456")

        assert result is False

    def test_verify_company_access_different_company_admin_user(self):
        """Test company access for admin user accessing different company"""
        mock_user = Mock(spec=User)
        mock_user.company_id = "company-123"
        mock_user.is_admin = True

        result = verify_company_access(mock_user, "company-456")

        assert result is True

    def test_require_company_access_allowed(self):
        """Test require company access when access is allowed"""
        mock_user = Mock(spec=User)
        mock_user.company_id = "company-123"
        mock_user.is_admin = False

        # Should not raise exception
        require_company_access(mock_user, "company-123")

    def test_require_company_access_denied(self):
        """Test require company access when access is denied"""
        mock_user = Mock(spec=User)
        mock_user.company_id = "company-123"
        mock_user.is_admin = False

        with pytest.raises(HTTPException) as exc_info:
            require_company_access(mock_user, "company-456")

        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Access denied" in str(exc_info.value.detail)


class TestGetOptionalUser:
    """Test get_optional_user dependency"""

    @pytest.mark.asyncio
    async def test_get_optional_user_no_credentials(self):
        """Test optional user retrieval without credentials"""
        mock_db = Mock(spec=Session)

        result = await get_optional_user(None, mock_db)

        assert result is None

    @pytest.mark.asyncio
    async def test_get_optional_user_valid_credentials(self):
        """Test optional user retrieval with valid credentials"""
        mock_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_user.id = "user-123"
        mock_user.is_active = True

        with patch("app.core.auth.verify_token") as mock_verify, patch.object(
            mock_db, "query"
        ) as mock_query:

            mock_verify.return_value = "user-123"
            mock_query.return_value.filter.return_value.first.return_value = mock_user

            result = await get_optional_user(mock_credentials, mock_db)

            assert result == mock_user

    @pytest.mark.asyncio
    async def test_get_optional_user_invalid_token(self):
        """Test optional user retrieval with invalid token"""
        mock_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="invalid_token"
        )
        mock_db = Mock(spec=Session)

        with patch("app.core.auth.verify_token") as mock_verify:
            mock_verify.return_value = None

            result = await get_optional_user(mock_credentials, mock_db)

            assert result is None

    @pytest.mark.asyncio
    async def test_get_optional_user_inactive_user(self):
        """Test optional user retrieval with inactive user"""
        mock_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_user.id = "user-123"
        mock_user.is_active = False

        with patch("app.core.auth.verify_token") as mock_verify, patch.object(
            mock_db, "query"
        ) as mock_query:

            mock_verify.return_value = "user-123"
            mock_query.return_value.filter.return_value.first.return_value = mock_user

            result = await get_optional_user(mock_credentials, mock_db)

            assert result is None

    @pytest.mark.asyncio
    async def test_get_optional_user_exception_handling(self):
        """Test optional user retrieval handles exceptions gracefully"""
        mock_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_db = Mock(spec=Session)

        with patch("app.core.auth.verify_token") as mock_verify:
            mock_verify.side_effect = Exception("Token verification failed")

            result = await get_optional_user(mock_credentials, mock_db)

            assert result is None


class TestErrorHandling:
    """Test error handling in authentication functions"""

    @pytest.mark.asyncio
    async def test_database_error_handling(self):
        """Test handling database errors during authentication"""
        mock_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_db = Mock(spec=Session)

        with patch("app.core.auth.verify_token") as mock_verify, patch.object(
            mock_db, "query"
        ) as mock_query:

            mock_verify.return_value = "user-123"
            mock_query.side_effect = Exception("Database connection failed")

            with pytest.raises(Exception):
                await get_current_user(mock_credentials, mock_db)

    @pytest.mark.asyncio
    async def test_token_verification_error_handling(self):
        """Test handling token verification errors"""
        mock_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="valid_token"
        )
        mock_db = Mock(spec=Session)

        with patch("app.core.auth.verify_token") as mock_verify:
            mock_verify.side_effect = Exception("Token verification failed")

            with pytest.raises(Exception):
                await get_current_user(mock_credentials, mock_db)


class TestSecurityIntegration:
    """Test integration with security module"""

    @pytest.mark.asyncio
    async def test_token_extraction_from_credentials(self):
        """Test token extraction from HTTP authorization credentials"""
        token = "test_jwt_token_123"
        mock_credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials=token
        )
        mock_db = Mock(spec=Session)

        with patch("app.core.auth.verify_token") as mock_verify:
            mock_verify.return_value = None  # Invalid token

            with pytest.raises(AuthenticationError):
                await get_current_user(mock_credentials, mock_db)

            # Verify token was extracted correctly
            mock_verify.assert_called_once_with(token)
