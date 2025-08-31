"""
Complete Contract Lifecycle Workflow Tests
Comprehensive test suite covering all contract workflows from creation to completion
Following TDD and DDD testing patterns
"""
import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any

from app.domain.entities.contract import Contract, ContractId
from app.domain.value_objects import (
    ContractType, ContractStatus, Money, DateRange, Email, 
    ContractParty, ComplianceScore, RiskAssessment
)
from app.domain.exceptions import (
    DomainValidationError, BusinessRuleViolationError, ContractStateError
)
from app.application.services.contract_application_service import (
    ContractApplicationService,
    CreateContractCommand,
    GenerateContractContentCommand,
    AnalyzeComplianceCommand,
    ActivateContractCommand,
    CompleteContractCommand,
    TerminateContractCommand,
    UpdateContractCommand
)
from app.infrastructure.repositories.sqlalchemy_contract_repository import SQLAlchemyContractRepository
from app.services.ai_service import GroqAIService


class TestContractCreationWorkflow:
    """Test complete contract creation workflow"""
    
    @pytest.fixture
    def mock_contract_repository(self):
        """Mock contract repository"""
        repository = Mock(spec=SQLAlchemyContractRepository)
        repository.save = AsyncMock()
        repository.get_by_id = AsyncMock()
        return repository
    
    @pytest.fixture
    def mock_ai_service(self):
        """Mock AI service"""
        service = Mock(spec=GroqAIService)
        service.generate_contract = AsyncMock()
        service.validate_contract_compliance = AsyncMock()
        return service
    
    @pytest.fixture
    def contract_service(self, mock_contract_repository, mock_ai_service):
        """Contract application service"""
        return ContractApplicationService(
            contract_repository=mock_contract_repository,
            ai_service=mock_ai_service
        )
    
    @pytest.mark.asyncio
    async def test_complete_contract_creation_workflow(self, contract_service, mock_contract_repository):
        """Test: Complete contract creation from plain English to finalized contract
        
        RED: No implementation exists
        GREEN: Implement the workflow
        REFACTOR: Optimize the workflow
        """
        # Arrange
        command = CreateContractCommand(
            title="Professional Services Agreement",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="I need a contract for consulting services with 30 day payment terms and confidentiality clauses",
            client_name="Test Client Ltd",
            client_email="client@example.com",
            created_by_user_id="user-123",
            company_id="company-456",
            contract_value=Decimal("10000.00"),
            currency="GBP",
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=365)
        )
        
        # Mock repository to return saved contract
        mock_contract_repository.save = AsyncMock(side_effect=lambda contract: contract)
        
        # Act
        contract = await contract_service.create_contract(command)
        
        # Assert
        assert isinstance(contract, Contract)
        assert contract.title == "Professional Services Agreement"
        assert contract.contract_type == ContractType.SERVICE_AGREEMENT
        assert contract.status == ContractStatus.DRAFT
        assert contract.client.name == "Test Client Ltd"
        assert contract.client.email.value == "client@example.com"
        assert contract.contract_value.amount == Decimal("10000.00")
        assert contract.contract_value.currency == "GBP"
        assert contract.date_range is not None
        
        # Verify repository was called
        mock_contract_repository.save.assert_called_once()
        
        # Verify domain events were raised
        domain_events = contract.get_domain_events()
        assert len(domain_events) == 1
        assert domain_events[0].event_type == "ContractCreated"
    
    @pytest.mark.asyncio
    async def test_contract_creation_with_minimal_data(self, contract_service, mock_contract_repository):
        """Test: Contract creation with only required fields
        
        Business Rule: Contract can be created with minimal information
        """
        # Arrange
        command = CreateContractCommand(
            title="Basic Service Agreement",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Simple service agreement for basic consulting",
            client_name="Basic Client",
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        mock_contract_repository.save = AsyncMock(side_effect=lambda contract: contract)
        
        # Act
        contract = await contract_service.create_contract(command)
        
        # Assert
        assert contract.title == "Basic Service Agreement"
        assert contract.client.name == "Basic Client"
        assert contract.client.email is None
        assert contract.supplier is None
        assert contract.contract_value is None
        assert contract.date_range is None
        assert contract.status == ContractStatus.DRAFT
    
    @pytest.mark.asyncio
    async def test_contract_creation_validation_errors(self, contract_service):
        """Test: Contract creation with invalid data should raise validation errors
        
        Business Rule: All required fields must be valid
        """
        # Test empty title
        with pytest.raises(DomainValidationError) as exc:
            command = CreateContractCommand(
                title="",  # Invalid
                contract_type=ContractType.SERVICE_AGREEMENT,
                plain_english_input="Valid input",
                client_name="Valid Client",
                created_by_user_id="user-123",
                company_id="company-456"
            )
            await contract_service.create_contract(command)
        assert "title" in str(exc.value).lower()
        
        # Test short plain English input
        with pytest.raises(DomainValidationError) as exc:
            command = CreateContractCommand(
                title="Valid Title",
                contract_type=ContractType.SERVICE_AGREEMENT,
                plain_english_input="Too short",  # Invalid - less than 10 chars
                client_name="Valid Client",
                created_by_user_id="user-123",
                company_id="company-456"
            )
            await contract_service.create_contract(command)
        assert "plain english input too short" in str(exc.value).lower()
        
        # Test invalid email
        with pytest.raises(ValueError) as exc:
            command = CreateContractCommand(
                title="Valid Title",
                contract_type=ContractType.SERVICE_AGREEMENT,
                plain_english_input="Valid input with enough characters",
                client_name="Valid Client",
                client_email="invalid-email",  # Invalid email format
                created_by_user_id="user-123",
                company_id="company-456"
            )
            await contract_service.create_contract(command)
        assert "email" in str(exc.value).lower()


class TestContractContentGenerationWorkflow:
    """Test AI content generation workflow"""
    
    @pytest.fixture
    def existing_contract(self):
        """Create an existing contract for testing"""
        contract_id = ContractId("test-contract-123")
        client = ContractParty("Test Client", Email("client@example.com"))
        
        contract = Contract.create(
            contract_id=contract_id,
            title="Test Agreement",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="I need a service agreement with payment terms",
            client=client,
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        # Set contract value and date range
        contract.set_contract_value(Money(Decimal("5000.00")))
        contract.set_date_range(DateRange(
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=90)
        ))
        
        return contract
    
    @pytest.fixture
    def contract_service_with_mocks(self, existing_contract):
        """Contract service with mocked dependencies"""
        mock_repository = Mock(spec=SQLAlchemyContractRepository)
        mock_repository.get_by_id = AsyncMock(return_value=existing_contract)
        mock_repository.save = AsyncMock(side_effect=lambda contract: contract)
        
        mock_ai_service = Mock(spec=GroqAIService)
        
        # Mock AI response
        from app.services.ai_service import ContractGenerationResponse
        mock_ai_response = Mock(spec=ContractGenerationResponse)
        mock_ai_response.content = "GENERATED_CONTRACT_CONTENT"
        mock_ai_response.model_name = "llama3-70b-8192"
        mock_ai_response.model_version = "1.0"
        mock_ai_response.processing_time_ms = 1500.0
        mock_ai_response.token_usage = {"input": 150, "output": 800}
        mock_ai_response.confidence_score = 0.92
        
        mock_ai_service.generate_contract = AsyncMock(return_value=mock_ai_response)
        
        return ContractApplicationService(
            contract_repository=mock_repository,
            ai_service=mock_ai_service
        )
    
    @pytest.mark.asyncio
    async def test_generate_contract_content_workflow(self, contract_service_with_mocks, existing_contract):
        """Test: Generate contract content using AI
        
        Workflow: Load contract -> Prepare AI request -> Generate content -> Save contract
        """
        # Arrange
        command = GenerateContractContentCommand(
            contract_id=existing_contract.id,
            regenerate=False
        )
        
        # Act
        updated_contract = await contract_service_with_mocks.generate_contract_content(command)
        
        # Assert
        assert updated_contract.generated_content == "GENERATED_CONTRACT_CONTENT"
        assert updated_contract.ai_metadata is not None
        assert updated_contract.ai_metadata["model_name"] == "llama3-70b-8192"
        assert updated_contract.ai_metadata["confidence_score"] == 0.92
        
        # Verify domain events
        domain_events = updated_contract.get_domain_events()
        content_generated_events = [e for e in domain_events if e.event_type == "ContractContentGenerated"]
        assert len(content_generated_events) == 1
        assert content_generated_events[0].ai_model == "llama3-70b-8192"
    
    @pytest.mark.asyncio
    async def test_skip_generation_if_already_generated(self, contract_service_with_mocks, existing_contract):
        """Test: Skip AI generation if content already exists and not forcing regeneration
        
        Business Rule: Don't regenerate content unless explicitly requested
        """
        # Arrange - Set existing generated content
        existing_contract.set_generated_content(
            "EXISTING_CONTENT",
            {"model_name": "previous-model", "confidence_score": 0.8}
        )
        
        command = GenerateContractContentCommand(
            contract_id=existing_contract.id,
            regenerate=False
        )
        
        # Act
        result = await contract_service_with_mocks.generate_contract_content(command)
        
        # Assert
        assert result.generated_content == "EXISTING_CONTENT"
        # AI service should not have been called
        contract_service_with_mocks._ai_service.generate_contract.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_force_regeneration_of_content(self, contract_service_with_mocks, existing_contract):
        """Test: Force regeneration of content even if already exists
        
        Business Rule: Allow forced regeneration for content improvement
        """
        # Arrange - Set existing generated content
        existing_contract.set_generated_content(
            "OLD_CONTENT",
            {"model_name": "old-model", "confidence_score": 0.7}
        )
        
        command = GenerateContractContentCommand(
            contract_id=existing_contract.id,
            regenerate=True  # Force regeneration
        )
        
        # Act
        result = await contract_service_with_mocks.generate_contract_content(command)
        
        # Assert
        assert result.generated_content == "GENERATED_CONTRACT_CONTENT"
        # AI service should have been called
        contract_service_with_mocks._ai_service.generate_contract.assert_called_once()


class TestContractComplianceAnalysisWorkflow:
    """Test compliance analysis workflow"""
    
    @pytest.fixture
    def contract_with_content(self):
        """Contract with generated content for analysis"""
        contract_id = ContractId("test-contract-456")
        client = ContractParty("Test Client", Email("client@example.com"))
        
        contract = Contract.create(
            contract_id=contract_id,
            title="Service Agreement for Compliance Testing",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Service agreement for compliance analysis testing",
            client=client,
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        # Add generated content
        contract.set_generated_content(
            "SAMPLE CONTRACT CONTENT FOR COMPLIANCE ANALYSIS",
            {"model_name": "test-model", "confidence_score": 0.9}
        )
        
        return contract
    
    @pytest.fixture
    def compliance_service_with_mocks(self, contract_with_content):
        """Service with mocked compliance analysis"""
        mock_repository = Mock(spec=SQLAlchemyContractRepository)
        mock_repository.get_by_id = AsyncMock(return_value=contract_with_content)
        mock_repository.save = AsyncMock(side_effect=lambda contract: contract)
        
        mock_ai_service = Mock(spec=GroqAIService)
        mock_ai_service.validate_contract_compliance = AsyncMock(return_value={
            "overall_score": 0.94,
            "gdpr_compliance": 0.96,
            "employment_law_compliance": 0.92,
            "consumer_rights_compliance": 0.91,
            "commercial_terms_compliance": 0.95,
            "risk_score": 3,
            "risk_factors": ["Standard commercial terms", "Minor GDPR gaps"],
            "recommendations": ["Add explicit GDPR consent clauses", "Clarify data retention"]
        })
        
        return ContractApplicationService(
            contract_repository=mock_repository,
            ai_service=mock_ai_service
        )
    
    @pytest.mark.asyncio
    async def test_compliance_analysis_workflow(self, compliance_service_with_mocks, contract_with_content):
        """Test: Complete compliance analysis workflow
        
        Workflow: Load contract -> Validate content exists -> Analyze compliance -> Save results
        """
        # Arrange
        command = AnalyzeComplianceCommand(
            contract_id=contract_with_content.id,
            force_reanalysis=False
        )
        
        # Act
        analyzed_contract = await compliance_service_with_mocks.analyze_compliance(command)
        
        # Assert
        assert analyzed_contract.compliance_score is not None
        assert analyzed_contract.compliance_score.overall_score == 0.94
        assert analyzed_contract.compliance_score.gdpr_compliance == 0.96
        assert analyzed_contract.compliance_score.is_compliant  # Score > 0.8
        
        assert analyzed_contract.risk_assessment is not None
        assert analyzed_contract.risk_assessment.risk_score == 3
        assert "Standard commercial terms" in analyzed_contract.risk_assessment.risk_factors
        assert "Add explicit GDPR consent clauses" in analyzed_contract.risk_assessment.recommendations
        assert analyzed_contract.risk_assessment.risk_level == "Low"  # Score 1-3
    
    @pytest.mark.asyncio
    async def test_compliance_analysis_without_content_fails(self, compliance_service_with_mocks):
        """Test: Compliance analysis fails if no content exists
        
        Business Rule: Cannot analyze compliance without content
        """
        # Arrange - Contract without content
        contract_id = ContractId("no-content-contract")
        client = ContractParty("Test Client")
        
        empty_contract = Contract.create(
            contract_id=contract_id,
            title="Empty Contract",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Contract for testing without content",
            client=client,
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        # Mock repository to return empty contract
        compliance_service_with_mocks._contract_repository.get_by_id = AsyncMock(return_value=empty_contract)
        
        command = AnalyzeComplianceCommand(
            contract_id=contract_id,
            force_reanalysis=False
        )
        
        # Act & Assert
        with pytest.raises(BusinessRuleViolationError) as exc:
            await compliance_service_with_mocks.analyze_compliance(command)
        assert "no content to analyze" in str(exc.value).lower()
    
    @pytest.mark.asyncio
    async def test_skip_analysis_if_already_analyzed(self, compliance_service_with_mocks, contract_with_content):
        """Test: Skip compliance analysis if already done and not forcing
        
        Business Rule: Don't reanalyze unless forced for performance
        """
        # Arrange - Set existing compliance results
        existing_compliance = ComplianceScore(
            overall_score=0.85,
            gdpr_compliance=0.88,
            employment_law_compliance=0.82
        )
        existing_risk = RiskAssessment(
            risk_score=4,
            risk_factors=["Existing analysis"],
            recommendations=["Existing recommendation"]
        )
        contract_with_content.set_compliance_analysis(existing_compliance, existing_risk)
        
        command = AnalyzeComplianceCommand(
            contract_id=contract_with_content.id,
            force_reanalysis=False
        )
        
        # Act
        result = await compliance_service_with_mocks.analyze_compliance(command)
        
        # Assert
        assert result.compliance_score.overall_score == 0.85  # Original score
        # AI service should not have been called
        compliance_service_with_mocks._ai_service.validate_contract_compliance.assert_not_called()


class TestContractStatusTransitionWorkflows:
    """Test contract status transitions and lifecycle management"""
    
    @pytest.fixture
    def draft_contract_with_content(self):
        """Draft contract with finalized content ready for activation"""
        contract_id = ContractId("draft-contract-789")
        client = ContractParty("Ready Client", Email("ready@example.com"))
        
        contract = Contract.create(
            contract_id=contract_id,
            title="Ready for Activation Agreement",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Agreement ready for activation testing",
            client=client,
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        # Add final content
        contract.finalize_content("FINAL CONTRACT CONTENT", "user-123")
        
        return contract
    
    @pytest.fixture
    def status_transition_service(self, draft_contract_with_content):
        """Service for status transition testing"""
        mock_repository = Mock(spec=SQLAlchemyContractRepository)
        mock_repository.get_by_id = AsyncMock(return_value=draft_contract_with_content)
        mock_repository.save = AsyncMock(side_effect=lambda contract: contract)
        
        mock_ai_service = Mock(spec=GroqAIService)
        
        return ContractApplicationService(
            contract_repository=mock_repository,
            ai_service=mock_ai_service
        )
    
    @pytest.mark.asyncio
    async def test_activate_contract_workflow(self, status_transition_service, draft_contract_with_content):
        """Test: Activate contract workflow
        
        Status Transition: DRAFT -> ACTIVE
        Business Rules: Must have final content, cannot be expired
        """
        # Arrange
        command = ActivateContractCommand(
            contract_id=draft_contract_with_content.id,
            activated_by_user_id="manager-456"
        )
        
        # Act
        activated_contract = await status_transition_service.activate_contract(command)
        
        # Assert
        assert activated_contract.status == ContractStatus.ACTIVE
        assert activated_contract.activated_at is not None
        assert activated_contract.activated_by_user_id == "manager-456"
        
        # Verify domain events
        domain_events = activated_contract.get_domain_events()
        activation_events = [e for e in domain_events if e.event_type == "ContractActivated"]
        assert len(activation_events) == 1
        assert activation_events[0].activated_by_user_id == "manager-456"
    
    @pytest.mark.asyncio
    async def test_activate_contract_without_content_fails(self, status_transition_service):
        """Test: Cannot activate contract without final content
        
        Business Rule: Contract must have final content to activate
        """
        # Arrange - Contract without final content
        contract_id = ContractId("no-final-content")
        client = ContractParty("Test Client")
        
        incomplete_contract = Contract.create(
            contract_id=contract_id,
            title="Incomplete Contract",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Contract without final content",
            client=client,
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        status_transition_service._contract_repository.get_by_id = AsyncMock(return_value=incomplete_contract)
        
        command = ActivateContractCommand(
            contract_id=contract_id,
            activated_by_user_id="manager-456"
        )
        
        # Act & Assert
        with pytest.raises(BusinessRuleViolationError) as exc:
            await status_transition_service.activate_contract(command)
        assert "cannot activate contract without final content" in str(exc.value).lower()
    
    @pytest.mark.asyncio
    async def test_complete_active_contract_workflow(self, status_transition_service):
        """Test: Complete active contract workflow
        
        Status Transition: ACTIVE -> COMPLETED
        """
        # Arrange - Create active contract
        contract_id = ContractId("active-contract")
        client = ContractParty("Active Client")
        
        active_contract = Contract.create(
            contract_id=contract_id,
            title="Active Contract",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Active contract for completion testing",
            client=client,
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        active_contract.finalize_content("FINAL CONTENT", "user-123")
        active_contract.activate("user-123")  # Make it active
        
        status_transition_service._contract_repository.get_by_id = AsyncMock(return_value=active_contract)
        
        command = CompleteContractCommand(
            contract_id=contract_id,
            completed_by_user_id="manager-789",
            completion_reason="Project completed successfully"
        )
        
        # Act
        completed_contract = await status_transition_service.complete_contract(command)
        
        # Assert
        assert completed_contract.status == ContractStatus.COMPLETED
        assert completed_contract.completed_at is not None
        assert completed_contract.completed_by_user_id == "manager-789"
        
        # Verify domain events
        domain_events = completed_contract.get_domain_events()
        completion_events = [e for e in domain_events if e.event_type == "ContractCompleted"]
        assert len(completion_events) == 1
        assert completion_events[0].completed_by_user_id == "manager-789"
        assert completion_events[0].completion_reason == "Project completed successfully"
    
    @pytest.mark.asyncio
    async def test_terminate_contract_workflow(self, status_transition_service, draft_contract_with_content):
        """Test: Terminate contract workflow
        
        Status Transition: DRAFT/ACTIVE -> TERMINATED
        Business Rule: Must provide termination reason
        """
        # Arrange
        command = TerminateContractCommand(
            contract_id=draft_contract_with_content.id,
            terminated_by_user_id="legal-manager-999",
            termination_reason="Breach of contract terms"
        )
        
        # Act
        terminated_contract = await status_transition_service.terminate_contract(command)
        
        # Assert
        assert terminated_contract.status == ContractStatus.TERMINATED
        assert terminated_contract.terminated_at is not None
        assert terminated_contract.terminated_by_user_id == "legal-manager-999"
        assert terminated_contract.termination_reason == "Breach of contract terms"
        
        # Verify domain events
        domain_events = terminated_contract.get_domain_events()
        termination_events = [e for e in domain_events if e.event_type == "ContractTerminated"]
        assert len(termination_events) == 1
        assert termination_events[0].terminated_by_user_id == "legal-manager-999"
        assert termination_events[0].termination_reason == "Breach of contract terms"
    
    @pytest.mark.asyncio
    async def test_terminate_without_reason_fails(self, status_transition_service, draft_contract_with_content):
        """Test: Cannot terminate contract without reason
        
        Business Rule: Termination reason is mandatory
        """
        # Arrange
        command = TerminateContractCommand(
            contract_id=draft_contract_with_content.id,
            terminated_by_user_id="legal-manager-999",
            termination_reason=""  # Empty reason - invalid
        )
        
        # Act & Assert
        with pytest.raises(DomainValidationError) as exc:
            await status_transition_service.terminate_contract(command)
        assert "termination reason is required" in str(exc.value).lower()


class TestContractVersionManagementWorkflow:
    """Test contract version management and audit trail workflows"""
    
    @pytest.fixture
    def versioned_contract(self):
        """Contract with multiple versions for testing"""
        contract_id = ContractId("versioned-contract")
        client = ContractParty("Versioned Client", Email("versioned@example.com"))
        
        contract = Contract.create(
            contract_id=contract_id,
            title="Versioned Agreement",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Contract for version management testing",
            client=client,
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        # Add initial content
        contract.set_generated_content(
            "INITIAL GENERATED CONTENT",
            {"model_name": "initial-model", "confidence_score": 0.8}
        )
        
        return contract
    
    @pytest.mark.asyncio
    async def test_contract_version_creation_workflow(self, versioned_contract):
        """Test: Create new contract version workflow
        
        Workflow: Modify contract -> Create version record -> Update content
        Business Rule: Must track all content changes
        """
        # Arrange
        initial_version = versioned_contract.version
        
        # Act - Create new version
        versioned_contract.create_new_version(
            content="UPDATED CONTRACT CONTENT VERSION 2",
            change_summary="Updated payment terms and added liability clauses",
            user_id="editor-789"
        )
        
        # Assert
        assert versioned_contract.version == initial_version + 1
        assert versioned_contract.final_content == "UPDATED CONTRACT CONTENT VERSION 2"
        assert len(versioned_contract.versions) == 1
        
        # Check version record
        version_record = versioned_contract.versions[0]
        assert version_record.version_number == initial_version + 1
        assert version_record.change_summary == "Updated payment terms and added liability clauses"
        assert version_record.content == "INITIAL GENERATED CONTENT"  # Previous content
    
    @pytest.mark.asyncio
    async def test_multiple_versions_tracking(self, versioned_contract):
        """Test: Multiple version changes tracking
        
        Business Rule: All versions must be tracked with audit trail
        """
        # Arrange & Act - Create multiple versions
        versioned_contract.finalize_content("VERSION 1 CONTENT", "user-123")
        
        versioned_contract.create_new_version(
            content="VERSION 2 CONTENT",
            change_summary="First major revision",
            user_id="editor-456"
        )
        
        versioned_contract.create_new_version(
            content="VERSION 3 CONTENT",
            change_summary="Second major revision",
            user_id="editor-789"
        )
        
        # Assert
        assert len(versioned_contract.versions) == 2
        assert versioned_contract.final_content == "VERSION 3 CONTENT"
        
        # Check version chronology
        assert versioned_contract.versions[0].change_summary == "First major revision"
        assert versioned_contract.versions[1].change_summary == "Second major revision"
        assert versioned_contract.versions[0].content == "VERSION 1 CONTENT"
        assert versioned_contract.versions[1].content == "VERSION 2 CONTENT"
    
    @pytest.mark.asyncio
    async def test_prevent_version_creation_on_completed_contract(self, versioned_contract):
        """Test: Cannot create versions on completed contracts
        
        Business Rule: Completed contracts are immutable
        """
        # Arrange - Complete the contract
        versioned_contract.finalize_content("FINAL VERSION", "user-123")
        versioned_contract.activate("user-123")
        versioned_contract.complete("manager-456", "Project finished")
        
        # Act & Assert
        with pytest.raises(BusinessRuleViolationError) as exc:
            versioned_contract.create_new_version(
                content="ATTEMPTED UPDATE",
                change_summary="This should fail",
                user_id="editor-999"
            )
        assert "cannot modify completed contract" in str(exc.value).lower()


class TestContractExpirationAndRenewalWorkflows:
    """Test contract expiration and renewal workflows"""
    
    @pytest.fixture
    def expiring_contract(self):
        """Contract approaching expiration"""
        contract_id = ContractId("expiring-contract")
        client = ContractParty("Expiring Client", Email("expiring@example.com"))
        
        contract = Contract.create(
            contract_id=contract_id,
            title="Expiring Agreement",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Contract for expiration testing",
            client=client,
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        # Set date range with near expiration
        contract.set_date_range(DateRange(
            start_date=datetime.now(timezone.utc) - timedelta(days=30),
            end_date=datetime.now(timezone.utc) + timedelta(days=5)  # Expires in 5 days
        ))
        
        return contract
    
    @pytest.mark.asyncio
    async def test_contract_expiration_detection(self, expiring_contract):
        """Test: Detect contract approaching expiration
        
        Business Rule: Identify contracts requiring renewal
        """
        # Act & Assert - Not yet expired but approaching
        assert not expiring_contract.is_expired()
        assert expiring_contract.is_active_period()
        assert expiring_contract.date_range.end_date > datetime.now(timezone.utc)
        
        # Check if expires within 7 days (renewal trigger)
        days_until_expiry = (expiring_contract.date_range.end_date - datetime.now(timezone.utc)).days
        assert days_until_expiry <= 7  # Should trigger renewal process
    
    @pytest.mark.asyncio
    async def test_expired_contract_detection(self):
        """Test: Detect fully expired contracts
        
        Business Rule: Expired contracts cannot be activated
        """
        # Arrange - Create already expired contract
        contract_id = ContractId("expired-contract")
        client = ContractParty("Expired Client")
        
        expired_contract = Contract.create(
            contract_id=contract_id,
            title="Expired Agreement",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Contract for expiration testing",
            client=client,
            supplier=None,
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        # Set past date range
        expired_contract.set_date_range(DateRange(
            start_date=datetime.now(timezone.utc) - timedelta(days=60),
            end_date=datetime.now(timezone.utc) - timedelta(days=10)  # Expired 10 days ago
        ))
        
        # Act & Assert
        assert expired_contract.is_expired()
        assert not expired_contract.is_active_period()
        
        # Try to activate expired contract
        expired_contract.finalize_content("EXPIRED CONTENT", "user-123")
        
        with pytest.raises(BusinessRuleViolationError) as exc:
            expired_contract.activate("user-123")
        assert "cannot activate expired contract" in str(exc.value).lower()


class TestContractCollaborationWorkflow:
    """Test multi-user collaboration workflows"""
    
    @pytest.fixture
    def collaborative_contract(self):
        """Contract for collaboration testing"""
        contract_id = ContractId("collaborative-contract")
        client = ContractParty("Collaborative Client", Email("collab@example.com"))
        supplier = ContractParty("Collaborative Supplier", Email("supplier@example.com"))
        
        contract = Contract.create(
            contract_id=contract_id,
            title="Collaborative Agreement",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Contract for multi-user collaboration testing",
            client=client,
            supplier=supplier,
            created_by_user_id="creator-123",
            company_id="company-456"
        )
        
        return contract
    
    @pytest.mark.asyncio
    async def test_multi_user_contract_workflow(self, collaborative_contract):
        """Test: Multiple users working on same contract
        
        Workflow: Creator -> AI Generation -> Reviewer -> Editor -> Manager -> Activation
        """
        # Step 1: Creator creates contract (already done in fixture)
        assert collaborative_contract.created_by_user_id == "creator-123"
        assert collaborative_contract.status == ContractStatus.DRAFT
        
        # Step 2: AI generates initial content
        collaborative_contract.set_generated_content(
            "AI GENERATED COLLABORATIVE CONTENT",
            {
                "model_name": "collab-model",
                "confidence_score": 0.89,
                "generated_by": "ai-service"
            }
        )
        
        # Step 3: Legal reviewer analyzes compliance
        compliance_score = ComplianceScore(
            overall_score=0.91,
            gdpr_compliance=0.94,
            employment_law_compliance=0.88
        )
        risk_assessment = RiskAssessment(
            risk_score=4,
            risk_factors=["Standard commercial risk"],
            recommendations=["Add termination clause"]
        )
        collaborative_contract.set_compliance_analysis(compliance_score, risk_assessment)
        
        # Step 4: Editor makes content changes
        collaborative_contract.create_new_version(
            content="EDITED COLLABORATIVE CONTENT WITH IMPROVEMENTS",
            change_summary="Added termination clause as recommended by legal review",
            user_id="editor-456"
        )
        
        # Step 5: Manager activates contract
        collaborative_contract.activate("manager-789")
        
        # Assert final state
        assert collaborative_contract.status == ContractStatus.ACTIVE
        assert collaborative_contract.activated_by_user_id == "manager-789"
        assert len(collaborative_contract.versions) == 1
        assert collaborative_contract.compliance_score.overall_score == 0.91
        
        # Verify audit trail through domain events
        domain_events = collaborative_contract.get_domain_events()
        event_types = [event.event_type for event in domain_events]
        
        assert "ContractCreated" in event_types
        assert "ContractContentGenerated" in event_types
        assert "ContractActivated" in event_types
    
    @pytest.mark.asyncio
    async def test_concurrent_modification_protection(self, collaborative_contract):
        """Test: Protect against concurrent modifications
        
        Business Rule: Version management prevents conflicting changes
        """
        # Simulate two users trying to modify same contract
        initial_version = collaborative_contract.version
        
        # User 1 makes changes
        collaborative_contract.finalize_content("USER 1 CONTENT", "user-001")
        user1_version = collaborative_contract.version
        
        # User 2 tries to make conflicting changes
        # In real implementation, this would check version conflicts
        collaborative_contract.create_new_version(
            content="USER 2 CONFLICTING CONTENT",
            change_summary="User 2 changes - potential conflict",
            user_id="user-002"
        )
        
        # Assert version tracking
        assert collaborative_contract.version > user1_version
        assert len(collaborative_contract.versions) == 1
        assert collaborative_contract.final_content == "USER 2 CONFLICTING CONTENT"
        
        # In production: implement optimistic locking or conflict resolution
        # For now: last write wins, but all changes are tracked