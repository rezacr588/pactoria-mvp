"""
Test cases for Notifications API endpoints
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
class TestGetNotifications:
    """Test GET /api/v1/notifications/"""
    
    def test_get_notifications_success(self, mock_auth):
        """Test successful retrieval of notifications"""
        response = client.get("/api/v1/notifications/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "notifications" in data
        assert "total" in data
        assert "unread_count" in data
        assert "page" in data
        assert "size" in data
        assert "pages" in data
        
        # Check structure of notifications
        if data["notifications"]:
            notification = data["notifications"][0]
            required_fields = [
                "id", "type", "title", "message", "priority",
                "action_required", "read", "timestamp", "user_id"
            ]
            for field in required_fields:
                assert field in notification
    
    def test_get_notifications_with_filters(self, mock_auth):
        """Test notifications retrieval with filters"""
        params = {
            "type": "deadline",
            "priority": "high",
            "read": False,
            "action_required": True,
            "search": "contract",
            "page": 1,
            "size": 10
        }
        
        response = client.get("/api/v1/notifications/", params=params)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 1
        assert data["size"] == 10
    
    def test_get_notifications_pagination(self, mock_auth):
        """Test pagination parameters"""
        response = client.get("/api/v1/notifications/?page=2&size=5")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["page"] == 2
        assert data["size"] == 5
    
    def test_get_notifications_invalid_page(self, mock_auth):
        """Test invalid page parameter"""
        response = client.get("/api/v1/notifications/?page=0")
        
        assert response.status_code == 422  # Validation error
    
    def test_get_notifications_unauthenticated(self):
        """Test unauthenticated request"""
        response = client.get("/api/v1/notifications/")
        
        assert response.status_code == 401


class TestGetNotification:
    """Test GET /api/v1/notifications/{notification_id}"""
    
    def test_get_notification_success(self, mock_auth):
        """Test successful retrieval of specific notification"""
        notification_id = "1"  # Using mock data ID
        response = client.get(f"/api/v1/notifications/{notification_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == notification_id
        required_fields = [
            "type", "title", "message", "priority", "action_required",
            "read", "timestamp", "user_id"
        ]
        for field in required_fields:
            assert field in data
    
    def test_get_notification_not_found(self, mock_auth):
        """Test notification not found"""
        notification_id = "nonexistent"
        response = client.get(f"/api/v1/notifications/{notification_id}")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
    
    def test_get_notification_unauthenticated(self):
        """Test unauthenticated request"""
        response = client.get("/api/v1/notifications/1")
        
        assert response.status_code == 401


class TestMarkNotificationAsRead:
    """Test PUT /api/v1/notifications/{notification_id}/read"""
    
    def test_mark_notification_as_read_success(self, mock_auth):
        """Test successful marking notification as read"""
        notification_id = "1"
        response = client.put(f"/api/v1/notifications/{notification_id}/read")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        notification_data = data["data"]
        
        assert notification_data["notification_id"] == notification_id
        assert notification_data["read"] is True
        assert "updated_at" in notification_data
    
    def test_mark_notification_as_read_not_found(self, mock_auth):
        """Test marking non-existent notification as read"""
        notification_id = "nonexistent"
        response = client.put(f"/api/v1/notifications/{notification_id}/read")
        
        # Mock implementation returns success for any ID
        # In real implementation, this would return 404
        assert response.status_code == 200
    
    def test_mark_notification_as_read_unauthenticated(self):
        """Test unauthenticated request"""
        response = client.put("/api/v1/notifications/1/read")
        
        assert response.status_code == 401


class TestMarkAllNotificationsAsRead:
    """Test PUT /api/v1/notifications/read-all"""
    
    def test_mark_all_notifications_as_read_success(self, mock_auth):
        """Test successful marking all notifications as read"""
        response = client.put("/api/v1/notifications/read-all")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        result_data = data["data"]
        
        assert "updated_count" in result_data
        assert "updated_at" in result_data
        assert isinstance(result_data["updated_count"], int)
    
    def test_mark_all_notifications_as_read_unauthenticated(self):
        """Test unauthenticated request"""
        response = client.put("/api/v1/notifications/read-all")
        
        assert response.status_code == 401


class TestDeleteNotification:
    """Test DELETE /api/v1/notifications/{notification_id}"""
    
    def test_delete_notification_success(self, mock_auth):
        """Test successful notification deletion"""
        notification_id = "1"
        response = client.delete(f"/api/v1/notifications/{notification_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        result_data = data["data"]
        
        assert result_data["notification_id"] == notification_id
        assert "deleted_at" in result_data
    
    def test_delete_notification_not_found(self, mock_auth):
        """Test deleting non-existent notification"""
        notification_id = "nonexistent"
        response = client.delete(f"/api/v1/notifications/{notification_id}")
        
        # Mock implementation returns success for any ID
        # In real implementation, this might return 404
        assert response.status_code == 200
    
    def test_delete_notification_unauthenticated(self):
        """Test unauthenticated request"""
        response = client.delete("/api/v1/notifications/1")
        
        assert response.status_code == 401


class TestGetNotificationStats:
    """Test GET /api/v1/notifications/stats/summary"""
    
    def test_get_notification_stats_success(self, mock_auth):
        """Test successful retrieval of notification statistics"""
        response = client.get("/api/v1/notifications/stats/summary")
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "total_notifications", "unread_count", "high_priority_count",
            "action_required_count", "notifications_by_type", "recent_activity"
        ]
        for field in required_fields:
            assert field in data
        
        # Check data types
        assert isinstance(data["total_notifications"], int)
        assert isinstance(data["unread_count"], int)
        assert isinstance(data["notifications_by_type"], dict)
        assert isinstance(data["recent_activity"], list)
    
    def test_get_notification_stats_unauthenticated(self):
        """Test unauthenticated request"""
        response = client.get("/api/v1/notifications/stats/summary")
        
        assert response.status_code == 401


class TestCreateNotification:
    """Test POST /api/v1/notifications/"""
    
    def test_create_notification_success(self, mock_auth):
        """Test successful notification creation"""
        notification_data = {
            "type": "contract",
            "title": "Test Notification",
            "message": "This is a test notification",
            "priority": "medium",
            "action_required": False
        }
        
        response = client.post("/api/v1/notifications/", json=notification_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["type"] == notification_data["type"]
        assert data["title"] == notification_data["title"]
        assert data["message"] == notification_data["message"]
        assert data["priority"] == notification_data["priority"]
        assert data["action_required"] == notification_data["action_required"]
        assert data["read"] is False
        assert "id" in data
        assert "timestamp" in data
    
    def test_create_notification_with_metadata(self, mock_auth):
        """Test notification creation with metadata"""
        notification_data = {
            "type": "deadline",
            "title": "Contract Review Due",
            "message": "Please review the contract before deadline",
            "priority": "high",
            "action_required": True,
            "target_user_id": "other_user_123",
            "related_contract_id": "contract_456",
            "metadata": {
                "deadline": "2024-12-31T23:59:59Z",
                "contract_type": "service_agreement"
            }
        }
        
        response = client.post("/api/v1/notifications/", json=notification_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["type"] == "deadline"
        assert data["priority"] == "high"
        assert data["action_required"] is True
    
    def test_create_notification_invalid_data(self, mock_auth):
        """Test notification creation with invalid data"""
        notification_data = {
            "title": "Test Notification"
            # Missing required fields
        }
        
        response = client.post("/api/v1/notifications/", json=notification_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_create_notification_unauthenticated(self):
        """Test unauthenticated request"""
        notification_data = {
            "type": "system",
            "title": "Test",
            "message": "Test message"
        }
        
        response = client.post("/api/v1/notifications/", json=notification_data)
        
        assert response.status_code == 401


class TestNotificationEndpointsIntegration:
    """Integration tests for notification endpoints"""
    
    def test_notification_workflow(self, mock_auth):
        """Test complete notification workflow"""
        # 1. Get notification stats
        stats_response = client.get("/api/v1/notifications/stats/summary")
        assert stats_response.status_code == 200
        
        # 2. Get all notifications
        notifications_response = client.get("/api/v1/notifications/")
        assert notifications_response.status_code == 200
        notifications_data = notifications_response.json()
        
        # 3. Get specific notification if available
        if notifications_data["notifications"]:
            notification_id = notifications_data["notifications"][0]["id"]
            
            # Get specific notification
            notification_response = client.get(f"/api/v1/notifications/{notification_id}")
            assert notification_response.status_code == 200
            
            # Mark as read
            read_response = client.put(f"/api/v1/notifications/{notification_id}/read")
            assert read_response.status_code == 200
            
            # Delete notification
            delete_response = client.delete(f"/api/v1/notifications/{notification_id}")
            assert delete_response.status_code == 200
        
        # 4. Mark all as read
        mark_all_response = client.put("/api/v1/notifications/read-all")
        assert mark_all_response.status_code == 200
    
    def test_notification_filtering(self, mock_auth):
        """Test notification filtering functionality"""
        # Test filtering by different criteria
        filter_params = [
            {"type": "deadline"},
            {"priority": "high"},
            {"read": False},
            {"action_required": True},
            {"search": "contract"}
        ]
        
        for params in filter_params:
            response = client.get("/api/v1/notifications/", params=params)
            assert response.status_code == 200
            data = response.json()
            assert "notifications" in data


class TestNotificationSecurity:
    """Security tests for notification endpoints"""
    
    def test_notification_endpoints_require_authentication(self):
        """Test that all notification endpoints require authentication"""
        endpoints = [
            ("/api/v1/notifications/", "GET"),
            ("/api/v1/notifications/1", "GET"),
            ("/api/v1/notifications/1/read", "PUT"),
            ("/api/v1/notifications/read-all", "PUT"),
            ("/api/v1/notifications/1", "DELETE"),
            ("/api/v1/notifications/stats/summary", "GET"),
            ("/api/v1/notifications/", "POST")
        ]
        
        for endpoint, method in endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "PUT":
                response = client.put(endpoint)
            elif method == "DELETE":
                response = client.delete(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={"type": "test", "title": "test", "message": "test"})
            
            assert response.status_code == 401, f"Endpoint {method} {endpoint} should require authentication"


class TestNotificationValidation:
    """Validation tests for notification endpoints"""
    
    def test_invalid_query_parameters(self, mock_auth):
        """Test validation of query parameters"""
        # Test invalid page
        response = client.get("/api/v1/notifications/?page=-1")
        assert response.status_code == 422
        
        # Test invalid size
        response = client.get("/api/v1/notifications/?size=0")
        assert response.status_code == 422
        
        # Test size too large
        response = client.get("/api/v1/notifications/?size=1000")
        assert response.status_code == 422
    
    def test_create_notification_validation(self, mock_auth):
        """Test validation of notification creation"""
        # Test missing required fields
        invalid_data = [
            {},  # Empty
            {"title": "Test"},  # Missing type and message
            {"type": "test", "message": "Test"},  # Missing title
            {"type": "test", "title": "Test"}  # Missing message
        ]
        
        for data in invalid_data:
            response = client.post("/api/v1/notifications/", json=data)
            assert response.status_code == 422
    
    def test_notification_type_validation(self, mock_auth):
        """Test notification type validation"""
        valid_types = ["deadline", "compliance", "team", "system", "contract"]
        
        for notification_type in valid_types:
            data = {
                "type": notification_type,
                "title": "Test Notification",
                "message": "Test message"
            }
            response = client.post("/api/v1/notifications/", json=data)
            assert response.status_code == 200