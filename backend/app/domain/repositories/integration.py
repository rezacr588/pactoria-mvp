"""
Integration repository interface following DDD patterns
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from app.domain.entities.integration import Integration, IntegrationCategory, IntegrationStatus


class IntegrationRepository(ABC):
    """Repository interface for Integration aggregate"""
    
    @abstractmethod
    async def get_by_id(self, integration_id: str) -> Optional[Integration]:
        """Get integration by ID"""
        pass
        
    @abstractmethod
    async def get_all(self) -> List[Integration]:
        """Get all available integrations"""
        pass
        
    @abstractmethod
    async def get_by_company(self, company_id: str) -> List[Integration]:
        """Get integrations for a company (connected ones)"""
        pass
        
    @abstractmethod
    async def get_filtered(
        self,
        category: Optional[IntegrationCategory] = None,
        status: Optional[IntegrationStatus] = None,
        price_tier: Optional[str] = None,
        popular_only: Optional[bool] = None,
        search: Optional[str] = None,
        company_id: Optional[str] = None
    ) -> List[Integration]:
        """Get integrations with filters"""
        pass
        
    @abstractmethod
    async def save(self, integration: Integration) -> None:
        """Save or update integration"""
        pass
        
    @abstractmethod
    async def delete(self, integration_id: str) -> None:
        """Delete integration"""
        pass
        
    @abstractmethod
    async def get_categories_stats(self) -> Dict[str, int]:
        """Get integration counts by category"""
        pass
        
    @abstractmethod
    async def get_status_stats(self) -> Dict[str, int]:
        """Get integration counts by status"""
        pass
        
    @abstractmethod
    async def get_popular_integrations(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get most popular integrations with stats"""
        pass