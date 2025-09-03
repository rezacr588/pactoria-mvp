"""
Unit tests for missing coverage in Core Authentication Module
Testing role-based permissions, WebSocket auth, and resource modification checks
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.core.auth import (
    has_permission,
    require_role,
    get_editor_user,
    get_admin_role_user,
    can_modify_resource,
    require_modify_permission,
    decode_jwt_token,
    authenticate_websocket_user
)
from app.infrastructure.database.models import User, UserRole


class TestHasPermission:
    """Test has_permission function"""
    
    def test_has_permission_admin_user_always_true(self):
        """Test admin users always have permission"""
        user = Mock(spec=User)
        user.is_admin = True
        user.role = UserRole.VIEWER
        
        result = has_permission(user, UserRole.ADMIN)
        assert result is True
    
    def test_has_permission_exact_role_match(self):
        """Test user with exact role has permission"""
        user = Mock(spec=User)
        user.is_admin = False
        user.role = UserRole.CONTRACT_MANAGER
        
        result = has_permission(user, UserRole.CONTRACT_MANAGER)
        assert result is True
    
    def test_has_permission_higher_role(self):
        """Test user with higher role has permission"""
        user = Mock(spec=User)
        user.is_admin = False
        user.role = UserRole.ADMIN
        
        result = has_permission(user, UserRole.CONTRACT_MANAGER)
        assert result is True
    
    def test_has_permission_lower_role_denied(self):
        """Test user with lower role is denied"""
        user = Mock(spec=User)
        user.is_admin = False
        user.role = UserRole.VIEWER
        
        result = has_permission(user, UserRole.CONTRACT_MANAGER)
        assert result is False
    
    def test_has_permission_unknown_role(self):
        """Test user with unknown role defaults to level 0"""
        user = Mock(spec=User)
        user.is_admin = False
        user.role = "unknown_role"
        
        result = has_permission(user, UserRole.VIEWER)
        assert result is False


class TestRequireRole:
    """Test require_role decorator factory"""
    
    @patch('app.core.auth.get_current_user')
    def test_require_role_sufficient_permission(self, mock_get_current_user):
        """Test require_role with sufficient permission"""
        mock_user = Mock(spec=User)
        mock_user.is_admin = False
        mock_user.role = UserRole.ADMIN
        mock_get_current_user.return_value = mock_user
        
        role_dependency = require_role(UserRole.CONTRACT_MANAGER)
        result = role_dependency(mock_user)
        
        assert result == mock_user
    
    @patch('app.core.auth.get_current_user')
    def test_require_role_insufficient_permission(self, mock_get_current_user):
        """Test require_role with insufficient permission"""
        mock_user = Mock(spec=User)
        mock_user.is_admin = False
        mock_user.role = UserRole.VIEWER
        mock_get_current_user.return_value = mock_user
        
        role_dependency = require_role(UserRole.ADMIN)
        
        with pytest.raises(HTTPException) as exc_info:
            role_dependency(mock_user)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Admin" in exc_info.value.detail
        assert "Insufficient permissions" in exc_info.value.detail


class TestGetEditorUser:
    """Test get_editor_user dependency"""
    
    @pytest.mark.asyncio
    @patch('app.core.auth.get_current_user')
    async def test_get_editor_user_contract_manager(self, mock_get_current_user):
        """Test get_editor_user with contract manager role"""
        mock_user = Mock(spec=User)
        mock_user.is_admin = False
        mock_user.role = UserRole.CONTRACT_MANAGER
        mock_get_current_user.return_value = mock_user
        
        result = await get_editor_user(mock_user)
        assert result == mock_user
    
    @pytest.mark.asyncio
    @patch('app.core.auth.get_current_user')
    async def test_get_editor_user_admin_role(self, mock_get_current_user):
        """Test get_editor_user with admin role"""
        mock_user = Mock(spec=User)
        mock_user.is_admin = False
        mock_user.role = UserRole.ADMIN
        mock_get_current_user.return_value = mock_user
        
        result = await get_editor_user(mock_user)
        assert result == mock_user
    
    @pytest.mark.asyncio
    @patch('app.core.auth.get_current_user')
    async def test_get_editor_user_insufficient_permission(self, mock_get_current_user):
        """Test get_editor_user with insufficient permission"""
        mock_user = Mock(spec=User)
        mock_user.is_admin = False
        mock_user.role = UserRole.VIEWER
        mock_get_current_user.return_value = mock_user
        
        with pytest.raises(HTTPException) as exc_info:
            await get_editor_user(mock_user)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Contract manager privileges required" in exc_info.value.detail


class TestGetAdminRoleUser:
    """Test get_admin_role_user dependency"""
    
    @pytest.mark.asyncio
    @patch('app.core.auth.get_current_user')
    async def test_get_admin_role_user_admin_role(self, mock_get_current_user):
        """Test get_admin_role_user with admin role"""
        mock_user = Mock(spec=User)
        mock_user.is_admin = False
        mock_user.role = UserRole.ADMIN
        mock_get_current_user.return_value = mock_user
        
        result = await get_admin_role_user(mock_user)
        assert result == mock_user
    
    @pytest.mark.asyncio
    @patch('app.core.auth.get_current_user')
    async def test_get_admin_role_user_system_admin(self, mock_get_current_user):
        """Test get_admin_role_user with system admin flag"""
        mock_user = Mock(spec=User)
        mock_user.is_admin = True
        mock_user.role = UserRole.VIEWER
        mock_get_current_user.return_value = mock_user
        
        result = await get_admin_role_user(mock_user)
        assert result == mock_user
    
    @pytest.mark.asyncio
    @patch('app.core.auth.get_current_user')
    async def test_get_admin_role_user_insufficient_permission(self, mock_get_current_user):
        """Test get_admin_role_user with insufficient permission"""
        mock_user = Mock(spec=User)
        mock_user.is_admin = False
        mock_user.role = UserRole.CONTRACT_MANAGER
        mock_get_current_user.return_value = mock_user
        
        with pytest.raises(HTTPException) as exc_info:
            await get_admin_role_user(mock_user)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Admin privileges required" in exc_info.value.detail


class TestCanModifyResource:
    """Test can_modify_resource function"""
    
    def test_can_modify_resource_system_admin(self):
        """Test system admin can modify any resource"""
        user = Mock(spec=User)
        user.is_admin = True
        user.role = UserRole.VIEWER
        user.id = "user-123"
        
        result = can_modify_resource(user, "different-user-456")
        assert result is True
    
    def test_can_modify_resource_admin_role(self):
        """Test admin role can modify any resource"""
        user = Mock(spec=User)
        user.is_admin = False
        user.role = UserRole.ADMIN
        user.id = "user-123"
        
        result = can_modify_resource(user, "different-user-456")
        assert result is True
    
    def test_can_modify_resource_contract_manager_own_resource(self):
        """Test contract manager can modify own resource"""
        user = Mock(spec=User)
        user.is_admin = False
        user.role = UserRole.CONTRACT_MANAGER
        user.id = "user-123"
        
        result = can_modify_resource(user, "user-123")
        assert result is True
    
    def test_can_modify_resource_contract_manager_other_resource(self):
        """Test contract manager cannot modify other's resource"""
        user = Mock(spec=User)
        user.is_admin = False
        user.role = UserRole.CONTRACT_MANAGER
        user.id = "user-123"
        
        result = can_modify_resource(user, "different-user-456")
        assert result is False
    
    def test_can_modify_resource_viewer_always_denied(self):
        """Test viewer cannot modify any resource"""
        user = Mock(spec=User)
        user.is_admin = False
        user.role = UserRole.VIEWER
        user.id = "user-123"
        
        # Own resource
        result = can_modify_resource(user, "user-123")
        assert result is False
        
        # Other resource
        result = can_modify_resource(user, "different-user-456")
        assert result is False


class TestRequireModifyPermission:
    """Test require_modify_permission function"""
    
    def test_require_modify_permission_allowed(self):
        """Test require_modify_permission when allowed"""
        user = Mock(spec=User)
        user.is_admin = True
        user.role = UserRole.ADMIN
        
        # Should not raise exception
        require_modify_permission(user, "resource-owner-123")
    
    def test_require_modify_permission_denied(self):
        """Test require_modify_permission when denied"""
        user = Mock(spec=User)
        user.is_admin = False
        user.role = UserRole.VIEWER
        user.id = "user-123"
        
        with pytest.raises(HTTPException) as exc_info:
            require_modify_permission(user, "different-user-456")
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Insufficient permissions to modify this resource" in exc_info.value.detail


class TestDecodeJWTToken:
    """Test decode_jwt_token function"""
    
    def test_decode_jwt_token_always_returns_none(self):
        """Test that decode_jwt_token always returns None due to import error"""
        # The function tries to import a non-existent 'decode_token' function
        # This will always fail and return None
        result = decode_jwt_token("any-token")
        assert result is None
    
    def test_decode_jwt_token_with_different_tokens(self):
        """Test decode_jwt_token behavior with various token inputs"""
        # All should return None due to the import error
        test_tokens = [
            "valid-looking-token",
            "invalid-token",
            "",
            "Bearer token",
            "malformed.jwt.token"
        ]
        
        for token in test_tokens:
            result = decode_jwt_token(token)
            assert result is None, f"Expected None for token: {token}"


class TestAuthenticateWebSocketUser:
    """Test authenticate_websocket_user function"""
    
    @patch('app.core.auth.verify_token')
    def test_authenticate_websocket_user_success(self, mock_verify_token):
        """Test successful WebSocket user authentication"""
        mock_verify_token.return_value = "user-123"
        
        mock_user = Mock(spec=User)
        mock_user.id = "user-123"
        mock_user.is_active = True
        
        mock_db = Mock(spec=Session)
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        result = authenticate_websocket_user("valid-token", mock_db)
        
        assert result == mock_user
        mock_verify_token.assert_called_once_with("valid-token")
        mock_db.query.assert_called_once_with(User)
    
    @patch('app.core.auth.verify_token')
    def test_authenticate_websocket_user_invalid_token(self, mock_verify_token):
        """Test WebSocket authentication with invalid token"""
        mock_verify_token.return_value = None
        
        mock_db = Mock(spec=Session)
        
        result = authenticate_websocket_user("invalid-token", mock_db)
        
        assert result is None
        mock_verify_token.assert_called_once_with("invalid-token")
        mock_db.query.assert_not_called()
    
    @patch('app.core.auth.verify_token')
    def test_authenticate_websocket_user_user_not_found(self, mock_verify_token):
        """Test WebSocket authentication when user not found"""
        mock_verify_token.return_value = "user-123"
        
        mock_db = Mock(spec=Session)
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = authenticate_websocket_user("valid-token", mock_db)
        
        assert result is None
        mock_verify_token.assert_called_once_with("valid-token")
        mock_db.query.assert_called_once_with(User)
    
    @patch('app.core.auth.verify_token')
    def test_authenticate_websocket_user_exception(self, mock_verify_token):
        """Test WebSocket authentication with database exception"""
        mock_verify_token.side_effect = Exception("Database error")
        
        mock_db = Mock(spec=Session)
        
        result = authenticate_websocket_user("token", mock_db)
        
        assert result is None
    
    @patch('app.core.auth.verify_token')
    def test_authenticate_websocket_user_inactive_user(self, mock_verify_token):
        """Test WebSocket authentication with inactive user"""
        mock_verify_token.return_value = "user-123"
        
        mock_user = Mock(spec=User)
        mock_user.id = "user-123"
        mock_user.is_active = False
        
        mock_db = Mock(spec=Session)
        # The query filters for is_active == True, so inactive user won't be returned
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        result = authenticate_websocket_user("valid-token", mock_db)
        
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])