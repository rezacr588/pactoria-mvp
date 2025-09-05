"""
Clause Library Domain Entity - Core business logic for UK legal clause management
Following DDD patterns with rich domain model for legal clause requirements
"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4
from enum import Enum

from app.domain.entities.base import AggregateRoot, DomainEvent
from app.domain.entities.template import LegalJurisdiction, ComplianceFramework
from app.domain.exceptions import (
    DomainValidationError, BusinessRuleViolationError
)


class ClauseCategory(str, Enum):
    """Categories for legal clauses"""
    TERMINATION = "termination"
    LIABILITY = "liability"
    INDEMNITY = "indemnity"
    PAYMENT = "payment"
    CONFIDENTIALITY = "confidentiality"
    DATA_PROTECTION = "data_protection"
    INTELLECTUAL_PROPERTY = "intellectual_property"
    FORCE_MAJEURE = "force_majeure"
    DISPUTE_RESOLUTION = "dispute_resolution"
    GOVERNING_LAW = "governing_law"
    WARRANTIES = "warranties"
    REPRESENTATIONS = "representations"
    DEFINITIONS = "definitions"
    BOILERPLATE = "boilerplate"
    REGULATORY = "regulatory"
    EMPLOYMENT = "employment"
    CONSUMER_PROTECTION = "consumer_protection"


class ClauseType(str, Enum):
    """Types of clauses by legal function"""
    MANDATORY = "mandatory"           # Required by law
    STANDARD = "standard"             # Industry standard practice
    OPTIONAL = "optional"             # Additional protection
    PROTECTIVE = "protective"         # Protects specific party
    MUTUAL = "mutual"                # Applies to both parties
    REGULATORY = "regulatory"         # Compliance requirement


class ClauseComplexity(str, Enum):
    """Clause complexity levels"""
    BASIC = "basic"                   # Simple, standard language
    INTERMEDIATE = "intermediate"     # Some customization needed
    ADVANCED = "advanced"             # Complex legal concepts
    EXPERT = "expert"                 # Requires legal expertise


@dataclass(frozen=True)
class ClauseId:
    """Clause identifier value object"""
    value: str
    
    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise DomainValidationError("Clause ID cannot be empty")
    
    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class ClauseVariable:
    """Variable within a clause"""
    name: str
    display_name: str
    description: str
    variable_type: str  # text, number, date, money, boolean, choice
    required: bool = True
    default_value: Optional[str] = None
    validation_rules: Optional[Dict[str, Any]] = None
    help_text: Optional[str] = None


@dataclass(frozen=True)
class ClauseRelationship:
    """Relationship between clauses"""
    related_clause_id: str
    relationship_type: str  # requires, conflicts, enhances, replaces
    description: str


@dataclass(frozen=True)
class ClauseCreated(DomainEvent):
    """Domain event for clause creation"""
    clause_title: str
    clause_category: str
    jurisdiction: str
    created_by_user_id: str


@dataclass(frozen=True)
class ClauseUpdated(DomainEvent):
    """Domain event for clause updates"""
    clause_title: str
    updated_by_user_id: str
    version_number: str


class LegalClause(AggregateRoot[ClauseId]):
    """
    Legal Clause Aggregate Root - manages individual legal clauses
    Encapsulates clause business rules and compliance requirements
    """
    
    def __init__(self,
                 clause_id: ClauseId,
                 title: str,
                 content: str,
                 category: ClauseCategory,
                 clause_type: ClauseType,
                 jurisdiction: LegalJurisdiction,
                 created_by_user_id: str,
                 description: Optional[str] = None):
        super().__init__(clause_id)
        
        # Validate required fields
        self._validate_title(title)
        self._validate_content(content)
        self._validate_user_id(created_by_user_id)
        
        # Initialize clause state
        self._title = title
        self._content = content
        self._category = category
        self._clause_type = clause_type
        self._jurisdiction = jurisdiction
        self._description = description
        self._created_by_user_id = created_by_user_id
        
        # Clause metadata
        self._version = "1.0"
        self._complexity = ClauseComplexity.INTERMEDIATE
        self._is_active = True
        
        # Compliance and legal requirements
        self._compliance_frameworks: List[ComplianceFramework] = []
        self._legal_references: List[str] = []  # UK statutes, cases, etc.
        self._regulatory_requirements: List[str] = []
        
        # Customization and variables
        self._variables: List[ClauseVariable] = []
        self._alternative_versions: List[str] = []  # Alternative clause IDs
        self._relationships: List[ClauseRelationship] = []
        
        # Usage and quality metrics
        self._usage_count = 0
        self._success_rate = 0.0
        self._user_ratings: List[float] = []
        self._feedback_comments: List[str] = []
        
        # Legal validation
        self._legal_reviewer_id: Optional[str] = None
        self._legal_review_date: Optional[datetime] = None
        self._legal_review_notes: Optional[str] = None
        self._is_legally_approved = False
        
        # Lifecycle management
        self._last_updated_by: Optional[str] = None
        self._deprecation_date: Optional[datetime] = None
        self._replacement_clause_id: Optional[str] = None
        
        # Automatically detect compliance frameworks
        self._compliance_frameworks = self._detect_compliance_frameworks()
    
    @classmethod
    def create(cls,
               clause_id: ClauseId,
               title: str,
               content: str,
               category: ClauseCategory,
               clause_type: ClauseType,
               jurisdiction: LegalJurisdiction,
               created_by_user_id: str,
               description: Optional[str] = None) -> 'LegalClause':
        """Factory method to create a new clause"""
        
        clause = cls(
            clause_id=clause_id,
            title=title,
            content=content,
            category=category,
            clause_type=clause_type,
            jurisdiction=jurisdiction,
            created_by_user_id=created_by_user_id,
            description=description
        )
        
        # Raise domain event
        event = ClauseCreated.create(
            aggregate_id=clause_id.value,
            event_type="ClauseCreated",
            clause_title=title,
            clause_category=category.value,
            jurisdiction=jurisdiction.value,
            created_by_user_id=created_by_user_id
        )
        clause.add_domain_event(event)
        
        return clause
    
    # Properties
    @property
    def title(self) -> str:
        return self._title
    
    @property
    def content(self) -> str:
        return self._content
    
    @property
    def category(self) -> ClauseCategory:
        return self._category
    
    @property
    def clause_type(self) -> ClauseType:
        return self._clause_type
    
    @property
    def jurisdiction(self) -> LegalJurisdiction:
        return self._jurisdiction
    
    @property
    def description(self) -> Optional[str]:
        return self._description
    
    @property
    def version(self) -> str:
        return self._version
    
    @property
    def complexity(self) -> ClauseComplexity:
        return self._complexity
    
    @property
    def is_active(self) -> bool:
        return self._is_active
    
    @property
    def compliance_frameworks(self) -> List[ComplianceFramework]:
        return self._compliance_frameworks.copy()
    
    @property
    def legal_references(self) -> List[str]:
        return self._legal_references.copy()
    
    @property
    def variables(self) -> List[ClauseVariable]:
        return self._variables.copy()
    
    @property
    def relationships(self) -> List[ClauseRelationship]:
        return self._relationships.copy()
    
    @property
    def usage_count(self) -> int:
        return self._usage_count
    
    @property
    def success_rate(self) -> float:
        return self._success_rate
    
    @property
    def average_rating(self) -> float:
        if not self._user_ratings:
            return 0.0
        return sum(self._user_ratings) / len(self._user_ratings)
    
    @property
    def is_legally_approved(self) -> bool:
        return self._is_legally_approved
    
    @property
    def is_deprecated(self) -> bool:
        return self._deprecation_date is not None
    
    # Business operations
    def update_content(self, new_content: str, user_id: str, version_increment: str = "patch"):
        """Update clause content"""
        self._validate_content(new_content)
        
        old_content = self._content
        self._content = new_content
        self._last_updated_by = user_id
        
        # Increment version
        self._increment_clause_version(version_increment)
        
        # Reset legal approval if content significantly changed
        if self._content_significantly_changed(old_content, new_content):
            self._is_legally_approved = False
            self._legal_review_date = None
        
        self._increment_version()
        
        # Raise domain event
        event = ClauseUpdated.create(
            aggregate_id=self.id.value,
            event_type="ClauseUpdated",
            clause_title=self._title,
            updated_by_user_id=user_id,
            version_number=self._version
        )
        self.add_domain_event(event)
    
    def add_variable(self, variable: ClauseVariable):
        """Add a variable to the clause"""
        # Check if variable already exists
        existing_names = [v.name for v in self._variables]
        if variable.name in existing_names:
            raise BusinessRuleViolationError(f"Variable '{variable.name}' already exists")
        
        self._variables.append(variable)
        self._increment_version()
    
    def remove_variable(self, variable_name: str):
        """Remove a variable from the clause"""
        self._variables = [v for v in self._variables if v.name != variable_name]
        self._increment_version()
    
    def add_legal_reference(self, reference: str):
        """Add legal reference (statute, case law, etc.)"""
        if reference not in self._legal_references:
            self._legal_references.append(reference)
            self._increment_version()
    
    def remove_legal_reference(self, reference: str):
        """Remove legal reference"""
        if reference in self._legal_references:
            self._legal_references.remove(reference)
            self._increment_version()
    
    def add_compliance_framework(self, framework: ComplianceFramework):
        """Add compliance framework requirement"""
        if framework not in self._compliance_frameworks:
            self._compliance_frameworks.append(framework)
            self._increment_version()
    
    def add_relationship(self, relationship: ClauseRelationship):
        """Add relationship with another clause"""
        # Check if relationship already exists
        existing = any(r.related_clause_id == relationship.related_clause_id and 
                      r.relationship_type == relationship.relationship_type 
                      for r in self._relationships)
        
        if not existing:
            self._relationships.append(relationship)
            self._increment_version()
    
    def set_complexity(self, complexity: ClauseComplexity):
        """Set clause complexity level"""
        self._complexity = complexity
        self._increment_version()
    
    def legal_approve(self, reviewer_id: str, notes: Optional[str] = None):
        """Approve clause from legal perspective"""
        self._legal_reviewer_id = reviewer_id
        self._legal_review_date = datetime.now(timezone.utc)
        self._legal_review_notes = notes
        self._is_legally_approved = True
        self._increment_version()
    
    def deprecate(self, user_id: str, replacement_clause_id: Optional[str] = None):
        """Deprecate clause"""
        self._deprecation_date = datetime.now(timezone.utc)
        self._last_updated_by = user_id
        self._replacement_clause_id = replacement_clause_id
        self._is_active = False
        self._increment_version()
    
    def record_usage(self, success: bool, user_rating: Optional[float] = None, 
                    feedback: Optional[str] = None):
        """Record clause usage metrics"""
        self._usage_count += 1
        
        # Update success rate
        if self._usage_count == 1:
            self._success_rate = 1.0 if success else 0.0
        else:
            current_successes = int(self._success_rate * (self._usage_count - 1))
            if success:
                current_successes += 1
            self._success_rate = current_successes / self._usage_count
        
        # Add user rating if provided
        if user_rating is not None and 1.0 <= user_rating <= 5.0:
            self._user_ratings.append(user_rating)
        
        # Add feedback if provided
        if feedback:
            self._feedback_comments.append(feedback)
        
        self._increment_version()
    
    def generate_content_with_variables(self, variable_values: Dict[str, Any]) -> str:
        """Generate final content by replacing variables"""
        # Validate variables first
        validation_errors = self.validate_variable_values(variable_values)
        if validation_errors:
            raise DomainValidationError(f"Variable validation failed: {validation_errors}")
        
        content = self._content
        
        # Replace variables in content
        for variable in self._variables:
            value = variable_values.get(variable.name, variable.default_value or "")
            placeholder = "{{" + variable.name + "}}"
            content = content.replace(placeholder, str(value))
        
        return content
    
    def validate_variable_values(self, variable_values: Dict[str, Any]) -> List[str]:
        """Validate provided variable values"""
        errors = []
        
        for variable in self._variables:
            value = variable_values.get(variable.name)
            
            # Check required variables
            if variable.required and (value is None or value == ""):
                errors.append(f"Required variable '{variable.display_name}' is missing")
                continue
            
            if value is not None and variable.validation_rules:
                # Apply validation rules
                errors.extend(self._validate_variable_value(variable, value))
        
        return errors
    
    def is_compatible_with_clause(self, other_clause_id: str) -> bool:
        """Check if this clause is compatible with another clause"""
        # Check for conflicting relationships
        conflicts = [r for r in self._relationships 
                    if r.related_clause_id == other_clause_id and 
                       r.relationship_type == "conflicts"]
        
        return len(conflicts) == 0
    
    def get_required_clauses(self) -> List[str]:
        """Get list of clause IDs that this clause requires"""
        return [r.related_clause_id for r in self._relationships 
                if r.relationship_type == "requires"]
    
    def get_enhancing_clauses(self) -> List[str]:
        """Get list of clause IDs that enhance this clause"""
        return [r.related_clause_id for r in self._relationships 
                if r.relationship_type == "enhances"]
    
    def get_quality_score(self) -> float:
        """Calculate clause quality score"""
        if self._usage_count == 0:
            return 0.5  # Neutral for unused clauses
        
        # Components of quality score
        success_weight = 0.3
        rating_weight = 0.3
        approval_weight = 0.2
        usage_weight = 0.2
        
        # Success rate component (0-1)
        success_component = self._success_rate
        
        # User rating component (0-1, normalized from 1-5 scale)
        rating_component = (self.average_rating - 1) / 4 if self.average_rating > 0 else 0.5
        
        # Legal approval component
        approval_component = 1.0 if self._is_legally_approved else 0.3
        
        # Usage popularity component (logarithmic, normalized)
        import math
        usage_component = min(1.0, math.log(self._usage_count + 1) / math.log(50))
        
        quality_score = (
            success_component * success_weight +
            rating_component * rating_weight +
            approval_component * approval_weight +
            usage_component * usage_weight
        )
        
        return round(quality_score, 2)
    
    def can_be_used(self) -> bool:
        """Check if clause can be used"""
        return self._is_active and not self.is_deprecated
    
    def requires_legal_review(self) -> bool:
        """Check if clause requires legal review"""
        return not self._is_legally_approved or self._legal_review_date is None
    
    # Private methods
    def _validate_title(self, title: str):
        """Validate clause title"""
        if not title or not title.strip():
            raise DomainValidationError("Clause title cannot be empty", "title", title)
        
        if len(title.strip()) > 200:
            raise DomainValidationError("Clause title too long (max 200 characters)", "title", title)
    
    def _validate_content(self, content: str):
        """Validate clause content"""
        if not content or not content.strip():
            raise DomainValidationError("Clause content cannot be empty", "content", content)
        
        if len(content) < 50:
            raise DomainValidationError("Clause content too short (min 50 characters)", "content", content)
    
    def _validate_user_id(self, user_id: str):
        """Validate user ID"""
        if not user_id or not user_id.strip():
            raise DomainValidationError("User ID cannot be empty", "created_by_user_id", user_id)
    
    def _detect_compliance_frameworks(self) -> List[ComplianceFramework]:
        """Auto-detect compliance frameworks based on content"""
        frameworks = []
        content_lower = self._content.lower()
        
        # GDPR/Data Protection
        if any(term in content_lower for term in ["personal data", "gdpr", "data protection", "privacy"]):
            frameworks.append(ComplianceFramework.GDPR)
        
        # Employment Law
        if any(term in content_lower for term in ["employee", "employment", "termination", "notice period"]):
            frameworks.append(ComplianceFramework.EMPLOYMENT_LAW)
        
        # Consumer Rights
        if any(term in content_lower for term in ["consumer", "unfair terms", "consumer rights"]):
            frameworks.append(ComplianceFramework.CONSUMER_RIGHTS)
        
        # Financial Services
        if any(term in content_lower for term in ["financial", "fca", "regulated activity"]):
            frameworks.append(ComplianceFramework.FINANCIAL_SERVICES)
        
        # Health & Safety
        if any(term in content_lower for term in ["health", "safety", "hasawa"]):
            frameworks.append(ComplianceFramework.HEALTH_SAFETY)
        
        # Competition Law
        if any(term in content_lower for term in ["competition", "anti-competitive", "market abuse"]):
            frameworks.append(ComplianceFramework.COMPETITION_LAW)
        
        # Always include commercial law as base
        frameworks.append(ComplianceFramework.COMMERCIAL_LAW)
        
        return list(set(frameworks))  # Remove duplicates
    
    def _increment_clause_version(self, increment_type: str):
        """Increment clause version number"""
        parts = self._version.split('.')
        major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0
        
        if increment_type == "major":
            major += 1
            minor = 0
            patch = 0
        elif increment_type == "minor":
            minor += 1
            patch = 0
        else:  # patch
            patch += 1
        
        self._version = f"{major}.{minor}.{patch}"
    
    def _content_significantly_changed(self, old_content: str, new_content: str) -> bool:
        """Check if content change is significant enough to require re-approval"""
        # Simple heuristic: if more than 30% of content changed, it's significant
        old_words = set(old_content.lower().split())
        new_words = set(new_content.lower().split())
        
        if len(old_words) == 0:
            return True
        
        common_words = old_words.intersection(new_words)
        change_ratio = 1 - (len(common_words) / len(old_words))
        
        return change_ratio > 0.3
    
    def _validate_variable_value(self, variable: ClauseVariable, value: Any) -> List[str]:
        """Validate individual variable value against rules"""
        errors = []
        
        if not variable.validation_rules:
            return errors
        
        # Type validation
        expected_type = variable.validation_rules.get("type")
        if expected_type == "number" and not isinstance(value, (int, float)):
            try:
                float(value)
            except (ValueError, TypeError):
                errors.append(f"Variable '{variable.display_name}' must be a number")
        
        # Length validation
        min_length = variable.validation_rules.get("min_length")
        max_length = variable.validation_rules.get("max_length")
        
        if isinstance(value, str):
            if min_length and len(value) < min_length:
                errors.append(f"Variable '{variable.display_name}' too short (min {min_length} chars)")
            if max_length and len(value) > max_length:
                errors.append(f"Variable '{variable.display_name}' too long (max {max_length} chars)")
        
        # Pattern validation
        pattern = variable.validation_rules.get("pattern")
        if pattern and isinstance(value, str):
            import re
            if not re.match(pattern, value):
                errors.append(f"Variable '{variable.display_name}' format is invalid")
        
        return errors


class ClauseLibrary(AggregateRoot[str]):
    """
    Clause Library Aggregate Root - manages collections of legal clauses
    Coordinates clause relationships and provides search/organization capabilities
    """
    
    def __init__(self, library_id: str, name: str, description: str, owner_id: str):
        super().__init__(library_id)
        self._name = name
        self._description = description
        self._owner_id = owner_id
        self._clauses: Dict[str, LegalClause] = {}
        self._tags: List[str] = []
        self._is_public = False
        self._created_at = datetime.now(timezone.utc)
    
    def add_clause(self, clause: LegalClause):
        """Add clause to library"""
        self._clauses[clause.id.value] = clause
        self._increment_version()
    
    def remove_clause(self, clause_id: str):
        """Remove clause from library"""
        if clause_id in self._clauses:
            del self._clauses[clause_id]
            self._increment_version()
    
    def get_clauses_by_category(self, category: ClauseCategory) -> List[LegalClause]:
        """Get all clauses in a specific category"""
        return [clause for clause in self._clauses.values() 
                if clause.category == category and clause.can_be_used()]
    
    def search_clauses(self, query: str, category: Optional[ClauseCategory] = None) -> List[LegalClause]:
        """Search clauses by content"""
        results = []
        query_lower = query.lower()
        
        for clause in self._clauses.values():
            if not clause.can_be_used():
                continue
            
            # Category filter
            if category and clause.category != category:
                continue
            
            # Text search
            if (query_lower in clause.title.lower() or 
                query_lower in clause.content.lower() or
                (clause.description and query_lower in clause.description.lower())):
                results.append(clause)
        
        # Sort by quality score
        return sorted(results, key=lambda c: c.get_quality_score(), reverse=True)
    
    def validate_clause_compatibility(self, clause_ids: List[str]) -> List[str]:
        """Validate that a set of clauses are compatible"""
        errors = []
        
        for i, clause_id in enumerate(clause_ids):
            if clause_id not in self._clauses:
                continue
                
            clause = self._clauses[clause_id]
            
            # Check compatibility with other clauses
            for other_clause_id in clause_ids[i+1:]:
                if not clause.is_compatible_with_clause(other_clause_id):
                    errors.append(f"Clause '{clause.title}' conflicts with clause ID {other_clause_id}")
        
        return errors