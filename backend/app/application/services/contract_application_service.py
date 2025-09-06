"""
Contract Application Service
Orchestrates domain operations and coordinates between layers following DDD patterns
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from decimal import Decimal
from datetime import datetime
from uuid import uuid4

from app.domain.entities.contract import Contract, ContractId
from app.domain.value_objects import (
    ContractStatus,
    ContractType,
    Email,
    ContractParty,
    Money,
    ComplianceScore,
    RiskAssessment,
    DateRange,
)
from app.domain.repositories.contract_repository import (
    ContractRepository,
    ContractFilter,
    PageRequest,
    PageResult,
)
from app.domain.exceptions import BusinessRuleViolationError
from app.services.ai_service import ContractGenerationRequest


@dataclass
class CreateContractCommand:
    """Command to create a new contract"""

    title: str
    contract_type: ContractType
    plain_english_input: str
    client_name: str
    created_by_user_id: str
    company_id: str
    client_email: Optional[str] = None
    supplier_name: Optional[str] = None
    contract_value: Optional[Decimal] = None
    currency: str = "GBP"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


@dataclass
class UpdateContractCommand:
    """Command to update an existing contract"""

    contract_id: ContractId
    updated_by_user_id: Optional[str] = None
    title: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    supplier_name: Optional[str] = None
    contract_value: Optional[Decimal] = None
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    final_content: Optional[str] = None


@dataclass
class GenerateContractContentCommand:
    """Command to generate contract content using AI"""

    contract_id: ContractId
    regenerate: bool = False


@dataclass
class AnalyzeComplianceCommand:
    """Command to analyze contract compliance"""

    contract_id: ContractId
    force_reanalysis: bool = False


@dataclass
class ActivateContractCommand:
    """Command to activate a contract"""

    contract_id: ContractId
    activated_by_user_id: str


@dataclass
class CompleteContractCommand:
    """Command to complete a contract"""

    contract_id: ContractId
    completed_by_user_id: str
    completion_reason: Optional[str] = None


@dataclass
class TerminateContractCommand:
    """Command to terminate a contract"""

    contract_id: ContractId
    terminated_by_user_id: str
    termination_reason: str


class ContractApplicationService:
    """
    Application service for contract operations
    Coordinates between domain layer, infrastructure, and external services
    """

    def __init__(
        self,
        contract_repository: ContractRepository,
        ai_service: Any,  # AI service interface
        event_publisher: Optional[Any] = None,
    ):  # Domain event publisher
        self._contract_repository = contract_repository
        self._ai_service = ai_service
        self._event_publisher = event_publisher

    async def create_contract(self, command: CreateContractCommand) -> Contract:
        """Create a new contract"""
        # Create contract ID
        contract_id = ContractId(str(uuid4()))

        # Create client party
        client_email = Email(command.client_email) if command.client_email else None
        client = ContractParty(command.client_name, client_email)

        # Create supplier party if provided
        supplier = None
        if command.supplier_name:
            supplier = ContractParty(command.supplier_name)

        # Create contract domain entity
        contract = Contract.create(
            contract_id=contract_id,
            title=command.title,
            contract_type=command.contract_type,
            plain_english_input=command.plain_english_input,
            client=client,
            supplier=supplier,
            created_by_user_id=command.created_by_user_id,
            company_id=command.company_id,
        )

        # Set optional fields
        if command.contract_value:
            contract.set_contract_value(Money(command.contract_value, command.currency))

        if command.start_date or command.end_date:
            date_range = DateRange(command.start_date, command.end_date)
            contract.set_date_range(date_range)

        # Save contract
        saved_contract = await self._contract_repository.save(contract)

        # Publish domain events
        if self._event_publisher:
            await self._publish_domain_events(saved_contract)

        return saved_contract

    async def update_contract(self, command: UpdateContractCommand) -> Contract:
        """Update an existing contract"""
        # Load contract
        contract = await self._contract_repository.get_by_id(command.contract_id)

        # Apply updates - only update non-None values
        if command.title is not None:
            # This would require adding update methods to the domain entity
            # For now, we'll assume the entity has appropriate methods
            pass

        if command.contract_value is not None:
            contract.set_contract_value(
                Money(command.contract_value, command.currency or "GBP")
            )

        if command.final_content is not None:
            contract.finalize_content(
                command.final_content, command.updated_by_user_id or "system"
            )

        if command.start_date is not None or command.end_date is not None:
            # Use existing dates if not provided
            start_date = command.start_date or (
                contract.date_range.start_date if contract.date_range else None
            )
            end_date = command.end_date or (
                contract.date_range.end_date if contract.date_range else None
            )
            if start_date or end_date:
                date_range = DateRange(start_date, end_date)
                contract.set_date_range(date_range)

        # Save updated contract
        updated_contract = await self._contract_repository.save(contract)

        # Publish domain events
        if self._event_publisher:
            await self._publish_domain_events(updated_contract)

        return updated_contract

    async def generate_contract_content(
        self, command: GenerateContractContentCommand
    ) -> Contract:
        """Generate contract content using AI"""
        # Load contract
        contract = await self._contract_repository.get_by_id(command.contract_id)

        # Check if already generated and not forcing regeneration
        if contract.generated_content and not command.regenerate:
            return contract

        # Prepare AI generation request
        ai_request = ContractGenerationRequest(
            plain_english_input=contract.plain_english_input,
            contract_type=contract.contract_type.value,
            client_name=contract.client.name,
            supplier_name=contract.supplier.name if contract.supplier else None,
            contract_value=(
                float(contract.contract_value.amount)
                if contract.contract_value
                else None
            ),
            currency=(
                contract.contract_value.currency if contract.contract_value else "GBP"
            ),
            start_date=(
                contract.date_range.start_date.isoformat()
                if contract.date_range and contract.date_range.start_date
                else None
            ),
            end_date=(
                contract.date_range.end_date.isoformat()
                if contract.date_range and contract.date_range.end_date
                else None
            ),
        )

        # Generate content
        ai_response = await self._ai_service.generate_contract(ai_request)

        # Set generated content on contract
        ai_metadata = {
            "model_name": ai_response.model_name,
            "model_version": ai_response.model_version,
            "processing_time_ms": ai_response.processing_time_ms,
            "token_usage": ai_response.token_usage,
            "confidence_score": ai_response.confidence_score,
        }

        contract.set_generated_content(ai_response.content, ai_metadata)

        # Save contract
        updated_contract = await self._contract_repository.save(contract)

        # Publish domain events
        if self._event_publisher:
            await self._publish_domain_events(updated_contract)

        return updated_contract

    async def analyze_compliance(self, command: AnalyzeComplianceCommand) -> Contract:
        """Analyze contract compliance"""
        # Load contract
        contract = await self._contract_repository.get_by_id(command.contract_id)

        # Get content to analyze
        content = contract.get_effective_content()
        if not content:
            raise BusinessRuleViolationError(
                "No content to analyze. Generate or add content first."
            )

        # Check if already analyzed and not forcing reanalysis
        if contract.compliance_score and not command.force_reanalysis:
            return contract

        # Analyze compliance
        compliance_result = await self._ai_service.validate_contract_compliance(
            content, contract.contract_type.value
        )

        # Create compliance score and risk assessment value objects
        compliance_score = ComplianceScore(
            overall_score=compliance_result["overall_score"],
            gdpr_compliance=compliance_result.get("gdpr_compliance"),
            employment_law_compliance=compliance_result.get(
                "employment_law_compliance"
            ),
            consumer_rights_compliance=compliance_result.get(
                "consumer_rights_compliance"
            ),
            commercial_terms_compliance=compliance_result.get(
                "commercial_terms_compliance"
            ),
        )

        risk_assessment = RiskAssessment(
            risk_score=compliance_result["risk_score"],
            risk_factors=compliance_result.get("risk_factors", []),
            recommendations=compliance_result.get("recommendations", []),
        )

        # Set compliance analysis on contract
        contract.set_compliance_analysis(compliance_score, risk_assessment)

        # Save contract
        updated_contract = await self._contract_repository.save(contract)

        return updated_contract

    async def activate_contract(self, command: ActivateContractCommand) -> Contract:
        """Activate a contract"""
        # Load contract
        contract = await self._contract_repository.get_by_id(command.contract_id)

        # Activate contract (domain entity enforces business rules)
        contract.activate(command.activated_by_user_id)

        # Save contract
        updated_contract = await self._contract_repository.save(contract)

        # Publish domain events
        if self._event_publisher:
            await self._publish_domain_events(updated_contract)

        return updated_contract

    async def complete_contract(self, command: CompleteContractCommand) -> Contract:
        """Complete a contract"""
        # Load contract
        contract = await self._contract_repository.get_by_id(command.contract_id)

        # Complete contract
        contract.complete(command.completed_by_user_id, command.completion_reason)

        # Save contract
        updated_contract = await self._contract_repository.save(contract)

        # Publish domain events
        if self._event_publisher:
            await self._publish_domain_events(updated_contract)

        return updated_contract

    async def terminate_contract(self, command: TerminateContractCommand) -> Contract:
        """Terminate a contract"""
        # Load contract
        contract = await self._contract_repository.get_by_id(command.contract_id)

        # Terminate contract
        contract.terminate(command.terminated_by_user_id, command.termination_reason)

        # Save contract
        updated_contract = await self._contract_repository.save(contract)

        # Publish domain events
        if self._event_publisher:
            await self._publish_domain_events(updated_contract)

        return updated_contract

    async def get_contract_by_id(self, contract_id: ContractId) -> Contract:
        """Get a contract by ID"""
        return await self._contract_repository.get_by_id(contract_id)

    async def get_contracts_by_company(
        self, company_id: str, page: int = 1, size: int = 20
    ) -> PageResult:
        """Get contracts for a company with pagination"""
        page_request = PageRequest(page=page, size=size)
        return await self._contract_repository.find_by_company(company_id, page_request)

    async def search_contracts(
        self, filters: Dict[str, Any], page: int = 1, size: int = 20
    ) -> PageResult:
        """Search contracts with filters"""
        # Convert filters dict to ContractFilter
        contract_filter = self._create_contract_filter(filters)
        page_request = PageRequest(page=page, size=size)

        return await self._contract_repository.find_with_filter(
            contract_filter, page_request
        )

    async def get_expiring_contracts(
        self, company_id: str, days_ahead: int = 30
    ) -> List[Contract]:
        """Get contracts expiring within specified days"""
        contracts = await self._contract_repository.find_expiring_contracts(days_ahead)
        # Filter by company
        return [c for c in contracts if c.company_id == company_id]

    async def get_contracts_requiring_review(self, company_id: str) -> List[Contract]:
        """Get contracts requiring compliance review"""
        return (
            await self._contract_repository.find_contracts_requiring_compliance_review(
                company_id
            )
        )

    async def delete_contract(self, contract_id: ContractId) -> None:
        """Delete a contract"""
        await self._contract_repository.delete(contract_id)

    def _create_contract_filter(self, filters: Dict[str, Any]) -> ContractFilter:
        """Create ContractFilter from dictionary"""
        return ContractFilter(
            company_id=filters.get("company_id"),
            contract_type=(
                ContractType(filters["contract_type"])
                if filters.get("contract_type")
                else None
            ),
            status=ContractStatus(filters["status"]) if filters.get("status") else None,
            created_by_user_id=filters.get("created_by_user_id"),
            client_name=filters.get("client_name"),
            supplier_name=filters.get("supplier_name"),
            title_contains=filters.get("title_contains"),
            created_after=filters.get("created_after"),
            created_before=filters.get("created_before"),
            min_value=filters.get("min_value"),
            max_value=filters.get("max_value"),
        )

    async def _publish_domain_events(self, contract: Contract) -> None:
        """Publish domain events from the contract"""
        if self._event_publisher and contract.has_domain_events():
            for event in contract.get_domain_events():
                await self._event_publisher.publish(event)
            contract.clear_domain_events()
