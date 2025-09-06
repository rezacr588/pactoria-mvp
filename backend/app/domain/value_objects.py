"""
Value Objects for Contract Domain
Immutable objects representing domain concepts
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from decimal import Decimal
import re
from enum import Enum


class ContractStatus(str, Enum):
    """Contract lifecycle status"""

    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"
    TERMINATED = "terminated"
    DELETED = "deleted"  # Soft delete

    def can_transition_to(self, new_status: "ContractStatus") -> bool:
        """Define valid status transitions"""
        valid_transitions = {
            self.DRAFT: [self.PENDING_REVIEW, self.ACTIVE, self.DELETED],
            self.PENDING_REVIEW: [self.DRAFT, self.ACTIVE, self.DELETED],
            self.ACTIVE: [self.COMPLETED, self.EXPIRED, self.TERMINATED],
            self.COMPLETED: [],
            self.EXPIRED: [],
            self.TERMINATED: [],
            self.DELETED: [],
        }
        return new_status in valid_transitions.get(self, [])


class ContractType(str, Enum):
    """Types of contracts supported"""

    SERVICE_AGREEMENT = "service_agreement"
    EMPLOYMENT_CONTRACT = "employment_contract"
    SUPPLIER_AGREEMENT = "supplier_agreement"
    NDA = "nda"
    TERMS_CONDITIONS = "terms_conditions"
    CONSULTANCY = "consultancy"
    PARTNERSHIP = "partnership"
    LEASE = "lease"


@dataclass(frozen=True)
class Email:
    """Value object for email addresses"""

    value: str

    def __post_init__(self):
        if not self._is_valid_email(self.value):
            raise ValueError(f"Invalid email address: {self.value}")

    @staticmethod
    def _is_valid_email(email: str) -> bool:
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(pattern, email))

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class Money:
    """Value object for monetary amounts"""

    amount: Decimal
    currency: str = "GBP"

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")
        if self.currency not in ["GBP", "EUR", "USD"]:
            raise ValueError(f"Unsupported currency: {self.currency}")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError("Cannot add money with different currencies")
        return Money(self.amount + other.amount, self.currency)

    def multiply(self, factor: Decimal) -> "Money":
        return Money(self.amount * factor, self.currency)

    def __str__(self) -> str:
        return f"{self.currency} {self.amount:.2f}"


@dataclass(frozen=True)
class DateRange:
    """Value object for date ranges"""

    start_date: datetime
    end_date: Optional[datetime] = None

    def __post_init__(self):
        if self.end_date and self.start_date > self.end_date:
            raise ValueError("Start date must be before end date")

    @property
    def is_active(self) -> bool:
        """Check if the date range is currently active"""
        now = datetime.now(timezone.utc)
        if self.start_date > now:
            return False
        if self.end_date and self.end_date < now:
            return False
        return True

    @property
    def has_expired(self) -> bool:
        """Check if the date range has expired"""
        if not self.end_date:
            return False
        return self.end_date < datetime.now(timezone.utc)

    @property
    def duration_days(self) -> Optional[int]:
        """Calculate duration in days"""
        if not self.end_date:
            return None
        return (self.end_date - self.start_date).days


@dataclass(frozen=True)
class ComplianceScore:
    """Value object for compliance scoring"""

    overall_score: float
    gdpr_compliance: Optional[float] = None
    employment_law_compliance: Optional[float] = None
    consumer_rights_compliance: Optional[float] = None
    commercial_terms_compliance: Optional[float] = None

    def __post_init__(self):
        # Validate scores are between 0 and 1
        scores = [
            self.overall_score,
            self.gdpr_compliance,
            self.employment_law_compliance,
            self.consumer_rights_compliance,
            self.commercial_terms_compliance,
        ]
        for score in scores:
            if score is not None and not 0 <= score <= 1:
                raise ValueError(f"Compliance score must be between 0 and 1: {score}")

    @property
    def is_compliant(self) -> bool:
        """Check if meets minimum compliance threshold"""
        return self.overall_score >= 0.8

    @property
    def compliance_level(self) -> str:
        """Get compliance level description"""
        if self.overall_score >= 0.95:
            return "Excellent"
        elif self.overall_score >= 0.85:
            return "Good"
        elif self.overall_score >= 0.7:
            return "Satisfactory"
        elif self.overall_score >= 0.5:
            return "Needs Improvement"
        else:
            return "Poor"


@dataclass(frozen=True)
class RiskAssessment:
    """Enhanced value object for comprehensive contract risk assessment"""

    overall_score: float  # 1-10 scale with decimal precision
    risk_level: str  # "Low", "Medium", "High", "Critical"
    assessment_summary: str
    key_concerns: List[str] = field(default_factory=list)
    priority_actions: List[str] = field(default_factory=list)
    category_scores: Dict[str, float] = field(default_factory=dict)
    assessment_confidence: float = 1.0  # 0-1 confidence level

    # MVP-specific risk insights for UK SMEs
    sme_specific_risks: List[str] = field(default_factory=list)
    industry_specific_risks: List[str] = field(default_factory=list)
    legal_review_required: bool = False
    suitable_for_sme: bool = True

    def __post_init__(self):
        if not 1.0 <= self.overall_score <= 10.0:
            raise ValueError("Risk score must be between 1.0 and 10.0")
        if not 0.0 <= self.assessment_confidence <= 1.0:
            raise ValueError("Assessment confidence must be between 0.0 and 1.0")
        if self.risk_level not in ["Low", "Medium", "High", "Critical"]:
            raise ValueError("Risk level must be Low, Medium, High, or Critical")

    @property
    def requires_review(self) -> bool:
        """Check if requires manual review (MVP business rule)"""
        return self.overall_score >= 7.0 or self.legal_review_required

    @property
    def is_high_risk(self) -> bool:
        """Check if contract is high risk"""
        return self.risk_level in ["High", "Critical"]

    @property
    def risk_score_int(self) -> int:
        """Get integer risk score for backward compatibility"""
        return int(round(self.overall_score))

    def get_category_risk(self, category: str) -> float:
        """Get risk score for specific category"""
        return self.category_scores.get(category, 1.0)

    @classmethod
    def create_low_risk(
        cls, summary: str = "Standard contract with minimal risk"
    ) -> "RiskAssessment":
        """Factory method for low-risk assessments"""
        return cls(
            overall_score=2.0,
            risk_level="Low",
            assessment_summary=summary,
            suitable_for_sme=True,
            assessment_confidence=0.8,
        )

    @classmethod
    def create_from_ai_assessment(cls, ai_assessment) -> "RiskAssessment":
        """Factory method to create from AI assessment service result"""
        return cls(
            overall_score=ai_assessment.overall_score,
            risk_level=ai_assessment.risk_level.value.title(),
            assessment_summary=ai_assessment.assessment_summary,
            key_concerns=ai_assessment.key_concerns,
            priority_actions=ai_assessment.priority_actions,
            category_scores=ai_assessment.category_scores,
            assessment_confidence=ai_assessment.assessment_confidence,
            sme_specific_risks=ai_assessment.sme_specific_risks,
            industry_specific_risks=ai_assessment.industry_specific_risks,
            legal_review_required=ai_assessment.requires_legal_review(),
            suitable_for_sme=ai_assessment.is_suitable_for_sme(),
        )


@dataclass(frozen=True)
class ContractParty:
    """Value object for contract party information"""

    name: str
    email: Optional[Email] = None
    company: Optional[str] = None
    role: str = "party"

    def __post_init__(self):
        if not self.name or not self.name.strip():
            raise ValueError("Party name cannot be empty")

    def __str__(self) -> str:
        if self.company:
            return f"{self.name} ({self.company})"
        return self.name


@dataclass(frozen=True)
class ContractVersion:
    """Value object for contract versioning"""

    version_number: int
    content: str
    created_by: str
    created_at: datetime
    change_summary: Optional[str] = None

    def __post_init__(self):
        if self.version_number < 1:
            raise ValueError("Version number must be positive")
        if not self.content:
            raise ValueError("Version content cannot be empty")


@dataclass(frozen=True)
class AIGenerationMetadata:
    """Value object for AI generation metadata"""

    model_name: str
    model_version: Optional[str]
    processing_time_ms: float
    token_usage: Dict[str, int]
    confidence_score: float

    def __post_init__(self):
        if not 0 <= self.confidence_score <= 1:
            raise ValueError("Confidence score must be between 0 and 1")
        if self.processing_time_ms < 0:
            raise ValueError("Processing time cannot be negative")


@dataclass(frozen=True)
class AuditEntry:
    """Value object for audit log entries"""

    event_type: str
    user_id: str
    timestamp: datetime
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    def __post_init__(self):
        if not self.event_type:
            raise ValueError("Event type cannot be empty")
        if not self.user_id:
            raise ValueError("User ID cannot be empty")
