"""
Team Repository Interface
Defines the contract for team data access following DDD repository pattern
"""

from abc import ABC, abstractmethod
from typing import Optional, List
from app.domain.entities.team import Team, TeamMember, TeamInvitation


class TeamRepository(ABC):
    """Repository interface for team aggregate"""

    @abstractmethod
    async def get_by_company_id(self, company_id: str) -> Optional[Team]:
        """Get team by company ID"""
        pass

    @abstractmethod
    async def save(self, team: Team) -> Team:
        """Save team aggregate"""
        pass

    @abstractmethod
    async def delete(self, company_id: str) -> None:
        """Delete team by company ID"""
        pass

    @abstractmethod
    async def get_member_by_id(
        self, company_id: str, member_id: str
    ) -> Optional[TeamMember]:
        """Get team member by ID within a company"""
        pass

    @abstractmethod
    async def get_invitation_by_id(
        self, invitation_id: str
    ) -> Optional[TeamInvitation]:
        """Get invitation by ID"""
        pass

    @abstractmethod
    async def get_invitation_by_token(self, token: str) -> Optional[TeamInvitation]:
        """Get invitation by token"""
        pass

    @abstractmethod
    async def find_expired_invitations(
        self, company_id: Optional[str] = None
    ) -> List[TeamInvitation]:
        """Find expired invitations for processing"""
        pass
