"""
Team Management Domain Entities
Core business logic for team and user management following DDD patterns
"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from enum import Enum

from app.domain.entities.base import AggregateRoot, DomainEvent, Entity
from app.domain.value_objects import Email
from app.domain.exceptions import (
    DomainValidationError, BusinessRuleViolationError, TeamManagementError
)


class UserRole(str, Enum):
    """User roles in the system"""
    ADMIN = "admin"
    CONTRACT_MANAGER = "contract_manager"
    LEGAL_REVIEWER = "legal_reviewer"
    VIEWER = "viewer"

    def can_invite_members(self) -> bool:
        """Check if this role can invite team members"""
        return self in [UserRole.ADMIN, UserRole.CONTRACT_MANAGER]

    def can_manage_roles(self) -> bool:
        """Check if this role can manage other user roles"""
        return self == UserRole.ADMIN

    def can_remove_members(self) -> bool:
        """Check if this role can remove team members"""
        return self == UserRole.ADMIN


class InvitationStatus(str, Enum):
    """Status of team invitations"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REVOKED = "revoked"

    def is_active(self) -> bool:
        """Check if invitation is in active state"""
        return self == InvitationStatus.PENDING


@dataclass(frozen=True)
class TeamMemberId:
    """Team member identifier value object"""
    value: str
    
    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise DomainValidationError("Team member ID cannot be empty")
    
    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class InvitationId:
    """Invitation identifier value object"""
    value: str
    
    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise DomainValidationError("Invitation ID cannot be empty")
    
    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class TeamMemberInvited(DomainEvent):
    """Domain event for team member invitation"""
    invitee_email: str
    invitee_name: str
    role: str
    invited_by_user_id: str
    company_id: str
    send_email: bool


@dataclass(frozen=True)
class TeamMemberRoleChanged(DomainEvent):
    """Domain event for role changes"""
    member_id: str
    old_role: str
    new_role: str
    changed_by_user_id: str


@dataclass(frozen=True)
class TeamMemberRemoved(DomainEvent):
    """Domain event for member removal"""
    member_id: str
    member_name: str
    removed_by_user_id: str


@dataclass(frozen=True)
class InvitationExpired(DomainEvent):
    """Domain event for invitation expiration"""
    invitation_id: str
    invitee_email: str


class TeamMember(Entity[TeamMemberId]):
    """
    Team Member Entity - represents a user within a company context
    Encapsulates team membership business rules and state
    """
    
    def __init__(self,
                 member_id: TeamMemberId,
                 full_name: str,
                 email: Email,
                 role: UserRole,
                 company_id: str,
                 is_active: bool = True,
                 department: Optional[str] = None):
        super().__init__(member_id)
        
        self._validate_full_name(full_name)
        self._validate_company_id(company_id)
        
        self._full_name = full_name
        self._email = email
        self._role = role
        self._company_id = company_id
        self._is_active = is_active
        self._department = department
        self._last_active_at: Optional[datetime] = None
    
    @property
    def full_name(self) -> str:
        return self._full_name
    
    @property
    def email(self) -> Email:
        return self._email
    
    @property
    def role(self) -> UserRole:
        return self._role
    
    @property
    def company_id(self) -> str:
        return self._company_id
    
    @property
    def is_active(self) -> bool:
        return self._is_active
    
    @property
    def department(self) -> Optional[str]:
        return self._department
    
    @property
    def last_active_at(self) -> Optional[datetime]:
        return self._last_active_at
    
    def change_role(self, new_role: UserRole, changed_by_user_id: str):
        """Change the member's role"""
        if self._role == new_role:
            return  # No change needed
        
        old_role = self._role
        self._role = new_role
        self._increment_version()
        
        # Would normally be handled by aggregate root
        # For now, we'll track the change
    
    def deactivate(self, deactivated_by_user_id: str):
        """Deactivate the team member"""
        if not self._is_active:
            return  # Already inactive
        
        self._is_active = False
        self._increment_version()
    
    def reactivate(self, activated_by_user_id: str):
        """Reactivate the team member"""
        if self._is_active:
            return  # Already active
        
        self._is_active = True
        self._increment_version()
    
    def update_last_activity(self):
        """Update last activity timestamp"""
        self._last_active_at = datetime.now(timezone.utc)
    
    def _validate_full_name(self, full_name: str):
        """Validate full name"""
        if not full_name or not full_name.strip():
            raise DomainValidationError("Full name cannot be empty", "full_name", full_name)
        
        if len(full_name.strip()) < 2:
            raise DomainValidationError("Full name too short (min 2 characters)", "full_name", full_name)
        
        if len(full_name.strip()) > 100:
            raise DomainValidationError("Full name too long (max 100 characters)", "full_name", full_name)
    
    def _validate_company_id(self, company_id: str):
        """Validate company ID"""
        if not company_id or not company_id.strip():
            raise DomainValidationError("Company ID cannot be empty", "company_id", company_id)


class TeamInvitation(Entity[InvitationId]):
    """
    Team Invitation Entity - manages invitation lifecycle
    Encapsulates invitation business rules and expiration logic
    """
    
    def __init__(self,
                 invitation_id: InvitationId,
                 email: Email,
                 full_name: str,
                 role: UserRole,
                 company_id: str,
                 invited_by_user_id: str,
                 invitation_token: str,
                 expires_at: datetime,
                 department: Optional[str] = None):
        super().__init__(invitation_id)
        
        self._validate_full_name(full_name)
        self._validate_company_id(company_id)
        self._validate_invited_by(invited_by_user_id)
        self._validate_token(invitation_token)
        self._validate_expiry(expires_at)
        
        self._email = email
        self._full_name = full_name
        self._role = role
        self._company_id = company_id
        self._invited_by_user_id = invited_by_user_id
        self._invitation_token = invitation_token
        self._expires_at = expires_at
        self._department = department
        self._status = InvitationStatus.PENDING
        self._email_sent = False
        self._email_sent_at: Optional[datetime] = None
        self._accepted_at: Optional[datetime] = None
    
    @classmethod
    def create(cls,
               email: Email,
               full_name: str,
               role: UserRole,
               company_id: str,
               invited_by_user_id: str,
               department: Optional[str] = None,
               days_to_expire: int = 7) -> 'TeamInvitation':
        """Factory method to create a new invitation"""
        
        invitation_id = InvitationId(str(uuid4()))
        invitation_token = cls._generate_secure_token()
        expires_at = datetime.now(timezone.utc) + timedelta(days=days_to_expire)
        
        return cls(
            invitation_id=invitation_id,
            email=email,
            full_name=full_name,
            role=role,
            company_id=company_id,
            invited_by_user_id=invited_by_user_id,
            invitation_token=invitation_token,
            expires_at=expires_at,
            department=department
        )
    
    @property
    def email(self) -> Email:
        return self._email
    
    @property
    def full_name(self) -> str:
        return self._full_name
    
    @property
    def role(self) -> UserRole:
        return self._role
    
    @property
    def company_id(self) -> str:
        return self._company_id
    
    @property
    def invited_by_user_id(self) -> str:
        return self._invited_by_user_id
    
    @property
    def invitation_token(self) -> str:
        return self._invitation_token
    
    @property
    def expires_at(self) -> datetime:
        return self._expires_at
    
    @property
    def department(self) -> Optional[str]:
        return self._department
    
    @property
    def status(self) -> InvitationStatus:
        return self._status
    
    @property
    def email_sent(self) -> bool:
        return self._email_sent
    
    @property
    def email_sent_at(self) -> Optional[datetime]:
        return self._email_sent_at
    
    @property
    def accepted_at(self) -> Optional[datetime]:
        return self._accepted_at
    
    def is_expired(self) -> bool:
        """Check if invitation has expired"""
        return datetime.now(timezone.utc) > self._expires_at
    
    def is_valid(self) -> bool:
        """Check if invitation is valid and can be accepted"""
        return self._status == InvitationStatus.PENDING and not self.is_expired()
    
    def mark_email_sent(self):
        """Mark invitation email as sent"""
        self._email_sent = True
        self._email_sent_at = datetime.now(timezone.utc)
        self._increment_version()
    
    def resend_invitation(self, days_to_extend: int = 7) -> str:
        """Resend invitation with new token and extended expiry"""
        if not self.is_valid():
            raise BusinessRuleViolationError("Cannot resend invalid or expired invitation")
        
        # Generate new token for security
        self._invitation_token = self._generate_secure_token()
        
        # Extend expiry
        self._expires_at = datetime.now(timezone.utc) + timedelta(days=days_to_extend)
        
        # Reset email tracking
        self._email_sent = False
        self._email_sent_at = None
        
        self._increment_version()
        
        return self._invitation_token
    
    def accept(self) -> TeamMember:
        """Accept invitation and create team member"""
        if not self.is_valid():
            raise BusinessRuleViolationError("Cannot accept invalid or expired invitation")
        
        self._status = InvitationStatus.ACCEPTED
        self._accepted_at = datetime.now(timezone.utc)
        self._increment_version()
        
        # Create team member from invitation
        member_id = TeamMemberId(str(uuid4()))
        return TeamMember(
            member_id=member_id,
            full_name=self._full_name,
            email=self._email,
            role=self._role,
            company_id=self._company_id,
            department=self._department
        )
    
    def revoke(self):
        """Revoke the invitation"""
        if self._status != InvitationStatus.PENDING:
            raise BusinessRuleViolationError("Can only revoke pending invitations")
        
        self._status = InvitationStatus.REVOKED
        self._increment_version()
    
    def expire(self):
        """Mark invitation as expired"""
        if self.is_expired() and self._status == InvitationStatus.PENDING:
            self._status = InvitationStatus.EXPIRED
            self._increment_version()
    
    @staticmethod
    def _generate_secure_token() -> str:
        """Generate a secure invitation token"""
        import secrets
        return secrets.token_urlsafe(32)
    
    def _validate_full_name(self, full_name: str):
        """Validate full name"""
        if not full_name or not full_name.strip():
            raise DomainValidationError("Full name cannot be empty", "full_name", full_name)
        
        if len(full_name.strip()) < 2:
            raise DomainValidationError("Full name too short (min 2 characters)", "full_name", full_name)
    
    def _validate_company_id(self, company_id: str):
        """Validate company ID"""
        if not company_id or not company_id.strip():
            raise DomainValidationError("Company ID cannot be empty", "company_id", company_id)
    
    def _validate_invited_by(self, user_id: str):
        """Validate inviting user ID"""
        if not user_id or not user_id.strip():
            raise DomainValidationError("Inviting user ID cannot be empty", "invited_by_user_id", user_id)
    
    def _validate_token(self, token: str):
        """Validate invitation token"""
        if not token or len(token) < 16:
            raise DomainValidationError("Invalid invitation token", "invitation_token", token)
    
    def _validate_expiry(self, expires_at: datetime):
        """Validate expiry date"""
        if expires_at <= datetime.now(timezone.utc):
            raise DomainValidationError("Expiry date must be in the future", "expires_at", expires_at)


class Team(AggregateRoot[str]):
    """
    Team Aggregate Root - manages team composition and business rules
    Coordinates team members and invitations
    """
    
    def __init__(self, company_id: str, max_members: int = 5):
        super().__init__(company_id)
        self._company_id = company_id
        self._max_members = max_members
        self._members: Dict[str, TeamMember] = {}
        self._invitations: Dict[str, TeamInvitation] = {}
    
    @property
    def company_id(self) -> str:
        return self._company_id
    
    @property
    def max_members(self) -> int:
        return self._max_members
    
    @property
    def members(self) -> List[TeamMember]:
        return list(self._members.values())
    
    @property
    def active_members(self) -> List[TeamMember]:
        return [member for member in self._members.values() if member.is_active]
    
    @property
    def pending_invitations(self) -> List[TeamInvitation]:
        return [inv for inv in self._invitations.values() if inv.is_valid()]
    
    def invite_member(self,
                     email: Email,
                     full_name: str,
                     role: UserRole,
                     invited_by_user_id: str,
                     department: Optional[str] = None,
                     send_email: bool = True) -> TeamInvitation:
        """Invite a new team member"""
        
        # Business rule: Check if inviter has permission
        inviter = self._get_member_by_id(invited_by_user_id)
        if inviter and not inviter.role.can_invite_members():
            raise BusinessRuleViolationError("User does not have permission to invite members")
        
        # Business rule: Check for duplicate email
        if self._has_member_with_email(email):
            raise BusinessRuleViolationError("Member with this email already exists")
        
        # Business rule: Check for existing pending invitation
        if self._has_pending_invitation_for_email(email):
            raise BusinessRuleViolationError("Pending invitation already exists for this email")
        
        # Business rule: Check team size limit
        projected_members = len(self.active_members) + len(self.pending_invitations) + 1
        if projected_members > self._max_members:
            raise BusinessRuleViolationError(f"Team size limit exceeded. Maximum {self._max_members} members allowed")
        
        # Create invitation
        invitation = TeamInvitation.create(
            email=email,
            full_name=full_name,
            role=role,
            company_id=self._company_id,
            invited_by_user_id=invited_by_user_id,
            department=department
        )
        
        self._invitations[invitation.id.value] = invitation
        
        if send_email:
            invitation.mark_email_sent()
        
        # Raise domain event
        event = TeamMemberInvited.create(
            aggregate_id=self._company_id,
            event_type="TeamMemberInvited",
            invitee_email=email.value,
            invitee_name=full_name,
            role=role.value,
            invited_by_user_id=invited_by_user_id,
            company_id=self._company_id,
            send_email=send_email
        )
        self.add_domain_event(event)
        
        return invitation
    
    def accept_invitation(self, invitation_id: str) -> TeamMember:
        """Accept an invitation and add member to team"""
        invitation = self._invitations.get(invitation_id)
        if not invitation:
            raise BusinessRuleViolationError("Invitation not found")
        
        member = invitation.accept()
        self._members[member.id.value] = member
        
        self._increment_version()
        return member
    
    def change_member_role(self, member_id: str, new_role: UserRole, changed_by_user_id: str):
        """Change a team member's role"""
        changer = self._get_member_by_id(changed_by_user_id)
        if not changer or not changer.role.can_manage_roles():
            raise BusinessRuleViolationError("User does not have permission to change roles")
        
        member = self._get_member_by_id(member_id)
        if not member:
            raise BusinessRuleViolationError("Member not found")
        
        # Business rule: Cannot change own role
        if member_id == changed_by_user_id:
            raise BusinessRuleViolationError("Cannot change your own role")
        
        # Business rule: Cannot demote last admin
        if member.role == UserRole.ADMIN and new_role != UserRole.ADMIN:
            admin_count = len([m for m in self.active_members if m.role == UserRole.ADMIN])
            if admin_count <= 1:
                raise BusinessRuleViolationError("Cannot demote the last admin")
        
        old_role = member.role
        member.change_role(new_role, changed_by_user_id)
        
        # Raise domain event
        event = TeamMemberRoleChanged.create(
            aggregate_id=self._company_id,
            event_type="TeamMemberRoleChanged",
            member_id=member_id,
            old_role=old_role.value,
            new_role=new_role.value,
            changed_by_user_id=changed_by_user_id
        )
        self.add_domain_event(event)
        
        self._increment_version()
    
    def remove_member(self, member_id: str, removed_by_user_id: str):
        """Remove a team member"""
        remover = self._get_member_by_id(removed_by_user_id)
        if not remover or not remover.role.can_remove_members():
            raise BusinessRuleViolationError("User does not have permission to remove members")
        
        # Business rule: Cannot remove self
        if member_id == removed_by_user_id:
            raise BusinessRuleViolationError("Cannot remove yourself")
        
        member = self._get_member_by_id(member_id)
        if not member:
            raise BusinessRuleViolationError("Member not found")
        
        # Business rule: Cannot remove last admin
        if member.role == UserRole.ADMIN:
            admin_count = len([m for m in self.active_members if m.role == UserRole.ADMIN])
            if admin_count <= 1:
                raise BusinessRuleViolationError("Cannot remove the last admin")
        
        # Deactivate member instead of hard delete
        member.deactivate(removed_by_user_id)
        
        # Raise domain event
        event = TeamMemberRemoved.create(
            aggregate_id=self._company_id,
            event_type="TeamMemberRemoved",
            member_id=member_id,
            member_name=member.full_name,
            removed_by_user_id=removed_by_user_id
        )
        self.add_domain_event(event)
        
        self._increment_version()
    
    def get_team_statistics(self) -> Dict[str, Any]:
        """Get team statistics"""
        active_members = self.active_members
        all_members = self.members
        pending_invitations = self.pending_invitations
        
        # Group by role
        members_by_role = {}
        for member in active_members:
            role = member.role.value
            members_by_role[role] = members_by_role.get(role, 0) + 1
        
        # Group by department
        members_by_department = {}
        for member in active_members:
            dept = member.department or "Unassigned"
            members_by_department[dept] = members_by_department.get(dept, 0) + 1
        
        return {
            "total_members": len(all_members) + len(pending_invitations),
            "active_members": len(active_members),
            "pending_invitations": len(pending_invitations),
            "members_by_role": members_by_role,
            "members_by_department": members_by_department
        }
    
    def expire_old_invitations(self):
        """Process and expire old invitations"""
        expired_invitations = []
        
        for invitation in self._invitations.values():
            if invitation.is_expired() and invitation.status == InvitationStatus.PENDING:
                invitation.expire()
                expired_invitations.append(invitation)
                
                # Raise domain event
                event = InvitationExpired.create(
                    aggregate_id=self._company_id,
                    event_type="InvitationExpired",
                    invitation_id=invitation.id.value,
                    invitee_email=invitation.email.value
                )
                self.add_domain_event(event)
        
        if expired_invitations:
            self._increment_version()
        
        return expired_invitations
    
    def _has_member_with_email(self, email: Email) -> bool:
        """Check if team has member with given email"""
        return any(member.email.value == email.value for member in self._members.values())
    
    def _has_pending_invitation_for_email(self, email: Email) -> bool:
        """Check if there's a pending invitation for given email"""
        return any(
            inv.email.value == email.value and inv.is_valid() 
            for inv in self._invitations.values()
        )
    
    def _get_member_by_id(self, member_id: str) -> Optional[TeamMember]:
        """Get team member by ID"""
        return self._members.get(member_id)