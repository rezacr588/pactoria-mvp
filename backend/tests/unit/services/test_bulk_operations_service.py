"""
Comprehensive unit tests for BulkOperationsService
Tests all methods directly to achieve 100% coverage
"""

import pytest
import uuid
import asyncio
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from app.services.bulk_operations_service import (
    BulkOperationsService,
)
from app.infrastructure.database.models import (
    User,
    Contract,
    AuditLog,
    Company,
)
from app.domain.value_objects import ContractStatus, ContractType
from app.schemas.bulk import (
    BulkContractOperation,
    BulkOperationResponse,
    BulkOperationItem,
    BulkOperationType,
    BulkOperationStatus,
)
from app.domain.exceptions import (
    DomainValidationError,
    BusinessRuleViolationError,
    ResourceNotFoundError,
    CompanyAccessError,
)


@pytest.fixture
def mock_db():
    """Mock database session"""
    return Mock(spec=Session)


@pytest.fixture
def admin_user():
    """Admin user fixture"""
    return User(
        id="admin-user-id",
        email="admin@example.com",
        full_name="Admin User",
        role="admin",
        company_id="test-company-id",
        is_active=True,
    )


@pytest.fixture
def contract_manager_user():
    """Contract manager user fixture"""
    return User(
        id="manager-user-id",
        email="manager@example.com",
        full_name="Manager User",
        role="contract_manager",
        company_id="test-company-id",
        is_active=True,
    )


@pytest.fixture
def viewer_user():
    """Viewer user fixture"""
    return User(
        id="viewer-user-id",
        email="viewer@example.com",
        full_name="Viewer User",
        role="viewer",
        company_id="test-company-id",
        is_active=True,
    )


@pytest.fixture
def sample_contracts():
    """Sample contracts fixture"""
    contracts = []
    for i in range(5):
        contract = Contract(
            id=f"contract-{i+1}",
            title=f"Test Contract {i+1}",
            contract_type=ContractType.SERVICE_AGREEMENT,
            status=ContractStatus.DRAFT,
            plain_english_input="Test input",
            client_name=f"Client {i+1}",
            supplier_name=f"Supplier {i+1}",
            contract_value=1000.0 + i * 100,
            currency="GBP",
            company_id="test-company-id",
            created_by="test-user-id",
            version=1,
            is_current_version=True,
        )
        contracts.append(contract)
    return contracts


@pytest.fixture
def bulk_service(mock_db):
    """BulkOperationsService fixture"""
    return BulkOperationsService(mock_db)


class TestBulkOperationsServiceConstants:
    """Test service constants and initialization"""

    def test_service_constants(self, bulk_service):
        """Test that service constants are properly set"""
        assert bulk_service.MAX_BULK_CONTRACTS == 1000
        assert bulk_service.MAX_BULK_USERS == 100
        assert bulk_service.MAX_EXPORT_CONTRACTS == 10000

    def test_service_initialization(self, mock_db):
        """Test service initialization"""
        service = BulkOperationsService(mock_db)
        assert service.db == mock_db


class TestBulkContractUpdate:
    """Test bulk contract update functionality"""

    @pytest.mark.asyncio
    async def test_bulk_update_contracts_success(
        self, bulk_service, mock_db, contract_manager_user, sample_contracts
    ):
        """Test successful bulk contract update"""
        # Given
        request = BulkContractUpdateRequest(
            contract_ids=[c.id for c in sample_contracts[:3]],
            updates=ContractBulkUpdateFields(
                status="active", client_name="Updated Client"
            ),
        )

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = sample_contracts[:3]

        with patch("app.core.datetime_utils.get_current_utc") as mock_utc:
            mock_utc.return_value = datetime.now(timezone.utc)

            # When
            result = await bulk_service.bulk_update_contracts(
                request, contract_manager_user
            )

            # Then
            assert result.operation_type == "bulk_contract_update"
            assert result.total_requested == 3
            assert result.success_count == 3
            assert result.failed_count == 0
            assert len(result.updated_ids) == 3
            assert result.errors is None
            mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_bulk_update_contracts_insufficient_permissions(
        self, bulk_service, mock_db, viewer_user
    ):
        """Test bulk update with insufficient permissions"""
        # Given
        request = BulkContractUpdateRequest(
            contract_ids=["contract-1"],
            updates=ContractBulkUpdateFields(status="active"),
        )

        # When/Then
        with pytest.raises(BusinessRuleViolationError) as exc_info:
            await bulk_service.bulk_update_contracts(request, viewer_user)

        assert "Insufficient permissions" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bulk_update_contracts_no_company(self, bulk_service, mock_db):
        """Test bulk update with user not associated with company"""
        # Given
        user_without_company = User(
            id="no-company-user",
            email="nocompany@example.com",
            role="admin",
            company_id=None,
            is_active=True,
        )

        request = BulkContractUpdateRequest(
            contract_ids=["contract-1"],
            updates=ContractBulkUpdateFields(status="active"),
        )

        # When/Then
        with pytest.raises(CompanyAccessError):
            await bulk_service.bulk_update_contracts(request, user_without_company)

    @pytest.mark.asyncio
    async def test_bulk_update_contracts_limit_exceeded(
        self, bulk_service, mock_db, admin_user
    ):
        """Test bulk update with limit exceeded"""
        # Given
        large_contract_list = [f"contract-{i}" for i in range(1001)]
        request = BulkContractUpdateRequest(
            contract_ids=large_contract_list,
            updates=ContractBulkUpdateFields(status="active"),
        )

        # When/Then
        with pytest.raises(DomainValidationError) as exc_info:
            await bulk_service.bulk_update_contracts(request, admin_user)

        assert "limit exceeded" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_bulk_update_contracts_not_found(
        self, bulk_service, mock_db, admin_user
    ):
        """Test bulk update with contracts not found"""
        # Given
        request = BulkContractUpdateRequest(
            contract_ids=["non-existent-1", "non-existent-2"],
            updates=ContractBulkUpdateFields(status="active"),
        )

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = []  # No contracts found

        # When
        result = await bulk_service.bulk_update_contracts(request, admin_user)

        # Then
        assert result.success_count == 0
        assert result.failed_count == 2
        assert len(result.errors) == 2
        for error in result.errors:
            assert error.error_code == "CONTRACT_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_bulk_update_contracts_partial_failure(
        self, bulk_service, mock_db, admin_user, sample_contracts
    ):
        """Test bulk update with partial failures"""
        # Given
        request = BulkContractUpdateRequest(
            contract_ids=[c.id for c in sample_contracts[:3]],
            updates=ContractBulkUpdateFields(status="active"),
        )

        # Mock one contract to raise an exception during update
        faulty_contract = sample_contracts[1]

        def side_effect_update(*args, **kwargs):
            if args and hasattr(args[0], "id") and args[0].id == faulty_contract.id:
                raise Exception("Database error")
            return Mock()

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = sample_contracts[:3]

        with patch("app.core.datetime_utils.get_current_utc") as mock_utc:
            mock_utc.return_value = datetime.now(timezone.utc)

            # Patch the contract update to simulate failure
            with patch.object(bulk_service, "_apply_contract_updates") as mock_apply:
                mock_apply.side_effect = lambda contract, updates: (
                    False if contract.id == faulty_contract.id else True
                )

                # When
                result = await bulk_service.bulk_update_contracts(request, admin_user)

                # Then
                assert result.success_count == 2
                assert result.failed_count == 0  # No actual failure, just no changes
                assert len(result.warnings) == 1
                assert "No changes applied" in result.warnings[0]

    @pytest.mark.asyncio
    async def test_bulk_update_contracts_database_rollback(
        self, bulk_service, mock_db, admin_user, sample_contracts
    ):
        """Test bulk update with database rollback on error"""
        # Given
        request = BulkContractUpdateRequest(
            contract_ids=[c.id for c in sample_contracts[:2]],
            updates=ContractBulkUpdateFields(status="active"),
        )

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = sample_contracts[:2]
        mock_db.commit.side_effect = Exception("Database connection lost")

        # When/Then
        with pytest.raises(BusinessRuleViolationError):
            await bulk_service.bulk_update_contracts(request, admin_user)

        mock_db.rollback.assert_called_once()


class TestBulkContractDelete:
    """Test bulk contract delete functionality"""

    @pytest.mark.asyncio
    async def test_bulk_delete_contracts_success(
        self, bulk_service, mock_db, admin_user, sample_contracts
    ):
        """Test successful bulk contract deletion"""
        # Given
        # Set contracts to DRAFT status so they can be deleted
        for contract in sample_contracts[:3]:
            contract.status = ContractStatus.DRAFT

        request = BulkContractDeleteRequest(
            contract_ids=[c.id for c in sample_contracts[:3]],
            deletion_reason="Test cleanup",
        )

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = sample_contracts[:3]

        with patch("app.core.datetime_utils.get_current_utc") as mock_utc:
            mock_utc.return_value = datetime.now(timezone.utc)

            # When
            result = await bulk_service.bulk_delete_contracts(request, admin_user)

            # Then
            assert result.operation_type == "bulk_contract_delete"
            assert result.success_count == 3
            assert result.failed_count == 0
            assert len(result.deleted_ids) == 3
            mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_bulk_delete_contracts_cannot_delete_active(
        self, bulk_service, mock_db, admin_user, sample_contracts
    ):
        """Test bulk delete fails for active contracts"""
        # Given
        # Set contracts to ACTIVE status so they cannot be deleted
        for contract in sample_contracts[:2]:
            contract.status = ContractStatus.ACTIVE

        request = BulkContractDeleteRequest(
            contract_ids=[c.id for c in sample_contracts[:2]],
            deletion_reason="Test cleanup",
        )

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = sample_contracts[:2]

        # When
        result = await bulk_service.bulk_delete_contracts(request, admin_user)

        # Then
        assert result.success_count == 0
        assert result.failed_count == 2
        assert len(result.errors) == 2
        for error in result.errors:
            assert error.error_code == "CANNOT_DELETE"

    @pytest.mark.asyncio
    async def test_bulk_delete_contracts_insufficient_permissions(
        self, bulk_service, mock_db, viewer_user
    ):
        """Test bulk delete with insufficient permissions"""
        # Given
        request = BulkContractDeleteRequest(
            contract_ids=["contract-1"], deletion_reason="Test"
        )

        # When/Then
        with pytest.raises(BusinessRuleViolationError):
            await bulk_service.bulk_delete_contracts(request, viewer_user)


class TestBulkUserInvite:
    """Test bulk user invite functionality"""

    @pytest.mark.asyncio
    async def test_bulk_invite_users_success(self, bulk_service, mock_db, admin_user):
        """Test successful bulk user invitation"""
        # Given
        invitations = [
            UserInvitation(
                email="user1@example.com",
                full_name="User One",
                role="contract_manager",
                send_email=True,
            ),
            UserInvitation(
                email="user2@example.com",
                full_name="User Two",
                role="viewer",
                send_email=False,
            ),
        ]

        request = BulkUserInviteRequest(invitations=invitations)

        # Mock database queries to show no existing users
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None  # No existing users

        with patch("app.core.datetime_utils.get_current_utc") as mock_utc, patch(
            "uuid.uuid4"
        ) as mock_uuid:
            mock_utc.return_value = datetime.now(timezone.utc)
            mock_uuid.return_value = uuid.UUID("12345678-1234-1234-1234-123456789abc")

            # When
            result = await bulk_service.bulk_invite_users(request, admin_user)

            # Then
            assert result.operation_type == "bulk_user_invite"
            assert result.success_count == 2
            assert result.failed_count == 0
            assert len(result.invited_emails) == 2
            assert "user1@example.com" in result.invited_emails
            assert "user2@example.com" in result.invited_emails
            mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_bulk_invite_users_existing_same_company(
        self, bulk_service, mock_db, admin_user
    ):
        """Test bulk invite with user already in same company"""
        # Given
        existing_user = User(
            id="existing-user",
            email="existing@example.com",
            company_id=admin_user.company_id,
            is_active=True,
        )

        invitations = [
            UserInvitation(
                email="existing@example.com",
                full_name="Existing User",
                role="viewer",
                send_email=True,
            )
        ]

        request = BulkUserInviteRequest(invitations=invitations)

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = existing_user

        # When
        result = await bulk_service.bulk_invite_users(request, admin_user)

        # Then
        assert result.success_count == 0
        assert result.failed_count == 0
        assert len(result.warnings) == 1
        assert "already part of your company" in result.warnings[0]

    @pytest.mark.asyncio
    async def test_bulk_invite_users_existing_other_company(
        self, bulk_service, mock_db, admin_user
    ):
        """Test bulk invite with user in different company"""
        # Given
        existing_user = User(
            id="existing-user",
            email="existing@example.com",
            company_id="other-company-id",  # Different company
            is_active=True,
        )

        invitations = [
            UserInvitation(
                email="existing@example.com",
                full_name="Existing User",
                role="viewer",
                send_email=True,
            )
        ]

        request = BulkUserInviteRequest(invitations=invitations)

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = existing_user

        # When
        result = await bulk_service.bulk_invite_users(request, admin_user)

        # Then
        assert result.success_count == 0
        assert result.failed_count == 1
        assert len(result.errors) == 1
        assert result.errors[0].error_code == "USER_EXISTS_OTHER_COMPANY"

    @pytest.mark.asyncio
    async def test_bulk_invite_users_non_admin(
        self, bulk_service, mock_db, contract_manager_user
    ):
        """Test bulk invite with non-admin user"""
        # Given
        invitations = [
            UserInvitation(
                email="user@example.com",
                full_name="User",
                role="viewer",
                send_email=True,
            )
        ]

        request = BulkUserInviteRequest(invitations=invitations)

        # When/Then
        with pytest.raises(BusinessRuleViolationError):
            await bulk_service.bulk_invite_users(request, contract_manager_user)

    @pytest.mark.asyncio
    async def test_bulk_invite_users_limit_exceeded(
        self, bulk_service, mock_db, admin_user
    ):
        """Test bulk invite with limit exceeded"""
        # Given
        invitations = [
            UserInvitation(
                email=f"user{i}@example.com",
                full_name=f"User {i}",
                role="viewer",
                send_email=False,
            )
            for i in range(101)  # Exceeds MAX_BULK_USERS
        ]

        request = BulkUserInviteRequest(invitations=invitations)

        # When/Then
        with pytest.raises(DomainValidationError):
            await bulk_service.bulk_invite_users(request, admin_user)


class TestBulkUserRoleChange:
    """Test bulk user role change functionality"""

    @pytest.mark.asyncio
    async def test_bulk_change_user_roles_success(
        self, bulk_service, mock_db, admin_user
    ):
        """Test successful bulk user role change"""
        # Given
        users = [
            User(
                id="user-1",
                email="user1@example.com",
                role="viewer",
                company_id=admin_user.company_id,
                is_active=True,
            ),
            User(
                id="user-2",
                email="user2@example.com",
                role="viewer",
                company_id=admin_user.company_id,
                is_active=True,
            ),
        ]

        request = BulkUserRoleChangeRequest(
            user_ids=["user-1", "user-2"], new_role="contract_manager"
        )

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = users

        with patch("app.core.datetime_utils.get_current_utc") as mock_utc:
            mock_utc.return_value = datetime.now(timezone.utc)

            # When
            result = await bulk_service.bulk_change_user_roles(request, admin_user)

            # Then
            assert result.operation_type == "bulk_user_role_change"
            assert result.success_count == 2
            assert result.failed_count == 0
            assert len(result.updated_ids) == 2
            mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_bulk_change_user_roles_cannot_change_own_role(
        self, bulk_service, mock_db, admin_user
    ):
        """Test cannot change own role"""
        # Given
        users = [admin_user]  # Admin trying to change own role

        request = BulkUserRoleChangeRequest(
            user_ids=[admin_user.id], new_role="contract_manager"
        )

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = users

        # When
        result = await bulk_service.bulk_change_user_roles(request, admin_user)

        # Then
        assert result.success_count == 0
        assert result.failed_count == 0
        assert len(result.warnings) == 1
        assert "Cannot change your own role" in result.warnings[0]

    @pytest.mark.asyncio
    async def test_bulk_change_user_roles_cannot_demote_last_admin(
        self, bulk_service, mock_db, admin_user
    ):
        """Test cannot demote last admin"""
        # Given
        admin_users = [admin_user]  # Only one admin

        request = BulkUserRoleChangeRequest(
            user_ids=[admin_user.id], new_role="contract_manager"
        )

        # Mock queries
        mock_query_all = Mock()
        mock_query_count = Mock()

        def query_side_effect(model):
            if model == User:
                mock = Mock()
                mock.filter.return_value = mock
                if hasattr(mock, "all"):
                    mock.all.return_value = admin_users
                if hasattr(mock, "count"):
                    mock.count.return_value = 1  # Only one admin
                return mock
            return Mock()

        mock_db.query.side_effect = query_side_effect

        # Create another admin user that's not the same as current user
        other_admin = User(
            id="other-admin-id",
            email="otheradmin@example.com",
            role="admin",
            company_id=admin_user.company_id,
            is_active=True,
        )

        # Setup mock to return this admin when querying for role change
        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [other_admin]
        mock_query.count.return_value = 1  # Only one admin total

        request = BulkUserRoleChangeRequest(
            user_ids=[other_admin.id], new_role="contract_manager"
        )

        # When
        result = await bulk_service.bulk_change_user_roles(request, admin_user)

        # Then
        assert result.success_count == 0
        assert result.failed_count == 1
        assert len(result.errors) == 1
        assert result.errors[0].error_code == "CANNOT_DEMOTE_LAST_ADMIN"

    @pytest.mark.asyncio
    async def test_bulk_change_user_roles_same_role(
        self, bulk_service, mock_db, admin_user
    ):
        """Test role change when user already has the target role"""
        # Given
        user = User(
            id="user-1",
            email="user1@example.com",
            role="viewer",  # Already viewer
            company_id=admin_user.company_id,
            is_active=True,
        )

        request = BulkUserRoleChangeRequest(
            user_ids=["user-1"], new_role="viewer"  # Same role
        )

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [user]

        # When
        result = await bulk_service.bulk_change_user_roles(request, admin_user)

        # Then
        assert result.success_count == 0
        assert result.failed_count == 0
        assert len(result.warnings) == 1
        assert "already has role" in result.warnings[0]


class TestHelperMethods:
    """Test private helper methods"""

    def test_ensure_bulk_operation_permissions_admin(self, bulk_service, admin_user):
        """Test bulk operation permissions for admin"""
        # Should not raise exception
        bulk_service._ensure_bulk_operation_permissions(admin_user)

    def test_ensure_bulk_operation_permissions_contract_manager(
        self, bulk_service, contract_manager_user
    ):
        """Test bulk operation permissions for contract manager"""
        # Should not raise exception
        bulk_service._ensure_bulk_operation_permissions(contract_manager_user)

    def test_ensure_bulk_operation_permissions_viewer(self, bulk_service, viewer_user):
        """Test bulk operation permissions for viewer"""
        with pytest.raises(BusinessRuleViolationError):
            bulk_service._ensure_bulk_operation_permissions(viewer_user)

    def test_ensure_bulk_operation_permissions_no_company(self, bulk_service):
        """Test bulk operation permissions without company"""
        user = User(
            id="no-company", email="test@example.com", role="admin", company_id=None
        )

        with pytest.raises(CompanyAccessError):
            bulk_service._ensure_bulk_operation_permissions(user)

    def test_ensure_admin_permissions_admin(self, bulk_service, admin_user):
        """Test admin permissions for admin user"""
        # Should not raise exception
        bulk_service._ensure_admin_permissions(admin_user)

    def test_ensure_admin_permissions_non_admin(
        self, bulk_service, contract_manager_user
    ):
        """Test admin permissions for non-admin user"""
        with pytest.raises(BusinessRuleViolationError):
            bulk_service._ensure_admin_permissions(contract_manager_user)

    def test_validate_bulk_contract_limits_valid(self, bulk_service):
        """Test valid bulk contract limits"""
        # Should not raise exception
        bulk_service._validate_bulk_contract_limits(500)

    def test_validate_bulk_contract_limits_exceeded(self, bulk_service):
        """Test exceeded bulk contract limits"""
        with pytest.raises(DomainValidationError):
            bulk_service._validate_bulk_contract_limits(1001)

    def test_get_user_contracts(self, bulk_service, mock_db, admin_user):
        """Test getting user contracts"""
        contract_ids = ["contract-1", "contract-2"]

        mock_query = Mock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = []

        result = bulk_service._get_user_contracts(contract_ids, admin_user)

        assert result == []
        mock_db.query.assert_called_with(Contract)

    def test_apply_contract_updates_status(self, bulk_service, sample_contracts):
        """Test applying status update"""
        contract = sample_contracts[0]
        updates = ContractBulkUpdateFields(status="active")

        result = bulk_service._apply_contract_updates(contract, updates)

        assert result is True
        assert contract.status.value == "active"

    def test_apply_contract_updates_multiple_fields(
        self, bulk_service, sample_contracts
    ):
        """Test applying multiple field updates"""
        contract = sample_contracts[0]
        updates = ContractBulkUpdateFields(
            client_name="New Client", contract_value=5000.0, currency="USD"
        )

        result = bulk_service._apply_contract_updates(contract, updates)

        assert result is True
        assert contract.client_name == "New Client"
        assert contract.contract_value == 5000.0
        assert contract.currency == "USD"

    def test_apply_contract_updates_no_changes(self, bulk_service, sample_contracts):
        """Test applying updates with no actual changes"""
        contract = sample_contracts[0]
        # Set the same values that already exist
        updates = ContractBulkUpdateFields(
            client_name=contract.client_name, contract_value=contract.contract_value
        )

        result = bulk_service._apply_contract_updates(contract, updates)

        assert result is False

    def test_get_contract_audit_values(self, bulk_service, sample_contracts):
        """Test getting contract audit values"""
        contract = sample_contracts[0]

        result = bulk_service._get_contract_audit_values(contract)

        assert result["title"] == contract.title
        assert result["status"] == contract.status.value
        assert result["client_name"] == contract.client_name
        assert result["supplier_name"] == contract.supplier_name
        assert result["contract_value"] == contract.contract_value
        assert result["currency"] == contract.currency

    def test_can_delete_contract_draft(self, bulk_service, sample_contracts):
        """Test can delete draft contract"""
        contract = sample_contracts[0]
        contract.status = ContractStatus.DRAFT

        result = bulk_service._can_delete_contract(contract)

        assert result is True

    def test_can_delete_contract_completed(self, bulk_service, sample_contracts):
        """Test can delete completed contract"""
        contract = sample_contracts[0]
        contract.status = ContractStatus.COMPLETED

        result = bulk_service._can_delete_contract(contract)

        assert result is True

    def test_can_delete_contract_terminated(self, bulk_service, sample_contracts):
        """Test can delete terminated contract"""
        contract = sample_contracts[0]
        contract.status = ContractStatus.TERMINATED

        result = bulk_service._can_delete_contract(contract)

        assert result is True

    def test_cannot_delete_contract_active(self, bulk_service, sample_contracts):
        """Test cannot delete active contract"""
        contract = sample_contracts[0]
        contract.status = ContractStatus.ACTIVE

        result = bulk_service._can_delete_contract(contract)

        assert result is False

    def test_create_contract_audit_log(self, bulk_service, mock_db, sample_contracts):
        """Test creating contract audit log"""
        contract = sample_contracts[0]
        old_values = {"status": "DRAFT"}
        new_values = {"status": "ACTIVE"}
        metadata = {"reason": "test"}

        bulk_service._create_contract_audit_log(
            contract=contract,
            event_type="test_event",
            user_id="test-user",
            old_values=old_values,
            new_values=new_values,
            metadata=metadata,
        )

        mock_db.add.assert_called_once()
        added_log = mock_db.add.call_args[0][0]
        assert isinstance(added_log, AuditLog)
        assert added_log.event_type == "test_event"
        assert added_log.resource_type == "contract"
        assert added_log.resource_id == contract.id


class TestFactoryFunction:
    """Test factory function"""

    def test_get_bulk_operations_service(self, mock_db):
        """Test bulk operations service factory function"""
        from app.services.bulk_operations_service import get_bulk_operations_service

        service = get_bulk_operations_service(mock_db)

        assert isinstance(service, BulkOperationsService)
        assert service.db == mock_db


class TestBulkOperationResult:
    """Test BulkOperationResult dataclass"""

    def test_bulk_operation_result_creation(self):
        """Test creating BulkOperationResult"""
        result = BulkOperationResult(
            success_count=5,
            failed_count=2,
            updated_ids=["1", "2"],
            deleted_ids=["3", "4"],
            invited_emails=["test@example.com"],
            errors=[],
            warnings=[],
            processing_time_ms=123.45,
        )

        assert result.success_count == 5
        assert result.failed_count == 2
        assert len(result.updated_ids) == 2
        assert len(result.deleted_ids) == 2
        assert len(result.invited_emails) == 1
        assert result.processing_time_ms == 123.45
