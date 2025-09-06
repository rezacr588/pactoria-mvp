"""
Unit tests for Contract Application Service
Following TDD principles - tests for application service coordination
"""

import pytest
from unittest.mock import Mock, AsyncMock
from datetime import datetime, timezone
from decimal import Decimal

from app.domain.entities.contract import Contract, ContractId
from app.domain.value_objects import (
    ContractStatus,
    ContractType,
    Email,
    ContractParty,
    Money,
    ComplianceScore,
    RiskAssessment,
)
from app.domain.repositories.contract_repository import (
    ContractRepository,
    ContractFilter,
)
from app.application.services.contract_application_service import (
    ContractApplicationService,
    CreateContractCommand,
    UpdateContractCommand,
    GenerateContractContentCommand,
    AnalyzeComplianceCommand,
    ActivateContractCommand,
)
from app.domain.exceptions import ContractNotFoundError, BusinessRuleViolationError


class TestContractApplicationService:
    """Test Contract Application Service"""

    @pytest.fixture
    def mock_contract_repository(self) -> Mock:
        """Create mock contract repository"""
        return Mock(spec=ContractRepository)

    @pytest.fixture
    def mock_ai_service(self) -> Mock:
        """Create mock AI service"""
        mock_service = Mock()
        mock_service.generate_contract = AsyncMock()
        mock_service.validate_contract_compliance = AsyncMock()
        return mock_service

    @pytest.fixture
    def mock_event_publisher(self) -> Mock:
        """Create mock domain event publisher"""
        mock_publisher = Mock()
        mock_publisher.publish = AsyncMock()
        return mock_publisher

    @pytest.fixture
    def application_service(
        self, mock_contract_repository, mock_ai_service, mock_event_publisher
    ) -> ContractApplicationService:
        """Create application service with mocked dependencies"""
        return ContractApplicationService(
            contract_repository=mock_contract_repository,
            ai_service=mock_ai_service,
            event_publisher=mock_event_publisher,
        )

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

    @pytest.mark.asyncio
    async def test_create_contract_creates_and_saves_contract(
        self,
        application_service: ContractApplicationService,
        mock_contract_repository: Mock,
        mock_event_publisher: Mock,
    ):
        """Test creating a contract creates domain entity and saves it"""
        # Given
        command = CreateContractCommand(
            title="New Contract",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Create a service agreement",
            client_name="Client Corp",
            client_email="client@corp.com",
            supplier_name=None,
            created_by_user_id="user-123",
            company_id="company-456",
        )

        mock_contract_repository.save = AsyncMock(side_effect=lambda contract: contract)

        # When
        result = await application_service.create_contract(command)

        # Then
        assert result.title == "New Contract"
        assert result.contract_type == ContractType.SERVICE_AGREEMENT
        assert result.status == ContractStatus.DRAFT
        mock_contract_repository.save.assert_called_once()
        mock_event_publisher.publish.assert_called_once()  # Domain event published

    @pytest.mark.asyncio
    async def test_create_contract_with_invalid_data_raises_validation_error(
        self, application_service: ContractApplicationService
    ):
        """Test creating contract with invalid data raises validation error"""
        # Given
        command = CreateContractCommand(
            title="",  # Invalid empty title
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Create a service agreement",
            client_name="Client Corp",
            client_email="client@corp.com",
            supplier_name=None,
            created_by_user_id="user-123",
            company_id="company-456",
        )

        # When & Then
        with pytest.raises(Exception):  # Domain validation will raise an exception
            await application_service.create_contract(command)

    @pytest.mark.asyncio
    async def test_update_contract_updates_existing_contract(
        self,
        application_service: ContractApplicationService,
        mock_contract_repository: Mock,
        sample_contract: Contract,
    ):
        """Test updating an existing contract"""
        # Given
        contract_id = ContractId("contract-123")
        command = UpdateContractCommand(
            contract_id=contract_id,
            title="Updated Contract Title",
            client_name="Updated Client Name",
            contract_value=Decimal("5000.00"),
            currency="GBP",
        )

        mock_contract_repository.get_by_id = AsyncMock(return_value=sample_contract)
        mock_contract_repository.save = AsyncMock(return_value=sample_contract)

        # When
        result = await application_service.update_contract(command)

        # Then
        mock_contract_repository.get_by_id.assert_called_once_with(contract_id)
        mock_contract_repository.save.assert_called_once()
        assert result is not None

    @pytest.mark.asyncio
    async def test_update_nonexistent_contract_raises_not_found_error(
        self,
        application_service: ContractApplicationService,
        mock_contract_repository: Mock,
    ):
        """Test updating non-existent contract raises not found error"""
        # Given
        contract_id = ContractId("non-existent")
        command = UpdateContractCommand(contract_id=contract_id, title="Updated Title")

        mock_contract_repository.get_by_id = AsyncMock(
            side_effect=ContractNotFoundError("non-existent")
        )

        # When & Then
        with pytest.raises(ContractNotFoundError):
            await application_service.update_contract(command)

    @pytest.mark.asyncio
    async def test_generate_contract_content_generates_and_saves_content(
        self,
        application_service: ContractApplicationService,
        mock_contract_repository: Mock,
        mock_ai_service: Mock,
        sample_contract: Contract,
    ):
        """Test generating contract content via AI service"""
        # Given
        contract_id = ContractId("contract-123")
        command = GenerateContractContentCommand(
            contract_id=contract_id, regenerate=False
        )

        ai_response = Mock()
        ai_response.content = "Generated contract content"
        ai_response.model_name = "test-model"
        ai_response.processing_time_ms = 1500.0
        ai_response.confidence_score = 0.95

        mock_contract_repository.get_by_id = AsyncMock(return_value=sample_contract)
        mock_ai_service.generate_contract = AsyncMock(return_value=ai_response)
        mock_contract_repository.save = AsyncMock(return_value=sample_contract)

        # When
        result = await application_service.generate_contract_content(command)

        # Then
        mock_contract_repository.get_by_id.assert_called_once_with(contract_id)
        mock_ai_service.generate_contract.assert_called_once()
        mock_contract_repository.save.assert_called_once()
        assert result.generated_content == "Generated contract content"

    @pytest.mark.asyncio
    async def test_analyze_compliance_analyzes_and_saves_results(
        self,
        application_service: ContractApplicationService,
        mock_contract_repository: Mock,
        mock_ai_service: Mock,
        sample_contract: Contract,
    ):
        """Test analyzing contract compliance"""
        # Given
        contract_id = ContractId("contract-123")
        command = AnalyzeComplianceCommand(
            contract_id=contract_id, force_reanalysis=False
        )

        # Set up contract with content
        sample_contract.set_generated_content("Contract content", {})

        compliance_result = {
            "overall_score": 0.96,
            "gdpr_compliance": 0.98,
            "risk_score": 2,
            "risk_factors": ["Low risk"],
            "recommendations": ["Continue as planned"],
        }

        mock_contract_repository.get_by_id = AsyncMock(return_value=sample_contract)
        mock_ai_service.validate_contract_compliance = AsyncMock(
            return_value=compliance_result
        )
        mock_contract_repository.save = AsyncMock(return_value=sample_contract)

        # When
        result = await application_service.analyze_compliance(command)

        # Then
        mock_contract_repository.get_by_id.assert_called_once_with(contract_id)
        mock_ai_service.validate_contract_compliance.assert_called_once()
        mock_contract_repository.save.assert_called_once()
        assert result.compliance_score is not None

    @pytest.mark.asyncio
    async def test_analyze_compliance_without_content_raises_error(
        self,
        application_service: ContractApplicationService,
        mock_contract_repository: Mock,
        sample_contract: Contract,
    ):
        """Test analyzing compliance without content raises error"""
        # Given
        contract_id = ContractId("contract-123")
        command = AnalyzeComplianceCommand(
            contract_id=contract_id, force_reanalysis=False
        )

        # Contract has no content
        mock_contract_repository.get_by_id = AsyncMock(return_value=sample_contract)

        # When & Then
        with pytest.raises(BusinessRuleViolationError, match="No content to analyze"):
            await application_service.analyze_compliance(command)

    @pytest.mark.asyncio
    async def test_activate_contract_activates_and_publishes_event(
        self,
        application_service: ContractApplicationService,
        mock_contract_repository: Mock,
        mock_event_publisher: Mock,
        sample_contract: Contract,
    ):
        """Test activating a contract"""
        # Given
        contract_id = ContractId("contract-123")
        command = ActivateContractCommand(
            contract_id=contract_id, activated_by_user_id="user-123"
        )

        # Prepare contract for activation
        sample_contract.set_generated_content("Content", {})
        sample_contract.finalize_content("Final content", "user-123")

        mock_contract_repository.get_by_id = AsyncMock(return_value=sample_contract)
        mock_contract_repository.save = AsyncMock(return_value=sample_contract)

        # When
        result = await application_service.activate_contract(command)

        # Then
        mock_contract_repository.get_by_id.assert_called_once_with(contract_id)
        mock_contract_repository.save.assert_called_once()
        mock_event_publisher.publish.assert_called()  # Domain events published
        assert result.status == ContractStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_activate_contract_without_content_raises_error(
        self,
        application_service: ContractApplicationService,
        mock_contract_repository: Mock,
        sample_contract: Contract,
    ):
        """Test activating contract without content raises business rule violation"""
        # Given
        contract_id = ContractId("contract-123")
        command = ActivateContractCommand(
            contract_id=contract_id, activated_by_user_id="user-123"
        )

        mock_contract_repository.get_by_id = AsyncMock(return_value=sample_contract)

        # When & Then
        with pytest.raises(
            BusinessRuleViolationError,
            match="Cannot activate contract without final content",
        ):
            await application_service.activate_contract(command)

    @pytest.mark.asyncio
    async def test_get_contracts_by_company_returns_paginated_results(
        self,
        application_service: ContractApplicationService,
        mock_contract_repository: Mock,
        sample_contract: Contract,
    ):
        """Test getting contracts by company with pagination"""
        # Given
        company_id = "company-456"
        page = 1
        size = 10

        from app.domain.repositories.contract_repository import PageResult, PageRequest

        page_result = PageResult(
            items=[sample_contract], total_items=1, page=1, size=10
        )

        mock_contract_repository.find_by_company = AsyncMock(return_value=page_result)

        # When
        result = await application_service.get_contracts_by_company(
            company_id, page, size
        )

        # Then
        mock_contract_repository.find_by_company.assert_called_once()
        assert result.total_items == 1
        assert len(result.items) == 1

    @pytest.mark.asyncio
    async def test_search_contracts_applies_filters(
        self,
        application_service: ContractApplicationService,
        mock_contract_repository: Mock,
        sample_contract: Contract,
    ):
        """Test searching contracts with filters"""
        # Given
        filters = {
            "contract_type": ContractType.SERVICE_AGREEMENT.value,
            "status": ContractStatus.DRAFT.value,
            "company_id": "company-456",
        }

        from app.domain.repositories.contract_repository import PageResult

        page_result = PageResult(
            items=[sample_contract], total_items=1, page=1, size=10
        )

        mock_contract_repository.find_with_filter = AsyncMock(return_value=page_result)

        # When
        result = await application_service.search_contracts(filters)

        # Then
        mock_contract_repository.find_with_filter.assert_called_once()
        # Verify filter was created correctly
        call_args = mock_contract_repository.find_with_filter.call_args
        contract_filter = call_args[0][0]
        assert contract_filter.company_id == "company-456"
        assert contract_filter.contract_type == ContractType.SERVICE_AGREEMENT
        assert contract_filter.status == ContractStatus.DRAFT
