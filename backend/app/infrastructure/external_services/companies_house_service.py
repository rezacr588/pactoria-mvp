"""
Companies House API Integration Service
Provides integration with UK Companies House REST API for business verification
Supports company lookup, verification, and ongoing monitoring
"""
import aiohttp
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
from enum import Enum

from app.core.config import settings


class CompanyHouseCompanyStatus(str, Enum):
    """Companies House company status values"""
    ACTIVE = "active"
    DISSOLVED = "dissolved"
    LIQUIDATION = "liquidation"
    RECEIVERSHIP = "receivership"
    ADMINISTRATION = "administration"
    VOLUNTARY_ARRANGEMENT = "voluntary-arrangement"
    CONVERTED_CLOSED = "converted-closed"
    INSOLVENCY_PROCEEDINGS = "insolvency-proceedings"


class CompanyHouseCompanyType(str, Enum):
    """Companies House company type values"""
    PRIVATE_LIMITED_COMPANY = "ltd"
    PRIVATE_LIMITED_GUARANT_NSC_LIMITED_EXEMPTION = "private-limited-guarant-nsc-limited-exemption"
    PRIVATE_LIMITED_GUARANT_NSC = "private-limited-guarant-nsc"
    PRIVATE_LIMITED_SHARES_SECTION_30_EXEMPTION = "private-limited-shares-section-30-exemption"
    PUBLIC_LIMITED_COMPANY = "plc"
    PRIVATE_UNLIMITED_NSC = "private-unlimited-nsc"
    PRIVATE_UNLIMITED = "private-unlimited"
    LIMITED_PARTNERSHIP = "limited-partnership"
    LIMITED_LIABILITY_PARTNERSHIP = "llp"
    COMMUNITY_INTEREST_COMPANY = "community-interest-company"
    CHARITABLE_INCORPORATED_ORGANISATION = "charitable-incorporated-organisation"


@dataclass
class CompanyHouseAddress:
    """Companies House address data"""
    address_line_1: Optional[str]
    address_line_2: Optional[str]
    locality: Optional[str]  # City
    region: Optional[str]    # County/State
    postal_code: Optional[str]
    country: Optional[str]

    def to_uk_address(self) -> Dict[str, str]:
        """Convert to UK address format"""
        return {
            "line1": self.address_line_1 or "",
            "line2": self.address_line_2 or "",
            "city": self.locality or "",
            "county": self.region or "",
            "postcode": self.postal_code or "",
            "country": self.country or "United Kingdom"
        }


@dataclass
class CompanyHouseOfficer:
    """Companies House officer data"""
    name: str
    officer_role: str
    appointed_on: Optional[datetime]
    date_of_birth: Optional[Dict[str, int]]  # month, year
    address: Optional[CompanyHouseAddress]


@dataclass
class CompanyHouseData:
    """Companies House company data"""
    company_number: str
    company_name: str
    company_status: str
    company_type: str
    date_of_creation: Optional[datetime]
    date_of_cessation: Optional[datetime]
    registered_office_address: Optional[CompanyHouseAddress]
    sic_codes: List[str]  # Standard Industrial Classification
    officers: List[CompanyHouseOfficer]
    accounts: Optional[Dict[str, Any]]
    confirmation_statement: Optional[Dict[str, Any]]
    last_updated: datetime

    def is_active(self) -> bool:
        """Check if company is active"""
        return self.company_status == CompanyHouseCompanyStatus.ACTIVE

    def is_filing_compliant(self) -> bool:
        """Check if company is compliant with filing requirements"""
        if not self.accounts:
            return False
        
        # Check if accounts are overdue
        next_due = self.accounts.get('next_due')
        if next_due:
            try:
                next_due_date = datetime.fromisoformat(next_due.replace('Z', '+00:00'))
                return next_due_date >= datetime.now()
            except:
                pass
        
        return True

    def get_industry_codes(self) -> List[str]:
        """Get SIC codes for industry classification"""
        return self.sic_codes

    def get_registration_age_years(self) -> Optional[int]:
        """Get company age in years"""
        if self.date_of_creation:
            return (datetime.now() - self.date_of_creation).days // 365
        return None


class CompaniesHouseAPIError(Exception):
    """Companies House API specific errors"""
    
    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Optional[Dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data


class CompaniesHouseService:
    """
    Service for integrating with UK Companies House API
    Provides company verification and data retrieval functionality
    """
    
    BASE_URL = "https://api.company-information.service.gov.uk"
    
    def __init__(self, api_key: Optional[str] = None, timeout: int = 30):
        self.api_key = api_key or getattr(settings, 'COMPANIES_HOUSE_API_KEY', None)
        self.timeout = timeout
        self.logger = logging.getLogger(__name__)
        
        if not self.api_key:
            self.logger.warning("Companies House API key not configured")
    
    async def get_company_details(self, company_number: str) -> Optional[CompanyHouseData]:
        """
        Get detailed company information from Companies House
        
        Args:
            company_number: UK company number (e.g., "12345678")
            
        Returns:
            CompanyHouseData if found, None otherwise
            
        Raises:
            CompaniesHouseAPIError: If API error occurs
        """
        if not self.api_key:
            raise CompaniesHouseAPIError("Companies House API key not configured")
        
        # Clean company number
        clean_number = company_number.replace(" ", "").upper()
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout)) as session:
                # Get basic company data
                company_url = f"{self.BASE_URL}/company/{clean_number}"
                
                async with session.get(
                    company_url,
                    auth=aiohttp.BasicAuth(self.api_key, "")
                ) as response:
                    
                    if response.status == 404:
                        return None
                    
                    if response.status != 200:
                        error_data = await response.json() if response.content_type == "application/json" else {}
                        raise CompaniesHouseAPIError(
                            f"Companies House API error: {response.status}",
                            status_code=response.status,
                            response_data=error_data
                        )
                    
                    company_data = await response.json()
                
                # Get officers data (optional - may fail for some companies)
                officers = []
                try:
                    officers_url = f"{self.BASE_URL}/company/{clean_number}/officers"
                    async with session.get(
                        officers_url,
                        auth=aiohttp.BasicAuth(self.api_key, "")
                    ) as officers_response:
                        if officers_response.status == 200:
                            officers_data = await officers_response.json()
                            officers = self._parse_officers(officers_data.get('items', []))
                except Exception as e:
                    self.logger.warning(f"Failed to fetch officers for {clean_number}: {e}")
                
                # Parse and return data
                return self._parse_company_data(company_data, officers)
                
        except aiohttp.ClientError as e:
            raise CompaniesHouseAPIError(f"HTTP client error: {str(e)}")
        except asyncio.TimeoutError:
            raise CompaniesHouseAPIError("Request timeout")
        except Exception as e:
            self.logger.error(f"Unexpected error fetching company {clean_number}: {e}")
            raise CompaniesHouseAPIError(f"Unexpected error: {str(e)}")
    
    async def search_companies(self, query: str, items_per_page: int = 20) -> List[Dict[str, Any]]:
        """
        Search for companies by name or number
        
        Args:
            query: Search query (company name or number)
            items_per_page: Results per page (max 100)
            
        Returns:
            List of basic company information
            
        Raises:
            CompaniesHouseAPIError: If API error occurs
        """
        if not self.api_key:
            raise CompaniesHouseAPIError("Companies House API key not configured")
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout)) as session:
                search_url = f"{self.BASE_URL}/search/companies"
                params = {
                    "q": query,
                    "items_per_page": min(items_per_page, 100)
                }
                
                async with session.get(
                    search_url,
                    params=params,
                    auth=aiohttp.BasicAuth(self.api_key, "")
                ) as response:
                    
                    if response.status != 200:
                        error_data = await response.json() if response.content_type == "application/json" else {}
                        raise CompaniesHouseAPIError(
                            f"Companies House search API error: {response.status}",
                            status_code=response.status,
                            response_data=error_data
                        )
                    
                    search_results = await response.json()
                    return search_results.get('items', [])
                    
        except aiohttp.ClientError as e:
            raise CompaniesHouseAPIError(f"HTTP client error: {str(e)}")
        except asyncio.TimeoutError:
            raise CompaniesHouseAPIError("Search request timeout")
    
    async def validate_company_number(self, company_number: str) -> bool:
        """
        Validate if a company number exists at Companies House
        
        Args:
            company_number: Company number to validate
            
        Returns:
            True if company exists, False otherwise
        """
        try:
            company_data = await self.get_company_details(company_number)
            return company_data is not None
        except CompaniesHouseAPIError:
            return False
    
    async def get_company_filing_history(self, company_number: str, items_per_page: int = 25) -> List[Dict[str, Any]]:
        """
        Get company filing history
        
        Args:
            company_number: Company number
            items_per_page: Number of items per page
            
        Returns:
            List of filing records
        """
        if not self.api_key:
            raise CompaniesHouseAPIError("Companies House API key not configured")
        
        clean_number = company_number.replace(" ", "").upper()
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout)) as session:
                filing_url = f"{self.BASE_URL}/company/{clean_number}/filing-history"
                params = {"items_per_page": min(items_per_page, 100)}
                
                async with session.get(
                    filing_url,
                    params=params,
                    auth=aiohttp.BasicAuth(self.api_key, "")
                ) as response:
                    
                    if response.status == 404:
                        return []
                    
                    if response.status != 200:
                        error_data = await response.json() if response.content_type == "application/json" else {}
                        raise CompaniesHouseAPIError(
                            f"Filing history API error: {response.status}",
                            status_code=response.status,
                            response_data=error_data
                        )
                    
                    filing_data = await response.json()
                    return filing_data.get('items', [])
                    
        except aiohttp.ClientError as e:
            raise CompaniesHouseAPIError(f"HTTP client error: {str(e)}")
    
    def _parse_company_data(self, data: Dict[str, Any], officers: List[CompanyHouseOfficer]) -> CompanyHouseData:
        """Parse Companies House API response into domain object"""
        
        # Parse registered office address
        address_data = data.get('registered_office_address', {})
        registered_office = None
        if address_data:
            registered_office = CompanyHouseAddress(
                address_line_1=address_data.get('address_line_1'),
                address_line_2=address_data.get('address_line_2'),
                locality=address_data.get('locality'),
                region=address_data.get('region'),
                postal_code=address_data.get('postal_code'),
                country=address_data.get('country')
            )
        
        # Parse dates
        date_of_creation = None
        if data.get('date_of_creation'):
            try:
                date_of_creation = datetime.fromisoformat(data['date_of_creation'])
            except ValueError:
                pass
        
        date_of_cessation = None
        if data.get('date_of_cessation'):
            try:
                date_of_cessation = datetime.fromisoformat(data['date_of_cessation'])
            except ValueError:
                pass
        
        return CompanyHouseData(
            company_number=data['company_number'],
            company_name=data['company_name'],
            company_status=data.get('company_status', ''),
            company_type=data.get('type', ''),
            date_of_creation=date_of_creation,
            date_of_cessation=date_of_cessation,
            registered_office_address=registered_office,
            sic_codes=data.get('sic_codes', []),
            officers=officers,
            accounts=data.get('accounts'),
            confirmation_statement=data.get('confirmation_statement'),
            last_updated=datetime.now()
        )
    
    def _parse_officers(self, officers_data: List[Dict[str, Any]]) -> List[CompanyHouseOfficer]:
        """Parse officers data from API response"""
        officers = []
        
        for officer_data in officers_data:
            # Parse address if present
            address = None
            if officer_data.get('address'):
                addr_data = officer_data['address']
                address = CompanyHouseAddress(
                    address_line_1=addr_data.get('address_line_1'),
                    address_line_2=addr_data.get('address_line_2'),
                    locality=addr_data.get('locality'),
                    region=addr_data.get('region'),
                    postal_code=addr_data.get('postal_code'),
                    country=addr_data.get('country')
                )
            
            # Parse appointment date
            appointed_on = None
            if officer_data.get('appointed_on'):
                try:
                    appointed_on = datetime.fromisoformat(officer_data['appointed_on'])
                except ValueError:
                    pass
            
            officer = CompanyHouseOfficer(
                name=officer_data.get('name', ''),
                officer_role=officer_data.get('officer_role', ''),
                appointed_on=appointed_on,
                date_of_birth=officer_data.get('date_of_birth'),
                address=address
            )
            
            officers.append(officer)
        
        return officers
    
    def format_company_verification_data(self, ch_data: CompanyHouseData) -> Dict[str, Any]:
        """
        Format Companies House data for domain entity verification
        
        Args:
            ch_data: Companies House data
            
        Returns:
            Formatted verification data for domain entity
        """
        return {
            "name": ch_data.company_name,
            "company_number": ch_data.company_number,
            "company_status": ch_data.company_status,
            "company_type": ch_data.company_type,
            "date_of_creation": ch_data.date_of_creation.isoformat() if ch_data.date_of_creation else None,
            "registered_office_address": ch_data.registered_office_address.to_uk_address() if ch_data.registered_office_address else None,
            "sic_codes": ch_data.sic_codes,
            "is_active": ch_data.is_active(),
            "is_filing_compliant": ch_data.is_filing_compliant(),
            "registration_age_years": ch_data.get_registration_age_years(),
            "officers_count": len(ch_data.officers),
            "verification_source": "companies_house",
            "verified_at": datetime.now().isoformat(),
            "api_response_cached_until": (datetime.now() + timedelta(hours=24)).isoformat()
        }


# Utility functions
def is_valid_company_number_format(company_number: str) -> bool:
    """
    Validate UK company number format (basic check)
    
    Args:
        company_number: Company number to validate
        
    Returns:
        True if format appears valid
    """
    if not company_number:
        return False
    
    clean_number = company_number.replace(" ", "").upper()
    
    # Standard format: 2 optional letters + 6-8 digits
    # Examples: 12345678, SC123456, NI123456, OC123456
    import re
    pattern = r'^([A-Z]{0,2})(\d{6,8})$'
    return bool(re.match(pattern, clean_number))


def extract_company_number_from_url(url: str) -> Optional[str]:
    """
    Extract company number from Companies House URL
    
    Args:
        url: Companies House company URL
        
    Returns:
        Company number if found
    """
    import re
    
    # Match Companies House URLs
    patterns = [
        r'/company/([A-Z0-9]{6,10})',
        r'company-number=([A-Z0-9]{6,10})',
        r'companyNumber=([A-Z0-9]{6,10})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url, re.IGNORECASE)
        if match:
            return match.group(1).upper()
    
    return None