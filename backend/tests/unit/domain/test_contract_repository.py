"""
Unit tests for Contract Repository
Following TDD principles - tests written first to define expected behavior
"""
import pytest
from typing import List, Optional
from unittest.mock import Mock, AsyncMock

from app.domain.entities.contract import Contract, ContractId
from app.domain.value_objects import ContractStatus, ContractType, Email, ContractParty
from app.domain.repositories.contract_repository import ContractRepository, ContractFilter
from app.domain.exceptions import ContractNotFoundError, ConcurrencyError


class TestContractRepository:
    """Test Contract Repository interface"""
    
    @pytest.fixture
    def mock_repository(self) -> Mock:
        """Create mock repository for testing"""
        repository = Mock(spec=ContractRepository)
        return repository
    
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
            company_id="company-456"
        )
    
    @pytest.mark.asyncio
    async def test_save_contract_returns_contract(self, mock_repository: Mock, sample_contract: Contract):
        """Test saving a contract returns the contract"""
        # Given
        mock_repository.save = AsyncMock(return_value=sample_contract)
        
        # When
        result = await mock_repository.save(sample_contract)
        
        # Then
        assert result == sample_contract
        mock_repository.save.assert_called_once_with(sample_contract)
    
    @pytest.mark.asyncio
    async def test_find_by_id_returns_contract_when_found(self, mock_repository: Mock, sample_contract: Contract):
        """Test finding contract by ID when it exists"""
        # Given
        contract_id = ContractId("contract-123")
        mock_repository.find_by_id = AsyncMock(return_value=sample_contract)
        
        # When
        result = await mock_repository.find_by_id(contract_id)
        
        # Then
        assert result == sample_contract
        mock_repository.find_by_id.assert_called_once_with(contract_id)
    
    @pytest.mark.asyncio
    async def test_find_by_id_returns_none_when_not_found(self, mock_repository: Mock):
        """Test finding contract by ID when it doesn't exist"""
        # Given
        contract_id = ContractId("non-existent")
        mock_repository.find_by_id = AsyncMock(return_value=None)
        
        # When
        result = await mock_repository.find_by_id(contract_id)
        
        # Then
        assert result is None
        mock_repository.find_by_id.assert_called_once_with(contract_id)
    
    @pytest.mark.asyncio
    async def test_get_by_id_returns_contract_when_found(self, mock_repository: Mock, sample_contract: Contract):
        """Test getting contract by ID when it exists"""
        # Given
        contract_id = ContractId("contract-123")
        mock_repository.get_by_id = AsyncMock(return_value=sample_contract)
        
        # When
        result = await mock_repository.get_by_id(contract_id)
        
        # Then
        assert result == sample_contract
        mock_repository.get_by_id.assert_called_once_with(contract_id)
    
    @pytest.mark.asyncio
    async def test_get_by_id_raises_exception_when_not_found(self, mock_repository: Mock):
        """Test getting contract by ID when it doesn't exist raises exception"""
        # Given
        contract_id = ContractId("non-existent")
        mock_repository.get_by_id = AsyncMock(side_effect=ContractNotFoundError("non-existent"))
        
        # When & Then
        with pytest.raises(ContractNotFoundError):
            await mock_repository.get_by_id(contract_id)
    
    @pytest.mark.asyncio
    async def test_find_by_company_returns_contracts(self, mock_repository: Mock, sample_contract: Contract):
        """Test finding contracts by company ID"""
        # Given
        company_id = "company-456"
        expected_contracts = [sample_contract]
        mock_repository.find_by_company = AsyncMock(return_value=expected_contracts)
        
        # When
        result = await mock_repository.find_by_company(company_id)
        
        # Then
        assert result == expected_contracts
        mock_repository.find_by_company.assert_called_once_with(company_id)
    
    @pytest.mark.asyncio
    async def test_find_with_filter_returns_filtered_contracts(self, mock_repository: Mock, sample_contract: Contract):
        """Test finding contracts with filter"""
        # Given
        contract_filter = ContractFilter(
            contract_type=ContractType.SERVICE_AGREEMENT,
            status=ContractStatus.DRAFT
        )
        expected_contracts = [sample_contract]
        mock_repository.find_with_filter = AsyncMock(return_value=expected_contracts)
        
        # When
        result = await mock_repository.find_with_filter(contract_filter)
        
        # Then
        assert result == expected_contracts
        mock_repository.find_with_filter.assert_called_once_with(contract_filter)
    
    @pytest.mark.asyncio
    async def test_count_by_company_returns_count(self, mock_repository: Mock):
        """Test counting contracts by company"""
        # Given
        company_id = "company-456"
        expected_count = 5
        mock_repository.count_by_company = AsyncMock(return_value=expected_count)
        
        # When
        result = await mock_repository.count_by_company(company_id)
        
        # Then
        assert result == expected_count
        mock_repository.count_by_company.assert_called_once_with(company_id)
    
    @pytest.mark.asyncio
    async def test_delete_contract_removes_contract(self, mock_repository: Mock):
        """Test deleting a contract"""
        # Given
        contract_id = ContractId("contract-123")
        mock_repository.delete = AsyncMock(return_value=None)
        
        # When
        await mock_repository.delete(contract_id)
        
        # Then
        mock_repository.delete.assert_called_once_with(contract_id)
    
    @pytest.mark.asyncio
    async def test_exists_returns_true_when_contract_exists(self, mock_repository: Mock):
        """Test checking if contract exists when it does"""
        # Given
        contract_id = ContractId("contract-123")
        mock_repository.exists = AsyncMock(return_value=True)
        
        # When
        result = await mock_repository.exists(contract_id)
        
        # Then
        assert result is True
        mock_repository.exists.assert_called_once_with(contract_id)
    
    @pytest.mark.asyncio
    async def test_exists_returns_false_when_contract_not_exists(self, mock_repository: Mock):
        """Test checking if contract exists when it doesn't"""
        # Given
        contract_id = ContractId("non-existent")
        mock_repository.exists = AsyncMock(return_value=False)
        
        # When
        result = await mock_repository.exists(contract_id)
        
        # Then
        assert result is False
        mock_repository.exists.assert_called_once_with(contract_id)


class TestContractFilter:
    """Test Contract Repository Filter"""
    
    def test_create_empty_filter(self):
        """Test creating an empty filter"""
        # When
        contract_filter = ContractFilter()
        
        # Then
        assert contract_filter.company_id is None
        assert contract_filter.contract_type is None
        assert contract_filter.status is None
        assert contract_filter.created_by_user_id is None
        assert contract_filter.client_name is None
        assert contract_filter.supplier_name is None
        assert contract_filter.title_contains is None
    
    def test_create_filter_with_company_id(self):
        """Test creating filter with company ID"""
        # Given
        company_id = "company-456"
        
        # When
        contract_filter = ContractFilter(company_id=company_id)
        
        # Then
        assert contract_filter.company_id == company_id
    
    def test_create_filter_with_contract_type(self):
        """Test creating filter with contract type"""
        # Given
        contract_type = ContractType.SERVICE_AGREEMENT
        
        # When
        contract_filter = ContractFilter(contract_type=contract_type)
        
        # Then
        assert contract_filter.contract_type == contract_type
    
    def test_create_filter_with_status(self):
        """Test creating filter with status"""
        # Given
        status = ContractStatus.ACTIVE
        
        # When
        contract_filter = ContractFilter(status=status)
        
        # Then
        assert contract_filter.status == status
    
    def test_create_filter_with_multiple_criteria(self):
        """Test creating filter with multiple criteria"""
        # Given
        company_id = "company-456"
        contract_type = ContractType.SERVICE_AGREEMENT
        status = ContractStatus.DRAFT
        title_contains = "test"
        
        # When
        contract_filter = ContractFilter(
            company_id=company_id,
            contract_type=contract_type,
            status=status,
            title_contains=title_contains
        )
        
        # Then
        assert contract_filter.company_id == company_id
        assert contract_filter.contract_type == contract_type
        assert contract_filter.status == status
        assert contract_filter.title_contains == title_contains
    
    def test_filter_equality(self):
        """Test filter equality comparison"""
        # Given
        filter1 = ContractFilter(
            company_id="company-456",
            contract_type=ContractType.SERVICE_AGREEMENT
        )
        filter2 = ContractFilter(
            company_id="company-456",
            contract_type=ContractType.SERVICE_AGREEMENT
        )
        filter3 = ContractFilter(
            company_id="company-789",
            contract_type=ContractType.SERVICE_AGREEMENT
        )
        
        # When & Then
        assert filter1 == filter2
        assert filter1 != filter3
    
    def test_filter_has_criteria(self):
        """Test checking if filter has any criteria"""
        # Given
        empty_filter = ContractFilter()
        filter_with_criteria = ContractFilter(company_id="company-456")
        
        # When & Then
        assert not empty_filter.has_criteria()
        assert filter_with_criteria.has_criteria()
    
    def test_filter_to_dict(self):
        """Test converting filter to dictionary"""
        # Given
        contract_filter = ContractFilter(
            company_id="company-456",
            contract_type=ContractType.SERVICE_AGREEMENT,
            status=ContractStatus.DRAFT
        )
        
        # When
        filter_dict = contract_filter.to_dict()
        
        # Then
        expected_dict = {
            "company_id": "company-456",
            "contract_type": ContractType.SERVICE_AGREEMENT,
            "status": ContractStatus.DRAFT
        }
        assert filter_dict == expected_dict