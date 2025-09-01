"""
Basic Functionality Tests for Pactoria MVP Backend
Tests the core API endpoints to ensure they work correctly
"""
import pytest
from fastapi.testclient import TestClient


class TestBasicEndpoints:
    """Test basic API endpoints work"""

    def test_root_endpoint(self, client):
        """Test the root endpoint returns expected data"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert data["name"] == "Pactoria Contract Management"

    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_api_status_endpoint(self, client):
        """Test API status endpoint"""
        response = client.get("/api/v1/status/")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "operational"
        assert "features" in data
        assert "core_capabilities" in data
        
        # Check required features exist
        required_features = [
            "contract_generation",
            "uk_legal_compliance", 
            "document_management",
            "user_authentication"
        ]
        
        for feature in required_features:
            assert feature in data["features"]
            assert data["features"][feature] is True

    def test_api_features_endpoint(self, client):
        """Test API features listing"""
        response = client.get("/api/v1/status/features")
        assert response.status_code == 200
        data = response.json()
        
        # Check main feature categories exist
        assert "authentication" in data
        assert "contracts" in data
        assert "analytics" in data
        assert "security" in data


class TestAuthentication:
    """Test authentication functionality"""

    def test_user_registration(self, client, test_database):
        """Test user can register successfully"""
        import uuid
        unique_email = f"testuser-{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": unique_email,
            "password": "TestPassword123!",
            "full_name": "Test User",
            "company_name": "Test Company"
        }
        
        response = client.post("/api/v1/auth/register", json=user_data)
        assert response.status_code == 201
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == user_data["email"]

    def test_user_login_with_valid_credentials(self, client, test_database):
        """Test user can login with valid credentials"""
        # First register a user
        import uuid
        unique_email = f"logintest-{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": unique_email,
            "password": "TestPassword123!",
            "full_name": "Login Test User",
            "company_name": "Login Test Company"
        }
        client.post("/api/v1/auth/register", json=user_data)
        
        # Then try to login
        login_data = {
            "email": unique_email,
            "password": "TestPassword123!"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data

    def test_user_login_with_invalid_credentials(self):
        """Test login fails with invalid credentials"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/v1/auth/login", json=login_data)
        assert response.status_code == 401

    def test_protected_endpoint_without_auth(self, client):
        """Test protected endpoints require authentication"""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_protected_endpoint_with_auth(self, client, test_database):
        """Test protected endpoints work with valid authentication"""
        # Register and get token
        import uuid
        unique_email = f"authtest-{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": unique_email,
            "password": "TestPassword123!",
            "full_name": "Auth Test User",
            "company_name": "Auth Test Company"
        }
        response = client.post("/api/v1/auth/register", json=user_data)
        token = response.json()["token"]["access_token"]
        
        # Use token to access protected endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/v1/auth/me", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == unique_email


class TestTemplates:
    """Test template functionality"""

    def test_list_templates(self, client, test_database):
        """Test listing available templates"""
        response = client.get("/api/v1/contracts/templates/")
        assert response.status_code == 200
        
        templates = response.json()
        assert isinstance(templates, list)
        
        # Should have 20+ UK templates as per MVP requirements
        assert len(templates) >= 20
        
        # Check template structure
        if templates:
            template = templates[0]
            assert "id" in template
            assert "name" in template
            assert "contract_type" in template
            assert "description" in template

    def test_filter_templates_by_type(self, client, test_database):
        """Test filtering templates by contract type"""
        response = client.get("/api/v1/contracts/templates/?contract_type=service_agreement")
        assert response.status_code == 200
        
        templates = response.json()
        assert isinstance(templates, list)
        
        # All returned templates should be service agreements
        for template in templates:
            assert template["contract_type"] == "service_agreement"


class TestContracts:
    """Test contract functionality"""

    @pytest.fixture
    def authenticated_user(self, client, test_database):
        """Create an authenticated user for contract tests"""
        import uuid
        unique_email = f"contracttest-{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": unique_email, 
            "password": "TestPassword123!",
            "full_name": "Contract Test User",
            "company_name": "Test Company"
        }
        response = client.post("/api/v1/auth/register", json=user_data)
        token = response.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        return {"token": token, "headers": headers, "email": unique_email}

    def test_create_contract(self, client, authenticated_user):
        """Test creating a new contract"""
        contract_data = {
            "title": "Test Service Agreement",
            "contract_type": "service_agreement",
            "plain_english_input": "I need a contract for web design services",
            "client_name": "Test Client",
            "contract_value": 5000.0,
            "currency": "GBP"
        }
        
        response = client.post("/api/v1/contracts/", json=contract_data, headers=authenticated_user["headers"])
        assert response.status_code == 201
        
        data = response.json()
        assert data["title"] == contract_data["title"]
        assert data["contract_type"] == contract_data["contract_type"]
        assert data["status"] == "draft"

    def test_list_contracts(self, client, authenticated_user):
        """Test listing user's contracts"""
        # First create a contract
        contract_data = {
            "title": "Test Contract for Listing",
            "contract_type": "service_agreement", 
            "plain_english_input": "Test contract for listing"
        }
        client.post("/api/v1/contracts/", json=contract_data, headers=authenticated_user["headers"])
        
        # Then list contracts
        response = client.get("/api/v1/contracts/", headers=authenticated_user["headers"])
        assert response.status_code == 200
        
        data = response.json()
        assert "contracts" in data
        assert "total" in data
        assert isinstance(data["contracts"], list)

    def test_get_contract_by_id(self, client, authenticated_user):
        """Test retrieving a specific contract"""
        # Create a contract
        contract_data = {
            "title": "Test Contract for Retrieval",
            "contract_type": "service_agreement",
            "plain_english_input": "Test contract for retrieval"
        }
        create_response = client.post("/api/v1/contracts/", json=contract_data, headers=authenticated_user["headers"])
        contract_id = create_response.json()["id"]
        
        # Retrieve the contract
        response = client.get(f"/api/v1/contracts/{contract_id}", headers=authenticated_user["headers"])
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == contract_id
        assert data["title"] == contract_data["title"]

    def test_update_contract(self, client, authenticated_user):
        """Test updating an existing contract"""
        # Create a contract
        contract_data = {
            "title": "Original Title",
            "contract_type": "service_agreement",
            "plain_english_input": "Original description"
        }
        create_response = client.post("/api/v1/contracts/", json=contract_data, headers=authenticated_user["headers"])
        contract_id = create_response.json()["id"]
        
        # Update the contract
        update_data = {
            "title": "Updated Title",
            "status": "active"
        }
        
        response = client.put(f"/api/v1/contracts/{contract_id}", json=update_data, headers=authenticated_user["headers"])
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["status"] == "active"


class TestAnalytics:
    """Test analytics endpoints"""
    
    @pytest.fixture
    def authenticated_analytics_user(self, client, test_database):
        """Setup authenticated user for analytics tests"""
        import uuid
        unique_email = f"analyticstest-{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": unique_email,
            "password": "TestPassword123!", 
            "full_name": "Analytics Test User",
            "company_name": "Analytics Test Company"
        }
        response = client.post("/api/v1/auth/register", json=user_data)
        token = response.json()["token"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        return {"token": token, "headers": headers, "email": unique_email}

    def test_business_metrics(self, client, authenticated_analytics_user):
        """Test business metrics endpoint"""
        response = client.get("/api/v1/analytics/business", headers=authenticated_analytics_user["headers"])
        assert response.status_code == 200
        
        data = response.json()
        assert "total_contracts" in data
        assert "active_contracts" in data
        assert "compliance_score_average" in data
        assert isinstance(data["total_contracts"], int)

    def test_user_metrics(self, client, authenticated_analytics_user):
        """Test user metrics endpoint"""
        response = client.get("/api/v1/analytics/users", headers=authenticated_analytics_user["headers"])
        assert response.status_code == 200
        
        data = response.json()
        assert "total_users" in data
        assert "active_users_30d" in data
        assert "user_engagement_score" in data

    def test_contract_type_metrics(self, client, authenticated_analytics_user):
        """Test contract type distribution metrics"""
        response = client.get("/api/v1/analytics/contract-types", headers=authenticated_analytics_user["headers"])
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check structure if data exists
        if data:
            metric = data[0]
            assert "contract_type" in metric
            assert "count" in metric
            assert "percentage" in metric


if __name__ == "__main__":
    pytest.main([__file__, "-v"])