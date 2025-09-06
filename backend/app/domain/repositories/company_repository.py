"""
Company Repository Interface - Domain layer contract
Defines the contract for company persistence following Repository pattern
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

from app.domain.entities.company import (
    Company,
    CompanyId,
    CompanyNumber,
    IndustryType,
    CompanySize,
)


class CompanyRepository(ABC):
    """
    Company Repository Interface following DDD Repository pattern
    Defines contract for company persistence and querying
    """

    @abstractmethod
    async def save(self, company: Company) -> None:
        """
        Save company aggregate to persistence store

        Args:
            company: Company aggregate to save
        """
        pass

    @abstractmethod
    async def get_by_id(self, company_id: CompanyId) -> Optional[Company]:
        """
        Get company by its unique identifier

        Args:
            company_id: Company identifier

        Returns:
            Company aggregate if found, None otherwise
        """
        pass

    @abstractmethod
    async def get_by_company_number(
        self, company_number: CompanyNumber
    ) -> Optional[Company]:
        """
        Get company by UK Companies House number

        Args:
            company_number: UK company number

        Returns:
            Company aggregate if found, None otherwise
        """
        pass

    @abstractmethod
    async def get_by_name(self, name: str, exact_match: bool = False) -> List[Company]:
        """
        Search companies by name

        Args:
            name: Company name to search for
            exact_match: If True, perform exact match; otherwise fuzzy search

        Returns:
            List of matching companies
        """
        pass

    @abstractmethod
    async def get_by_user_id(self, user_id: str) -> List[Company]:
        """
        Get all companies created by a specific user

        Args:
            user_id: User identifier

        Returns:
            List of companies created by the user
        """
        pass

    @abstractmethod
    async def get_by_industry(self, industry: IndustryType) -> List[Company]:
        """
        Get companies in a specific industry

        Args:
            industry: Industry type

        Returns:
            List of companies in the industry
        """
        pass

    @abstractmethod
    async def get_by_size(self, company_size: CompanySize) -> List[Company]:
        """
        Get companies of a specific size

        Args:
            company_size: Company size classification

        Returns:
            List of companies of the specified size
        """
        pass

    @abstractmethod
    async def get_verified_companies(self) -> List[Company]:
        """
        Get all verified companies

        Returns:
            List of Companies House verified companies
        """
        pass

    @abstractmethod
    async def get_companies_requiring_compliance_check(self) -> List[Company]:
        """
        Get companies that require compliance monitoring

        Returns:
            List of companies requiring compliance checks
        """
        pass

    @abstractmethod
    async def get_active_companies(
        self, limit: Optional[int] = None, offset: Optional[int] = None
    ) -> List[Company]:
        """
        Get active companies with pagination

        Args:
            limit: Maximum number of companies to return
            offset: Number of companies to skip

        Returns:
            List of active companies
        """
        pass

    @abstractmethod
    async def get_companies_by_subscription_tier(self, tier: str) -> List[Company]:
        """
        Get companies by subscription tier

        Args:
            tier: Subscription tier (starter, professional, enterprise)

        Returns:
            List of companies with the specified subscription tier
        """
        pass

    @abstractmethod
    async def get_company_statistics(self) -> Dict[str, Any]:
        """
        Get overall company statistics

        Returns:
            Dictionary containing various statistics about companies
        """
        pass

    @abstractmethod
    async def search_companies(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[Company]:
        """
        Advanced company search with filters

        Args:
            query: Search query string
            filters: Additional filters (industry, size, verified, etc.)
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of matching companies
        """
        pass

    @abstractmethod
    async def exists_by_company_number(self, company_number: CompanyNumber) -> bool:
        """
        Check if company exists by company number

        Args:
            company_number: UK company number to check

        Returns:
            True if company exists, False otherwise
        """
        pass

    @abstractmethod
    async def delete(self, company_id: CompanyId) -> None:
        """
        Delete company from persistence store
        Note: Consider implementing soft delete for audit purposes

        Args:
            company_id: Company identifier to delete
        """
        pass

    @abstractmethod
    async def get_companies_with_expired_subscriptions(self) -> List[Company]:
        """
        Get companies with expired subscriptions for cleanup/notification

        Returns:
            List of companies with expired subscriptions
        """
        pass

    @abstractmethod
    async def get_companies_for_monthly_reset(self) -> List[Company]:
        """
        Get companies that need monthly contract count reset

        Returns:
            List of companies for monthly processing
        """
        pass
