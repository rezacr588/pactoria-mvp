"""
Comprehensive tests for app/core/auth.py to achieve 100% coverage
Tests all missing lines and edge cases
"""
import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException
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
    has_permission,
    require_role,
    get_contract_manager_user,
    get_admin_role_user,
    can_modify_resource,
    require_modify_permission,
    authenticate_websocket_user
)
from app.infrastructure.database.models import User, Company, UserRole


class TestCompleteCoverage:
    """Tests for complete coverage of auth.py"""
    
    @pytest.fixture
    def mock_user(self):
        """Mock user fixture"""
        user = Mock(spec=User)
        user.id = "test-user-id"
        user.email = "test@example.com"
        user.is_active = True
        user.is_admin = False
        user.role = UserRole.CONTRACT_MANAGER
        user.company_id = "test-company-id"
        return user
    
    @pytest.fixture
    def mock_admin_user(self):
        """Mock admin user fixture"""
        user = Mock(spec=User)
        user.id = "admin-user-id"
        user.email = "admin@example.com"
        user.is_active = True
        user.is_admin = True
        user.role = UserRole.ADMIN
        user.company_id = "admin-company-id"
        return user
    
    @pytest.fixture
    def mock_company(self):
        """Mock company fixture"""
        company = Mock(spec=Company)
        company.id = "test-company-id"
        company.name = "Test Company"
        return company
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock(spec=Session)


class TestHasPermission:
    """Test has_permission function for all role combinations"""
    
    def test_admin_user_has_all_permissions(self):
        """Admin user should have all permissions"""
        user = Mock()
        user.is_admin = True
        user.role = UserRole.ADMIN
        
        assert has_permission(user, UserRole.VIEWER) is True
        assert has_permission(user, UserRole.CONTRACT_MANAGER) is True
        assert has_permission(user, UserRole.ADMIN) is True
    
    def test_contract_manager_permissions(self):
        """Contract manager should have viewer and contract manager permissions"""
        user = Mock()
        user.is_admin = False
        user.role = UserRole.CONTRACT_MANAGER
        
        assert has_permission(user, UserRole.VIEWER) is True
        assert has_permission(user, UserRole.CONTRACT_MANAGER) is True
        assert has_permission(user, UserRole.ADMIN) is False
    
    def test_viewer_permissions(self):
        """Viewer should only have viewer permissions"""
        user = Mock()
        user.is_admin = False
        user.role = UserRole.VIEWER
        
        assert has_permission(user, UserRole.VIEWER) is True
        assert has_permission(user, UserRole.CONTRACT_MANAGER) is False
        assert has_permission(user, UserRole.ADMIN) is False
    
    def test_unknown_role(self):
        """Unknown role should have no permissions"""
        user = Mock()
        user.is_admin = False
        user.role = "unknown_role"
        
        assert has_permission(user, UserRole.VIEWER) is False
        assert has_permission(user, UserRole.CONTRACT_MANAGER) is False
        assert has_permission(user, UserRole.ADMIN) is False


class TestRequireRole:
    """Test require_role decorator factory"""
    
    def test_require_role_success(self):
        """Test successful role requirement"""
        user = Mock()
        user.role = UserRole.CONTRACT_MANAGER
        user.is_admin = False
        
        dependency = require_role(UserRole.CONTRACT_MANAGER)
        result = dependency(current_user=user)
        assert result == user
    
    def test_require_role_insufficient_permissions(self):
        """Test insufficient permissions"""
        user = Mock()
        user.role = UserRole.VIEWER
        user.is_admin = False
        
        dependency = require_role(UserRole.ADMIN)
        
        with pytest.raises(HTTPException) as exc_info:
            dependency(current_user=user)
        
        assert exc_info.value.status_code == 403
        assert "Insufficient permissions" in exc_info.value.detail
        assert "Admin role or higher required" in exc_info.value.detail


class TestGetContractManagerUser:
    """Test get_contract_manager_user function"""
    
    async def test_contract_manager_user_success(self):
        """Test successful contract manager user retrieval"""
        user = Mock()
        user.role = UserRole.CONTRACT_MANAGER
        user.is_admin = False
        
        result = await get_contract manager_user(current_user=user)
        assert result == user
    
    async def test_admin_user_as_contract manager(self):
        """Test admin user can act as contract manager"""
        user = Mock()
        user.role = UserRole.ADMIN
        user.is_admin = True
        
        result = await get_contract manager_user(current_user=user)
        assert result == user
    
    async def test_viewer_user_denied(self):
        """Test viewer user is denied contract manager access"""
        user = Mock()
        user.role = UserRole.VIEWER
        user.is_admin = False
        
        with pytest.raises(HTTPException) as exc_info:
            await get_contract manager_user(current_user=user)
        
        assert exc_info.value.status_code == 403
        assert "Contract manager privileges required" in exc_info.value.detail


class TestGetAdminRoleUser:
    """Test get_admin_role_user function"""
    
    async def test_admin_role_user_success(self):
        """Test successful admin role user retrieval"""
        user = Mock()
        user.role = UserRole.ADMIN
        user.is_admin = False
        
        result = await get_admin_role_user(current_user=user)
        assert result == user
    
    async def test_system_admin_success(self):
        """Test system admin success"""
        user = Mock()
        user.role = UserRole.CONTRACT_MANAGER
        user.is_admin = True
        
        result = await get_admin_role_user(current_user=user)
        assert result == user
    
    async def test_contract_manager_user_denied_admin_role(self):
        """Test contract manager user is denied admin role access"""
        user = Mock()
        user.role = UserRole.CONTRACT_MANAGER
        user.is_admin = False
        
        with pytest.raises(HTTPException) as exc_info:
            await get_admin_role_user(current_user=user)
        
        assert exc_info.value.status_code == 403
        assert "Admin privileges required" in exc_info.value.detail


class TestCanModifyResource:
    """Test can_modify_resource function"""
    
    def test_admin_can_modify_any_resource(self):
        """Test admin can modify any resource"""
        admin_user = Mock()
        admin_user.is_admin = True
        admin_user.role = UserRole.ADMIN
        admin_user.id = "admin-id"
        
        result = can_modify_resource(admin_user, "different-owner-id")
        assert result is True
    
    def test_admin_role_user_can_modify_any_resource(self):
        """Test user with admin role can modify any resource"""
        admin_role_user = Mock()
        admin_role_user.is_admin = False
        admin_role_user.role = UserRole.ADMIN
        admin_role_user.id = "admin-role-user-id"
        
        result = can_modify_resource(admin_role_user, "different-owner-id")
        assert result is True
    
    def test_contract_manager_can_modify_own_resource(self):
        """Test contract manager can modify their own resource"""
        contract manager_user = Mock()
        contract manager_user.is_admin = False
        contract manager_user.role = UserRole.CONTRACT_MANAGER
        contract manager_user.id = "contract manager-id"
        
        result = can_modify_resource(contract manager_user, "contract manager-id")
        assert result is True
    
    def test_contract_manager_cannot_modify_others_resource(self):
        """Test contract manager cannot modify other's resource"""
        contract manager_user = Mock()
        contract manager_user.is_admin = False
        contract manager_user.role = UserRole.CONTRACT_MANAGER
        contract manager_user.id = "contract manager-id"
        
        result = can_modify_resource(contract manager_user, "different-owner-id")
        assert result is False
    
    def test_viewer_cannot_modify_any_resource(self):
        """Test viewer cannot modify any resource"""
        viewer_user = Mock()
        viewer_user.is_admin = False
        viewer_user.role = UserRole.VIEWER
        viewer_user.id = "viewer-id"
        
        result = can_modify_resource(viewer_user, "viewer-id")
        assert result is False


class TestVerifyCompanyAccessEdgeCases:
    """Test edge cases for verify_company_access"""
    
    def test_verify_company_access_admin_different_company(self, mock_admin_user):
        """Test admin user can access different company"""
        mock_admin_user.is_admin = True
        mock_admin_user.company_id = "admin-company-id"
        
        # Should not raise exception for admin user
        verify_company_access(mock_admin_user, "different-company-id")
    
    def test_verify_company_access_regular_user_different_company(self, mock_user):
        """Test regular user cannot access different company"""
        mock_user.is_admin = False
        mock_user.company_id = "user-company-id"
        
        with pytest.raises(HTTPException) as exc_info:
            verify_company_access(mock_user, "different-company-id")
        
        assert exc_info.value.status_code == 403
        assert "access to company resources" in exc_info.value.detail


class TestRequireCompanyAccess:
    """Test require_company_access function"""
    
    def test_require_company_access_same_company(self, mock_user):
        """Test access allowed for same company"""
        mock_user.company_id = "test-company-id"
        
        # Should not raise exception
        require_company_access(mock_user, "test-company-id")
    
    def test_require_company_access_different_company_admin(self, mock_admin_user):
        """Test admin can access different company"""
        mock_admin_user.is_admin = True
        mock_admin_user.company_id = "admin-company-id"
        
        # Should not raise exception for admin
        require_company_access(mock_admin_user, "different-company-id")


class TestGetOptionalUserEdgeCases:
    """Test edge cases for get_optional_user"""
    
    async def test_get_optional_user_database_error(self, mock_db):
        """Test database error handling in get_optional_user"""
        credentials = Mock()
        credentials.credentials = "valid-token"
        
        # Mock verify_token to return user_id
        with patch('app.core.auth.verify_token', return_value="test-user-id"):
            # Mock database to raise exception
            mock_db.query.side_effect = Exception("Database error")
            
            result = await get_optional_user(credentials=credentials, db=mock_db)
            assert result is None
    
    async def test_get_optional_user_inactive_user(self, mock_db):
        """Test inactive user returns None"""
        credentials = Mock()
        credentials.credentials = "valid-token"
        
        inactive_user = Mock()
        inactive_user.is_active = False
        mock_db.query.return_value.filter.return_value.first.return_value = inactive_user
        
        with patch('app.core.auth.verify_token', return_value="test-user-id"):
            result = await get_optional_user(credentials=credentials, db=mock_db)
            assert result is None


class TestDatabaseErrorHandling:
    """Test database error handling scenarios"""
    
    async def test_get_current_user_database_exception(self, mock_db):
        """Test database exception in get_current_user"""
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid-token")
        
        with patch('app.core.auth.verify_token', return_value="test-user-id"):
            mock_db.query.side_effect = Exception("Database connection error")
            
            with pytest.raises(AuthenticationError) as exc_info:
                await get_current_user(credentials=credentials, db=mock_db)
            
            assert "Authentication failed" in str(exc_info.value.detail)
    
    async def test_get_user_company_database_exception(self, mock_user, mock_db):
        """Test database exception in get_user_company"""
        mock_db.query.side_effect = Exception("Database error")
        
        with pytest.raises(HTTPException) as exc_info:
            await get_user_company(current_user=mock_user, db=mock_db)
        
        assert exc_info.value.status_code == 500


class TestTokenVerificationEdgeCases:
    """Test token verification edge cases"""
    
    async def test_get_current_user_token_verification_exception(self, mock_db):
        """Test token verification exception"""
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid-token")
        
        with patch('app.core.auth.verify_token', side_effect=Exception("Token verification error")):
            with pytest.raises(AuthenticationError):
                await get_current_user(credentials=credentials, db=mock_db)


class TestWebSocketAuthentication:
    """Test WebSocket authentication functions"""
    
    def test_authenticate_websocket_user_success(self, mock_db, mock_user):
        """Test successful WebSocket user authentication"""
        mock_user.is_active = True
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user
        
        with patch('app.core.auth.verify_token', return_value="test-user-id"):
            result = authenticate_websocket_user("valid-token", mock_db)
            assert result == mock_user
    
    def test_authenticate_websocket_user_invalid_token(self, mock_db):
        """Test WebSocket authentication with invalid token"""
        with patch('app.core.auth.verify_token', return_value=None):
            result = authenticate_websocket_user("invalid-token", mock_db)
            assert result is None
    
    def test_authenticate_websocket_user_exception(self, mock_db):
        """Test WebSocket authentication with exception"""
        with patch('app.core.auth.verify_token', side_effect=Exception("Token error")):
            result = authenticate_websocket_user("token", mock_db)
            assert result is None


class TestRequireModifyPermission:
    """Test require_modify_permission function"""
    
    def test_require_modify_permission_success(self):
        """Test successful modify permission check"""
        admin_user = Mock()
        admin_user.is_admin = True
        admin_user.role = UserRole.ADMIN
        
        # Should not raise exception
        require_modify_permission(admin_user, "any-resource-id")
    
    def test_require_modify_permission_denied(self):
        """Test modify permission denied"""
        viewer_user = Mock()
        viewer_user.is_admin = False
        viewer_user.role = UserRole.VIEWER
        viewer_user.id = "viewer-id"
        
        with pytest.raises(HTTPException) as exc_info:
            require_modify_permission(viewer_user, "other-resource-id")
        
        assert exc_info.value.status_code == 403
        assert "Insufficient permissions to modify" in exc_info.value.detail


class TestSecurityIntegration:
    """Test security integration scenarios"""
    
    async def test_authentication_error_headers(self):
        """Test AuthenticationError includes proper headers"""
        error = AuthenticationError("Custom error message")
        
        assert error.status_code == 401
        assert error.detail == "Custom error message"
        assert error.headers == {"WWW-Authenticate": "Bearer"}
    
    async def test_authentication_error_default_message(self):
        """Test AuthenticationError default message"""
        error = AuthenticationError()
        
        assert error.detail == "Authentication failed"