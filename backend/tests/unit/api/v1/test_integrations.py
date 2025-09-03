"""
Test cases for Integrations API endpoints
"""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import Mock

from app.main import app
from app.core.auth import get_current_user
from app.infrastructure.database.models import User

client = TestClient(app)


# Test fixtures
@pytest.fixture
def mock_user():
    """Mock authenticated user"""
    user = Mock(spec=User)
    user.id = "test_user_123"
    user.email = "test@example.com"
    user.full_name = "Test User"
    user.company_id = "company_123"
    user.is_active = True
    return user


@pytest.fixture
def mock_auth(mock_user):
    """Mock authentication dependency"""
    def _mock_get_current_user():
        return mock_user
    
    app.dependency_overrides[get_current_user] = _mock_get_current_user
    yield
    app.dependency_overrides.clear()


# Test Cases
class TestGetIntegrations:
    """Test GET /api/v1/integrations/"""
    
    def test_get_integrations_success(self, mock_auth):
        """Test successful retrieval of integrations"""
        response = client.get("/api/v1/integrations/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # Check structure of integrations
        if data:
            integration = data[0]
            required_fields = [
                "id", "name", "description", "category", "provider",
                "status", "is_popular", "is_premium", "setup_time_minutes",
                "connections_count", "rating", "price_tier", "features"
            ]
            for field in required_fields:
                assert field in integration
    
    def test_get_integrations_with_filters(self, mock_auth):
        """Test integrations retrieval with filters"""
        params = {
            "category": "accounting",
            "status": "available",
            "price_tier": "free",
            "popular_only": True,
            "search": "xero"
        }
        
        response = client.get("/api/v1/integrations/", params=params)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_integrations_category_filter(self, mock_auth):
        """Test filtering by category"""
        categories = ["crm", "accounting", "storage", "communication", "hr", "legal"]
        
        for category in categories:
            response = client.get(f"/api/v1/integrations/?category={category}")
            assert response.status_code == 200
            data = response.json()
            
            # Check that all returned integrations match the category
            for integration in data:
                assert integration["category"] == category
    
    def test_get_integrations_status_filter(self, mock_auth):
        """Test filtering by status"""
        statuses = ["connected", "available", "pending", "error"]
        
        for status in statuses:
            response = client.get(f"/api/v1/integrations/?status={status}")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
    
    def test_get_integrations_popular_only(self, mock_auth):
        """Test filtering for popular integrations only"""
        response = client.get("/api/v1/integrations/?popular_only=true")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that all returned integrations are popular
        for integration in data:
            assert integration["is_popular"] is True
    
    def test_get_integrations_search(self, mock_auth):
        """Test search functionality"""
        response = client.get("/api/v1/integrations/?search=xero")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_integrations_unauthenticated(self):
        """Test unauthenticated request"""
        response = client.get("/api/v1/integrations/")
        
        assert response.status_code == 401


class TestGetIntegration:
    """Test GET /api/v1/integrations/{integration_id}"""
    
    def test_get_integration_success(self, mock_auth):
        """Test successful retrieval of specific integration"""
        integration_id = "1"  # Using mock data ID
        response = client.get(f"/api/v1/integrations/{integration_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == integration_id
        required_fields = [
            "name", "description", "category", "provider",
            "status", "features", "rating", "price_tier"
        ]
        for field in required_fields:
            assert field in data
    
    def test_get_integration_not_found(self, mock_auth):
        """Test integration not found"""
        integration_id = "nonexistent"
        response = client.get(f"/api/v1/integrations/{integration_id}")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
    
    def test_get_integration_unauthenticated(self):
        """Test unauthenticated request"""
        response = client.get("/api/v1/integrations/1")
        
        assert response.status_code == 401


class TestConnectIntegration:
    """Test POST /api/v1/integrations/{integration_id}/connect"""
    
    def test_connect_integration_success(self, mock_auth):
        """Test successful integration connection"""
        integration_id = "1"
        connection_data = {
            "configuration": {
                "api_key": "test_api_key",
                "account_id": "test_account"
            },
            "api_key": "test_api_key"
        }
        
        response = client.post(f"/api/v1/integrations/{integration_id}/connect", json=connection_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        result_data = data["data"]
        
        assert result_data["integration_id"] == integration_id
        assert result_data["status"] == "connected"
        assert "connection_id" in result_data
        assert "connected_at" in result_data
    
    def test_connect_integration_minimal_config(self, mock_auth):
        """Test connection with minimal configuration"""
        integration_id = "4"  # Google Drive (no API key required)
        connection_data = {
            "configuration": {}
        }
        
        response = client.post(f"/api/v1/integrations/{integration_id}/connect", json=connection_data)
        
        assert response.status_code == 200
    
    def test_connect_integration_with_webhook(self, mock_auth):
        """Test connection with webhook URL"""
        integration_id = "5"  # Slack
        connection_data = {
            "configuration": {
                "api_key": "test_api_key"
            },
            "webhook_url": "https://hooks.slack.com/services/test"
        }
        
        response = client.post(f"/api/v1/integrations/{integration_id}/connect", json=connection_data)
        
        assert response.status_code == 200
    
    def test_connect_integration_empty_body(self, mock_auth):
        """Test connection with empty request body"""
        integration_id = "1"
        
        response = client.post(f"/api/v1/integrations/{integration_id}/connect", json={})
        
        assert response.status_code == 200  # Should work with defaults
    
    def test_connect_integration_unauthenticated(self):
        """Test unauthenticated request"""
        integration_id = "1"
        connection_data = {"configuration": {}}
        
        response = client.post(f"/api/v1/integrations/{integration_id}/connect", json=connection_data)
        
        assert response.status_code == 401


class TestDisconnectIntegration:
    """Test DELETE /api/v1/integrations/{integration_id}/disconnect"""
    
    def test_disconnect_integration_success(self, mock_auth):
        """Test successful integration disconnection"""
        integration_id = "2"  # Connected integration from mock data
        response = client.delete(f"/api/v1/integrations/{integration_id}/disconnect")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        result_data = data["data"]
        
        assert result_data["integration_id"] == integration_id
        assert "disconnected_at" in result_data
    
    def test_disconnect_integration_not_connected(self, mock_auth):
        """Test disconnecting a non-connected integration"""
        integration_id = "1"  # Available but not connected
        response = client.delete(f"/api/v1/integrations/{integration_id}/disconnect")
        
        # Mock implementation returns success regardless
        assert response.status_code == 200
    
    def test_disconnect_integration_unauthenticated(self):
        """Test unauthenticated request"""
        integration_id = "2"
        response = client.delete(f"/api/v1/integrations/{integration_id}/disconnect")
        
        assert response.status_code == 401


class TestConfigureIntegration:
    """Test PUT /api/v1/integrations/{integration_id}/configure"""
    
    def test_configure_integration_success(self, mock_auth):
        """Test successful integration configuration"""
        integration_id = "2"
        config_data = {
            "configuration": {
                "api_key": "updated_api_key",
                "portal_id": "new_portal_id",
                "sync_frequency": "daily"
            }
        }
        
        response = client.put(f"/api/v1/integrations/{integration_id}/configure", json=config_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        result_data = data["data"]
        
        assert result_data["integration_id"] == integration_id
        assert "updated_at" in result_data
    
    def test_configure_integration_with_webhook(self, mock_auth):
        """Test configuration update with webhook"""
        integration_id = "5"
        config_data = {
            "configuration": {
                "api_key": "updated_key"
            },
            "webhook_url": "https://hooks.slack.com/services/updated"
        }
        
        response = client.put(f"/api/v1/integrations/{integration_id}/configure", json=config_data)
        
        assert response.status_code == 200
    
    def test_configure_integration_empty_config(self, mock_auth):
        """Test configuration with empty config"""
        integration_id = "2"
        config_data = {
            "configuration": {}
        }
        
        response = client.put(f"/api/v1/integrations/{integration_id}/configure", json=config_data)
        
        assert response.status_code == 200
    
    def test_configure_integration_unauthenticated(self):
        """Test unauthenticated request"""
        integration_id = "2"
        config_data = {"configuration": {}}
        
        response = client.put(f"/api/v1/integrations/{integration_id}/configure", json=config_data)
        
        assert response.status_code == 401


class TestGetSyncStatus:
    """Test GET /api/v1/integrations/{integration_id}/sync-status"""
    
    def test_get_sync_status_success(self, mock_auth):
        """Test successful sync status retrieval"""
        integration_id = "2"  # Connected integration
        response = client.get(f"/api/v1/integrations/{integration_id}/sync-status")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        sync_data = data["data"]
        
        required_fields = [
            "integration_id", "status", "last_sync", "next_sync",
            "sync_frequency", "records_synced"
        ]
        for field in required_fields:
            assert field in sync_data
    
    def test_get_sync_status_with_error(self, mock_auth):
        """Test sync status with error"""
        integration_id = "7"  # Error integration from mock data
        response = client.get(f"/api/v1/integrations/{integration_id}/sync-status")
        
        assert response.status_code == 200
        data = response.json()
        
        sync_data = data["data"]
        assert "error_message" in sync_data
    
    def test_get_sync_status_not_connected(self, mock_auth):
        """Test sync status for non-connected integration"""
        integration_id = "1"  # Not connected
        response = client.get(f"/api/v1/integrations/{integration_id}/sync-status")
        
        assert response.status_code == 404
    
    def test_get_sync_status_unauthenticated(self):
        """Test unauthenticated request"""
        integration_id = "2"
        response = client.get(f"/api/v1/integrations/{integration_id}/sync-status")
        
        assert response.status_code == 401


class TestTriggerSync:
    """Test POST /api/v1/integrations/{integration_id}/sync"""
    
    def test_trigger_sync_success(self, mock_auth):
        """Test successful sync trigger"""
        integration_id = "2"
        response = client.post(f"/api/v1/integrations/{integration_id}/sync")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        sync_data = data["data"]
        
        assert sync_data["integration_id"] == integration_id
        assert "sync_job_id" in sync_data
        assert "estimated_completion" in sync_data
    
    def test_trigger_sync_not_connected(self, mock_auth):
        """Test triggering sync for non-connected integration"""
        integration_id = "1"  # Not connected
        response = client.post(f"/api/v1/integrations/{integration_id}/sync")
        
        # Mock implementation returns success regardless
        assert response.status_code == 200
    
    def test_trigger_sync_unauthenticated(self):
        """Test unauthenticated request"""
        integration_id = "2"
        response = client.post(f"/api/v1/integrations/{integration_id}/sync")
        
        assert response.status_code == 401


class TestGetIntegrationStats:
    """Test GET /api/v1/integrations/stats/summary"""
    
    def test_get_integration_stats_success(self, mock_auth):
        """Test successful retrieval of integration statistics"""
        response = client.get("/api/v1/integrations/stats/summary")
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "total_available", "connected_count", "available_count",
            "error_count", "pending_count", "by_category", "by_status",
            "most_popular"
        ]
        for field in required_fields:
            assert field in data
        
        # Check data types
        assert isinstance(data["total_available"], int)
        assert isinstance(data["connected_count"], int)
        assert isinstance(data["by_category"], dict)
        assert isinstance(data["by_status"], dict)
        assert isinstance(data["most_popular"], list)
    
    def test_get_integration_stats_structure(self, mock_auth):
        """Test integration stats structure"""
        response = client.get("/api/v1/integrations/stats/summary")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check by_status structure
        by_status = data["by_status"]
        expected_statuses = ["connected", "available", "error", "pending"]
        for status in expected_statuses:
            assert status in by_status
            assert isinstance(by_status[status], int)
        
        # Check most_popular structure
        if data["most_popular"]:
            popular = data["most_popular"][0]
            assert "name" in popular
            assert "connections" in popular
            assert "rating" in popular
    
    def test_get_integration_stats_unauthenticated(self):
        """Test unauthenticated request"""
        response = client.get("/api/v1/integrations/stats/summary")
        
        assert response.status_code == 401


class TestGetIntegrationCategories:
    """Test GET /api/v1/integrations/categories/list"""
    
    def test_get_integration_categories_success(self, mock_auth):
        """Test successful retrieval of integration categories"""
        response = client.get("/api/v1/integrations/categories/list")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        result_data = data["data"]
        
        assert "categories" in result_data
        categories = result_data["categories"]
        
        # Check expected categories
        expected_categories = ["crm", "accounting", "storage", "communication", "hr", "productivity", "legal", "analytics"]
        category_values = [cat["value"] for cat in categories]
        
        for expected_cat in expected_categories:
            assert expected_cat in category_values
        
        # Check category structure
        if categories:
            category = categories[0]
            required_fields = ["value", "name", "description"]
            for field in required_fields:
                assert field in category
    
    def test_get_integration_categories_unauthenticated(self):
        """Test unauthenticated request"""
        response = client.get("/api/v1/integrations/categories/list")
        
        assert response.status_code == 401


class TestIntegrationEndpointsIntegration:
    """Integration tests for integration endpoints"""
    
    def test_integration_management_workflow(self, mock_auth):
        """Test complete integration management workflow"""
        # 1. Get integration stats
        stats_response = client.get("/api/v1/integrations/stats/summary")
        assert stats_response.status_code == 200
        
        # 2. Get categories
        categories_response = client.get("/api/v1/integrations/categories/list")
        assert categories_response.status_code == 200
        
        # 3. Get all integrations
        integrations_response = client.get("/api/v1/integrations/")
        assert integrations_response.status_code == 200
        integrations = integrations_response.json()
        
        if integrations:
            integration_id = integrations[0]["id"]
            
            # 4. Get specific integration
            integration_response = client.get(f"/api/v1/integrations/{integration_id}")
            assert integration_response.status_code == 200
            
            # 5. Connect integration
            connection_data = {"configuration": {"api_key": "test_key"}}
            connect_response = client.post(f"/api/v1/integrations/{integration_id}/connect", json=connection_data)
            assert connect_response.status_code == 200
            
            # 6. Configure integration
            config_data = {"configuration": {"api_key": "updated_key"}}
            config_response = client.put(f"/api/v1/integrations/{integration_id}/configure", json=config_data)
            assert config_response.status_code == 200
            
            # 7. Get sync status
            sync_status_response = client.get(f"/api/v1/integrations/{integration_id}/sync-status")
            # This might return 404 for newly connected integrations in mock
            assert sync_status_response.status_code in [200, 404]
            
            # 8. Trigger sync
            sync_response = client.post(f"/api/v1/integrations/{integration_id}/sync")
            assert sync_response.status_code == 200
            
            # 9. Disconnect integration
            disconnect_response = client.delete(f"/api/v1/integrations/{integration_id}/disconnect")
            assert disconnect_response.status_code == 200
    
    def test_integration_filtering_consistency(self, mock_auth):
        """Test consistency of integration filtering"""
        # Get all integrations
        all_response = client.get("/api/v1/integrations/")
        assert all_response.status_code == 200
        all_integrations = all_response.json()
        
        # Test category filtering
        categories = set(integration["category"] for integration in all_integrations)
        for category in categories:
            filtered_response = client.get(f"/api/v1/integrations/?category={category}")
            assert filtered_response.status_code == 200
            filtered_integrations = filtered_response.json()
            
            # All filtered integrations should match the category
            for integration in filtered_integrations:
                assert integration["category"] == category


class TestIntegrationSecurity:
    """Security tests for integration endpoints"""
    
    def test_integration_endpoints_require_authentication(self):
        """Test that all integration endpoints require authentication"""
        endpoints = [
            ("/api/v1/integrations/", "GET"),
            ("/api/v1/integrations/1", "GET"),
            ("/api/v1/integrations/1/connect", "POST"),
            ("/api/v1/integrations/1/disconnect", "DELETE"),
            ("/api/v1/integrations/1/configure", "PUT"),
            ("/api/v1/integrations/1/sync-status", "GET"),
            ("/api/v1/integrations/1/sync", "POST"),
            ("/api/v1/integrations/stats/summary", "GET"),
            ("/api/v1/integrations/categories/list", "GET")
        ]
        
        for endpoint, method in endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={"configuration": {}})
            elif method == "PUT":
                response = client.put(endpoint, json={"configuration": {}})
            elif method == "DELETE":
                response = client.delete(endpoint)
            
            assert response.status_code == 401, f"Endpoint {method} {endpoint} should require authentication"


class TestIntegrationValidation:
    """Validation tests for integration endpoints"""
    
    def test_connect_integration_validation(self, mock_auth):
        """Test validation of connection data"""
        integration_id = "1"
        
        # Test with valid data
        valid_data = {
            "configuration": {
                "api_key": "test_key"
            }
        }
        response = client.post(f"/api/v1/integrations/{integration_id}/connect", json=valid_data)
        assert response.status_code == 200
        
        # Test with invalid JSON structure should still work (mock implementation)
        response = client.post(f"/api/v1/integrations/{integration_id}/connect", json={})
        assert response.status_code == 200
    
    def test_configure_integration_validation(self, mock_auth):
        """Test validation of configuration data"""
        integration_id = "2"
        
        # Test with valid data
        valid_data = {
            "configuration": {
                "setting1": "value1",
                "setting2": "value2"
            }
        }
        response = client.put(f"/api/v1/integrations/{integration_id}/configure", json=valid_data)
        assert response.status_code == 200
        
        # Test missing configuration should fail
        response = client.put(f"/api/v1/integrations/{integration_id}/configure", json={})
        assert response.status_code == 422
    
    def test_invalid_integration_id(self, mock_auth):
        """Test handling of invalid integration IDs"""
        invalid_id = "invalid_integration_id"
        
        # Most endpoints should return 404 for invalid IDs
        response = client.get(f"/api/v1/integrations/{invalid_id}")
        assert response.status_code == 404
        
        # Connect should still work (mock implementation)
        response = client.post(f"/api/v1/integrations/{invalid_id}/connect", json={"configuration": {}})
        assert response.status_code == 200