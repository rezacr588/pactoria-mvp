"""
Template Domain Entity - Core business logic for UK legal template management
Following DDD patterns with rich domain model for legal template requirements
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum

from app.domain.entities.base import AggregateRoot, DomainEvent
from app.domain.value_objects import ContractType
from app.domain.entities.company import IndustryType, CompanySize
from app.domain.exceptions import DomainValidationError, BusinessRuleViolationError


class TemplateCategory(str, Enum):
    """Template categories for UK legal documents"""

    COMMERCIAL = "commercial"
    EMPLOYMENT = "employment"
    PROPERTY = "property"
    INTELLECTUAL_PROPERTY = "intellectual_property"
    DATA_PROTECTION = "data_protection"
    CONSUMER = "consumer"
    PARTNERSHIP = "partnership"
    COMPANY_FORMATION = "company_formation"
    COMPLIANCE = "compliance"
    DISPUTE_RESOLUTION = "dispute_resolution"


class TemplateStatus(str, Enum):
    """Template lifecycle status"""

    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"


class LegalJurisdiction(str, Enum):
    """Legal jurisdictions supported"""

    ENGLAND_WALES = "england_wales"
    SCOTLAND = "scotland"
    NORTHERN_IRELAND = "northern_ireland"
    UK_WIDE = "uk_wide"


class ComplianceFramework(str, Enum):
    """UK compliance frameworks"""

    GDPR = "gdpr"
    EMPLOYMENT_LAW = "employment_law"
    CONSUMER_RIGHTS = "consumer_rights"
    COMMERCIAL_LAW = "commercial_law"
    COMPANY_LAW = "company_law"
    HEALTH_SAFETY = "health_safety"
    FINANCIAL_SERVICES = "financial_services"
    COMPETITION_LAW = "competition_law"


@dataclass(frozen=True)
class TemplateId:
    """Template identifier value object"""

    value: str

    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise DomainValidationError("Template ID cannot be empty")

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class ClauseLibraryEntry:
    """Individual clause that can be reused across templates"""

    clause_id: str
    title: str
    content: str
    category: str
    jurisdiction: LegalJurisdiction
    compliance_frameworks: List[ComplianceFramework]
    variables: List[str] = field(
        default_factory=list
    )  # Placeholders like {{CLIENT_NAME}}
    prerequisites: List[str] = field(default_factory=list)  # Required conditions
    alternatives: List[str] = field(default_factory=list)  # Alternative clause IDs
    legal_notes: Optional[str] = None
    last_updated: Optional[datetime] = None


@dataclass(frozen=True)
class TemplateVariable:
    """Variable definition within template"""

    name: str
    display_name: str
    description: str
    variable_type: str  # text, number, date, money, boolean, choice
    required: bool = True
    default_value: Optional[str] = None
    validation_regex: Optional[str] = None
    choices: Optional[List[str]] = None  # For choice type
    help_text: Optional[str] = None


@dataclass(frozen=True)
class TemplateCreated(DomainEvent):
    """Domain event for template creation"""

    template_name: str
    template_category: str
    contract_type: str
    created_by_user_id: str
    jurisdiction: str


@dataclass(frozen=True)
class TemplateActivated(DomainEvent):
    """Domain event for template activation"""

    template_name: str
    activated_by_user_id: str
    version: str


@dataclass(frozen=True)
class TemplateDeprecated(DomainEvent):
    """Domain event for template deprecation"""

    template_name: str
    deprecated_by_user_id: str
    reason: str
    replacement_template_id: Optional[str]


class LegalTemplate(AggregateRoot[TemplateId]):
    """
    Legal Template Aggregate Root - manages UK legal template lifecycle
    Encapsulates template business rules and compliance requirements
    """

    def __init__(
        self,
        template_id: TemplateId,
        name: str,
        category: TemplateCategory,
        contract_type: ContractType,
        jurisdiction: LegalJurisdiction,
        content: str,
        created_by_user_id: str,
        description: Optional[str] = None,
    ):
        super().__init__(template_id)

        # Validate required fields
        self._validate_name(name)
        self._validate_content(content)
        self._validate_user_id(created_by_user_id)

        # Initialize template state
        self._name = name
        self._category = category
        self._contract_type = contract_type
        self._jurisdiction = jurisdiction
        self._content = content
        self._description = description
        self._created_by_user_id = created_by_user_id

        # Template metadata
        self._status = TemplateStatus.DRAFT
        self._version = "1.0"
        self._is_active = False

        # Compliance and applicability
        self._compliance_frameworks: List[ComplianceFramework] = []
        self._suitable_for_industries: List[IndustryType] = []
        self._suitable_for_company_sizes: List[CompanySize] = []
        self._required_clauses: List[str] = []
        self._optional_clauses: List[str] = []

        # Template variables and customization
        self._variables: List[TemplateVariable] = []
        self._clause_library_references: List[str] = []

        # Usage and quality metrics
        self._usage_count = 0
        self._success_rate = 0.0  # Based on user feedback
        self._average_customization_time_minutes = 0.0

        # Legal validation
        self._legal_review_required = True
        self._legal_reviewer_id: Optional[str] = None
        self._legal_review_date: Optional[datetime] = None
        self._legal_review_notes: Optional[str] = None

        # Approval workflow
        self._approved_by_user_id: Optional[str] = None
        self._approved_at: Optional[datetime] = None
        self._approval_notes: Optional[str] = None

        # Lifecycle management
        self._deprecated_at: Optional[datetime] = None
        self._deprecated_by_user_id: Optional[str] = None
        self._deprecation_reason: Optional[str] = None
        self._replacement_template_id: Optional[str] = None

        # Automatically determine initial compliance frameworks
        self._compliance_frameworks = self._determine_compliance_frameworks()

    @classmethod
    def create(
        cls,
        template_id: TemplateId,
        name: str,
        category: TemplateCategory,
        contract_type: ContractType,
        jurisdiction: LegalJurisdiction,
        content: str,
        created_by_user_id: str,
        description: Optional[str] = None,
    ) -> "LegalTemplate":
        """Factory method to create a new template"""

        template = cls(
            template_id=template_id,
            name=name,
            category=category,
            contract_type=contract_type,
            jurisdiction=jurisdiction,
            content=content,
            created_by_user_id=created_by_user_id,
            description=description,
        )

        # Raise domain event
        event = TemplateCreated.create(
            aggregate_id=template_id.value,
            event_type="TemplateCreated",
            template_name=name,
            template_category=category.value,
            contract_type=contract_type.value,
            created_by_user_id=created_by_user_id,
            jurisdiction=jurisdiction.value,
        )
        template.add_domain_event(event)

        return template

    # Properties
    @property
    def name(self) -> str:
        return self._name

    @property
    def category(self) -> TemplateCategory:
        return self._category

    @property
    def contract_type(self) -> ContractType:
        return self._contract_type

    @property
    def jurisdiction(self) -> LegalJurisdiction:
        return self._jurisdiction

    @property
    def content(self) -> str:
        return self._content

    @property
    def description(self) -> Optional[str]:
        return self._description

    @property
    def status(self) -> TemplateStatus:
        return self._status

    @property
    def version(self) -> str:
        return self._version

    @property
    def is_active(self) -> bool:
        return self._is_active

    @property
    def compliance_frameworks(self) -> List[ComplianceFramework]:
        return self._compliance_frameworks.copy()

    @property
    def suitable_for_industries(self) -> List[IndustryType]:
        return self._suitable_for_industries.copy()

    @property
    def suitable_for_company_sizes(self) -> List[CompanySize]:
        return self._suitable_for_company_sizes.copy()

    @property
    def variables(self) -> List[TemplateVariable]:
        return self._variables.copy()

    @property
    def usage_count(self) -> int:
        return self._usage_count

    @property
    def success_rate(self) -> float:
        return self._success_rate

    @property
    def is_approved(self) -> bool:
        return self._approved_at is not None

    @property
    def is_deprecated(self) -> bool:
        return self._deprecated_at is not None

    @property
    def requires_legal_review(self) -> bool:
        return self._legal_review_required and self._legal_review_date is None

    # Business operations
    def update_content(self, new_content: str, user_id: str):
        """Update template content"""
        self._validate_content(new_content)

        if self._status in [TemplateStatus.ACTIVE, TemplateStatus.APPROVED]:
            raise BusinessRuleViolationError(
                "Cannot modify active or approved template content. Create new version instead."
            )

        self._content = new_content
        self._increment_version()

        # Reset approval if content changes
        if self._approved_at:
            self._approved_at = None
            self._approved_by_user_id = None
            self._status = TemplateStatus.DRAFT

    def add_variable(self, variable: TemplateVariable):
        """Add a variable to the template"""
        # Check if variable already exists
        existing_names = [v.name for v in self._variables]
        if variable.name in existing_names:
            raise BusinessRuleViolationError(
                f"Variable '{variable.name}' already exists"
            )

        self._variables.append(variable)
        self._increment_version()

    def remove_variable(self, variable_name: str):
        """Remove a variable from the template"""
        self._variables = [v for v in self._variables if v.name != variable_name]
        self._increment_version()

    def set_suitable_industries(self, industries: List[IndustryType]):
        """Set industries this template is suitable for"""
        self._suitable_for_industries = industries.copy()
        self._increment_version()

    def set_suitable_company_sizes(self, sizes: List[CompanySize]):
        """Set company sizes this template is suitable for"""
        self._suitable_for_company_sizes = sizes.copy()
        self._increment_version()

    def add_compliance_framework(self, framework: ComplianceFramework):
        """Add a compliance framework requirement"""
        if framework not in self._compliance_frameworks:
            self._compliance_frameworks.append(framework)
            self._increment_version()

    def remove_compliance_framework(self, framework: ComplianceFramework):
        """Remove a compliance framework requirement"""
        if framework in self._compliance_frameworks:
            self._compliance_frameworks.remove(framework)
            self._increment_version()

    def submit_for_legal_review(self, user_id: str):
        """Submit template for legal review"""
        if self._status != TemplateStatus.DRAFT:
            raise BusinessRuleViolationError(
                "Only draft templates can be submitted for review"
            )

        self._status = TemplateStatus.UNDER_REVIEW
        self._increment_version()

    def complete_legal_review(
        self, reviewer_id: str, approved: bool, notes: Optional[str] = None
    ):
        """Complete legal review process"""
        if self._status != TemplateStatus.UNDER_REVIEW:
            raise BusinessRuleViolationError("Template is not under review")

        self._legal_reviewer_id = reviewer_id
        self._legal_review_date = datetime.now(timezone.utc)
        self._legal_review_notes = notes
        self._legal_review_required = False

        if approved:
            self._status = TemplateStatus.APPROVED
            self._approved_by_user_id = reviewer_id
            self._approved_at = datetime.now(timezone.utc)
            self._approval_notes = notes
        else:
            self._status = TemplateStatus.DRAFT

        self._increment_version()

    def activate(self, user_id: str):
        """Activate template for use"""
        if self._status != TemplateStatus.APPROVED:
            raise BusinessRuleViolationError("Only approved templates can be activated")

        self._status = TemplateStatus.ACTIVE
        self._is_active = True
        self._increment_version()

        # Raise domain event
        event = TemplateActivated.create(
            aggregate_id=self.id.value,
            event_type="TemplateActivated",
            template_name=self._name,
            activated_by_user_id=user_id,
            version=self._version,
        )
        self.add_domain_event(event)

    def deprecate(
        self, user_id: str, reason: str, replacement_template_id: Optional[str] = None
    ):
        """Deprecate template"""
        if self._status not in [TemplateStatus.ACTIVE, TemplateStatus.APPROVED]:
            raise BusinessRuleViolationError(
                "Only active or approved templates can be deprecated"
            )

        self._status = TemplateStatus.DEPRECATED
        self._is_active = False
        self._deprecated_at = datetime.now(timezone.utc)
        self._deprecated_by_user_id = user_id
        self._deprecation_reason = reason
        self._replacement_template_id = replacement_template_id
        self._increment_version()

        # Raise domain event
        event = TemplateDeprecated.create(
            aggregate_id=self.id.value,
            event_type="TemplateDeprecated",
            template_name=self._name,
            deprecated_by_user_id=user_id,
            reason=reason,
            replacement_template_id=replacement_template_id,
        )
        self.add_domain_event(event)

    def record_usage(self, success: bool, customization_time_minutes: float):
        """Record template usage metrics"""
        self._usage_count += 1

        # Update success rate using running average
        if self._usage_count == 1:
            self._success_rate = 1.0 if success else 0.0
        else:
            current_success_count = int(self._success_rate * (self._usage_count - 1))
            if success:
                current_success_count += 1
            self._success_rate = current_success_count / self._usage_count

        # Update average customization time
        if self._usage_count == 1:
            self._average_customization_time_minutes = customization_time_minutes
        else:
            total_time = self._average_customization_time_minutes * (
                self._usage_count - 1
            )
            total_time += customization_time_minutes
            self._average_customization_time_minutes = total_time / self._usage_count

        self._increment_version()

    def is_suitable_for_business(
        self, industry: IndustryType, company_size: CompanySize
    ) -> bool:
        """Check if template is suitable for a specific business"""
        industry_suitable = (
            not self._suitable_for_industries
            or industry in self._suitable_for_industries
        )

        size_suitable = (
            not self._suitable_for_company_sizes
            or company_size in self._suitable_for_company_sizes
        )

        return industry_suitable and size_suitable

    def validate_variable_values(self, variable_values: Dict[str, Any]) -> List[str]:
        """Validate provided variable values against template requirements"""
        errors = []

        for variable in self._variables:
            value = variable_values.get(variable.name)

            # Check required variables
            if variable.required and (value is None or value == ""):
                errors.append(f"Required variable '{variable.display_name}' is missing")
                continue

            if value is not None:
                # Validate regex pattern
                if variable.validation_regex:
                    import re

                    if not re.match(variable.validation_regex, str(value)):
                        errors.append(
                            f"Variable '{variable.display_name}' format is invalid"
                        )

                # Validate choices
                if variable.choices and value not in variable.choices:
                    errors.append(
                        f"Variable '{variable.display_name}' must be one of: {variable.choices}"
                    )

        return errors

    def generate_content_with_variables(self, variable_values: Dict[str, Any]) -> str:
        """Generate final content by replacing variables"""
        # Validate variables first
        validation_errors = self.validate_variable_values(variable_values)
        if validation_errors:
            raise DomainValidationError(
                f"Variable validation failed: {validation_errors}"
            )

        content = self._content

        # Replace variables in content
        for variable in self._variables:
            value = variable_values.get(variable.name, variable.default_value or "")
            placeholder = "{{" + variable.name + "}}"
            content = content.replace(placeholder, str(value))

        return content

    def get_quality_score(self) -> float:
        """Calculate template quality score based on various metrics"""
        if self._usage_count == 0:
            return 0.5  # Neutral score for unused templates

        # Factors contributing to quality score
        success_weight = 0.4
        usage_weight = 0.3
        review_weight = 0.3

        # Success rate component (0-1)
        success_component = self._success_rate

        # Usage popularity component (logarithmic scale, normalized)
        import math

        usage_component = min(1.0, math.log(self._usage_count + 1) / math.log(100))

        # Review quality component
        review_component = 1.0 if self.is_approved else 0.5

        quality_score = (
            success_component * success_weight
            + usage_component * usage_weight
            + review_component * review_weight
        )

        return round(quality_score, 2)

    def can_be_used(self) -> bool:
        """Check if template can be used for contract generation"""
        return (
            self._status == TemplateStatus.ACTIVE
            and self._is_active
            and not self.is_deprecated
        )

    # Private methods
    def _validate_name(self, name: str):
        """Validate template name"""
        if not name or not name.strip():
            raise DomainValidationError("Template name cannot be empty", "name", name)

        if len(name.strip()) > 200:
            raise DomainValidationError(
                "Template name too long (max 200 characters)", "name", name
            )

    def _validate_content(self, content: str):
        """Validate template content"""
        if not content or not content.strip():
            raise DomainValidationError(
                "Template content cannot be empty", "content", content
            )

        if len(content) < 100:
            raise DomainValidationError(
                "Template content too short (min 100 characters)", "content", content
            )

    def _validate_user_id(self, user_id: str):
        """Validate user ID"""
        if not user_id or not user_id.strip():
            raise DomainValidationError(
                "User ID cannot be empty", "created_by_user_id", user_id
            )

    def _determine_compliance_frameworks(self) -> List[ComplianceFramework]:
        """Determine applicable compliance frameworks based on template attributes"""
        frameworks = []

        # Always include basic commercial law
        frameworks.append(ComplianceFramework.COMMERCIAL_LAW)

        # Category-specific frameworks
        if self._category == TemplateCategory.EMPLOYMENT:
            frameworks.append(ComplianceFramework.EMPLOYMENT_LAW)
        elif self._category == TemplateCategory.CONSUMER:
            frameworks.append(ComplianceFramework.CONSUMER_RIGHTS)
        elif self._category == TemplateCategory.COMPANY_FORMATION:
            frameworks.append(ComplianceFramework.COMPANY_LAW)
        elif self._category == TemplateCategory.DATA_PROTECTION:
            frameworks.append(ComplianceFramework.GDPR)

        # Content-based frameworks
        content_lower = self._content.lower()
        if "personal data" in content_lower or "data protection" in content_lower:
            frameworks.append(ComplianceFramework.GDPR)

        if "health" in content_lower or "safety" in content_lower:
            frameworks.append(ComplianceFramework.HEALTH_SAFETY)

        # Remove duplicates
        return list(set(frameworks))
