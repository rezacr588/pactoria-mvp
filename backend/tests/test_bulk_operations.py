"""
Tests for bulk operations functionality
Following TDD approach - tests first, then implementation
"""
import pytest
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from unittest.mock import Mock, patch, AsyncMock

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db
from app.core.auth import get_current_user
from app.infrastructure.database.models import (
    User, Contract, ContractStatus, ContractType, Company
)
from app.schemas.bulk import (
    BulkContractUpdateRequest, BulkContractDeleteRequest, 
    BulkContractExportRequest, BulkUserInviteRequest,
    BulkUserRoleChangeRequest, BulkOperationResponse
)

# Test fixtures
@pytest.fixture
def test_user():
    return User(
        id="test-user-id",
        email="test@example.com",
        full_name="Test User",
        is_active=True,
        company_id="test-company-id"
    )

@pytest.fixture
def test_contracts():
    contracts = []
    for i in range(5):
        contract = Contract(
            id=f"contract-{i+1}",
            title=f"Test Contract {i+1}",
            contract_type=ContractType.SERVICE_AGREEMENT,
            status=ContractStatus.DRAFT,
            plain_english_input="Test input",
            client_name=f"Client {i+1}",
            company_id="test-company-id",
            created_by="test-user-id",
            version=1,
            is_current_version=True
        )
        contracts.append(contract)
    return contracts

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_db():
    return Mock(spec=Session)


class TestBulkContractOperations:
    """Test bulk contract operations"""

    def test_bulk_contract_update_should_update_multiple_contracts(self, client, mock_db, test_user, test_contracts):
        """Test bulk updating contract statuses"""
        # Given
        contract_ids = [c.id for c in test_contracts[:3]]
        update_data = {
            "contract_ids": contract_ids,
            "updates": {
                "status": "ACTIVE"
            }
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            mock_db.query.return_value.filter.return_value.all.return_value = test_contracts[:3]
            mock_db.commit.return_value = None
            
            # When
            response = client.post("/api/v1/contracts/bulk-update", json=update_data)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["success_count"] == 3
            assert result["failed_count"] == 0
            assert len(result["updated_ids"]) == 3

    def test_bulk_contract_update_should_fail_for_invalid_contracts(self, client, mock_db, test_user):
        """Test bulk update fails gracefully for non-existent contracts"""
        # Given
        update_data = {
            "contract_ids": ["non-existent-1", "non-existent-2"],
            "updates": {
                "status": "ACTIVE"
            }
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            mock_db.query.return_value.filter.return_value.all.return_value = []
            
            # When
            response = client.post("/api/v1/contracts/bulk-update", json=update_data)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["success_count"] == 0
            assert result["failed_count"] == 2

    def test_bulk_contract_delete_should_soft_delete_multiple_contracts(self, client, mock_db, test_user, test_contracts):
        """Test bulk soft deletion of contracts"""
        # Given
        contract_ids = [c.id for c in test_contracts[:2]]
        delete_data = {
            "contract_ids": contract_ids,
            "deletion_reason": "Bulk cleanup"
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            mock_db.query.return_value.filter.return_value.all.return_value = test_contracts[:2]
            mock_db.commit.return_value = None
            
            # When
            response = client.post("/api/v1/contracts/bulk-delete", json=delete_data)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["success_count"] == 2
            assert result["failed_count"] == 0

    def test_bulk_contract_export_should_generate_export_file(self, client, mock_db, test_user, test_contracts):
        """Test bulk export of contracts"""
        # Given
        export_data = {
            "contract_ids": [c.id for c in test_contracts],
            "format": "CSV",
            "fields": ["title", "status", "client_name", "contract_value"]
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user), \
             patch('app.services.export_service.export_contracts_to_csv', return_value="file_id_123") as mock_export:
            
            mock_db.query.return_value.filter.return_value.all.return_value = test_contracts
            
            # When
            response = client.post("/api/v1/contracts/bulk-export", json=export_data)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert "export_id" in result
            assert result["format"] == "CSV"
            mock_export.assert_called_once()


class TestBulkUserOperations:
    """Test bulk user operations"""

    def test_bulk_user_invite_should_send_multiple_invitations(self, client, mock_db, test_user):
        """Test bulk user invitations"""
        # Given
        invite_data = {
            "invitations": [
                {
                    "email": "user1@example.com",
                    "full_name": "User One",
                    "role": "CONTRACT_MANAGER"
                },
                {
                    "email": "user2@example.com",
                    "full_name": "User Two",
                    "role": "VIEWER"
                }
            ]
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user), \
             patch('app.services.email_service.send_invitation_email', return_value=True) as mock_email:
            
            mock_db.query.return_value.filter.return_value.first.return_value = None  # No existing users
            mock_db.commit.return_value = None
            
            # When
            response = client.post("/api/v1/users/bulk-invite", json=invite_data)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["success_count"] == 2
            assert result["failed_count"] == 0
            assert mock_email.call_count == 2

    def test_bulk_user_role_change_should_update_multiple_users(self, client, mock_db, test_user):
        """Test bulk user role changes"""
        # Given
        users = [
            User(id="user-1", email="user1@example.com", role="VIEWER", company_id="test-company-id"),
            User(id="user-2", email="user2@example.com", role="VIEWER", company_id="test-company-id")
        ]
        
        role_change_data = {
            "user_ids": ["user-1", "user-2"],
            "new_role": "CONTRACT_MANAGER"
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            mock_db.query.return_value.filter.return_value.all.return_value = users
            mock_db.commit.return_value = None
            
            # When
            response = client.put("/api/v1/users/bulk-role-change", json=role_change_data)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["success_count"] == 2
            assert result["failed_count"] == 0

    def test_bulk_operations_should_require_admin_permissions(self, client, mock_db):
        """Test that bulk operations require admin permissions"""
        # Given
        non_admin_user = User(
            id="non-admin",
            email="user@example.com",
            role="VIEWER",
            company_id="test-company-id"
        )
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=non_admin_user):
            
            # When
            response = client.post("/api/v1/contracts/bulk-update", json={
                "contract_ids": ["test"],
                "updates": {"status": "ACTIVE"}
            })
            
            # Then
            assert response.status_code == 403

    def test_bulk_operations_should_respect_company_isolation(self, client, mock_db, test_user):
        """Test that bulk operations respect company boundaries"""
        # Given
        other_company_contract = Contract(
            id="other-contract",
            title="Other Company Contract",
            contract_type=ContractType.SERVICE_AGREEMENT,
            status=ContractStatus.DRAFT,
            plain_english_input="Test input",
            client_name="Other Client",
            company_id="other-company-id",  # Different company
            created_by="other-user",
            version=1,
            is_current_version=True
        )
        
        update_data = {
            "contract_ids": ["other-contract"],
            "updates": {"status": "ACTIVE"}
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            mock_db.query.return_value.filter.return_value.all.return_value = []  # No contracts found for user's company
            
            # When
            response = client.post("/api/v1/contracts/bulk-update", json=update_data)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["success_count"] == 0  # Should not update contracts from other companies


class TestBulkOperationsErrorHandling:
    """Test error handling in bulk operations"""

    def test_bulk_operations_should_handle_partial_failures(self, client, mock_db, test_user, test_contracts):
        """Test bulk operations handle partial failures gracefully"""
        # Given - simulate some contracts failing validation
        update_data = {
            "contract_ids": [c.id for c in test_contracts],
            "updates": {"status": "INVALID_STATUS"}  # Invalid status should cause some to fail
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            mock_db.query.return_value.filter.return_value.all.return_value = test_contracts
            # Simulate database constraint error for some contracts
            mock_db.commit.side_effect = Exception("Database constraint violation")
            
            # When
            response = client.post("/api/v1/contracts/bulk-update", json=update_data)
            
            # Then
            assert response.status_code == 200
            result = response.json()
            assert result["failed_count"] > 0
            assert "errors" in result

    def test_bulk_operations_should_validate_input_limits(self, client, mock_db, test_user):
        """Test bulk operations validate input limits"""
        # Given - too many contract IDs
        large_contract_list = [f"contract-{i}" for i in range(1001)]  # Assuming 1000 is the limit
        
        update_data = {
            "contract_ids": large_contract_list,
            "updates": {"status": "ACTIVE"}
        }
        
        # Mock dependencies
        with patch('app.core.database.get_db', return_value=mock_db), \
             patch('app.core.auth.get_current_user', return_value=test_user):
            
            # When
            response = client.post("/api/v1/contracts/bulk-update", json=update_data)
            
            # Then
            assert response.status_code == 422  # Validation error