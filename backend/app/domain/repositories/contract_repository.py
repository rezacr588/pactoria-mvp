"""
Contract Repository Interface
Following DDD Repository pattern with proper abstraction
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from dataclasses import dataclass
from datetime import datetime

from app.domain.entities.contract import Contract, ContractId
from app.domain.value_objects import ContractStatus, ContractType
from app.domain.exceptions import ContractNotFoundError


@dataclass
class ContractFilter:
    """Filter criteria for contract queries"""
    company_id: Optional[str] = None
    contract_type: Optional[ContractType] = None
    status: Optional[ContractStatus] = None
    created_by_user_id: Optional[str] = None
    client_name: Optional[str] = None
    supplier_name: Optional[str] = None
    title_contains: Optional[str] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    
    def has_criteria(self) -> bool:
        """Check if filter has any criteria set"""
        return any([
            self.company_id,
            self.contract_type,
            self.status,
            self.created_by_user_id,
            self.client_name,
            self.supplier_name,
            self.title_contains,
            self.created_after,
            self.created_before,
            self.min_value,
            self.max_value
        ])
    
    def to_dict(self) -> dict:
        """Convert filter to dictionary (excluding None values)"""
        return {
            k: v for k, v in {
                "company_id": self.company_id,
                "contract_type": self.contract_type,
                "status": self.status,
                "created_by_user_id": self.created_by_user_id,
                "client_name": self.client_name,
                "supplier_name": self.supplier_name,
                "title_contains": self.title_contains,
                "created_after": self.created_after,
                "created_before": self.created_before,
                "min_value": self.min_value,
                "max_value": self.max_value
            }.items() if v is not None
        }
    
    def __eq__(self, other):
        """Compare filters for equality"""
        if not isinstance(other, ContractFilter):
            return False
        return (
            self.company_id == other.company_id and
            self.contract_type == other.contract_type and
            self.status == other.status and
            self.created_by_user_id == other.created_by_user_id and
            self.client_name == other.client_name and
            self.supplier_name == other.supplier_name and
            self.title_contains == other.title_contains and
            self.created_after == other.created_after and
            self.created_before == other.created_before and
            self.min_value == other.min_value and
            self.max_value == other.max_value
        )


@dataclass
class PageRequest:
    """Pagination request parameters"""
    page: int = 1
    size: int = 20
    
    def __post_init__(self):
        if self.page < 1:
            raise ValueError("Page number must be positive")
        if self.size < 1 or self.size > 100:
            raise ValueError("Page size must be between 1 and 100")
    
    @property
    def offset(self) -> int:
        """Calculate offset for database query"""
        return (self.page - 1) * self.size


@dataclass
class PageResult:
    """Paginated result container"""
    items: List[Contract]
    total_items: int
    page: int
    size: int
    
    @property
    def total_pages(self) -> int:
        """Calculate total number of pages"""
        return (self.total_items + self.size - 1) // self.size
    
    @property
    def has_next(self) -> bool:
        """Check if there are more pages"""
        return self.page < self.total_pages
    
    @property
    def has_previous(self) -> bool:
        """Check if there are previous pages"""
        return self.page > 1


class ContractRepository(ABC):
    """
    Contract Repository interface following DDD patterns
    Defines contract for contract persistence operations
    """
    
    @abstractmethod
    async def save(self, contract: Contract) -> Contract:
        """
        Save contract to repository
        
        Args:
            contract: Contract entity to save
            
        Returns:
            Contract: The saved contract
            
        Raises:
            ConcurrencyError: If optimistic locking detects concurrent modification
        """
        pass
    
    @abstractmethod
    async def find_by_id(self, contract_id: ContractId) -> Optional[Contract]:
        """
        Find contract by ID
        
        Args:
            contract_id: Contract identifier
            
        Returns:
            Optional[Contract]: Contract if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def get_by_id(self, contract_id: ContractId) -> Contract:
        """
        Get contract by ID, raising exception if not found
        
        Args:
            contract_id: Contract identifier
            
        Returns:
            Contract: The contract
            
        Raises:
            ContractNotFoundError: If contract not found
        """
        pass
    
    @abstractmethod
    async def find_by_company(self, company_id: str, page_request: Optional[PageRequest] = None) -> PageResult:
        """
        Find contracts by company ID with pagination
        
        Args:
            company_id: Company identifier
            page_request: Pagination parameters
            
        Returns:
            PageResult: Paginated contracts
        """
        pass
    
    @abstractmethod
    async def find_with_filter(self, contract_filter: ContractFilter, 
                              page_request: Optional[PageRequest] = None) -> PageResult:
        """
        Find contracts matching filter criteria
        
        Args:
            contract_filter: Filter criteria
            page_request: Pagination parameters
            
        Returns:
            PageResult: Paginated filtered contracts
        """
        pass
    
    @abstractmethod
    async def count_by_company(self, company_id: str) -> int:
        """
        Count contracts for a company
        
        Args:
            company_id: Company identifier
            
        Returns:
            int: Number of contracts
        """
        pass
    
    @abstractmethod
    async def count_with_filter(self, contract_filter: ContractFilter) -> int:
        """
        Count contracts matching filter criteria
        
        Args:
            contract_filter: Filter criteria
            
        Returns:
            int: Number of matching contracts
        """
        pass
    
    @abstractmethod
    async def exists(self, contract_id: ContractId) -> bool:
        """
        Check if contract exists
        
        Args:
            contract_id: Contract identifier
            
        Returns:
            bool: True if contract exists
        """
        pass
    
    @abstractmethod
    async def delete(self, contract_id: ContractId) -> None:
        """
        Delete contract from repository
        
        Args:
            contract_id: Contract identifier
            
        Raises:
            ContractNotFoundError: If contract not found
        """
        pass
    
    @abstractmethod
    async def find_expiring_contracts(self, days_ahead: int = 30) -> List[Contract]:
        """
        Find contracts expiring within specified days
        
        Args:
            days_ahead: Number of days to look ahead
            
        Returns:
            List[Contract]: Contracts expiring soon
        """
        pass
    
    @abstractmethod
    async def find_contracts_requiring_compliance_review(self, company_id: str) -> List[Contract]:
        """
        Find contracts that require compliance review
        
        Args:
            company_id: Company identifier
            
        Returns:
            List[Contract]: Contracts needing review
        """
        pass