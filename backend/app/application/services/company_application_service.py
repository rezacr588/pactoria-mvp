"""
Company Application Service
Orchestrates company-related business operations and use cases
Coordinates between domain entities and external services
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import uuid4

from app.domain.entities.company import (
    Company, CompanyId, CompanyNumber, VATNumber, BusinessAddress,
    CompanyType, IndustryType, CompanySize, CompanyStatus
)
from app.domain.repositories.company_repository import CompanyRepository
from app.domain.value_objects import Email
from app.domain.exceptions import (
    CompanyNotFoundError, BusinessRuleViolationError, DomainValidationError
)


class CompanyRegistrationRequest:
    """Data transfer object for company registration"""
    
    def __init__(self,
                 name: str,
                 company_type: str,
                 industry: str,
                 primary_contact_email: str,
                 address_line1: str,
                 city: str,
                 postcode: str,
                 created_by_user_id: str,
                 company_number: Optional[str] = None,
                 vat_number: Optional[str] = None,
                 address_line2: Optional[str] = None,
                 county: Optional[str] = None,
                 phone_number: Optional[str] = None,
                 website: Optional[str] = None):
        self.name = name
        self.company_type = company_type
        self.industry = industry
        self.primary_contact_email = primary_contact_email
        self.address_line1 = address_line1
        self.address_line2 = address_line2
        self.city = city
        self.county = county
        self.postcode = postcode
        self.created_by_user_id = created_by_user_id
        self.company_number = company_number
        self.vat_number = vat_number
        self.phone_number = phone_number
        self.website = website


class CompanyUpdateRequest:
    """Data transfer object for company updates"""
    
    def __init__(self,
                 company_id: str,
                 updated_by_user_id: str,
                 name: Optional[str] = None,
                 primary_contact_email: Optional[str] = None,
                 phone_number: Optional[str] = None,
                 website: Optional[str] = None,
                 address_line1: Optional[str] = None,
                 address_line2: Optional[str] = None,
                 city: Optional[str] = None,
                 county: Optional[str] = None,
                 postcode: Optional[str] = None,
                 vat_number: Optional[str] = None,
                 company_size: Optional[str] = None):
        self.company_id = company_id
        self.updated_by_user_id = updated_by_user_id
        self.name = name
        self.primary_contact_email = primary_contact_email
        self.phone_number = phone_number
        self.website = website
        self.address_line1 = address_line1
        self.address_line2 = address_line2
        self.city = city
        self.county = county
        self.postcode = postcode
        self.vat_number = vat_number
        self.company_size = company_size


class CompanyApplicationService:
    """
    Application Service for Company-related operations
    Orchestrates business workflows and coordinates with external services
    """
    
    def __init__(self, 
                 company_repository: CompanyRepository,
                 companies_house_service: Optional[Any] = None):
        self._company_repository = company_repository
        self._companies_house_service = companies_house_service
    
    async def register_company(self, request: CompanyRegistrationRequest) -> str:
        """
        Register a new company in the system
        
        Args:
            request: Company registration data
            
        Returns:
            Company ID of the newly registered company
            
        Raises:
            DomainValidationError: If validation fails
            BusinessRuleViolationError: If business rules are violated
        """
        # Generate unique company ID
        company_id = CompanyId(str(uuid4()))
        
        # Validate and create value objects
        try:
            company_type = CompanyType(request.company_type)
            industry = IndustryType(request.industry)
            primary_contact_email = Email(request.primary_contact_email)
            
            address = BusinessAddress(
                line1=request.address_line1,
                line2=request.address_line2,
                city=request.city,
                county=request.county,
                postcode=request.postcode
            )
            
            company_number = None
            if request.company_number:
                company_number = CompanyNumber(request.company_number)
                
                # Check if company number already exists
                if await self._company_repository.exists_by_company_number(company_number):
                    raise BusinessRuleViolationError("Company number already registered")
            
            vat_number = None
            if request.vat_number:
                vat_number = VATNumber(request.vat_number)
            
        except ValueError as e:
            raise DomainValidationError(f"Invalid input: {str(e)}")
        
        # Create company aggregate
        company = Company.register(
            company_id=company_id,
            name=request.name,
            company_type=company_type,
            industry=industry,
            address=address,
            primary_contact_email=primary_contact_email,
            created_by_user_id=request.created_by_user_id,
            company_number=company_number,
            vat_number=vat_number
        )
        
        # Set additional optional fields
        if request.phone_number:
            company.set_phone_number(request.phone_number, request.created_by_user_id)
        
        if request.website:
            company.set_website(request.website, request.created_by_user_id)
        
        # Save to repository
        await self._company_repository.save(company)
        
        # If Companies House integration is available, initiate verification
        if (self._companies_house_service and 
            company_number and 
            company_type in [CompanyType.PRIVATE_LIMITED, CompanyType.PUBLIC_LIMITED]):
            try:
                await self._initiate_companies_house_verification(company)
            except Exception:
                # Don't fail registration if verification fails
                pass
        
        return company_id.value
    
    async def get_company(self, company_id: str) -> Optional[Dict[str, Any]]:
        """
        Get company by ID
        
        Args:
            company_id: Company identifier
            
        Returns:
            Company data dictionary or None if not found
        """
        company = await self._company_repository.get_by_id(CompanyId(company_id))
        
        if not company:
            return None
        
        return self._company_to_dict(company)
    
    async def update_company(self, request: CompanyUpdateRequest) -> None:
        """
        Update company information
        
        Args:
            request: Update request with new values
            
        Raises:
            CompanyNotFoundError: If company doesn't exist
            DomainValidationError: If validation fails
        """
        company = await self._company_repository.get_by_id(CompanyId(request.company_id))
        
        if not company:
            raise CompanyNotFoundError(f"Company not found: {request.company_id}")
        
        # Update fields that were provided
        if request.name:
            company.update_name(request.name, request.updated_by_user_id)
        
        if request.primary_contact_email:
            try:
                email = Email(request.primary_contact_email)
                company.update_contact_email(email, request.updated_by_user_id)
            except ValueError as e:
                raise DomainValidationError(f"Invalid email: {str(e)}")
        
        if request.phone_number is not None:  # Allow empty string to clear
            company.set_phone_number(request.phone_number, request.updated_by_user_id)
        
        if request.website is not None:  # Allow empty string to clear
            company.set_website(request.website, request.updated_by_user_id)
        
        # Update address if any address fields provided
        address_fields = [
            request.address_line1, request.address_line2, request.city,
            request.county, request.postcode
        ]
        if any(field is not None for field in address_fields):
            try:
                new_address = BusinessAddress(
                    line1=request.address_line1 or company.address.line1,
                    line2=request.address_line2 or company.address.line2,
                    city=request.city or company.address.city,
                    county=request.county or company.address.county,
                    postcode=request.postcode or company.address.postcode
                )
                company.update_address(new_address, request.updated_by_user_id)
            except ValueError as e:
                raise DomainValidationError(f"Invalid address: {str(e)}")
        
        if request.vat_number:
            try:
                vat_number = VATNumber(request.vat_number)
                company.register_vat_number(vat_number, request.updated_by_user_id)
            except ValueError as e:
                raise DomainValidationError(f"Invalid VAT number: {str(e)}")
        
        if request.company_size:
            try:
                company_size = CompanySize(request.company_size)
                company.update_company_size(company_size, request.updated_by_user_id)
            except ValueError as e:
                raise DomainValidationError(f"Invalid company size: {str(e)}")
        
        # Save changes
        await self._company_repository.save(company)
    
    async def verify_company_with_companies_house(self, 
                                                 company_id: str, 
                                                 user_id: str) -> bool:
        """
        Manually trigger Companies House verification
        
        Args:
            company_id: Company to verify
            user_id: User requesting verification
            
        Returns:
            True if verification successful
            
        Raises:
            CompanyNotFoundError: If company doesn't exist
            BusinessRuleViolationError: If company can't be verified
        """
        company = await self._company_repository.get_by_id(CompanyId(company_id))
        
        if not company:
            raise CompanyNotFoundError(f"Company not found: {company_id}")
        
        if not company.company_number:
            raise BusinessRuleViolationError("Company number required for verification")
        
        if not self._companies_house_service:
            raise BusinessRuleViolationError("Companies House integration not available")
        
        try:
            # Get data from Companies House
            ch_data = await self._companies_house_service.get_company_details(
                company.company_number.value
            )
            
            if not ch_data:
                raise BusinessRuleViolationError("Company not found at Companies House")
            
            # Verify company with the retrieved data
            company.verify_with_companies_house(ch_data, user_id)
            
            # Save verification
            await self._company_repository.save(company)
            
            return True
            
        except Exception as e:
            raise BusinessRuleViolationError(f"Verification failed: {str(e)}")
    
    async def upgrade_subscription(self, 
                                  company_id: str, 
                                  new_tier: str, 
                                  user_id: str) -> None:
        """
        Upgrade company subscription tier
        
        Args:
            company_id: Company to upgrade
            new_tier: New subscription tier
            user_id: User requesting upgrade
        """
        company = await self._company_repository.get_by_id(CompanyId(company_id))
        
        if not company:
            raise CompanyNotFoundError(f"Company not found: {company_id}")
        
        company.upgrade_subscription(new_tier, user_id)
        await self._company_repository.save(company)
    
    async def search_companies(self, 
                              query: str, 
                              filters: Optional[Dict[str, Any]] = None,
                              limit: int = 20,
                              offset: int = 0) -> List[Dict[str, Any]]:
        """
        Search companies with filters
        
        Args:
            query: Search query
            filters: Optional filters (industry, size, verified, etc.)
            limit: Maximum results
            offset: Result offset
            
        Returns:
            List of company dictionaries
        """
        companies = await self._company_repository.search_companies(
            query=query,
            filters=filters,
            limit=limit,
            offset=offset
        )
        
        return [self._company_to_dict(company) for company in companies]
    
    async def get_companies_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all companies created by a user
        
        Args:
            user_id: User identifier
            
        Returns:
            List of company dictionaries
        """
        companies = await self._company_repository.get_by_user_id(user_id)
        return [self._company_to_dict(company) for company in companies]
    
    async def get_company_statistics(self) -> Dict[str, Any]:
        """
        Get overall company statistics
        
        Returns:
            Statistics dictionary
        """
        return await self._company_repository.get_company_statistics()
    
    async def get_companies_by_industry(self, industry: str) -> List[Dict[str, Any]]:
        """
        Get companies in a specific industry
        
        Args:
            industry: Industry type
            
        Returns:
            List of company dictionaries
        """
        try:
            industry_enum = IndustryType(industry)
            companies = await self._company_repository.get_by_industry(industry_enum)
            return [self._company_to_dict(company) for company in companies]
        except ValueError:
            raise DomainValidationError(f"Invalid industry: {industry}")
    
    async def reset_monthly_contract_counts(self) -> int:
        """
        Reset monthly contract counts for all companies (scheduled task)
        
        Returns:
            Number of companies processed
        """
        companies = await self._company_repository.get_companies_for_monthly_reset()
        
        for company in companies:
            company.reset_monthly_contract_count()
            await self._company_repository.save(company)
        
        return len(companies)
    
    async def process_compliance_monitoring(self) -> List[Dict[str, Any]]:
        """
        Process companies requiring compliance monitoring
        
        Returns:
            List of companies requiring attention
        """
        companies = await self._company_repository.get_companies_requiring_compliance_check()
        
        compliance_alerts = []
        for company in companies:
            if company.requires_compliance_check():
                compliance_alerts.append({
                    "company_id": company.id.value,
                    "company_name": company.name,
                    "compliance_requirements": company.compliance_requirements,
                    "applicable_regulations": company.get_applicable_regulations(),
                    "last_activity": company._last_activity_at
                })
        
        return compliance_alerts
    
    # Private helper methods
    async def _initiate_companies_house_verification(self, company: Company):
        """Initiate automatic Companies House verification"""
        if self._companies_house_service and company.company_number:
            ch_data = await self._companies_house_service.get_company_details(
                company.company_number.value
            )
            
            if ch_data:
                company.verify_with_companies_house(ch_data, "system")
                await self._company_repository.save(company)
    
    def _company_to_dict(self, company: Company) -> Dict[str, Any]:
        """Convert company domain entity to dictionary"""
        return {
            "id": company.id.value,
            "name": company.name,
            "company_type": company.company_type.value,
            "company_number": company.company_number.value if company.company_number else None,
            "vat_number": company.vat_number.value if company.vat_number else None,
            "industry": company.industry.value,
            "company_size": company.company_size.value,
            "status": company.status.value,
            "primary_contact_email": company.primary_contact_email.value,
            "phone_number": company.phone_number,
            "website": company.website,
            "address": {
                "line1": company.address.line1,
                "line2": company.address.line2,
                "city": company.address.city,
                "county": company.address.county,
                "postcode": company.address.postcode,
                "country": company.address.country,
                "formatted": company.address.formatted_address()
            },
            "subscription_tier": company.subscription_tier,
            "max_team_members": company.max_team_members,
            "max_contracts_per_month": company.max_contracts_per_month,
            "monthly_contract_count": company.monthly_contract_count,
            "is_verified": company.is_verified,
            "verified_at": company.verified_at.isoformat() if company.verified_at else None,
            "is_vat_registered": company.is_vat_registered,
            "compliance_requirements": company.compliance_requirements,
            "applicable_regulations": company.get_applicable_regulations(),
            "is_sme_eligible": company.is_sme_eligible(),
            "features_enabled": company.features_enabled,
            "created_by_user_id": company.created_by_user_id,
            "created_at": company.created_at.isoformat(),
            "updated_at": company.updated_at.isoformat() if company.updated_at else None,
            "version": company.version
        }