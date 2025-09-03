# Domain-Driven Design Documentation

**Pactoria MVP Backend - Business Logic and Domain Architecture**

## Table of Contents

1. [Domain Overview](#domain-overview)
2. [Bounded Context](#bounded-context)
3. [Ubiquitous Language](#ubiquitous-language)
4. [Aggregate Design](#aggregate-design)
5. [Value Objects](#value-objects)
6. [Domain Services](#domain-services)
7. [Domain Events](#domain-events)
8. [Business Rules and Invariants](#business-rules-and-invariants)
9. [Repository Patterns](#repository-patterns)
10. [Application Services](#application-services)

---

## Domain Overview

The Pactoria domain focuses on **AI-powered contract management for UK SMEs**, emphasizing legal compliance, efficiency, and business value delivery. The domain model reflects real-world contract management processes while incorporating AI capabilities and UK-specific legal requirements.

### Core Domain Purpose

**Primary Goal:** Transform plain English contract requirements into legally compliant UK contracts using AI, while ensuring comprehensive compliance and audit capabilities.

**Business Value:**
- 85% cost reduction vs enterprise solutions
- 6+ hours/week time savings per user
- 95%+ UK legal compliance accuracy
- Complete audit trail for regulatory compliance

### Domain Boundaries

```
┌─────────────────────────────────────────────────┐
│              Contract Management Domain          │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐              │
│  │   Contract   │  │    User     │              │
│  │  Aggregate   │  │ Management  │              │
│  └─────────────┘  └─────────────┘              │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐              │
│  │   Company    │  │  Template   │              │
│  │  Aggregate   │  │ Management  │              │  
│  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────┘
          │                     │
          ▼                     ▼
┌─────────────────┐    ┌─────────────────┐
│   AI Services   │    │ Compliance &    │
│  (External)     │    │ Legal Services  │
└─────────────────┘    └─────────────────┘
```

---

## Bounded Context

### Single Bounded Context: Contract Management

The system operates within a single, cohesive bounded context focused on contract lifecycle management with AI enhancement.

#### Context Boundaries

**Included in Context:**
- Contract creation, modification, and lifecycle management
- AI-powered content generation and analysis
- UK legal compliance validation and scoring
- User and company management (as supporting aggregates)
- Template management and customization
- Audit trail and version control
- Risk assessment and scoring

**External to Context:**
- Payment processing (future integration)
- Document signing (future integration)
- Calendar management (integration planned)
- Email notifications (service integration)
- File storage (infrastructure concern)

#### Context Map

```
┌─────────────────────────────────────┐
│     Contract Management Context     │
│                                     │
│  Core Aggregates:                   │
│  • Contract (root aggregate)        │
│  • User (supporting aggregate)      │
│  • Company (supporting aggregate)   │
│  • Template (supporting aggregate)  │
│                                     │
│  Domain Services:                   │
│  • ContractGenerationService        │
│  • ComplianceAnalysisService        │
│  • RiskAssessmentService            │
└─────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ AI      │  │ Legal   │  │ Audit   │
│Services │  │Services │  │Services │
│Context  │  │Context  │  │Context  │
└─────────┘  └─────────┘  └─────────┘
```

---

## Ubiquitous Language

### Core Business Terms

**Contract Management:**
- **Contract**: A legal agreement between parties with specific terms and conditions
- **Agreement**: Synonym for contract in business discussions
- **Template**: Pre-built contract structure for specific use cases
- **Generation**: AI-powered creation of contract content from plain English
- **Analysis**: AI-powered review of contract for compliance and risks

**Legal Compliance:**
- **Compliance Score**: Numerical assessment (0-1 scale) of legal compliance
- **Risk Assessment**: Evaluation of potential legal and business risks (1-10 scale)
- **GDPR Compliance**: Adherence to UK/EU data protection regulations
- **Employment Law Compliance**: Adherence to UK employment regulations
- **Consumer Rights Compliance**: Adherence to UK consumer protection laws

**Business Process:**
- **Plain English Input**: Natural language description of contract requirements
- **Professional Contract**: Formally structured legal document
- **Draft**: Contract in creation/editing phase
- **Active**: Contract in execution phase
- **Completed**: Successfully fulfilled contract
- **Terminated**: Prematurely ended contract

**UK Legal Context:**
- **Jurisdiction**: Legal territory (England & Wales, Scotland, Northern Ireland)
- **Governing Law**: Legal framework governing the contract (English Law)
- **Statutory Requirements**: Legal obligations mandated by UK law
- **Common Law**: Legal principles from court decisions
- **Consumer Protection**: UK-specific consumer rights and protections

---

## Aggregate Design

### Contract Aggregate Root

The Contract is the primary aggregate root, encapsulating all business rules related to contract lifecycle management.

```python
class Contract(AggregateRoot[ContractId]):
    """
    Contract aggregate root managing the complete contract lifecycle.
    
    The Contract aggregate ensures consistency of all contract-related 
    business rules and invariants while providing a clear interface
    for external interactions.
    """
    
    # === Core Identity ===
    _contract_id: ContractId
    _version: int
    _created_at: datetime
    _updated_at: Optional[datetime]
    
    # === Essential Properties ===
    _title: str                           # Human-readable contract name
    _contract_type: ContractType          # Category of contract
    _status: ContractStatus               # Current lifecycle state
    _plain_english_input: str             # Original natural language requirements
    
    # === Parties ===
    _client: ContractParty                # Primary contracting party
    _supplier: Optional[ContractParty]    # Secondary party (if applicable)
    
    # === Business Context ===
    _company_id: CompanyId                # Owning company (multi-tenant)
    _created_by_user_id: UserId           # User who created the contract
    _assigned_to_user_id: Optional[UserId] # User responsible for contract
    
    # === Financial Information ===
    _contract_value: Optional[Money]       # Monetary value of contract
    _currency: str                        # ISO currency code (default: GBP)
    _payment_terms: Optional[PaymentTerms] # Payment schedule and terms
    
    # === Timeline ===
    _date_range: Optional[DateRange]       # Contract start/end dates
    _notice_period: Optional[NoticePeriod] # Required notice for changes
    _renewal_terms: Optional[RenewalTerms] # Auto-renewal configuration
    
    # === Content Management ===
    _generated_content: Optional[str]      # AI-generated contract text
    _final_content: Optional[str]          # Human-approved final content
    _content_format: ContentFormat        # Plain text, HTML, etc.
    
    # === AI and Analysis ===
    _ai_generation_metadata: Optional[Dict[str, Any]]    # AI generation details
    _compliance_score: Optional[ComplianceScore]         # Legal compliance assessment
    _risk_assessment: Optional[RiskAssessment]           # Risk evaluation
    _recommendations: List[str]                          # AI-generated recommendations
    
    # === Version Control ===
    _versions: List[ContractVersion]       # Complete version history
    _is_current_version: bool              # Whether this is the latest version
    
    # === Audit and Compliance ===
    _audit_trail: List[AuditEntry]         # Complete change history
    _compliance_checks: List[ComplianceCheck] # Historical compliance validations
    _legal_reviews: List[LegalReview]      # Human legal review records
```

#### Contract Business Operations

```python
    # === Factory Methods ===
    @classmethod
    def create(cls, 
               title: str,
               contract_type: ContractType, 
               plain_english_input: str,
               client: ContractParty,
               supplier: Optional[ContractParty],
               created_by_user_id: UserId,
               company_id: CompanyId,
               **optional_params) -> 'Contract':
        """
        Factory method for creating new contracts with full validation.
        
        Business Rules:
        - Title must be between 1 and 200 characters
        - Contract type must be supported by the system
        - Plain English input must be at least 10 characters
        - Client information must be valid
        - User must belong to the specified company
        
        Domain Events Raised:
        - ContractCreated
        """
        # Validation logic
        if not title or len(title.strip()) == 0:
            raise ContractValidationError("Contract title is required")
        
        if len(title) > 200:
            raise ContractValidationError("Contract title must not exceed 200 characters")
        
        if len(plain_english_input) < 10:
            raise ContractValidationError("Plain English input must be at least 10 characters")
        
        # Create contract instance
        contract_id = ContractId.generate()
        contract = cls(
            contract_id=contract_id,
            title=title.strip(),
            contract_type=contract_type,
            status=ContractStatus.DRAFT,
            plain_english_input=plain_english_input,
            client=client,
            supplier=supplier,
            company_id=company_id,
            created_by_user_id=created_by_user_id,
            version=1,
            created_at=datetime.utcnow()
        )
        
        # Raise domain event
        contract.add_domain_event(ContractCreated(
            contract_id=contract_id,
            title=title,
            contract_type=contract_type,
            created_by=created_by_user_id,
            company_id=company_id,
            created_at=contract.created_at
        ))
        
        return contract

    # === Lifecycle Management ===
    def activate(self, user_id: UserId, activation_reason: Optional[str] = None) -> None:
        """
        Activate contract for execution.
        
        Business Rules:
        - Contract must be in DRAFT status
        - Final content must exist
        - Contract must not be expired
        - User must have activation permissions
        
        Domain Events Raised:
        - ContractActivated
        """
        if self._status != ContractStatus.DRAFT:
            raise ContractStateError(
                f"Cannot activate contract in {self._status} status",
                current_state=self._status.value,
                expected_state=ContractStatus.DRAFT.value
            )
        
        if not self._final_content:
            raise ContractStateError(
                "Cannot activate contract without final content"
            )
        
        if self._date_range and self._date_range.has_expired:
            raise ContractStateError(
                "Cannot activate expired contract"
            )
        
        # Update state
        self._status = ContractStatus.ACTIVE
        self._updated_at = datetime.utcnow()
        self._increment_version()
        
        # Create audit entry
        self._add_audit_entry(
            event_type="contract_activated",
            user_id=user_id,
            details={"reason": activation_reason}
        )
        
        # Raise domain event
        self.add_domain_event(ContractActivated(
            contract_id=self._contract_id,
            activated_by=user_id,
            activated_at=self._updated_at,
            reason=activation_reason
        ))
    
    def complete(self, user_id: UserId, completion_reason: str) -> None:
        """
        Mark contract as successfully completed.
        
        Business Rules:
        - Contract must be in ACTIVE status
        - Completion reason must be provided
        - Contract becomes read-only after completion
        
        Domain Events Raised:
        - ContractCompleted
        """
        if self._status != ContractStatus.ACTIVE:
            raise ContractStateError(
                f"Cannot complete contract in {self._status} status",
                current_state=self._status.value,
                expected_state=ContractStatus.ACTIVE.value
            )
        
        if not completion_reason or len(completion_reason.strip()) == 0:
            raise ContractValidationError("Completion reason is required")
        
        # Update state
        self._status = ContractStatus.COMPLETED
        self._updated_at = datetime.utcnow()
        self._increment_version()
        
        # Create audit entry
        self._add_audit_entry(
            event_type="contract_completed",
            user_id=user_id,
            details={"completion_reason": completion_reason}
        )
        
        # Raise domain event
        self.add_domain_event(ContractCompleted(
            contract_id=self._contract_id,
            completed_by=user_id,
            completed_at=self._updated_at,
            completion_reason=completion_reason
        ))

    def terminate(self, user_id: UserId, termination_reason: str) -> None:
        """
        Terminate contract before natural completion.
        
        Business Rules:
        - Contract must be ACTIVE or DRAFT
        - Termination reason must be provided
        - Termination creates permanent audit record
        
        Domain Events Raised:
        - ContractTerminated
        """
        if self._status not in [ContractStatus.ACTIVE, ContractStatus.DRAFT]:
            raise ContractStateError(
                f"Cannot terminate contract in {self._status} status"
            )
        
        if not termination_reason or len(termination_reason.strip()) == 0:
            raise ContractValidationError("Termination reason is required")
        
        # Update state
        self._status = ContractStatus.TERMINATED
        self._updated_at = datetime.utcnow()
        self._increment_version()
        
        # Create audit entry
        self._add_audit_entry(
            event_type="contract_terminated",
            user_id=user_id,
            details={"termination_reason": termination_reason}
        )
        
        # Raise domain event
        self.add_domain_event(ContractTerminated(
            contract_id=self._contract_id,
            terminated_by=user_id,
            terminated_at=self._updated_at,
            termination_reason=termination_reason
        ))

    # === Content Management ===
    def set_generated_content(self, 
                             content: str, 
                             ai_metadata: Dict[str, Any],
                             user_id: UserId) -> None:
        """
        Set AI-generated content with metadata tracking.
        
        Business Rules:
        - Content cannot be empty
        - Only allowed on modifiable contracts
        - AI metadata must include model information
        - Version increments on content change
        
        Domain Events Raised:
        - ContractContentGenerated
        """
        if not content or len(content.strip()) == 0:
            raise ContractValidationError("Generated content cannot be empty")
        
        if not self._is_modifiable():
            raise ContractStateError(
                f"Cannot modify content of {self._status} contract"
            )
        
        if not ai_metadata.get('model_name'):
            raise ContractValidationError("AI metadata must include model_name")
        
        # Update content
        self._generated_content = content.strip()
        self._ai_generation_metadata = ai_metadata
        self._updated_at = datetime.utcnow()
        self._increment_version()
        
        # Create audit entry
        self._add_audit_entry(
            event_type="content_generated",
            user_id=user_id,
            details={
                "model_name": ai_metadata.get('model_name'),
                "processing_time_ms": ai_metadata.get('processing_time_ms'),
                "confidence_score": ai_metadata.get('confidence_score')
            }
        )
        
        # Raise domain event
        self.add_domain_event(ContractContentGenerated(
            contract_id=self._contract_id,
            generated_by=user_id,
            model_name=ai_metadata.get('model_name'),
            content_length=len(content),
            confidence_score=ai_metadata.get('confidence_score'),
            generated_at=self._updated_at
        ))

    def finalize_content(self, content: str, user_id: UserId) -> None:
        """
        Set final human-reviewed content.
        
        Business Rules:
        - Final content overrides generated content
        - Only allowed on modifiable contracts
        - Creates permanent version in history
        
        Domain Events Raised:
        - ContractContentFinalized
        """
        if not content or len(content.strip()) == 0:
            raise ContractValidationError("Final content cannot be empty")
        
        if not self._is_modifiable():
            raise ContractStateError(
                f"Cannot modify content of {self._status} contract"
            )
        
        # Update content
        self._final_content = content.strip()
        self._updated_at = datetime.utcnow()
        self._increment_version()
        
        # Create version snapshot
        self._versions.append(ContractVersion(
            version=self._version,
            content=content,
            created_by=user_id,
            created_at=self._updated_at,
            change_reason="Content finalized"
        ))
        
        # Create audit entry
        self._add_audit_entry(
            event_type="content_finalized",
            user_id=user_id,
            details={"content_length": len(content)}
        )
        
        # Raise domain event
        self.add_domain_event(ContractContentFinalized(
            contract_id=self._contract_id,
            finalized_by=user_id,
            content_length=len(content),
            finalized_at=self._updated_at
        ))

    # === Compliance and Risk Management ===
    def set_compliance_score(self, 
                           compliance_score: ComplianceScore,
                           risk_assessment: RiskAssessment,
                           user_id: UserId) -> None:
        """
        Update compliance score and risk assessment.
        
        Business Rules:
        - Compliance score must be valid (0.0-1.0)
        - Risk assessment must include all required areas
        - Historical scores are maintained for trending
        
        Domain Events Raised:
        - ContractComplianceAnalyzed
        """
        if not compliance_score.is_valid():
            raise ContractValidationError("Invalid compliance score")
        
        if not risk_assessment.is_valid():
            raise ContractValidationError("Invalid risk assessment")
        
        # Update scores
        self._compliance_score = compliance_score
        self._risk_assessment = risk_assessment
        self._updated_at = datetime.utcnow()
        
        # Store historical compliance check
        self._compliance_checks.append(ComplianceCheck(
            overall_score=compliance_score.overall_score,
            gdpr_compliance=compliance_score.gdpr_compliance,
            employment_law_compliance=compliance_score.employment_law_compliance,
            consumer_rights_compliance=compliance_score.consumer_rights_compliance,
            risk_score=risk_assessment.risk_score,
            risk_factors=risk_assessment.risk_factors,
            analyzed_by=user_id,
            analyzed_at=self._updated_at
        ))
        
        # Create audit entry
        self._add_audit_entry(
            event_type="compliance_analyzed",
            user_id=user_id,
            details={
                "overall_score": compliance_score.overall_score,
                "risk_score": risk_assessment.risk_score,
                "is_compliant": compliance_score.is_compliant
            }
        )
        
        # Raise domain event
        self.add_domain_event(ContractComplianceAnalyzed(
            contract_id=self._contract_id,
            compliance_score=compliance_score.overall_score,
            risk_score=risk_assessment.risk_score,
            analyzed_by=user_id,
            analyzed_at=self._updated_at
        ))

    # === Business Rule Validation ===
    def _is_modifiable(self) -> bool:
        """Check if contract can be modified."""
        return self._status in [ContractStatus.DRAFT, ContractStatus.PENDING_REVIEW]
    
    def _can_be_activated(self) -> bool:
        """Check if contract can be activated."""
        return (
            self._status == ContractStatus.DRAFT and
            self._final_content is not None and
            (not self._date_range or not self._date_range.has_expired)
        )
    
    def _increment_version(self) -> None:
        """Increment version number for change tracking."""
        self._version += 1
    
    def _add_audit_entry(self, event_type: str, user_id: UserId, details: Dict[str, Any]) -> None:
        """Add entry to audit trail."""
        self._audit_trail.append(AuditEntry(
            event_type=event_type,
            user_id=user_id,
            timestamp=datetime.utcnow(),
            details=details
        ))
    
    # === Properties ===
    @property
    def contract_id(self) -> ContractId:
        return self._contract_id
    
    @property 
    def title(self) -> str:
        return self._title
    
    @property
    def status(self) -> ContractStatus:
        return self._status
    
    @property
    def is_active(self) -> bool:
        return self._status == ContractStatus.ACTIVE
    
    @property
    def is_compliant(self) -> bool:
        return (
            self._compliance_score and 
            self._compliance_score.is_compliant
        )
    
    @property
    def effective_content(self) -> Optional[str]:
        """Get the content that should be used (final over generated)."""
        return self._final_content or self._generated_content
```

---

## Value Objects

Value objects represent concepts that are defined by their value rather than identity and are immutable.

### Money Value Object

```python
@dataclass(frozen=True)
class Money:
    """
    Monetary value with currency support.
    
    Business Rules:
    - Amount cannot be negative
    - Currency must be ISO 4217 code
    - UK contracts default to GBP
    - Supports arithmetic operations with same currency
    """
    amount: Decimal
    currency: str = "GBP"
    
    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")
        
        if not self._is_valid_currency(self.currency):
            raise ValueError(f"Invalid currency code: {self.currency}")
    
    def add(self, other: 'Money') -> 'Money':
        """Add two money amounts (same currency only)."""
        if self.currency != other.currency:
            raise ValueError(f"Cannot add different currencies: {self.currency} and {other.currency}")
        return Money(self.amount + other.amount, self.currency)
    
    def multiply(self, factor: Decimal) -> 'Money':
        """Multiply money by a factor."""
        return Money(self.amount * factor, self.currency)
    
    @property
    def is_zero(self) -> bool:
        return self.amount == 0
    
    @property
    def formatted(self) -> str:
        """Format money for display."""
        if self.currency == "GBP":
            return f"£{self.amount:,.2f}"
        elif self.currency == "EUR":
            return f"€{self.amount:,.2f}"
        elif self.currency == "USD":
            return f"${self.amount:,.2f}"
        else:
            return f"{self.amount:,.2f} {self.currency}"
    
    def _is_valid_currency(self, currency: str) -> bool:
        """Validate ISO 4217 currency code."""
        valid_currencies = {"GBP", "EUR", "USD", "AUD", "CAD", "CHF", "JPY"}
        return currency in valid_currencies
```

### ComplianceScore Value Object

```python
@dataclass(frozen=True)
class ComplianceScore:
    """
    UK legal compliance scoring with detailed breakdown.
    
    Business Rules:
    - All scores are 0.0 to 1.0 scale
    - Overall score is required
    - Specific compliance areas are optional
    - Score >= 0.95 is considered compliant for UK law
    """
    overall_score: float
    gdpr_compliance: Optional[float] = None
    employment_law_compliance: Optional[float] = None
    consumer_rights_compliance: Optional[float] = None
    commercial_terms_compliance: Optional[float] = None
    
    def __post_init__(self):
        self._validate_score(self.overall_score, "overall_score")
        
        if self.gdpr_compliance is not None:
            self._validate_score(self.gdpr_compliance, "gdpr_compliance")
        
        if self.employment_law_compliance is not None:
            self._validate_score(self.employment_law_compliance, "employment_law_compliance")
        
        if self.consumer_rights_compliance is not None:
            self._validate_score(self.consumer_rights_compliance, "consumer_rights_compliance")
        
        if self.commercial_terms_compliance is not None:
            self._validate_score(self.commercial_terms_compliance, "commercial_terms_compliance")
    
    @property
    def is_compliant(self) -> bool:
        """Check if score meets UK legal compliance threshold."""
        return self.overall_score >= 0.95
    
    @property
    def compliance_level(self) -> str:
        """Get human-readable compliance level."""
        if self.overall_score >= 0.98:
            return "Excellent"
        elif self.overall_score >= 0.95:
            return "Compliant"
        elif self.overall_score >= 0.90:
            return "Good"
        elif self.overall_score >= 0.80:
            return "Acceptable"
        else:
            return "Needs Improvement"
    
    @property
    def risk_indicators(self) -> List[str]:
        """Identify areas of compliance concern."""
        indicators = []
        
        if self.gdpr_compliance and self.gdpr_compliance < 0.95:
            indicators.append("GDPR compliance below threshold")
        
        if self.employment_law_compliance and self.employment_law_compliance < 0.95:
            indicators.append("Employment law compliance concerns")
        
        if self.consumer_rights_compliance and self.consumer_rights_compliance < 0.95:
            indicators.append("Consumer rights compliance issues")
        
        if self.commercial_terms_compliance and self.commercial_terms_compliance < 0.90:
            indicators.append("Commercial terms need review")
        
        return indicators
    
    def _validate_score(self, score: float, field_name: str) -> None:
        """Validate compliance score is in valid range."""
        if not (0.0 <= score <= 1.0):
            raise ValueError(f"{field_name} must be between 0.0 and 1.0, got {score}")
```

### DateRange Value Object

```python
@dataclass(frozen=True)
class DateRange:
    """
    Contract duration with start and end dates.
    
    Business Rules:
    - Start date is required
    - End date must be after start date (if specified)
    - Supports open-ended contracts (no end date)
    - Timezone-aware dates
    """
    start_date: datetime
    end_date: Optional[datetime] = None
    
    def __post_init__(self):
        if self.end_date and self.end_date <= self.start_date:
            raise ValueError("End date must be after start date")
        
        # Ensure dates are timezone-aware (UTC)
        if self.start_date.tzinfo is None:
            object.__setattr__(self, 'start_date', self.start_date.replace(tzinfo=timezone.utc))
        
        if self.end_date and self.end_date.tzinfo is None:
            object.__setattr__(self, 'end_date', self.end_date.replace(tzinfo=timezone.utc))
    
    @property
    def duration(self) -> Optional[timedelta]:
        """Calculate contract duration."""
        if self.end_date:
            return self.end_date - self.start_date
        return None
    
    @property
    def is_active(self) -> bool:
        """Check if contract is currently within active date range."""
        now = datetime.now(timezone.utc)
        if now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        return True
    
    @property
    def has_expired(self) -> bool:
        """Check if contract has passed its end date."""
        if not self.end_date:
            return False
        return datetime.now(timezone.utc) > self.end_date
    
    @property
    def days_until_expiry(self) -> Optional[int]:
        """Calculate days until contract expires."""
        if not self.end_date:
            return None
        delta = self.end_date - datetime.now(timezone.utc)
        return max(0, delta.days)
    
    @property
    def is_expiring_soon(self, days_ahead: int = 30) -> bool:
        """Check if contract expires within specified days."""
        days_left = self.days_until_expiry
        return days_left is not None and 0 <= days_left <= days_ahead
```

### ContractParty Value Object

```python
@dataclass(frozen=True)
class ContractParty:
    """
    Information about a party to the contract.
    
    Business Rules:
    - Name is required
    - Email must be valid format (if provided)
    - Company name is optional
    - Contact details are optional but recommended
    """
    name: str
    email: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    role: str = "party"
    
    def __post_init__(self):
        if not self.name or len(self.name.strip()) == 0:
            raise ValueError("Party name is required")
        
        if self.email and not self._is_valid_email(self.email):
            raise ValueError(f"Invalid email address: {self.email}")
        
        if self.phone and not self._is_valid_uk_phone(self.phone):
            raise ValueError(f"Invalid UK phone number: {self.phone}")
    
    @property
    def display_name(self) -> str:
        """Get formatted display name."""
        if self.company:
            return f"{self.name} ({self.company})"
        return self.name
    
    @property
    def has_contact_details(self) -> bool:
        """Check if party has sufficient contact information."""
        return bool(self.email or self.phone)
    
    def _is_valid_email(self, email: str) -> bool:
        """Basic email validation."""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def _is_valid_uk_phone(self, phone: str) -> bool:
        """Validate UK phone number format."""
        import re
        # Remove all non-digit characters
        digits = re.sub(r'\D', '', phone)
        
        # UK phone number patterns
        if digits.startswith('44'):  # International format
            return len(digits) >= 12
        elif digits.startswith('0'):  # National format
            return len(digits) >= 10
        else:
            return len(digits) >= 10
```

---

## Domain Services

Domain services contain business logic that doesn't naturally fit within a single entity or value object.

### ContractGenerationService

```python
class ContractGenerationService:
    """
    Domain service for complex contract generation business logic
    that spans multiple aggregates and external services.
    """
    
    def __init__(self, 
                 template_repository: TemplateRepository,
                 ai_service: AIService):
        self._template_repository = template_repository
        self._ai_service = ai_service
    
    async def can_generate_contract(self, contract: Contract) -> bool:
        """
        Determine if contract is eligible for AI generation.
        
        Business Rules:
        - Contract must be in modifiable state
        - Plain English input must be sufficient
        - Template must be available for contract type
        - User must have generation permissions
        """
        if not contract.is_modifiable:
            return False
        
        if len(contract.plain_english_input) < 10:
            return False
        
        available_templates = await self._template_repository.find_by_type(
            contract.contract_type
        )
        
        return len(available_templates) > 0
    
    async def prepare_generation_context(self, 
                                       contract: Contract,
                                       user_preferences: Optional[Dict[str, Any]] = None) -> GenerationContext:
        """
        Prepare comprehensive context for AI generation.
        
        Combines:
        - Contract requirements
        - UK legal templates
        - Compliance requirements
        - User preferences
        - Company-specific terms
        """
        # Get relevant templates
        templates = await self._template_repository.find_by_type(
            contract.contract_type
        )
        
        # Select best template
        primary_template = self._select_optimal_template(
            templates, 
            contract.plain_english_input,
            user_preferences
        )
        
        # Build generation context
        context = GenerationContext(
            contract_type=contract.contract_type,
            plain_english_input=contract.plain_english_input,
            client=contract.client,
            supplier=contract.supplier,
            contract_value=contract.contract_value,
            date_range=contract.date_range,
            primary_template=primary_template,
            alternative_templates=templates[:3],  # Top 3 alternatives
            uk_legal_requirements=self._get_uk_legal_requirements(contract.contract_type),
            compliance_requirements=self._get_compliance_requirements(contract),
            user_preferences=user_preferences or {}
        )
        
        return context
    
    def _select_optimal_template(self, 
                               templates: List[Template],
                               requirements: str,
                               preferences: Optional[Dict[str, Any]]) -> Template:
        """
        Select the most appropriate template based on requirements.
        
        Selection Criteria:
        - Template type compatibility
        - Keyword matching with requirements
        - User preferences
        - Template popularity/success rate
        """
        if not templates:
            raise DomainError("No templates available for contract type")
        
        # Score each template
        scored_templates = []
        for template in templates:
            score = self._calculate_template_score(template, requirements, preferences)
            scored_templates.append((template, score))
        
        # Sort by score (highest first)
        scored_templates.sort(key=lambda x: x[1], reverse=True)
        
        return scored_templates[0][0]
    
    def _calculate_template_score(self, 
                                template: Template,
                                requirements: str,
                                preferences: Optional[Dict[str, Any]]) -> float:
        """Calculate template suitability score (0.0 - 1.0)."""
        score = 0.0
        
        # Base compatibility score
        score += 0.3
        
        # Keyword matching
        requirement_words = set(requirements.lower().split())
        template_keywords = set(template.keywords)
        
        if template_keywords:
            keyword_match = len(requirement_words & template_keywords) / len(template_keywords)
            score += keyword_match * 0.4
        
        # User preference matching
        if preferences:
            jurisdiction_match = preferences.get('jurisdiction') == template.jurisdiction
            if jurisdiction_match:
                score += 0.2
            
            complexity_match = preferences.get('complexity_level') == template.complexity_level
            if complexity_match:
                score += 0.1
        
        return min(1.0, score)
    
    def _get_uk_legal_requirements(self, contract_type: ContractType) -> Dict[str, Any]:
        """Get UK-specific legal requirements for contract type."""
        base_requirements = {
            "jurisdiction": "England and Wales",
            "governing_law": "English Law",
            "dispute_resolution": "English Courts",
            "currency": "GBP"
        }
        
        # Add type-specific requirements
        if contract_type == ContractType.EMPLOYMENT:
            base_requirements.update({
                "minimum_wage_compliance": True,
                "working_time_regulations": True,
                "holiday_entitlement": True,
                "notice_periods": True
            })
        elif contract_type == ContractType.SERVICE_AGREEMENT:
            base_requirements.update({
                "consumer_rights": True,
                "unfair_terms_protection": True,
                "cancellation_rights": True
            })
        
        return base_requirements
    
    def _get_compliance_requirements(self, contract: Contract) -> Dict[str, Any]:
        """Get compliance requirements based on contract context."""
        requirements = {
            "gdpr_compliance": True,
            "data_protection_clauses": True,
            "audit_trail_requirements": True
        }
        
        # Add value-based requirements
        if contract.contract_value and contract.contract_value.amount > 10000:
            requirements["professional_indemnity"] = True
            requirements["liability_caps"] = True
        
        return requirements
```

### ComplianceAnalysisService

```python
class ComplianceAnalysisService:
    """
    Domain service for comprehensive UK legal compliance analysis.
    """
    
    def __init__(self, ai_service: AIService):
        self._ai_service = ai_service
    
    async def analyze_contract_compliance(self, 
                                        contract: Contract) -> Tuple[ComplianceScore, RiskAssessment]:
        """
        Perform comprehensive compliance analysis.
        
        Analyzes:
        - GDPR compliance
        - UK employment law
        - Consumer rights
        - Commercial terms
        - Contract-specific legal requirements
        """
        if not contract.effective_content:
            raise DomainError("Cannot analyze contract without content")
        
        # Prepare analysis request
        analysis_request = ComplianceAnalysisRequest(
            contract_content=contract.effective_content,
            contract_type=contract.contract_type,
            contract_value=contract.contract_value,
            parties=[contract.client, contract.supplier] if contract.supplier else [contract.client],
            jurisdiction="England and Wales"
        )
        
        # Perform AI analysis
        ai_analysis = await self._ai_service.analyze_compliance(analysis_request)
        
        # Build compliance score
        compliance_score = ComplianceScore(
            overall_score=ai_analysis.overall_score,
            gdpr_compliance=ai_analysis.gdpr_score,
            employment_law_compliance=ai_analysis.employment_law_score,
            consumer_rights_compliance=ai_analysis.consumer_rights_score,
            commercial_terms_compliance=ai_analysis.commercial_terms_score
        )
        
        # Build risk assessment
        risk_assessment = RiskAssessment(
            risk_score=self._calculate_risk_score(ai_analysis),
            risk_factors=ai_analysis.identified_risks,
            recommendations=ai_analysis.recommendations,
            legal_concerns=ai_analysis.legal_concerns,
            mitigation_strategies=ai_analysis.mitigation_strategies
        )
        
        return compliance_score, risk_assessment
    
    def _calculate_risk_score(self, ai_analysis) -> int:
        """
        Calculate overall risk score (1-10 scale).
        
        Risk Factors:
        - Compliance score (lower = higher risk)
        - Number of identified risks
        - Severity of legal concerns
        - Contract value and complexity
        """
        base_risk = 1
        
        # Compliance-based risk
        if ai_analysis.overall_score < 0.8:
            base_risk += 4
        elif ai_analysis.overall_score < 0.9:
            base_risk += 2
        elif ai_analysis.overall_score < 0.95:
            base_risk += 1
        
        # Risk factor count
        risk_count = len(ai_analysis.identified_risks)
        if risk_count > 5:
            base_risk += 3
        elif risk_count > 2:
            base_risk += 1
        
        # Legal concern severity
        critical_concerns = [
            concern for concern in ai_analysis.legal_concerns
            if concern.severity == "critical"
        ]
        base_risk += len(critical_concerns) * 2
        
        return min(10, base_risk)
```

---

## Domain Events

Domain events represent important business occurrences that other parts of the system should know about.

### Core Contract Events

```python
@dataclass(frozen=True)
class ContractCreated(DomainEvent):
    """Event raised when a new contract is created."""
    contract_id: ContractId
    title: str
    contract_type: ContractType
    created_by: UserId
    company_id: CompanyId
    created_at: datetime

@dataclass(frozen=True)
class ContractContentGenerated(DomainEvent):
    """Event raised when AI generates contract content."""
    contract_id: ContractId
    generated_by: UserId
    model_name: str
    content_length: int
    confidence_score: Optional[float]
    generated_at: datetime

@dataclass(frozen=True)
class ContractActivated(DomainEvent):
    """Event raised when contract becomes active."""
    contract_id: ContractId
    activated_by: UserId
    activated_at: datetime
    reason: Optional[str]

@dataclass(frozen=True)
class ContractCompleted(DomainEvent):
    """Event raised when contract is completed."""
    contract_id: ContractId
    completed_by: UserId
    completed_at: datetime
    completion_reason: str

@dataclass(frozen=True)
class ContractComplianceAnalyzed(DomainEvent):
    """Event raised when compliance analysis is performed."""
    contract_id: ContractId
    compliance_score: float
    risk_score: int
    analyzed_by: UserId
    analyzed_at: datetime
```

### Event Usage

```python
# In the Contract aggregate
def activate(self, user_id: UserId) -> None:
    # ... business logic ...
    
    # Raise domain event
    self.add_domain_event(ContractActivated(
        contract_id=self._contract_id,
        activated_by=user_id,
        activated_at=datetime.utcnow(),
        reason=activation_reason
    ))

# Event handlers in application layer
class ContractEventHandlers:
    
    async def handle_contract_created(self, event: ContractCreated) -> None:
        """Handle contract creation event."""
        # Send welcome email
        # Update analytics
        # Create initial audit log
        pass
    
    async def handle_contract_activated(self, event: ContractActivated) -> None:
        """Handle contract activation event."""
        # Create calendar reminders
        # Notify relevant parties
        # Update business metrics
        pass
```

---

This Domain-Driven Design documentation provides a comprehensive view of the business logic, rules, and patterns implemented in the Pactoria backend, ensuring clear understanding of how the system models the real-world contract management domain for UK SMEs.