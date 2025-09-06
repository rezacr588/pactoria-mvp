"""
Contract Domain Entity - Core business logic for contract management
Following DDD patterns with rich domain model and business rules
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from app.domain.entities.base import AggregateRoot, DomainEvent
from app.domain.value_objects import (
    ContractStatus,
    ContractType,
    Money,
    DateRange,
    ContractParty,
    ComplianceScore,
    RiskAssessment,
    ContractVersion,
)
from app.domain.exceptions import (
    DomainValidationError,
    BusinessRuleViolationError,
    ContractStateError,
)


@dataclass(frozen=True)
class ContractId:
    """Contract identifier value object"""

    value: str

    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise DomainValidationError("Contract ID cannot be empty")

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class ContractCreated(DomainEvent):
    """Domain event for contract creation"""

    contract_title: str
    contract_type: str
    client_name: str
    created_by_user_id: str
    company_id: str


@dataclass(frozen=True)
class ContractContentGenerated(DomainEvent):
    """Domain event for AI content generation"""

    ai_model: str
    processing_time_ms: float
    confidence_score: float


@dataclass(frozen=True)
class ContractActivated(DomainEvent):
    """Domain event for contract activation"""

    activated_by_user_id: str
    contract_value: Optional[float]
    start_date: Optional[datetime]


@dataclass(frozen=True)
class ContractCompleted(DomainEvent):
    """Domain event for contract completion"""

    completed_by_user_id: str
    completion_reason: Optional[str]


@dataclass(frozen=True)
class ContractTerminated(DomainEvent):
    """Domain event for contract termination"""

    terminated_by_user_id: str
    termination_reason: str


class Contract(AggregateRoot[ContractId]):
    """
    Contract aggregate root - manages contract lifecycle and business rules
    Encapsulates all contract-related business logic and invariants
    """

    def __init__(
        self,
        contract_id: ContractId,
        title: str,
        contract_type: ContractType,
        plain_english_input: str,
        client: ContractParty,
        supplier: Optional[ContractParty],
        created_by_user_id: str,
        company_id: str,
    ):
        super().__init__(contract_id)

        # Validate required fields
        self._validate_title(title)
        self._validate_plain_english_input(plain_english_input)
        self._validate_user_id(created_by_user_id)
        self._validate_company_id(company_id)

        # Initialize contract state
        self._title = title
        self._contract_type = contract_type
        self._status = ContractStatus.DRAFT
        self._plain_english_input = plain_english_input
        self._client = client
        self._supplier = supplier
        self._created_by_user_id = created_by_user_id
        self._company_id = company_id

        # Optional fields
        self._contract_value: Optional[Money] = None
        self._date_range: Optional[DateRange] = None
        self._generated_content: Optional[str] = None
        self._final_content: Optional[str] = None
        self._ai_metadata: Optional[Dict[str, Any]] = None
        self._compliance_score: Optional[ComplianceScore] = None
        self._risk_assessment: Optional[RiskAssessment] = None

        # Version control
        self._versions: List[ContractVersion] = []

        # Lifecycle tracking
        self._activated_at: Optional[datetime] = None
        self._activated_by_user_id: Optional[str] = None
        self._completed_at: Optional[datetime] = None
        self._completed_by_user_id: Optional[str] = None
        self._terminated_at: Optional[datetime] = None
        self._terminated_by_user_id: Optional[str] = None
        self._termination_reason: Optional[str] = None

    @classmethod
    def create(
        cls,
        contract_id: ContractId,
        title: str,
        contract_type: ContractType,
        plain_english_input: str,
        client: ContractParty,
        supplier: Optional[ContractParty],
        created_by_user_id: str,
        company_id: str,
    ) -> "Contract":
        """Factory method to create a new contract"""

        contract = cls(
            contract_id=contract_id,
            title=title,
            contract_type=contract_type,
            plain_english_input=plain_english_input,
            client=client,
            supplier=supplier,
            created_by_user_id=created_by_user_id,
            company_id=company_id,
        )

        # Raise domain event
        event = ContractCreated.create(
            aggregate_id=contract_id.value,
            event_type="ContractCreated",
            contract_title=title,
            contract_type=contract_type.value,
            client_name=client.name,
            created_by_user_id=created_by_user_id,
            company_id=company_id,
        )
        contract.add_domain_event(event)

        return contract

    @classmethod
    def from_persistence(
        cls,
        contract_id: ContractId,
        title: str,
        contract_type: ContractType,
        status: ContractStatus,
        plain_english_input: str,
        client: ContractParty,
        supplier: Optional[ContractParty],
        created_by_user_id: str,
        company_id: str,
        version: int,
        created_at: datetime,
        updated_at: Optional[datetime] = None,
        contract_value: Optional[Money] = None,
        date_range: Optional[DateRange] = None,
        generated_content: Optional[str] = None,
        final_content: Optional[str] = None,
        ai_metadata: Optional[Dict[str, Any]] = None,
        compliance_score: Optional[ComplianceScore] = None,
        risk_assessment: Optional[RiskAssessment] = None,
        activated_at: Optional[datetime] = None,
        activated_by_user_id: Optional[str] = None,
        completed_at: Optional[datetime] = None,
        completed_by_user_id: Optional[str] = None,
        terminated_at: Optional[datetime] = None,
        terminated_by_user_id: Optional[str] = None,
        termination_reason: Optional[str] = None,
    ) -> "Contract":
        """
        Factory method to reconstruct a contract from persistence data
        This method bypasses normal domain rules to allow reconstruction
        """
        # Create contract using regular constructor for basic validation
        contract = cls(
            contract_id=contract_id,
            title=title,
            contract_type=contract_type,
            plain_english_input=plain_english_input,
            client=client,
            supplier=supplier,
            created_by_user_id=created_by_user_id,
            company_id=company_id,
        )

        # Override state from persistence (this is acceptable for reconstruction)
        contract._status = status
        contract._version = version
        contract._created_at = created_at
        contract._updated_at = updated_at

        # Set optional fields
        contract._contract_value = contract_value
        contract._date_range = date_range
        contract._generated_content = generated_content
        contract._final_content = final_content
        contract._ai_metadata = ai_metadata
        contract._compliance_score = compliance_score
        contract._risk_assessment = risk_assessment

        # Set lifecycle tracking
        contract._activated_at = activated_at
        contract._activated_by_user_id = activated_by_user_id
        contract._completed_at = completed_at
        contract._completed_by_user_id = completed_by_user_id
        contract._terminated_at = terminated_at
        contract._terminated_by_user_id = terminated_by_user_id
        contract._termination_reason = termination_reason

        # Clear domain events (they shouldn't be replayed from persistence)
        contract.clear_domain_events()

        return contract

    # Properties
    @property
    def title(self) -> str:
        return self._title

    @property
    def contract_type(self) -> ContractType:
        return self._contract_type

    @property
    def status(self) -> ContractStatus:
        return self._status

    @property
    def plain_english_input(self) -> str:
        return self._plain_english_input

    @property
    def client(self) -> ContractParty:
        return self._client

    @property
    def supplier(self) -> Optional[ContractParty]:
        return self._supplier

    @property
    def created_by_user_id(self) -> str:
        return self._created_by_user_id

    @property
    def company_id(self) -> str:
        return self._company_id

    @property
    def contract_value(self) -> Optional[Money]:
        return self._contract_value

    @property
    def date_range(self) -> Optional[DateRange]:
        return self._date_range

    @property
    def generated_content(self) -> Optional[str]:
        return self._generated_content

    @property
    def final_content(self) -> Optional[str]:
        return self._final_content

    @property
    def ai_metadata(self) -> Optional[Dict[str, Any]]:
        return self._ai_metadata

    @property
    def compliance_score(self) -> Optional[ComplianceScore]:
        return self._compliance_score

    @property
    def risk_assessment(self) -> Optional[RiskAssessment]:
        return self._risk_assessment

    @property
    def versions(self) -> List[ContractVersion]:
        return self._versions.copy()

    @property
    def activated_at(self) -> Optional[datetime]:
        return self._activated_at

    @property
    def activated_by_user_id(self) -> Optional[str]:
        return self._activated_by_user_id

    @property
    def completed_at(self) -> Optional[datetime]:
        return self._completed_at

    @property
    def completed_by_user_id(self) -> Optional[str]:
        return self._completed_by_user_id

    @property
    def terminated_at(self) -> Optional[datetime]:
        return self._terminated_at

    @property
    def terminated_by_user_id(self) -> Optional[str]:
        return self._terminated_by_user_id

    @property
    def termination_reason(self) -> Optional[str]:
        return self._termination_reason

    # Business operations
    def set_contract_value(self, money: Money):
        """Set contract monetary value"""
        self._ensure_not_completed()
        self._contract_value = money
        self._increment_version()

    def set_date_range(self, date_range: DateRange):
        """Set contract date range"""
        self._ensure_not_completed()
        self._date_range = date_range
        self._increment_version()

    def set_generated_content(self, content: str, ai_metadata: Dict[str, Any]):
        """Set AI-generated content"""
        self._ensure_not_completed()
        if not content or not content.strip():
            raise DomainValidationError("Generated content cannot be empty")

        self._generated_content = content
        self._ai_metadata = ai_metadata
        self._increment_version()

        # Raise domain event
        event = ContractContentGenerated.create(
            aggregate_id=self.id.value,
            event_type="ContractContentGenerated",
            ai_model=ai_metadata.get("model_name", "unknown"),
            processing_time_ms=ai_metadata.get("processing_time_ms", 0.0),
            confidence_score=ai_metadata.get("confidence_score", 0.0),
        )
        self.add_domain_event(event)

    def finalize_content(self, content: str, user_id: str):
        """Set final contract content"""
        self._ensure_not_completed()
        if not content or not content.strip():
            raise DomainValidationError("Final content cannot be empty")

        self._final_content = content
        self._increment_version()

    def set_compliance_analysis(
        self, compliance_score: ComplianceScore, risk_assessment: RiskAssessment
    ):
        """Set compliance analysis results"""
        self._compliance_score = compliance_score
        self._risk_assessment = risk_assessment
        self._increment_version()

    def activate(self, user_id: str):
        """Activate the contract"""
        if self._status != ContractStatus.DRAFT:
            raise ContractStateError(
                "Contract must be in draft status to activate",
                self._status.value,
                ContractStatus.DRAFT.value,
            )

        if not self._final_content:
            raise BusinessRuleViolationError(
                "Cannot activate contract without final content"
            )

        if self._date_range and self._date_range.has_expired:
            raise BusinessRuleViolationError("Cannot activate expired contract")

        self._status = ContractStatus.ACTIVE
        self._activated_at = datetime.now(timezone.utc)
        self._activated_by_user_id = user_id
        self._increment_version()

        # Raise domain event
        event = ContractActivated.create(
            aggregate_id=self.id.value,
            event_type="ContractActivated",
            activated_by_user_id=user_id,
            contract_value=(
                self._contract_value.amount if self._contract_value else None
            ),
            start_date=self._date_range.start_date if self._date_range else None,
        )
        self.add_domain_event(event)

    def complete(self, user_id: str, completion_reason: Optional[str] = None):
        """Complete the contract"""
        if self._status != ContractStatus.ACTIVE:
            raise BusinessRuleViolationError(
                "Cannot complete contract that is not active"
            )

        self._status = ContractStatus.COMPLETED
        self._completed_at = datetime.now(timezone.utc)
        self._completed_by_user_id = user_id
        self._increment_version()

        # Raise domain event
        event = ContractCompleted.create(
            aggregate_id=self.id.value,
            event_type="ContractCompleted",
            completed_by_user_id=user_id,
            completion_reason=completion_reason,
        )
        self.add_domain_event(event)

    def terminate(self, user_id: str, reason: str):
        """Terminate the contract"""
        if self._status not in [ContractStatus.ACTIVE, ContractStatus.DRAFT]:
            raise ContractStateError(
                "Cannot terminate contract in current status", self._status.value
            )

        if not reason or not reason.strip():
            raise DomainValidationError("Termination reason is required")

        self._status = ContractStatus.TERMINATED
        self._terminated_at = datetime.now(timezone.utc)
        self._terminated_by_user_id = user_id
        self._termination_reason = reason
        self._increment_version()

        # Raise domain event
        event = ContractTerminated.create(
            aggregate_id=self.id.value,
            event_type="ContractTerminated",
            terminated_by_user_id=user_id,
            termination_reason=reason,
        )
        self.add_domain_event(event)

    def create_new_version(self, content: str, change_summary: str, user_id: str):
        """Create a new version of the contract"""
        self._ensure_not_completed()

        if not content or not content.strip():
            raise DomainValidationError("Version content cannot be empty")

        # Create version record
        version = ContractVersion(
            version_number=self.version + 1,
            content=self._final_content or self._generated_content or "",
            created_by=self._created_by_user_id,
            created_at=self.updated_at or self.created_at,
            change_summary=change_summary,
        )

        self._versions.append(version)
        self._final_content = content
        self._increment_version()

    def is_expired(self) -> bool:
        """Check if contract has expired"""
        if not self._date_range:
            return False
        return self._date_range.has_expired

    def is_active_period(self) -> bool:
        """Check if contract is in active time period"""
        if not self._date_range:
            return True
        return self._date_range.is_active

    def get_effective_content(self) -> Optional[str]:
        """Get the effective contract content (final or generated)"""
        return self._final_content or self._generated_content

    def requires_compliance_review(self) -> bool:
        """Check if contract requires compliance review"""
        if not self._compliance_score:
            return True
        return not self._compliance_score.is_compliant

    def get_risk_level(self) -> Optional[str]:
        """Get human-readable risk level"""
        if not self._risk_assessment:
            return None
        return self._risk_assessment.risk_level

    # Validation methods
    def _validate_title(self, title: str):
        """Validate contract title"""
        if not title or not title.strip():
            raise DomainValidationError(
                "Contract title cannot be empty", "title", title
            )

        if len(title.strip()) > 200:
            raise DomainValidationError(
                "Contract title too long (max 200 characters)", "title", title
            )

    def _validate_plain_english_input(self, input_text: str):
        """Validate plain English input"""
        if not input_text or not input_text.strip():
            raise DomainValidationError(
                "Plain English input cannot be empty", "plain_english_input", input_text
            )

        if len(input_text.strip()) < 10:
            raise DomainValidationError(
                "Plain English input too short (min 10 characters)",
                "plain_english_input",
                input_text,
            )

    def _validate_user_id(self, user_id: str):
        """Validate user ID"""
        if not user_id or not user_id.strip():
            raise DomainValidationError(
                "User ID cannot be empty", "created_by_user_id", user_id
            )

    def _validate_company_id(self, company_id: str):
        """Validate company ID"""
        if not company_id or not company_id.strip():
            raise DomainValidationError(
                "Company ID cannot be empty", "company_id", company_id
            )

    def _ensure_not_completed(self):
        """Ensure contract is not in completed state"""
        if self._status == ContractStatus.COMPLETED:
            raise BusinessRuleViolationError("Cannot modify completed contract")
