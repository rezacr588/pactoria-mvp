"""
Tests for Contract Repository Implementation
Following TDD principles - tests for SQLAlchemy repository implementation
"""

import pytest
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone

from app.domain.entities.contract import Contract, ContractId
from app.domain.value_objects import (
    ContractStatus,
    ContractType,
    Email,
    ContractParty,
    Money,
)
from app.domain.repositories.contract_repository import ContractFilter, PageRequest
from app.infrastructure.repositories.sqlalchemy_contract_repository import (
    SQLAlchemyContractRepository,
)
from app.infrastructure.database.models import Contract as ContractModel
from app.domain.exceptions import ContractNotFoundError, ConcurrencyError


class TestSQLAlchemyContractRepository:
    """Test SQLAlchemy Contract Repository implementation"""

    @pytest.fixture
    def mock_db_session(self) -> Mock:
        """Create mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def repository(self, mock_db_session) -> SQLAlchemyContractRepository:
        """Create repository with mock session"""
        return SQLAlchemyContractRepository(mock_db_session)

    @pytest.fixture
    def sample_contract(self) -> Contract:
        """Create sample contract for testing"""
        return Contract.create(
            contract_id=ContractId("contract-123"),
            title="Test Contract",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Test plain english input",
            client=ContractParty("Test Client", Email("client@example.com")),
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456",
        )

    @pytest.fixture
    def mock_contract_model(self) -> Mock:
        """Create mock contract database model"""
        model = Mock(spec=ContractModel)
        model.id = "contract-123"
        model.title = "Test Contract"
        model.contract_type = "service_agreement"
        model.status = "draft"
        model.plain_english_input = "Test input"
        model.client_name = "Test Client"
        model.company_id = "company-456"
        model.created_by = "user-123"
        model.version = 1
        model.created_at = datetime.now(timezone.utc)
        model.updated_at = None
        return model

    @pytest.mark.asyncio
    async def test_save_new_contract_creates_database_record(
        self,
        repository: SQLAlchemyContractRepository,
        mock_db_session: Mock,
        sample_contract: Contract,
    ):
        """Test saving a new contract creates database record"""
        # Given
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        mock_db_session.add = Mock()
        mock_db_session.commit = Mock()
        mock_db_session.refresh = Mock()

        # When
        result = await repository.save(sample_contract)

        # Then
        assert result == sample_contract
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_save_existing_contract_updates_database_record(
        self,
        repository: SQLAlchemyContractRepository,
        mock_db_session: Mock,
        sample_contract: Contract,
        mock_contract_model: Mock,
    ):
        """Test saving existing contract updates database record"""
        # Given
        mock_db_session.query.return_value.filter.return_value.first.return_value = (
            mock_contract_model
        )
        mock_db_session.commit = Mock()
        mock_db_session.refresh = Mock()

        # Modify contract to trigger update
        sample_contract.set_contract_value(Money(1000, "GBP"))

        # Update mock model version to match the contract version after modification
        mock_contract_model.version = sample_contract.version

        # When
        result = await repository.save(sample_contract)

        # Then
        assert result == sample_contract
        mock_db_session.commit.assert_called_once()
        mock_db_session.refresh.assert_called_once_with(mock_contract_model)

    @pytest.mark.asyncio
    async def test_save_with_version_mismatch_raises_concurrency_error(
        self,
        repository: SQLAlchemyContractRepository,
        mock_db_session: Mock,
        sample_contract: Contract,
        mock_contract_model: Mock,
    ):
        """Test saving contract with version mismatch raises concurrency error"""
        # Given
        mock_contract_model.version = 2  # Different version
        mock_db_session.query.return_value.filter.return_value.first.return_value = (
            mock_contract_model
        )

        # When & Then
        with pytest.raises(ConcurrencyError):
            await repository.save(sample_contract)

    @pytest.mark.asyncio
    async def test_find_by_id_returns_contract_when_found(
        self,
        repository: SQLAlchemyContractRepository,
        mock_db_session: Mock,
        mock_contract_model: Mock,
    ):
        """Test finding contract by ID when it exists"""
        # Given
        contract_id = ContractId("contract-123")
        mock_db_session.query.return_value.filter.return_value.first.return_value = (
            mock_contract_model
        )

        # Mock the domain mapper
        with patch.object(repository, "_to_domain", return_value=Mock()) as mock_mapper:
            # When
            result = await repository.find_by_id(contract_id)

            # Then
            assert result is not None
            mock_mapper.assert_called_once_with(mock_contract_model)

    @pytest.mark.asyncio
    async def test_find_by_id_returns_none_when_not_found(
        self, repository: SQLAlchemyContractRepository, mock_db_session: Mock
    ):
        """Test finding contract by ID when it doesn't exist"""
        # Given
        contract_id = ContractId("non-existent")
        mock_db_session.query.return_value.filter.return_value.first.return_value = None

        # When
        result = await repository.find_by_id(contract_id)

        # Then
        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_id_returns_contract_when_found(
        self,
        repository: SQLAlchemyContractRepository,
        mock_db_session: Mock,
        mock_contract_model: Mock,
    ):
        """Test getting contract by ID when it exists"""
        # Given
        contract_id = ContractId("contract-123")
        mock_db_session.query.return_value.filter.return_value.first.return_value = (
            mock_contract_model
        )

        with patch.object(repository, "_to_domain", return_value=Mock()) as mock_mapper:
            # When
            result = await repository.get_by_id(contract_id)

            # Then
            assert result is not None
            mock_mapper.assert_called_once_with(mock_contract_model)

    @pytest.mark.asyncio
    async def test_get_by_id_raises_exception_when_not_found(
        self, repository: SQLAlchemyContractRepository, mock_db_session: Mock
    ):
        """Test getting contract by ID when it doesn't exist raises exception"""
        # Given
        contract_id = ContractId("non-existent")
        mock_db_session.query.return_value.filter.return_value.first.return_value = None

        # When & Then
        with pytest.raises(ContractNotFoundError):
            await repository.get_by_id(contract_id)

    @pytest.mark.asyncio
    async def test_find_by_company_returns_paginated_contracts(
        self,
        repository: SQLAlchemyContractRepository,
        mock_db_session: Mock,
        mock_contract_model: Mock,
    ):
        """Test finding contracts by company with pagination"""
        # Given
        company_id = "company-456"
        page_request = PageRequest(page=1, size=10)

        # Mock query chain
        mock_query = Mock()
        mock_db_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = [mock_contract_model]
        mock_query.count.return_value = 1

        with patch.object(repository, "_to_domain", return_value=Mock()) as mock_mapper:
            # When
            result = await repository.find_by_company(company_id, page_request)

            # Then
            assert result.total_items == 1
            assert result.page == 1
            assert result.size == 10
            assert len(result.items) == 1
            mock_mapper.assert_called_once()

    @pytest.mark.asyncio
    async def test_find_with_filter_applies_filter_criteria(
        self,
        repository: SQLAlchemyContractRepository,
        mock_db_session: Mock,
        mock_contract_model: Mock,
    ):
        """Test finding contracts with filter applies criteria correctly"""
        # Given
        contract_filter = ContractFilter(
            company_id="company-456",
            contract_type=ContractType.SERVICE_AGREEMENT,
            status=ContractStatus.DRAFT,
        )

        # Mock query chain
        mock_query = Mock()
        mock_db_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = [mock_contract_model]
        mock_query.count.return_value = 1

        with patch.object(repository, "_to_domain", return_value=Mock()) as mock_mapper:
            # When
            result = await repository.find_with_filter(contract_filter)

            # Then
            assert result.total_items == 1
            assert len(result.items) == 1
            # Verify filter was applied (multiple filter calls)
            assert mock_query.filter.call_count >= 1

    @pytest.mark.asyncio
    async def test_count_by_company_returns_correct_count(
        self, repository: SQLAlchemyContractRepository, mock_db_session: Mock
    ):
        """Test counting contracts by company"""
        # Given
        company_id = "company-456"
        expected_count = 5

        mock_query = Mock()
        mock_db_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = expected_count

        # When
        result = await repository.count_by_company(company_id)

        # Then
        assert result == expected_count

    @pytest.mark.asyncio
    async def test_exists_returns_true_when_contract_exists(
        self, repository: SQLAlchemyContractRepository, mock_db_session: Mock
    ):
        """Test checking if contract exists when it does"""
        # Given
        contract_id = ContractId("contract-123")
        mock_db_session.query.return_value.filter.return_value.first.return_value = (
            Mock()
        )

        # When
        result = await repository.exists(contract_id)

        # Then
        assert result is True

    @pytest.mark.asyncio
    async def test_exists_returns_false_when_contract_not_exists(
        self, repository: SQLAlchemyContractRepository, mock_db_session: Mock
    ):
        """Test checking if contract exists when it doesn't"""
        # Given
        contract_id = ContractId("non-existent")
        mock_db_session.query.return_value.filter.return_value.first.return_value = None

        # When
        result = await repository.exists(contract_id)

        # Then
        assert result is False

    @pytest.mark.asyncio
    async def test_delete_removes_contract_when_exists(
        self,
        repository: SQLAlchemyContractRepository,
        mock_db_session: Mock,
        mock_contract_model: Mock,
    ):
        """Test deleting contract when it exists"""
        # Given
        contract_id = ContractId("contract-123")
        mock_db_session.query.return_value.filter.return_value.first.return_value = (
            mock_contract_model
        )
        mock_db_session.delete = Mock()
        mock_db_session.commit = Mock()

        # When
        await repository.delete(contract_id)

        # Then
        mock_db_session.delete.assert_called_once_with(mock_contract_model)
        mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_raises_exception_when_contract_not_found(
        self, repository: SQLAlchemyContractRepository, mock_db_session: Mock
    ):
        """Test deleting contract when it doesn't exist raises exception"""
        # Given
        contract_id = ContractId("non-existent")
        mock_db_session.query.return_value.filter.return_value.first.return_value = None

        # When & Then
        with pytest.raises(ContractNotFoundError):
            await repository.delete(contract_id)


class TestDomainModelMapping:
    """Test mapping between domain entities and database models"""

    def test_to_database_model_maps_correctly(self):
        """Test mapping domain entity to database model"""
        # This would test the _to_model method implementation
        # Implementation depends on the actual mapping logic
        pass

    def test_to_domain_entity_maps_correctly(self):
        """Test mapping database model to domain entity"""
        # This would test the _to_domain method implementation
        # Implementation depends on the actual mapping logic
        pass
