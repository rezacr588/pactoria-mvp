"""
Integration tests for Authentication API endpoints
Testing MVP requirements for user registration, login, and company management
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock
import json

from app.main import app


class TestAuthAPI:
    """Integration tests for authentication endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_user_registration_success(self, client, sample_user_data):
        """Test successful user registration with company"""
        response = client.post(
            "/api/v1/auth/register",
            json=sample_user_data
        )
        
        assert response.status_code == 201
        data = response.json()
        
        # Verify response structure (updated for actual API structure)
        assert "token" in data
        assert "user" in data
        
        # Verify token details  
        token = data["token"]
        assert "access_token" in token
        assert "token_type" in token
        assert token["token_type"] == "bearer"
        
        # Verify user details
        user = data["user"]
        assert user["email"] == sample_user_data["email"]
        assert user["full_name"] == sample_user_data["full_name"]
        assert user["is_active"] is True
        assert user["company_id"] is not None  # Company should be created
    
    def test_user_registration_without_company(self, client):
        """Test user registration without creating a company"""
        user_data = {
            "email": "solo@example.com",
            "password": "password123",
            "full_name": "Solo User"
            # No company data
        }
        
        response = client.post(
            "/api/v1/auth/register",
            json=user_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        user = data["user"]
        assert user["company_id"] is None
    
    def test_user_registration_duplicate_email(self, client):
        """Test registration with already existing email"""
        # First registration
        user_data = {
            "email": "duplicate@example.com",
            "password": "password123",
            "full_name": "First User",
        "company_name": "Test Company Ltd"
        }
        
        response1 = client.post("/api/v1/auth/register", json=user_data)
        assert response1.status_code == 200
        
        # Second registration with same email
        user_data["full_name"] = "Second User"
        response2 = client.post("/api/v1/auth/register", json=user_data)
        
        assert response2.status_code == 400
        error_data = response2.json()
        assert "already exists" in error_data["detail"]
    
    def test_user_registration_invalid_data(self, client):
        """Test registration with invalid data"""
        invalid_data = {
            "email": "invalid-email",  # Invalid email format
            "password": "123",  # Too short
            "full_name": ""  # Empty name
        }
        
        response = client.post(
            "/api/v1/auth/register",
            json=invalid_data
        )
        
        assert response.status_code == 422
        error_data = response.json()
        assert "detail" in error_data
    
    def test_user_login_success(self, client):
        """Test successful user login"""
        # Register user first
        email = f"login-{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": email,
            "password": "TestPassword123!",
            "full_name": "Login User",
            "company_name": "Test Company Ltd"
        }
        reg_response = client.post("/api/v1/auth/register", json=user_data)
        assert reg_response.status_code == 201
        
        # Login with same email
        login_data = {
            "email": email,
            "password": "TestPassword123!"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure (updated for actual API structure)
        assert "token" in data
        assert "user" in data
        
        # Verify token details
        token = data["token"]
        assert "access_token" in token
        assert "token_type" in token
        assert "expires_in" in token
        
        user = data["user"]
        assert user["email"] == login_data["email"]
        assert user["is_active"] is True
    
    def test_user_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        login_data = {
            "email": f"nonexistent-{uuid.uuid4().hex[:8]}@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        error_data = response.json()
        assert "Invalid credentials" in error_data["detail"]
    
    def test_user_login_wrong_password(self, client):
        """Test login with correct email but wrong password"""
        # Register user
        user_data = {
            "email": "wrongpass@example.com",
            "password": "correctpassword",
            "full_name": "Wrong Pass User",
        "company_name": "Test Company Ltd"
        }
        client.post("/api/v1/auth/register", json=user_data)
        
        # Login with wrong password
        login_data = {
            "email": "wrongpass@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 401
        error_data = response.json()
        assert "Invalid credentials" in error_data["detail"]
    
    def test_get_current_user_profile(self, client):
        """Test getting current user profile"""
        # Mock authentication
        with patch('app.api.v1.endpoints.auth.get_current_user') as mock_get_user:
            mock_user = {
                "id": "user-123",
                "email": "test@example.com",
                "full_name": "Test User",
                "company_id": "company-456",
                "is_active": True,
                "is_admin": True
            }
            mock_get_user.return_value = mock_user
            
            response = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": "Bearer mock_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["email"] == mock_user["email"]
            assert data["full_name"] == mock_user["full_name"]
            assert data["company_id"] == mock_user["company_id"]
            assert data["is_active"] is True
            assert data["is_admin"] is True
    
    def test_get_user_company(self, client):
        """Test getting user's company information"""
        with patch('app.api.v1.endpoints.auth.get_current_user') as mock_get_user:
            mock_user = {
                "id": "user-123",
                "email": "test@example.com",
                "company_id": "company-456",
                "is_admin": True
            }
            mock_get_user.return_value = mock_user
            
            response = client.get(
                "/api/v1/auth/company",
                headers={"Authorization": "Bearer mock_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "id" in data
            assert "name" in data
            assert "subscription_tier" in data
            assert "created_at" in data
    
    def test_get_company_no_company_associated(self, client):
        """Test getting company when user has no company"""
        with patch('app.api.v1.endpoints.auth.get_current_user') as mock_get_user:
            mock_user = {
                "id": "user-123",
                "email": "test@example.com",
                "company_id": None,  # No company
                "is_admin": False
            }
            mock_get_user.return_value = mock_user
            
            response = client.get(
                "/api/v1/auth/company",
                headers={"Authorization": "Bearer mock_token"}
            )
            
            assert response.status_code == 404
            error_data = response.json()
            assert "No company associated" in error_data["detail"]
    
    def test_update_company_as_admin(self, client):
        """Test updating company information as admin"""
        with patch('app.api.v1.endpoints.auth.get_current_user') as mock_get_user:
            mock_user = {
                "id": "user-123",
                "email": f"admin-{uuid.uuid4().hex[:8]}@example.com",
                "company_id": "company-456",
                "is_admin": True
            }
            mock_get_user.return_value = mock_user
            
            update_data = {
                "name": "Updated Company Ltd",
                "registration_number": "87654321",
                "address": "456 Updated St, London"
            }
            
            response = client.put(
                "/api/v1/auth/company",
                json=update_data,
                headers={"Authorization": "Bearer mock_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["name"] == update_data["name"]
            assert data["registration_number"] == update_data["registration_number"]
            assert data["address"] == update_data["address"]
    
    def test_update_company_as_non_admin(self, client):
        """Test updating company as non-admin user (should fail)"""
        with patch('app.api.v1.endpoints.auth.get_current_user') as mock_get_user:
            mock_user = {
                "id": "user-123",
                "email": "user@example.com",
                "company_id": "company-456",
                "is_admin": False  # Not admin
            }
            mock_get_user.return_value = mock_user
            
            update_data = {
                "name": "Unauthorized Update Ltd"
            }
            
            response = client.put(
                "/api/v1/auth/company",
                json=update_data,
                headers={"Authorization": "Bearer mock_token"}
            )
            
            assert response.status_code == 403
            error_data = response.json()
            assert "Only company admins" in error_data["detail"]
    
    def test_get_company_users(self, client):
        """Test getting all users in company"""
        with patch('app.api.v1.endpoints.auth.get_current_user') as mock_get_user:
            mock_user = {
                "id": "user-123",
                "email": f"admin-{uuid.uuid4().hex[:8]}@example.com",
                "company_id": "company-456",
                "is_admin": True
            }
            mock_get_user.return_value = mock_user
            
            response = client.get(
                "/api/v1/auth/company/users",
                headers={"Authorization": "Bearer mock_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "company_id" in data
            assert "users" in data
            assert "total_users" in data
            assert "max_users" in data
            
            assert data["company_id"] == mock_user["company_id"]
            assert isinstance(data["users"], list)
            assert data["max_users"] == 5  # MVP limit
    
    def test_logout_user(self, client):
        """Test user logout"""
        with patch('app.api.v1.endpoints.auth.get_current_user') as mock_get_user:
            mock_user = {
                "id": "user-123",
                "email": "test@example.com"
            }
            mock_get_user.return_value = mock_user
            
            response = client.post(
                "/api/v1/auth/logout",
                headers={"Authorization": "Bearer mock_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "Successfully logged out" in data["message"]
    
    def test_verify_token(self, client):
        """Test token verification endpoint"""
        with patch('app.api.v1.endpoints.auth.get_current_user') as mock_get_user:
            mock_user = {
                "id": "user-123",
                "email": "test@example.com"
            }
            mock_get_user.return_value = mock_user
            
            response = client.post(
                "/api/v1/auth/verify-token",
                headers={"Authorization": "Bearer mock_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["valid"] is True
            assert data["user_id"] == mock_user["id"]
            assert data["email"] == mock_user["email"]
    
    def test_unauthorized_access(self, client):
        """Test accessing protected endpoints without authentication"""
        protected_endpoints = [
            "/api/v1/auth/me",
            "/api/v1/auth/company",
            "/api/v1/auth/company/users",
            "/api/v1/auth/logout",
            "/api/v1/auth/verify-token"
        ]
        
        for endpoint in protected_endpoints:
            response = client.get(endpoint)  # No auth header
            assert response.status_code in [401, 422]  # Unauthorized or validation error
    
    def test_invalid_token_access(self, client):
        """Test accessing protected endpoints with invalid token"""
        with patch('app.api.v1.endpoints.auth.verify_token') as mock_verify:
            from fastapi import HTTPException, status
            mock_verify.side_effect = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
            
            response = client.get(
                "/api/v1/auth/me",
                headers={"Authorization": "Bearer invalid_token"}
            )
            
            assert response.status_code == 401
    
    @pytest.mark.parametrize("email,password,expected_status", [
        ("valid@example.com", "password123", 200),  # Valid
        ("", "password123", 422),  # Empty email
        ("invalid-email", "password123", 422),  # Invalid email format
        ("test@example.com", "", 422),  # Empty password
        ("test@example.com", "123", 422),  # Password too short
    ])
    def test_registration_validation(self, client, email, password, expected_status):
        """Test registration input validation"""
        user_data = {
            "email": email,
            "password": password,
            "full_name": "Test User",
        "company_name": "Test Company Ltd"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == expected_status
    
    def test_jwt_token_structure(self, client, sample_user_data):
        """Test JWT token structure and claims"""
        # Register and get token
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        
        assert response.status_code == 200
        data = response.json()
        
        token = data["access_token"]
        
        # Basic token structure validation
        assert isinstance(token, str)
        assert len(token) > 50  # JWT tokens are typically long
        
        # Token should have 3 parts separated by dots
        token_parts = token.split('.')
        assert len(token_parts) == 3
    
    def test_company_creation_during_registration(self, client):
        """Test that company is properly created during registration"""
        user_data = {
            "email": f"company-{uuid.uuid4().hex[:8]}@example.com",
            "password": "password123",
            "full_name": "Company Admin",
            "company": {
                "name": "Test Company Ltd",
                "registration_number": "12345678",
                "address": "123 Business St, London"
            }
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # User should have company_id
        user = data["user"]
        assert user["company_id"] is not None
        
        # Should be admin of the company
        assert user["is_admin"] is True
    
    def test_mvp_user_limits(self, client):
        """Test MVP requirement: 5 users per account"""
        with patch('app.api.v1.endpoints.auth.get_current_user') as mock_get_user:
            mock_user = {
                "company_id": "company-456"
            }
            mock_get_user.return_value = mock_user
            
            response = client.get(
                "/api/v1/auth/company/users",
                headers={"Authorization": "Bearer mock_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify MVP limit is enforced
            assert data["max_users"] == 5