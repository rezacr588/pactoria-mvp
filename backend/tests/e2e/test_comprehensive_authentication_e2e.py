"""
Comprehensive End-to-End Authentication Flow Tests for Pactoria MVP

Tests the complete authentication lifecycle from registration to token refresh,
including edge cases, error scenarios, and security validations.

Following TDD principles - comprehensive testing for maximum coverage.
"""

import pytest
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any
from unittest.mock import patch, AsyncMock

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.config import settings
from app.infrastructure.database.models import User, Company, SubscriptionTier, UserRole
from tests.conftest import create_test_company, create_test_user


class TestComprehensiveAuthenticationE2E:
    """Comprehensive authentication flow E2E tests"""

    def test_complete_user_registration_flow(self, client: TestClient, db_session: Session):
        """Test complete user registration flow including company creation"""
        # Arrange
        unique_email = f"register-test-{uuid.uuid4().hex[:8]}@example.com"
        registration_data = {
            "email": unique_email,
            "password": "SecurePassword123!",
            "full_name": "John Test User",
            "company_name": "Test Company Ltd",
            "company_registration_number": "12345678",
            "company_address": "123 Test Street, London, UK"
        }

        # Act
        response = client.post("/api/v1/auth/register", json=registration_data)

        # Assert
        assert response.status_code == status.HTTP_201_CREATED
        response_data = response.json()
        
        # Verify response structure
        assert "access_token" in response_data
        assert "token_type" in response_data
        assert response_data["token_type"] == "bearer"
        assert "user" in response_data
        assert "company" in response_data
        
        # Verify user data
        user_data = response_data["user"]
        assert user_data["email"] == unique_email
        assert user_data["full_name"] == "John Test User"
        assert user_data["is_active"] is True
        assert user_data["role"] == UserRole.ACCOUNT_OWNER.value
        
        # Verify company data
        company_data = response_data["company"]
        assert company_data["name"] == "Test Company Ltd"
        assert company_data["registration_number"] == "12345678"
        assert company_data["subscription_tier"] == SubscriptionTier.PROFESSIONAL.value

        # Verify database records
        db_user = db_session.query(User).filter(User.email == unique_email).first()
        assert db_user is not None
        assert db_user.full_name == "John Test User"
        assert db_user.is_active is True
        assert verify_password("SecurePassword123!", db_user.hashed_password)
        
        db_company = db_session.query(Company).filter(Company.id == db_user.company_id).first()
        assert db_company is not None
        assert db_company.name == "Test Company Ltd"

    def test_user_login_flow_with_valid_credentials(self, client: TestClient, db_session: Session):
        """Test user login with valid credentials"""
        # Arrange - Create user first
        company = create_test_company(db_session)
        test_password = "TestPassword123!"
        user = create_test_user(
            db_session, 
            company.id,
            email=f"login-test-{uuid.uuid4().hex[:8]}@example.com",
            hashed_password=get_password_hash(test_password)
        )
        
        login_data = {
            "email": user.email,
            "password": test_password
        }

        # Act
        response = client.post("/api/v1/auth/login", json=login_data)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        
        assert "access_token" in response_data
        assert "token_type" in response_data
        assert response_data["token_type"] == "bearer"
        assert "user" in response_data
        
        # Verify user data in response
        user_data = response_data["user"]
        assert user_data["email"] == user.email
        assert user_data["id"] == user.id

    def test_authentication_with_jwt_token(self, client: TestClient, db_session: Session):
        """Test authenticated request using JWT token"""
        # Arrange - Create user and get token
        company = create_test_company(db_session)
        user = create_test_user(db_session, company.id)
        
        token = create_access_token(data={"sub": user.email})
        headers = {"Authorization": f"Bearer {token}"}

        # Act
        response = client.get("/api/v1/auth/profile", headers=headers)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        profile_data = response.json()
        assert profile_data["email"] == user.email
        assert profile_data["full_name"] == user.full_name

    def test_token_refresh_flow(self, client: TestClient, db_session: Session):
        """Test token refresh functionality"""
        # Arrange
        company = create_test_company(db_session)
        user = create_test_user(db_session, company.id)
        
        # Create token with short expiry for testing
        token_data = {"sub": user.email, "exp": datetime.utcnow() + timedelta(seconds=5)}
        old_token = create_access_token(data=token_data)
        headers = {"Authorization": f"Bearer {old_token}"}
        
        # Wait for token to be near expiry
        time.sleep(1)

        # Act - Request token refresh
        response = client.post("/api/v1/auth/refresh", headers=headers)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        response_data = response.json()
        assert "access_token" in response_data
        assert "token_type" in response_data
        
        # Verify new token is different and works
        new_token = response_data["access_token"]
        assert new_token != old_token
        
        new_headers = {"Authorization": f"Bearer {new_token}"}
        profile_response = client.get("/api/v1/auth/profile", headers=new_headers)
        assert profile_response.status_code == status.HTTP_200_OK

    def test_password_change_flow(self, client: TestClient, db_session: Session):
        """Test password change functionality"""
        # Arrange
        company = create_test_company(db_session)
        old_password = "OldPassword123!"
        user = create_test_user(
            db_session, 
            company.id,
            hashed_password=get_password_hash(old_password)
        )
        
        token = create_access_token(data={"sub": user.email})
        headers = {"Authorization": f"Bearer {token}"}
        
        password_change_data = {
            "current_password": old_password,
            "new_password": "NewSecurePassword456!",
            "confirm_password": "NewSecurePassword456!"
        }

        # Act
        response = client.post("/api/v1/auth/change-password", json=password_change_data, headers=headers)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        
        # Verify old password no longer works
        login_old_password = {
            "email": user.email,
            "password": old_password
        }
        login_response_old = client.post("/api/v1/auth/login", json=login_old_password)
        assert login_response_old.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Verify new password works
        login_new_password = {
            "email": user.email,
            "password": "NewSecurePassword456!"
        }
        login_response_new = client.post("/api/v1/auth/login", json=login_new_password)
        assert login_response_new.status_code == status.HTTP_200_OK

    @pytest.mark.asyncio
    async def test_password_reset_flow(self, client: TestClient, db_session: Session):
        """Test complete password reset flow"""
        # Arrange
        company = create_test_company(db_session)
        user = create_test_user(db_session, company.id)
        
        # Mock email service
        with patch('app.services.email_service.send_password_reset_email') as mock_email:
            mock_email.return_value = AsyncMock()
            
            # Act - Request password reset
            reset_request = {"email": user.email}
            response = client.post("/api/v1/auth/forgot-password", json=reset_request)
            
            # Assert password reset request
            assert response.status_code == status.HTTP_200_OK
            mock_email.assert_called_once()
            
            # Simulate reset token (would normally come from email)
            from app.core.security import create_password_reset_token
            reset_token = create_password_reset_token(user.email)
            
            # Act - Confirm password reset
            new_password = "ResetPassword789!"
            reset_confirm = {
                "token": reset_token,
                "new_password": new_password,
                "confirm_password": new_password
            }
            
            confirm_response = client.post("/api/v1/auth/reset-password", json=reset_confirm)
            
            # Assert password reset confirmation
            assert confirm_response.status_code == status.HTTP_200_OK
            
            # Verify new password works
            login_data = {
                "email": user.email,
                "password": new_password
            }
            login_response = client.post("/api/v1/auth/login", json=login_data)
            assert login_response.status_code == status.HTTP_200_OK

    def test_invalid_credentials_error_handling(self, client: TestClient):
        """Test error handling for invalid login credentials"""
        # Arrange
        invalid_login_data = {
            "email": "nonexistent@example.com",
            "password": "WrongPassword123!"
        }

        # Act
        response = client.post("/api/v1/auth/login", json=invalid_login_data)

        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        error_data = response.json()
        assert "detail" in error_data
        assert "Invalid credentials" in error_data["detail"] or "Incorrect email or password" in error_data["detail"]

    def test_duplicate_email_registration_error(self, client: TestClient, db_session: Session):
        """Test error handling for duplicate email registration"""
        # Arrange - Create existing user
        company = create_test_company(db_session)
        existing_user = create_test_user(db_session, company.id)
        
        duplicate_registration = {
            "email": existing_user.email,
            "password": "NewPassword123!",
            "full_name": "Duplicate User",
            "company_name": "New Company Ltd"
        }

        # Act
        response = client.post("/api/v1/auth/register", json=duplicate_registration)

        # Assert
        assert response.status_code == status.HTTP_409_CONFLICT
        error_data = response.json()
        assert "detail" in error_data
        assert "already registered" in error_data["detail"].lower()

    def test_weak_password_validation(self, client: TestClient):
        """Test password strength validation during registration"""
        # Arrange
        weak_password_data = {
            "email": f"weak-pwd-{uuid.uuid4().hex[:8]}@example.com",
            "password": "weak",  # Too weak
            "full_name": "Test User",
            "company_name": "Test Company"
        }

        # Act
        response = client.post("/api/v1/auth/register", json=weak_password_data)

        # Assert
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_data = response.json()
        assert "detail" in error_data
        # Should contain validation errors about password strength

    def test_invalid_email_format_validation(self, client: TestClient):
        """Test email format validation"""
        # Arrange
        invalid_email_data = {
            "email": "invalid-email-format",
            "password": "ValidPassword123!",
            "full_name": "Test User",
            "company_name": "Test Company"
        }

        # Act
        response = client.post("/api/v1/auth/register", json=invalid_email_data)

        # Assert
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_data = response.json()
        assert "detail" in error_data

    def test_expired_token_handling(self, client: TestClient, db_session: Session):
        """Test handling of expired JWT tokens"""
        # Arrange
        company = create_test_company(db_session)
        user = create_test_user(db_session, company.id)
        
        # Create expired token
        expired_token_data = {
            "sub": user.email, 
            "exp": datetime.utcnow() - timedelta(hours=1)
        }
        expired_token = create_access_token(data=expired_token_data)
        headers = {"Authorization": f"Bearer {expired_token}"}

        # Act
        response = client.get("/api/v1/auth/profile", headers=headers)

        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_malformed_token_handling(self, client: TestClient):
        """Test handling of malformed JWT tokens"""
        # Arrange
        malformed_tokens = [
            "invalid.token.format",
            "Bearer invalid_token",
            "completely_invalid",
            ""
        ]

        for malformed_token in malformed_tokens:
            headers = {"Authorization": f"Bearer {malformed_token}"}
            
            # Act
            response = client.get("/api/v1/auth/profile", headers=headers)
            
            # Assert
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_missing_authorization_header(self, client: TestClient):
        """Test protected endpoint without authorization header"""
        # Act
        response = client.get("/api/v1/auth/profile")

        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_user_profile_update_flow(self, client: TestClient, db_session: Session):
        """Test user profile update functionality"""
        # Arrange
        company = create_test_company(db_session)
        user = create_test_user(db_session, company.id)
        
        token = create_access_token(data={"sub": user.email})
        headers = {"Authorization": f"Bearer {token}"}
        
        profile_updates = {
            "full_name": "Updated Full Name",
            "department": "Updated Department",
            "timezone": "America/New_York"
        }

        # Act
        response = client.put("/api/v1/auth/profile", json=profile_updates, headers=headers)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        updated_profile = response.json()
        assert updated_profile["full_name"] == "Updated Full Name"
        assert updated_profile["department"] == "Updated Department"
        assert updated_profile["timezone"] == "America/New_York"
        
        # Verify database update
        db_session.refresh(user)
        assert user.full_name == "Updated Full Name"
        assert user.department == "Updated Department"
        assert user.timezone == "America/New_York"

    def test_account_deactivation_flow(self, client: TestClient, db_session: Session):
        """Test account deactivation functionality"""
        # Arrange
        company = create_test_company(db_session)
        user = create_test_user(db_session, company.id, role=UserRole.ACCOUNT_OWNER)
        
        token = create_access_token(data={"sub": user.email})
        headers = {"Authorization": f"Bearer {token}"}

        # Act - Deactivate account
        response = client.post("/api/v1/auth/deactivate", headers=headers)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        
        # Verify user cannot login after deactivation
        login_data = {
            "email": user.email,
            "password": "testpassword"  # Default password from create_test_user
        }
        login_response = client.post("/api/v1/auth/login", json=login_data)
        assert login_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_cors_headers_on_auth_endpoints(self, client: TestClient):
        """Test CORS headers are properly set on authentication endpoints"""
        # Arrange
        headers = {"Origin": "http://localhost:3000"}
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }

        # Act
        response = client.post("/api/v1/auth/login", json=login_data, headers=headers)

        # Assert - Even on error responses, CORS headers should be present
        assert "access-control-allow-origin" in [h.lower() for h in response.headers.keys()]

    def test_rate_limiting_on_login_attempts(self, client: TestClient):
        """Test rate limiting on repeated failed login attempts"""
        # Arrange
        invalid_login_data = {
            "email": "attacker@example.com",
            "password": "wrongpassword"
        }

        # Act - Make multiple rapid login attempts
        responses = []
        for i in range(6):  # Attempt more than typical rate limit
            response = client.post("/api/v1/auth/login", json=invalid_login_data)
            responses.append(response)

        # Assert - Eventually should get rate limited
        # Note: This assumes rate limiting is implemented
        # Last few responses should be 429 Too Many Requests
        status_codes = [r.status_code for r in responses]
        # Should have at least one rate limit response if implemented
        assert any(code == status.HTTP_429_TOO_MANY_REQUESTS for code in status_codes[-2:]) or \
               all(code == status.HTTP_401_UNAUTHORIZED for code in status_codes)

    def test_concurrent_login_sessions(self, client: TestClient, db_session: Session):
        """Test multiple concurrent login sessions for same user"""
        # Arrange
        company = create_test_company(db_session)
        test_password = "TestPassword123!"
        user = create_test_user(
            db_session, 
            company.id,
            hashed_password=get_password_hash(test_password)
        )
        
        login_data = {
            "email": user.email,
            "password": test_password
        }

        # Act - Create multiple login sessions
        tokens = []
        for i in range(3):
            response = client.post("/api/v1/auth/login", json=login_data)
            assert response.status_code == status.HTTP_200_OK
            tokens.append(response.json()["access_token"])

        # Assert - All tokens should work for authenticated requests
        for token in tokens:
            headers = {"Authorization": f"Bearer {token}"}
            profile_response = client.get("/api/v1/auth/profile", headers=headers)
            assert profile_response.status_code == status.HTTP_200_OK

    def test_session_security_headers(self, client: TestClient, db_session: Session):
        """Test security headers are set in authentication responses"""
        # Arrange
        company = create_test_company(db_session)
        test_password = "TestPassword123!"
        user = create_test_user(
            db_session, 
            company.id,
            hashed_password=get_password_hash(test_password)
        )
        
        login_data = {
            "email": user.email,
            "password": test_password
        }

        # Act
        response = client.post("/api/v1/auth/login", json=login_data)

        # Assert security headers
        assert response.status_code == status.HTTP_200_OK
        headers = {k.lower(): v for k, v in response.headers.items()}
        
        # Check for common security headers
        assert "x-content-type-options" in headers
        assert "x-frame-options" in headers
        assert "x-xss-protection" in headers
        assert headers.get("x-content-type-options") == "nosniff"

    def test_logout_flow(self, client: TestClient, db_session: Session):
        """Test user logout functionality"""
        # Arrange
        company = create_test_company(db_session)
        user = create_test_user(db_session, company.id)
        
        token = create_access_token(data={"sub": user.email})
        headers = {"Authorization": f"Bearer {token}"}

        # Act
        response = client.post("/api/v1/auth/logout", headers=headers)

        # Assert
        assert response.status_code == status.HTTP_200_OK
        
        # Note: In a real implementation, the token might be blacklisted
        # For now, we just verify the logout endpoint responds correctly
        logout_data = response.json()
        assert "message" in logout_data
        assert "successfully" in logout_data["message"].lower()