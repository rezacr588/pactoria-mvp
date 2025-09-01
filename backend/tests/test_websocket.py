"""
Tests for WebSocket real-time functionality
Following TDD approach - tests first, then implementation
"""
import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from typing import List, Dict, Any

from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket
import websockets

from app.main import app
from app.infrastructure.database.models import User, Contract, ContractStatus
from app.schemas.websocket import (
    WebSocketMessage, MessageType, ContractUpdateMessage,
    NotificationMessage, SystemMessage, ConnectionMessage
)

# Test fixtures
@pytest.fixture
def test_user():
    return User(
        id="test-user-id",
        email="test@example.com",
        full_name="Test User",
        is_active=True,
        company_id="test-company-id",
        role="CONTRACT_MANAGER"
    )

@pytest.fixture  
def test_contract():
    return Contract(
        id="contract-123",
        title="Test Contract",
        contract_type="SERVICE_AGREEMENT",
        status=ContractStatus.DRAFT,
        plain_english_input="Test contract",
        client_name="Test Client",
        company_id="test-company-id",
        created_by="test-user-id",
        version=1,
        is_current_version=True
    )

@pytest.fixture
def client():
    return TestClient(app)


class TestWebSocketConnection:
    """Test WebSocket connection management"""

    @pytest.mark.asyncio
    async def test_websocket_connection_should_authenticate_user(self, test_user):
        """Test WebSocket connection requires authentication"""
        # Given
        mock_websocket = AsyncMock(spec=WebSocket)
        
        # Mock authentication
        with patch('app.core.auth.authenticate_websocket_user', return_value=test_user) as mock_auth:
            from app.api.v1.websocket import websocket_endpoint
            
            # When
            await websocket_endpoint(mock_websocket, token="valid-token")
            
            # Then
            mock_auth.assert_called_once_with("valid-token")
            mock_websocket.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_websocket_connection_should_reject_invalid_token(self):
        """Test WebSocket connection rejects invalid authentication"""
        # Given
        mock_websocket = AsyncMock(spec=WebSocket)
        
        # Mock authentication failure
        with patch('app.core.auth.authenticate_websocket_user', side_effect=Exception("Invalid token")):
            from app.api.v1.websocket import websocket_endpoint
            
            # When/Then
            with pytest.raises(Exception):
                await websocket_endpoint(mock_websocket, token="invalid-token")

    @pytest.mark.asyncio
    async def test_websocket_should_handle_connection_cleanup(self, test_user):
        """Test WebSocket connection cleanup on disconnect"""
        # Given
        mock_websocket = AsyncMock(spec=WebSocket)
        
        # Mock authentication and connection manager
        with patch('app.core.auth.authenticate_websocket_user', return_value=test_user), \
             patch('app.services.websocket_service.websocket_manager') as mock_manager:
            
            from app.api.v1.websocket import websocket_endpoint
            
            # When
            await websocket_endpoint(mock_websocket, token="valid-token")
            
            # Then
            mock_manager.connect.assert_called()
            mock_manager.disconnect.assert_called()

    @pytest.mark.asyncio
    async def test_websocket_should_handle_company_isolation(self, test_user):
        """Test WebSocket connections respect company boundaries"""
        # Given
        mock_websocket = AsyncMock(spec=WebSocket)
        
        with patch('app.core.auth.authenticate_websocket_user', return_value=test_user), \
             patch('app.services.websocket_service.websocket_manager') as mock_manager:
            
            from app.api.v1.websocket import websocket_endpoint
            
            # When
            await websocket_endpoint(mock_websocket, token="valid-token")
            
            # Then - Should connect to company-specific room
            mock_manager.connect.assert_called_with(
                mock_websocket, test_user.id, test_user.company_id
            )


class TestRealTimeContractUpdates:
    """Test real-time contract update notifications"""

    @pytest.mark.asyncio
    async def test_contract_update_should_notify_company_users(self, test_user, test_contract):
        """Test contract updates notify all users in same company"""
        # Given
        update_message = ContractUpdateMessage(
            contract_id=test_contract.id,
            contract_title=test_contract.title,
            updated_by=test_user.id,
            updated_by_name=test_user.full_name,
            changes={
                "status": {"old": "DRAFT", "new": "ACTIVE"}
            },
            timestamp=datetime.now()
        )
        
        # Mock WebSocket manager
        with patch('app.services.websocket_service.websocket_manager') as mock_manager:
            from app.services.websocket_service import broadcast_contract_update
            
            # When
            await broadcast_contract_update(update_message, test_user.company_id)
            
            # Then
            mock_manager.broadcast_to_company.assert_called_once_with(
                test_user.company_id, update_message.dict()
            )

    @pytest.mark.asyncio
    async def test_contract_status_change_should_trigger_notification(self, test_user, test_contract):
        """Test contract status changes trigger real-time notifications"""
        # Given - contract status change
        old_status = test_contract.status
        new_status = ContractStatus.ACTIVE
        
        # Mock notification service
        with patch('app.services.websocket_service.broadcast_contract_update') as mock_broadcast:
            from app.services.notification_service import notify_contract_status_change
            
            # When
            await notify_contract_status_change(
                contract=test_contract,
                old_status=old_status,
                new_status=new_status,
                updated_by=test_user
            )
            
            # Then
            mock_broadcast.assert_called_once()
            call_args = mock_broadcast.call_args[0]
            message = call_args[0]
            assert message.contract_id == test_contract.id
            assert message.changes["status"]["old"] == old_status.value
            assert message.changes["status"]["new"] == new_status.value

    @pytest.mark.asyncio
    async def test_contract_creation_should_notify_team_members(self, test_user, test_contract):
        """Test contract creation notifies relevant team members"""
        # Given - new contract creation
        creation_message = ContractUpdateMessage(
            contract_id=test_contract.id,
            contract_title=test_contract.title,
            updated_by=test_user.id,
            updated_by_name=test_user.full_name,
            changes={"created": True},
            timestamp=datetime.now()
        )
        
        # Mock WebSocket manager
        with patch('app.services.websocket_service.websocket_manager') as mock_manager:
            from app.services.websocket_service import broadcast_contract_creation
            
            # When
            await broadcast_contract_creation(creation_message, test_user.company_id)
            
            # Then
            mock_manager.broadcast_to_company.assert_called_once()


class TestNotificationSystem:
    """Test real-time notification system"""

    @pytest.mark.asyncio
    async def test_system_notification_should_broadcast_to_all_users(self, test_user):
        """Test system notifications broadcast to all users"""
        # Given
        system_message = SystemMessage(
            message="System maintenance scheduled",
            level="INFO",
            timestamp=datetime.now()
        )
        
        # Mock WebSocket manager
        with patch('app.services.websocket_service.websocket_manager') as mock_manager:
            from app.services.websocket_service import broadcast_system_notification
            
            # When
            await broadcast_system_notification(system_message)
            
            # Then
            mock_manager.broadcast_to_all.assert_called_once_with(system_message.dict())

    @pytest.mark.asyncio
    async def test_user_notification_should_target_specific_user(self, test_user):
        """Test user-specific notifications target correct user"""
        # Given
        notification_message = NotificationMessage(
            title="Contract requires your review",
            message="Contract ABC-123 needs your approval",
            type="CONTRACT_REVIEW",
            target_user_id=test_user.id,
            data={"contract_id": "ABC-123"},
            timestamp=datetime.now()
        )
        
        # Mock WebSocket manager
        with patch('app.services.websocket_service.websocket_manager') as mock_manager:
            from app.services.websocket_service import send_user_notification
            
            # When
            await send_user_notification(notification_message)
            
            # Then
            mock_manager.send_to_user.assert_called_once_with(
                test_user.id, notification_message.dict()
            )

    @pytest.mark.asyncio
    async def test_compliance_alert_should_notify_relevant_users(self, test_user, test_contract):
        """Test compliance alerts notify users with appropriate roles"""
        # Given - compliance issue detected
        compliance_alert = NotificationMessage(
            title="Compliance Issue Detected",
            message=f"Contract {test_contract.title} has compliance issues",
            type="COMPLIANCE_ALERT",
            data={
                "contract_id": test_contract.id,
                "compliance_score": 0.3,
                "issues": ["Missing termination clause", "Invalid jurisdiction"]
            },
            timestamp=datetime.now()
        )
        
        # Mock role-based notification
        with patch('app.services.websocket_service.notify_users_by_role') as mock_notify:
            from app.services.notification_service import send_compliance_alert
            
            # When
            await send_compliance_alert(compliance_alert, test_user.company_id)
            
            # Then
            mock_notify.assert_called_with(
                test_user.company_id, 
                ["ADMIN", "LEGAL_REVIEWER"], 
                compliance_alert.dict()
            )


class TestWebSocketMessageTypes:
    """Test different WebSocket message types"""

    def test_contract_update_message_should_serialize_correctly(self, test_user):
        """Test contract update message serialization"""
        # Given
        message = ContractUpdateMessage(
            contract_id="contract-123",
            contract_title="Test Contract",
            updated_by=test_user.id,
            updated_by_name=test_user.full_name,
            changes={"status": {"old": "DRAFT", "new": "ACTIVE"}},
            timestamp=datetime.now()
        )
        
        # When
        serialized = message.dict()
        
        # Then
        assert serialized["type"] == MessageType.CONTRACT_UPDATE
        assert serialized["contract_id"] == "contract-123"
        assert serialized["changes"]["status"]["old"] == "DRAFT"
        assert "timestamp" in serialized

    def test_notification_message_should_include_required_fields(self):
        """Test notification message contains all required fields"""
        # Given/When
        message = NotificationMessage(
            title="Test Notification",
            message="This is a test",
            type="INFO",
            timestamp=datetime.now()
        )
        
        serialized = message.dict()
        
        # Then
        assert serialized["type"] == MessageType.NOTIFICATION
        assert "title" in serialized
        assert "message" in serialized
        assert "timestamp" in serialized

    def test_system_message_should_support_different_levels(self):
        """Test system messages support different severity levels"""
        # Given/When
        levels = ["INFO", "WARNING", "ERROR", "SUCCESS"]
        
        for level in levels:
            message = SystemMessage(
                message=f"Test {level} message",
                level=level,
                timestamp=datetime.now()
            )
            
            serialized = message.dict()
            
            # Then
            assert serialized["type"] == MessageType.SYSTEM
            assert serialized["level"] == level


class TestWebSocketSecurity:
    """Test WebSocket security measures"""

    @pytest.mark.asyncio
    async def test_websocket_should_validate_jwt_token(self):
        """Test WebSocket validates JWT tokens"""
        # Given
        mock_websocket = AsyncMock(spec=WebSocket)
        invalid_token = "invalid.jwt.token"
        
        # Mock JWT validation failure
        with patch('app.core.auth.authenticate_websocket_user') as mock_auth:
            mock_auth.side_effect = Exception("Invalid JWT token")
            
            from app.api.v1.websocket import websocket_endpoint
            
            # When/Then
            with pytest.raises(Exception):
                await websocket_endpoint(mock_websocket, token=invalid_token)

    @pytest.mark.asyncio 
    async def test_websocket_should_enforce_company_isolation(self, test_user):
        """Test WebSocket enforces company-based message isolation"""
        # Given
        other_company_user = User(
            id="other-user",
            company_id="other-company-id",
            email="other@example.com"
        )
        
        # Mock WebSocket manager
        with patch('app.services.websocket_service.websocket_manager') as mock_manager:
            from app.services.websocket_service import broadcast_contract_update
            
            update_message = ContractUpdateMessage(
                contract_id="contract-123",
                contract_title="Test Contract", 
                updated_by=test_user.id,
                updated_by_name=test_user.full_name,
                changes={},
                timestamp=datetime.now()
            )
            
            # When - broadcast to test_user's company
            await broadcast_contract_update(update_message, test_user.company_id)
            
            # Then - should only broadcast to that company
            mock_manager.broadcast_to_company.assert_called_once_with(
                test_user.company_id, update_message.dict()
            )

    @pytest.mark.asyncio
    async def test_websocket_should_handle_rate_limiting(self, test_user):
        """Test WebSocket implements rate limiting"""
        # Given
        mock_websocket = AsyncMock(spec=WebSocket)
        
        # Mock rate limiting
        with patch('app.core.auth.authenticate_websocket_user', return_value=test_user), \
             patch('app.services.websocket_service.check_rate_limit', return_value=False) as mock_rate_limit:
            
            from app.api.v1.websocket import handle_websocket_message
            
            # When - send too many messages
            for i in range(100):  # Exceed rate limit
                message = {"type": "ping"}
                await handle_websocket_message(mock_websocket, message, test_user)
            
            # Then - rate limiting should be applied
            mock_rate_limit.assert_called()


class TestWebSocketPerformance:
    """Test WebSocket performance and scalability"""

    @pytest.mark.asyncio
    async def test_websocket_should_handle_concurrent_connections(self, test_user):
        """Test WebSocket handles multiple concurrent connections"""
        # Given
        connection_count = 100
        mock_websockets = [AsyncMock(spec=WebSocket) for _ in range(connection_count)]
        
        # Mock WebSocket manager
        with patch('app.services.websocket_service.websocket_manager') as mock_manager:
            from app.services.websocket_service import WebSocketManager
            
            manager = WebSocketManager()
            
            # When - connect multiple websockets
            for i, ws in enumerate(mock_websockets):
                await manager.connect(ws, f"user-{i}", test_user.company_id)
            
            # Then - should track all connections
            assert len(manager.active_connections) == connection_count

    @pytest.mark.asyncio
    async def test_websocket_should_batch_notifications(self, test_user):
        """Test WebSocket batches multiple notifications for efficiency"""
        # Given
        notifications = [
            NotificationMessage(
                title=f"Notification {i}",
                message=f"Message {i}",
                type="INFO",
                timestamp=datetime.now()
            )
            for i in range(10)
        ]
        
        # Mock WebSocket manager with batching
        with patch('app.services.websocket_service.websocket_manager') as mock_manager:
            from app.services.websocket_service import batch_send_notifications
            
            # When
            await batch_send_notifications(test_user.id, notifications)
            
            # Then - should send as single batch
            mock_manager.send_to_user.assert_called_once()
            call_args = mock_manager.send_to_user.call_args[0]
            assert len(call_args[1]["batch"]) == 10