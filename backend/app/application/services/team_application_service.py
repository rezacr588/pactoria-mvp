"""
Team Application Service
Orchestrates team management operations following DDD patterns
"""
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.domain.entities.team import (
    Team, TeamMember, TeamInvitation, TeamMemberId, InvitationId,
    UserRole, InvitationStatus
)
from app.domain.value_objects import Email
from app.domain.exceptions import (
    BusinessRuleViolationError, DomainValidationError, TeamManagementError,
    ResourceNotFoundError, PermissionDeniedError
)
from app.domain.repositories.team_repository import TeamRepository
from app.infrastructure.services.email_service import EmailService


@dataclass
class InviteTeamMemberCommand:
    """Command to invite a new team member"""
    company_id: str
    full_name: str
    email: str
    role: str
    invited_by_user_id: str
    department: Optional[str] = None
    send_email: bool = True


@dataclass
class ChangeMemberRoleCommand:
    """Command to change a team member's role"""
    company_id: str
    member_id: str
    new_role: str
    changed_by_user_id: str


@dataclass
class RemoveTeamMemberCommand:
    """Command to remove a team member"""
    company_id: str
    member_id: str
    removed_by_user_id: str


@dataclass
class ResendInvitationCommand:
    """Command to resend an invitation"""
    company_id: str
    invitation_id: str
    resent_by_user_id: str
    send_email: bool = True


@dataclass
class TeamMemberDto:
    """Data transfer object for team members"""
    id: str
    full_name: str
    email: str
    role: str
    department: Optional[str]
    is_active: bool
    joined_at: datetime
    last_active: Optional[datetime]
    avatar_url: Optional[str] = None
    invitation_status: Optional[str] = None
    invited_by: Optional[str] = None
    invited_at: Optional[datetime] = None


@dataclass
class InvitationDto:
    """Data transfer object for invitations"""
    id: str
    full_name: str
    email: str
    role: str
    department: Optional[str]
    status: str
    invited_by_user_id: str
    invited_at: datetime
    expires_at: datetime
    email_sent: bool
    email_sent_at: Optional[datetime]


@dataclass
class TeamStatsDto:
    """Data transfer object for team statistics"""
    total_members: int
    active_members: int
    pending_invitations: int
    members_by_role: Dict[str, int]
    members_by_department: Dict[str, int]
    recent_activity: List[Dict[str, Any]]


class TeamApplicationService:
    """
    Application service for team management operations
    Orchestrates domain operations and coordinates with infrastructure services
    """
    
    def __init__(self, 
                 team_repository: TeamRepository,
                 email_service: Optional[EmailService] = None,
                 event_publisher: Optional[Any] = None):
        self._team_repository = team_repository
        self._email_service = email_service
        self._event_publisher = event_publisher
    
    async def invite_team_member(self, command: InviteTeamMemberCommand) -> InvitationDto:
        """Invite a new team member to the company"""
        
        # Load team aggregate
        team = await self._team_repository.get_by_company_id(command.company_id)
        if not team:
            raise ResourceNotFoundError("Team", command.company_id)
        
        # Validate role
        try:
            role = UserRole(command.role)
        except ValueError:
            raise DomainValidationError(f"Invalid role: {command.role}")
        
        # Validate email
        try:
            email = Email(command.email)
        except ValueError:
            raise DomainValidationError(f"Invalid email address: {command.email}")
        
        # Invite member through team aggregate (business rules enforced here)
        invitation = team.invite_member(
            email=email,
            full_name=command.full_name,
            role=role,
            invited_by_user_id=command.invited_by_user_id,
            department=command.department,
            send_email=command.send_email
        )
        
        # Save team with new invitation
        await self._team_repository.save(team)
        
        # Send email if requested
        if command.send_email and self._email_service:
            await self._email_service.send_invitation_email(
                email.value,
                command.full_name,
                invitation.invitation_token,
                command.company_id
            )
            invitation.mark_email_sent()
            await self._team_repository.save(team)
        
        # Publish domain events
        if self._event_publisher:
            await self._publish_domain_events(team)
        
        return self._map_invitation_to_dto(invitation)
    
    async def change_member_role(self, command: ChangeMemberRoleCommand) -> TeamMemberDto:
        """Change a team member's role"""
        
        # Load team aggregate
        team = await self._team_repository.get_by_company_id(command.company_id)
        if not team:
            raise ResourceNotFoundError("Team", command.company_id)
        
        # Validate new role
        try:
            new_role = UserRole(command.new_role)
        except ValueError:
            raise DomainValidationError(f"Invalid role: {command.new_role}")
        
        # Change role through team aggregate (business rules enforced here)
        team.change_member_role(
            member_id=command.member_id,
            new_role=new_role,
            changed_by_user_id=command.changed_by_user_id
        )
        
        # Save team
        await self._team_repository.save(team)
        
        # Publish domain events
        if self._event_publisher:
            await self._publish_domain_events(team)
        
        # Find and return updated member
        updated_member = next(
            (member for member in team.members if member.id.value == command.member_id),
            None
        )
        
        if not updated_member:
            raise ResourceNotFoundError("TeamMember", command.member_id)
        
        return self._map_member_to_dto(updated_member)
    
    async def remove_team_member(self, command: RemoveTeamMemberCommand) -> Dict[str, Any]:
        """Remove a team member"""
        
        # Load team aggregate
        team = await self._team_repository.get_by_company_id(command.company_id)
        if not team:
            raise ResourceNotFoundError("Team", command.company_id)
        
        # Get member details before removal
        member_to_remove = next(
            (member for member in team.members if member.id.value == command.member_id),
            None
        )
        
        if not member_to_remove:
            raise ResourceNotFoundError("TeamMember", command.member_id)
        
        # Remove member through team aggregate (business rules enforced here)
        team.remove_member(
            member_id=command.member_id,
            removed_by_user_id=command.removed_by_user_id
        )
        
        # Save team
        await self._team_repository.save(team)
        
        # Publish domain events
        if self._event_publisher:
            await self._publish_domain_events(team)
        
        return {
            "message": "Team member removed successfully",
            "member_id": command.member_id,
            "removed_by": command.removed_by_user_id,
            "removed_at": datetime.now().isoformat()
        }
    
    async def resend_invitation(self, command: ResendInvitationCommand) -> Dict[str, Any]:
        """Resend an invitation"""
        
        # Load team aggregate
        team = await self._team_repository.get_by_company_id(command.company_id)
        if not team:
            raise ResourceNotFoundError("Team", command.company_id)
        
        # Find invitation
        invitation = next(
            (inv for inv in team.pending_invitations if inv.id.value == command.invitation_id),
            None
        )
        
        if not invitation:
            raise ResourceNotFoundError("TeamInvitation", command.invitation_id)
        
        # Resend invitation
        new_token = invitation.resend_invitation()
        
        # Send email if requested
        if command.send_email and self._email_service:
            await self._email_service.send_invitation_email(
                invitation.email.value,
                invitation.full_name,
                new_token,
                command.company_id
            )
            invitation.mark_email_sent()
        
        # Save team
        await self._team_repository.save(team)
        
        return {
            "message": "Invitation resent successfully",
            "invitation_id": command.invitation_id,
            "email_sent": command.send_email,
            "resent_by": command.resent_by_user_id,
            "resent_at": datetime.now().isoformat(),
            "expires_at": invitation.expires_at.isoformat()
        }
    
    async def get_team_members(self, 
                              company_id: str,
                              include_inactive: bool = False,
                              role_filter: Optional[str] = None,
                              department_filter: Optional[str] = None) -> List[TeamMemberDto]:
        """Get team members for a company"""
        
        team = await self._team_repository.get_by_company_id(company_id)
        if not team:
            return []
        
        # Get members based on filters
        if include_inactive:
            members = team.members
        else:
            members = team.active_members
        
        # Apply role filter
        if role_filter:
            try:
                role_enum = UserRole(role_filter)
                members = [m for m in members if m.role == role_enum]
            except ValueError:
                raise DomainValidationError(f"Invalid role filter: {role_filter}")
        
        # Apply department filter
        if department_filter:
            members = [m for m in members if m.department == department_filter]
        
        result = [self._map_member_to_dto(member) for member in members]
        
        # Add pending invitations if including inactive
        if include_inactive:
            invitations = team.pending_invitations
            
            # Apply filters to invitations too
            if role_filter:
                try:
                    role_enum = UserRole(role_filter)
                    invitations = [inv for inv in invitations if inv.role == role_enum]
                except ValueError:
                    pass
            
            if department_filter:
                invitations = [inv for inv in invitations if inv.department == department_filter]
            
            # Convert invitations to member DTOs
            for invitation in invitations:
                result.append(self._map_invitation_to_member_dto(invitation))
        
        return result
    
    async def get_team_member(self, company_id: str, member_id: str) -> TeamMemberDto:
        """Get a specific team member"""
        
        team = await self._team_repository.get_by_company_id(company_id)
        if not team:
            raise ResourceNotFoundError("Team", company_id)
        
        # Check if it's a pending invitation
        if member_id.startswith("pending_"):
            invitation_id = member_id.replace("pending_", "")
            invitation = next(
                (inv for inv in team.pending_invitations if inv.id.value == invitation_id),
                None
            )
            if invitation:
                return self._map_invitation_to_member_dto(invitation)
        
        # Look for regular member
        member = next(
            (member for member in team.members if member.id.value == member_id),
            None
        )
        
        if not member:
            raise ResourceNotFoundError("TeamMember", member_id)
        
        return self._map_member_to_dto(member)
    
    async def get_team_statistics(self, company_id: str) -> TeamStatsDto:
        """Get team statistics for a company"""
        
        team = await self._team_repository.get_by_company_id(company_id)
        if not team:
            return TeamStatsDto(
                total_members=0,
                active_members=0,
                pending_invitations=0,
                members_by_role={},
                members_by_department={},
                recent_activity=[]
            )
        
        stats = team.get_team_statistics()
        
        # Add recent activity (this could be enhanced with actual activity tracking)
        recent_activity = []
        
        # Add recent members
        recent_members = sorted(team.active_members, key=lambda m: m.created_at, reverse=True)[:5]
        for member in recent_members:
            recent_activity.append({
                "type": "member_joined",
                "member_name": member.full_name,
                "date": member.created_at.isoformat()
            })
        
        # Add recent invitations
        recent_invitations = sorted(team.pending_invitations, key=lambda i: i.created_at, reverse=True)[:5]
        for invitation in recent_invitations:
            recent_activity.append({
                "type": "invitation_sent",
                "member_name": invitation.full_name,
                "date": invitation.created_at.isoformat()
            })
        
        # Sort by date (most recent first)
        recent_activity.sort(key=lambda x: x["date"], reverse=True)
        recent_activity = recent_activity[:10]  # Keep only top 10
        
        return TeamStatsDto(
            total_members=stats["total_members"],
            active_members=stats["active_members"],
            pending_invitations=stats["pending_invitations"],
            members_by_role=stats["members_by_role"],
            members_by_department=stats["members_by_department"],
            recent_activity=recent_activity
        )
    
    async def process_expired_invitations(self, company_id: str) -> List[InvitationDto]:
        """Process and expire old invitations"""
        
        team = await self._team_repository.get_by_company_id(company_id)
        if not team:
            return []
        
        expired_invitations = team.expire_old_invitations()
        
        if expired_invitations:
            await self._team_repository.save(team)
            
            # Publish domain events
            if self._event_publisher:
                await self._publish_domain_events(team)
        
        return [self._map_invitation_to_dto(inv) for inv in expired_invitations]
    
    def _map_member_to_dto(self, member: TeamMember) -> TeamMemberDto:
        """Map team member entity to DTO"""
        return TeamMemberDto(
            id=member.id.value,
            full_name=member.full_name,
            email=member.email.value,
            role=member.role.value,
            department=member.department,
            is_active=member.is_active,
            joined_at=member.created_at,
            last_active=member.last_active_at or member.created_at,
            avatar_url=self._generate_avatar_url(member.full_name)
        )
    
    def _map_invitation_to_dto(self, invitation: TeamInvitation) -> InvitationDto:
        """Map invitation entity to DTO"""
        return InvitationDto(
            id=invitation.id.value,
            full_name=invitation.full_name,
            email=invitation.email.value,
            role=invitation.role.value,
            department=invitation.department,
            status=invitation.status.value,
            invited_by_user_id=invitation.invited_by_user_id,
            invited_at=invitation.created_at,
            expires_at=invitation.expires_at,
            email_sent=invitation.email_sent,
            email_sent_at=invitation.email_sent_at
        )
    
    def _map_invitation_to_member_dto(self, invitation: TeamInvitation) -> TeamMemberDto:
        """Map invitation entity to member DTO (for pending invitations)"""
        return TeamMemberDto(
            id=f"pending_{invitation.id.value}",
            full_name=invitation.full_name,
            email=invitation.email.value,
            role=invitation.role.value,
            department=invitation.department,
            is_active=False,
            joined_at=invitation.created_at,
            last_active=invitation.created_at,
            avatar_url=self._generate_avatar_url(invitation.full_name),
            invitation_status=invitation.status.value,
            invited_by=invitation.invited_by_user_id,
            invited_at=invitation.created_at
        )
    
    def _generate_avatar_url(self, name: str) -> str:
        """Generate an avatar URL for a user"""
        return f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=3b82f6&color=fff"
    
    async def _publish_domain_events(self, team: Team) -> None:
        """Publish domain events from the team"""
        if self._event_publisher and team.has_domain_events():
            for event in team.get_domain_events():
                await self._event_publisher.publish(event)
            team.clear_domain_events()