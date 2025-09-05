"""
Company Domain Entity - Core business logic for UK company/business management
Following DDD patterns with rich domain model and UK business requirements
"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from uuid import uuid4
from enum import Enum
import re

from app.domain.entities.base import AggregateRoot, DomainEvent
from app.domain.value_objects import Email
from app.domain.exceptions import (
    DomainValidationError, BusinessRuleViolationError
)


class CompanySize(str, Enum):
    """UK business size classifications"""
    MICRO = "micro"          # < 10 employees, < £2M turnover
    SMALL = "small"          # < 50 employees, < £10M turnover
    MEDIUM = "medium"        # < 250 employees, < £50M turnover
    LARGE = "large"          # 250+ employees, £50M+ turnover


class CompanyType(str, Enum):
    """UK company legal structures"""
    PRIVATE_LIMITED = "private_limited"          # Ltd
    PUBLIC_LIMITED = "public_limited"            # PLC
    LIMITED_LIABILITY_PARTNERSHIP = "llp"        # LLP
    PARTNERSHIP = "partnership"                  # Traditional partnership
    SOLE_TRADER = "sole_trader"                  # Individual
    COMMUNITY_INTEREST_COMPANY = "cic"           # CIC
    CHARITY = "charity"                          # Registered charity


class CompanyStatus(str, Enum):
    """Company registration and operational status"""
    ACTIVE = "active"
    DORMANT = "dormant"
    IN_LIQUIDATION = "in_liquidation"
    DISSOLVED = "dissolved"
    SUSPENDED = "suspended"


class IndustryType(str, Enum):
    """UK industry classifications for SME focus"""
    TECHNOLOGY = "technology"
    PROFESSIONAL_SERVICES = "professional_services"
    RETAIL = "retail"
    MANUFACTURING = "manufacturing"
    CONSTRUCTION = "construction"
    HOSPITALITY = "hospitality"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    FINANCE = "finance"
    REAL_ESTATE = "real_estate"
    AGRICULTURE = "agriculture"
    TRANSPORT = "transport"
    CREATIVE = "creative"
    OTHER = "other"


@dataclass(frozen=True)
class CompanyId:
    """Company identifier value object"""
    value: str
    
    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise DomainValidationError("Company ID cannot be empty")
    
    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class CompanyNumber:
    """UK Companies House company number value object"""
    value: str
    
    def __post_init__(self):
        if not self._is_valid_company_number(self.value):
            raise DomainValidationError(f"Invalid UK company number: {self.value}")
    
    @staticmethod
    def _is_valid_company_number(number: str) -> bool:
        """Validate UK company number format"""
        if not number:
            return False
        
        # Remove spaces and convert to uppercase
        clean_number = number.replace(" ", "").upper()
        
        # UK company numbers are typically 8 digits, can be prefixed with letters
        # Examples: 12345678, SC123456, NI123456, OC123456
        pattern = r'^([A-Z]{0,2})(\d{6,8})$'
        match = re.match(pattern, clean_number)
        
        return bool(match)
    
    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class VATNumber:
    """UK VAT registration number value object"""
    value: str
    
    def __post_init__(self):
        if not self._is_valid_vat_number(self.value):
            raise DomainValidationError(f"Invalid UK VAT number: {self.value}")
    
    @staticmethod
    def _is_valid_vat_number(vat_number: str) -> bool:
        """Validate UK VAT number format"""
        if not vat_number:
            return False
        
        # Remove spaces and convert to uppercase
        clean_vat = vat_number.replace(" ", "").upper()
        
        # UK VAT numbers: GB123456789 or just 123456789
        if clean_vat.startswith("GB"):
            clean_vat = clean_vat[2:]
        
        # Should be 9 or 12 digits
        if len(clean_vat) not in [9, 12]:
            return False
        
        return clean_vat.isdigit()
    
    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class BusinessAddress:
    """UK business address value object"""
    line1: str
    city: str
    postcode: str
    line2: Optional[str] = None
    county: Optional[str] = None
    country: str = "United Kingdom"
    
    def __post_init__(self):
        if not self.line1 or not self.line1.strip():
            raise DomainValidationError("Address line 1 cannot be empty")
        if not self.city or not self.city.strip():
            raise DomainValidationError("City cannot be empty")
        if not self.postcode or not self.postcode.strip():
            raise DomainValidationError("Postcode cannot be empty")
        if not self._is_valid_uk_postcode(self.postcode):
            raise DomainValidationError(f"Invalid UK postcode: {self.postcode}")
    
    @staticmethod
    def _is_valid_uk_postcode(postcode: str) -> bool:
        """Validate UK postcode format"""
        if not postcode:
            return False
        
        # Remove spaces and convert to uppercase
        clean_postcode = postcode.replace(" ", "").upper()
        
        # UK postcode regex pattern
        pattern = r'^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$'
        return bool(re.match(pattern, postcode))
    
    def formatted_address(self) -> str:
        """Get formatted address string"""
        lines = [self.line1]
        if self.line2:
            lines.append(self.line2)
        lines.append(self.city)
        if self.county:
            lines.append(self.county)
        lines.append(self.postcode)
        lines.append(self.country)
        return ", ".join(lines)


@dataclass(frozen=True)
class CompanyRegistered(DomainEvent):
    """Domain event for company registration"""
    company_name: str
    company_type: str
    company_number: Optional[str]
    industry: str
    registered_by_user_id: str


@dataclass(frozen=True)
class CompanyVerified(DomainEvent):
    """Domain event for company verification via Companies House"""
    company_number: str
    verification_status: str
    verified_name: str
    verified_at: datetime


@dataclass(frozen=True)
class CompanyDetailsUpdated(DomainEvent):
    """Domain event for company details update"""
    updated_by_user_id: str
    changed_fields: List[str]


class Company(AggregateRoot[CompanyId]):
    """
    Company Aggregate Root - manages UK business entity and compliance
    Encapsulates all company-related business rules and UK legal requirements
    """
    
    def __init__(self,
                 company_id: CompanyId,
                 name: str,
                 company_type: CompanyType,
                 industry: IndustryType,
                 address: BusinessAddress,
                 primary_contact_email: Email,
                 created_by_user_id: str,
                 company_number: Optional[CompanyNumber] = None,
                 vat_number: Optional[VATNumber] = None,
                 company_size: CompanySize = CompanySize.SMALL):
        super().__init__(company_id)
        
        # Validate required fields
        self._validate_name(name)
        self._validate_user_id(created_by_user_id)
        
        # Initialize company state
        self._name = name
        self._company_type = company_type
        self._industry = industry
        self._address = address
        self._primary_contact_email = primary_contact_email
        self._created_by_user_id = created_by_user_id
        self._company_number = company_number
        self._vat_number = vat_number
        self._company_size = company_size
        
        # Operational state
        self._status = CompanyStatus.ACTIVE
        self._is_verified = False
        self._verified_at: Optional[datetime] = None
        self._verification_data: Optional[Dict[str, Any]] = None
        
        # Compliance and features
        self._is_vat_registered = vat_number is not None
        self._compliance_requirements: List[str] = self._determine_compliance_requirements()
        
        # Subscription and limits (for multi-tenancy)
        self._subscription_tier = "starter"
        self._max_team_members = 5
        self._max_contracts_per_month = 50
        self._monthly_contract_count = 0
        
        # Additional contact information
        self._phone_number: Optional[str] = None
        self._website: Optional[str] = None
        
        # Tracking
        self._last_activity_at: Optional[datetime] = None
        self._features_enabled: List[str] = ["contract_generation", "team_management"]
    
    @classmethod
    def register(cls,
                 company_id: CompanyId,
                 name: str,
                 company_type: CompanyType,
                 industry: IndustryType,
                 address: BusinessAddress,
                 primary_contact_email: Email,
                 created_by_user_id: str,
                 company_number: Optional[CompanyNumber] = None,
                 vat_number: Optional[VATNumber] = None) -> 'Company':
        """Factory method to register a new company"""
        
        company = cls(
            company_id=company_id,
            name=name,
            company_type=company_type,
            industry=industry,
            address=address,
            primary_contact_email=primary_contact_email,
            created_by_user_id=created_by_user_id,
            company_number=company_number,
            vat_number=vat_number
        )
        
        # Raise domain event
        event = CompanyRegistered.create(
            aggregate_id=company_id.value,
            event_type="CompanyRegistered",
            company_name=name,
            company_type=company_type.value,
            company_number=company_number.value if company_number else None,
            industry=industry.value,
            registered_by_user_id=created_by_user_id
        )
        company.add_domain_event(event)
        
        return company
    
    @classmethod
    def from_persistence(cls,
                        company_id: CompanyId,
                        name: str,
                        company_type: CompanyType,
                        industry: IndustryType,
                        address: BusinessAddress,
                        primary_contact_email: Email,
                        created_by_user_id: str,
                        company_number: Optional[CompanyNumber] = None,
                        vat_number: Optional[VATNumber] = None,
                        company_size: CompanySize = CompanySize.SMALL,
                        status: CompanyStatus = CompanyStatus.ACTIVE,
                        is_verified: bool = False,
                        verified_at: Optional[datetime] = None,
                        verification_data: Optional[Dict[str, Any]] = None,
                        is_vat_registered: bool = False,
                        compliance_requirements: List[str] = None,
                        subscription_tier: str = "starter",
                        max_team_members: int = 5,
                        max_contracts_per_month: int = 50,
                        monthly_contract_count: int = 0,
                        phone_number: Optional[str] = None,
                        website: Optional[str] = None,
                        last_activity_at: Optional[datetime] = None,
                        features_enabled: List[str] = None,
                        version: int = 1,
                        created_at: datetime = None,
                        updated_at: Optional[datetime] = None) -> 'Company':
        """
        Factory method to reconstruct company from persistence data
        This method bypasses normal domain rules to allow reconstruction
        """
        # Create company using regular constructor for basic validation
        company = cls(
            company_id=company_id,
            name=name,
            company_type=company_type,
            industry=industry,
            address=address,
            primary_contact_email=primary_contact_email,
            created_by_user_id=created_by_user_id,
            company_number=company_number,
            vat_number=vat_number,
            company_size=company_size
        )
        
        # Override state from persistence (this is acceptable for reconstruction)
        company._status = status
        company._is_verified = is_verified
        company._verified_at = verified_at
        company._verification_data = verification_data
        company._is_vat_registered = is_vat_registered
        company._compliance_requirements = compliance_requirements or []
        company._subscription_tier = subscription_tier
        company._max_team_members = max_team_members
        company._max_contracts_per_month = max_contracts_per_month
        company._monthly_contract_count = monthly_contract_count
        company._phone_number = phone_number
        company._website = website
        company._last_activity_at = last_activity_at
        company._features_enabled = features_enabled or ["contract_generation", "team_management"]
        company._version = version
        
        if created_at:
            company._created_at = created_at
        if updated_at:
            company._updated_at = updated_at
        
        # Clear domain events (they shouldn't be replayed from persistence)
        company.clear_domain_events()
        
        return company
    
    # Properties
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def company_type(self) -> CompanyType:
        return self._company_type
    
    @property
    def industry(self) -> IndustryType:
        return self._industry
    
    @property
    def address(self) -> BusinessAddress:
        return self._address
    
    @property
    def primary_contact_email(self) -> Email:
        return self._primary_contact_email
    
    @property
    def created_by_user_id(self) -> str:
        return self._created_by_user_id
    
    @property
    def company_number(self) -> Optional[CompanyNumber]:
        return self._company_number
    
    @property
    def vat_number(self) -> Optional[VATNumber]:
        return self._vat_number
    
    @property
    def company_size(self) -> CompanySize:
        return self._company_size
    
    @property
    def status(self) -> CompanyStatus:
        return self._status
    
    @property
    def is_verified(self) -> bool:
        return self._is_verified
    
    @property
    def verified_at(self) -> Optional[datetime]:
        return self._verified_at
    
    @property
    def is_vat_registered(self) -> bool:
        return self._is_vat_registered
    
    @property
    def compliance_requirements(self) -> List[str]:
        return self._compliance_requirements.copy()
    
    @property
    def subscription_tier(self) -> str:
        return self._subscription_tier
    
    @property
    def max_team_members(self) -> int:
        return self._max_team_members
    
    @property
    def max_contracts_per_month(self) -> int:
        return self._max_contracts_per_month
    
    @property
    def monthly_contract_count(self) -> int:
        return self._monthly_contract_count
    
    @property
    def phone_number(self) -> Optional[str]:
        return self._phone_number
    
    @property
    def website(self) -> Optional[str]:
        return self._website
    
    @property
    def features_enabled(self) -> List[str]:
        return self._features_enabled.copy()
    
    # Business operations
    def update_name(self, new_name: str, user_id: str):
        """Update company name"""
        self._validate_name(new_name)
        
        if self._name == new_name:
            return  # No change
        
        self._name = new_name
        self._increment_version()
        self._track_field_change("name", user_id)
    
    def update_address(self, new_address: BusinessAddress, user_id: str):
        """Update business address"""
        if self._address == new_address:
            return  # No change
        
        self._address = new_address
        self._increment_version()
        self._track_field_change("address", user_id)
    
    def update_contact_email(self, new_email: Email, user_id: str):
        """Update primary contact email"""
        if self._primary_contact_email == new_email:
            return  # No change
        
        self._primary_contact_email = new_email
        self._increment_version()
        self._track_field_change("primary_contact_email", user_id)
    
    def set_phone_number(self, phone_number: str, user_id: str):
        """Set company phone number"""
        self._phone_number = phone_number
        self._increment_version()
        self._track_field_change("phone_number", user_id)
    
    def set_website(self, website: str, user_id: str):
        """Set company website"""
        if website and not website.startswith(('http://', 'https://')):
            website = f"https://{website}"
        
        self._website = website
        self._increment_version()
        self._track_field_change("website", user_id)
    
    def register_vat_number(self, vat_number: VATNumber, user_id: str):
        """Register VAT number"""
        self._vat_number = vat_number
        self._is_vat_registered = True
        self._compliance_requirements = self._determine_compliance_requirements()
        self._increment_version()
        self._track_field_change("vat_number", user_id)
    
    def update_company_size(self, new_size: CompanySize, user_id: str):
        """Update company size classification"""
        if self._company_size == new_size:
            return
        
        self._company_size = new_size
        self._update_subscription_limits()
        self._increment_version()
        self._track_field_change("company_size", user_id)
    
    def verify_with_companies_house(self, 
                                   verification_data: Dict[str, Any], 
                                   user_id: str):
        """Mark company as verified via Companies House"""
        if not self._company_number:
            raise BusinessRuleViolationError("Cannot verify company without company number")
        
        self._is_verified = True
        self._verified_at = datetime.now(timezone.utc)
        self._verification_data = verification_data
        
        # Update name if different from Companies House
        official_name = verification_data.get('name')
        if official_name and official_name != self._name:
            self._name = official_name
        
        self._increment_version()
        
        # Raise domain event
        event = CompanyVerified.create(
            aggregate_id=self.id.value,
            event_type="CompanyVerified",
            company_number=self._company_number.value,
            verification_status="verified",
            verified_name=self._name,
            verified_at=self._verified_at
        )
        self.add_domain_event(event)
    
    def upgrade_subscription(self, new_tier: str, user_id: str):
        """Upgrade subscription tier"""
        tier_limits = {
            "starter": {"team_members": 5, "contracts": 50},
            "professional": {"team_members": 20, "contracts": 200},
            "enterprise": {"team_members": 100, "contracts": 1000}
        }
        
        if new_tier not in tier_limits:
            raise BusinessRuleViolationError(f"Invalid subscription tier: {new_tier}")
        
        self._subscription_tier = new_tier
        limits = tier_limits[new_tier]
        self._max_team_members = limits["team_members"]
        self._max_contracts_per_month = limits["contracts"]
        
        # Enable additional features for higher tiers
        if new_tier == "professional":
            self._features_enabled.extend(["advanced_analytics", "api_access"])
        elif new_tier == "enterprise":
            self._features_enabled.extend([
                "advanced_analytics", "api_access", "custom_integrations", 
                "dedicated_support", "compliance_automation"
            ])
        
        self._increment_version()
        self._track_field_change("subscription_tier", user_id)
    
    def increment_monthly_contracts(self):
        """Increment monthly contract count"""
        if self._monthly_contract_count >= self._max_contracts_per_month:
            raise BusinessRuleViolationError(
                f"Monthly contract limit reached: {self._max_contracts_per_month}"
            )
        
        self._monthly_contract_count += 1
        self._increment_version()
    
    def reset_monthly_contract_count(self):
        """Reset monthly contract count (called monthly)"""
        self._monthly_contract_count = 0
        self._increment_version()
    
    def update_last_activity(self):
        """Update last activity timestamp"""
        self._last_activity_at = datetime.now(timezone.utc)
    
    def can_add_team_member(self) -> bool:
        """Check if can add more team members"""
        # Would need to check current team size from Team aggregate
        # For now, assume we can check against max
        return True  # Implementation depends on Team aggregate integration
    
    def requires_compliance_check(self) -> bool:
        """Check if company requires compliance monitoring"""
        return len(self._compliance_requirements) > 0
    
    def is_sme_eligible(self) -> bool:
        """Check if qualifies as Small/Medium Enterprise"""
        return self._company_size in [CompanySize.MICRO, CompanySize.SMALL, CompanySize.MEDIUM]
    
    def get_applicable_regulations(self) -> List[str]:
        """Get list of applicable UK regulations"""
        regulations = ["GDPR", "Data Protection Act 2018"]
        
        if self._is_vat_registered:
            regulations.append("VAT Regulations")
        
        if self._company_size != CompanySize.MICRO:
            regulations.append("Companies House Filing Requirements")
        
        # Industry-specific regulations
        if self._industry == IndustryType.FINANCE:
            regulations.extend(["FCA Regulations", "Money Laundering Regulations"])
        elif self._industry == IndustryType.HEALTHCARE:
            regulations.append("Care Quality Commission Standards")
        elif self._industry == IndustryType.EDUCATION:
            regulations.append("Ofsted Requirements")
        
        return regulations
    
    # Private methods
    def _validate_name(self, name: str):
        """Validate company name"""
        if not name or not name.strip():
            raise DomainValidationError("Company name cannot be empty", "name", name)
        
        if len(name.strip()) < 2:
            raise DomainValidationError("Company name too short", "name", name)
        
        if len(name.strip()) > 160:  # Companies House limit
            raise DomainValidationError("Company name too long", "name", name)
    
    def _validate_user_id(self, user_id: str):
        """Validate user ID"""
        if not user_id or not user_id.strip():
            raise DomainValidationError("User ID cannot be empty", "created_by_user_id", user_id)
    
    def _determine_compliance_requirements(self) -> List[str]:
        """Determine compliance requirements based on company attributes"""
        requirements = ["gdpr", "data_protection"]
        
        if self._is_vat_registered:
            requirements.append("vat_compliance")
        
        if self._company_type in [CompanyType.PRIVATE_LIMITED, CompanyType.PUBLIC_LIMITED]:
            requirements.append("companies_house_filing")
        
        if self._company_size != CompanySize.MICRO:
            requirements.append("employment_law")
        
        return requirements
    
    def _update_subscription_limits(self):
        """Update subscription limits based on company size"""
        if self._company_size == CompanySize.LARGE:
            # Large companies automatically get enterprise features
            self._subscription_tier = "enterprise"
            self._max_team_members = 100
            self._max_contracts_per_month = 1000
    
    def _track_field_change(self, field_name: str, user_id: str):
        """Track field changes for audit"""
        event = CompanyDetailsUpdated.create(
            aggregate_id=self.id.value,
            event_type="CompanyDetailsUpdated",
            updated_by_user_id=user_id,
            changed_fields=[field_name]
        )
        self.add_domain_event(event)