"""
Unit tests for core validation module
Tests resource validation utilities and error handling
"""
import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.validation import ResourceValidator, AuditLogHelper
from app.core.exceptions import ResourceNotFoundError, CompanyAccessError
from app.infrastructure.database.models import User, Contract, Company, AuditLog


class TestResourceValidator:
    """Test ResourceValidator utility class"""
    
    def test_validate_user_has_company_success(self):
        """Test successful user company validation"""
        user = Mock(spec=User)
        user.company_id = "company-123"
        
        # Should not raise exception
        ResourceValidator.validate_user_has_company(user)
    
    def test_validate_user_has_company_no_company(self):
        """Test user company validation when user has no company"""
        user = Mock(spec=User)
        user.company_id = None
        
        with pytest.raises(HTTPException) as exc_info:
            ResourceValidator.validate_user_has_company(user)
        
        assert exc_info.value.status_code == 400
        assert "company" in exc_info.value.detail.lower()
    
    @patch('app.core.validation.require_company_access')
    def test_validate_contract_exists_and_access_success(self, mock_require_access):
        """Test successful contract validation"""
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_contract = Mock(spec=Contract)
        mock_contract.company_id = "company-123"
        
        # Mock database query
        mock_db.query.return_value.filter.return_value.first.return_value = mock_contract
        
        result = ResourceValidator.validate_contract_exists_and_access(
            "contract-123", mock_user, mock_db
        )
        
        assert result == mock_contract
        mock_require_access.assert_called_once_with(mock_user, mock_contract.company_id)
    
    def test_validate_contract_exists_and_access_not_found(self):
        """Test contract validation when contract doesn't exist"""
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        
        # Mock database query to return None
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with pytest.raises(ResourceNotFoundError) as exc_info:
            ResourceValidator.validate_contract_exists_and_access(
                "nonexistent-contract", mock_user, mock_db
            )
        
        assert "Contract" in str(exc_info.value)
        assert "nonexistent-contract" in str(exc_info.value)
    
    @patch('app.core.validation.require_company_access')
    def test_validate_contract_exists_and_access_no_permission(self, mock_require_access):
        """Test contract validation when user lacks access"""
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_contract = Mock(spec=Contract)
        mock_contract.company_id = "company-123"
        
        # Mock database query
        mock_db.query.return_value.filter.return_value.first.return_value = mock_contract
        
        # Mock access check to raise HTTPException
        mock_require_access.side_effect = HTTPException(status_code=403, detail="Access denied")
        
        with pytest.raises(CompanyAccessError):
            ResourceValidator.validate_contract_exists_and_access(
                "contract-123", mock_user, mock_db
            )
    
    @patch('app.core.validation.require_company_access')
    def test_validate_company_exists_and_access_success(self, mock_require_access):
        """Test successful company validation"""
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_company = Mock(spec=Company)
        mock_company.id = "company-123"
        
        # Mock database query
        mock_db.query.return_value.filter.return_value.first.return_value = mock_company
        
        result = ResourceValidator.validate_company_exists_and_access(
            "company-123", mock_user, mock_db
        )
        
        assert result == mock_company
        mock_require_access.assert_called_once_with(mock_user, "company-123")
    
    def test_validate_company_exists_and_access_not_found(self):
        """Test company validation when company doesn't exist"""
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        
        # Mock database query to return None
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with pytest.raises(ResourceNotFoundError) as exc_info:
            ResourceValidator.validate_company_exists_and_access(
                "nonexistent-company", mock_user, mock_db
            )
        
        assert "Company" in str(exc_info.value)
        assert "nonexistent-company" in str(exc_info.value)
    
    @patch('app.core.validation.require_company_access')
    def test_validate_company_exists_and_access_no_permission(self, mock_require_access):
        """Test company validation when user lacks access"""
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_company = Mock(spec=Company)
        
        # Mock database query
        mock_db.query.return_value.filter.return_value.first.return_value = mock_company
        
        # Mock access check to raise HTTPException
        mock_require_access.side_effect = HTTPException(status_code=403, detail="Access denied")
        
        with pytest.raises(CompanyAccessError):
            ResourceValidator.validate_company_exists_and_access(
                "company-123", mock_user, mock_db
            )


class TestAuditLogHelper:
    """Test AuditLogHelper utility class"""
    
    def test_create_audit_log_basic(self):
        """Test basic audit log creation"""
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_user.id = "user-123"
        mock_user.company_id = "company-123"
        
        AuditLogHelper.log_action(
            db=mock_db,
            user=mock_user,
            action="create_contract",
            resource_type="Contract",
            resource_id="contract-123"
        )
        
        # Verify audit log was created and added to database
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        
        # Get the audit log that was added
        audit_log_call = mock_db.add.call_args[0][0]
        assert hasattr(audit_log_call, 'user_id')
        assert hasattr(audit_log_call, 'event_type')
        assert hasattr(audit_log_call, 'resource_type')
    
    def test_create_audit_log_with_details(self):
        """Test audit log creation with additional details"""
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_user.id = "user-123"
        mock_user.company_id = "company-123"
        
        old_values = {"title": "Old Title"}
        new_values = {"title": "New Title"}
        
        AuditLogHelper.log_action(
            db=mock_db,
            user=mock_user,
            action="update_contract",
            resource_type="Contract",
            resource_id="contract-123",
            old_values=old_values,
            new_values=new_values,
            details="Updated contract title"
        )
        
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
    
    def test_create_audit_log_batch(self):
        """Test batch audit log creation"""
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_user.id = "user-123"
        mock_user.company_id = "company-123"
        
        actions = [
            {
                "action": "delete_contract",
                "resource_type": "Contract",
                "resource_id": "contract-1"
            },
            {
                "action": "delete_contract", 
                "resource_type": "Contract",
                "resource_id": "contract-2"
            }
        ]
        
        AuditLogHelper.log_batch_actions(
            db=mock_db,
            user=mock_user,
            actions=actions
        )
        
        # Should add multiple audit logs
        assert mock_db.add.call_count == len(actions)
        mock_db.commit.assert_called_once()
    
    def test_get_user_audit_trail(self):
        """Test getting user audit trail"""
        mock_db = Mock(spec=Session)
        mock_user = Mock(spec=User)
        mock_user.id = "user-123"
        
        mock_audit_logs = [Mock(spec=AuditLog), Mock(spec=AuditLog)]
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_audit_logs
        
        result = AuditLogHelper.get_user_audit_trail(mock_db, mock_user, limit=50)
        
        assert result == mock_audit_logs
        mock_db.query.assert_called_once_with(AuditLog)
    
    def test_get_resource_audit_trail(self):
        """Test getting resource audit trail"""
        mock_db = Mock(spec=Session)
        
        mock_audit_logs = [Mock(spec=AuditLog)]
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_audit_logs
        
        result = AuditLogHelper.get_resource_audit_trail(
            mock_db, "Contract", "contract-123", limit=25
        )
        
        assert result == mock_audit_logs
        mock_db.query.assert_called_once_with(AuditLog)


class TestValidationHelpers:
    """Test validation helper functions"""
    
    def test_validate_pagination_params_valid(self):
        """Test pagination parameter validation with valid values"""
        # Should not raise exception
        ResourceValidator.validate_pagination_params(page=2, size=25)
    
    def test_validate_pagination_params_invalid_page(self):
        """Test pagination parameter validation with invalid page"""
        with pytest.raises(HTTPException) as exc_info:
            ResourceValidator.validate_pagination_params(page=0, size=10)
        
        assert exc_info.value.status_code == 400
        assert "page" in exc_info.value.detail.lower()
    
    def test_validate_pagination_params_invalid_size(self):
        """Test pagination parameter validation with invalid size"""
        with pytest.raises(HTTPException) as exc_info:
            ResourceValidator.validate_pagination_params(page=1, size=101)  # Max is 100
        
        assert exc_info.value.status_code == 400
        assert "size" in exc_info.value.detail.lower()
    
    def test_validate_enum_value_valid(self):
        """Test enum validation with valid value"""
        from app.infrastructure.database.models import ContractType
        
        result = ResourceValidator.validate_enum_value("service_agreement", ContractType, "contract_type")
        assert result == ContractType.SERVICE_AGREEMENT
    
    def test_validate_enum_value_invalid(self):
        """Test enum validation with invalid value"""
        from app.infrastructure.database.models import ContractType
        
        with pytest.raises(HTTPException) as exc_info:
            ResourceValidator.validate_enum_value("invalid_type", ContractType, "contract_type")
        
        assert exc_info.value.status_code == 400
        assert "contract_type" in exc_info.value.detail
        assert "invalid_type" in exc_info.value.detail
    
    def test_validate_required_fields_all_present(self):
        """Test required field validation when all fields present"""
        data = {"name": "Test", "email": "test@example.com", "type": "service"}
        required_fields = ["name", "email", "type"]
        
        # Should not raise exception
        ResourceValidator.validate_required_fields(data, required_fields)
    
    def test_validate_required_fields_missing(self):
        """Test required field validation with missing fields"""
        data = {"name": "Test"}
        required_fields = ["name", "email", "type"]
        
        with pytest.raises(HTTPException) as exc_info:
            ResourceValidator.validate_required_fields(data, required_fields)
        
        assert exc_info.value.status_code == 422
        detail = exc_info.value.detail
        # Check if it's a structured response or string response
        if isinstance(detail, dict):
            errors = detail.get("errors", {})
            missing_fields = errors.get("missing_fields", [])
            assert "email" in missing_fields or "type" in missing_fields
        else:
            assert "email" in detail or "type" in detail
    
    def test_validate_required_fields_empty(self):
        """Test required field validation with empty fields"""
        data = {"name": "", "email": "   ", "type": "service"}
        required_fields = ["name", "email", "type"]
        
        with pytest.raises(HTTPException) as exc_info:
            ResourceValidator.validate_required_fields(data, required_fields)
        
        assert exc_info.value.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])