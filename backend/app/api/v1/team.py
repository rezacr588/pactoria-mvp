"""
Team Management API endpoints
Provides team member management, invitations, and role management
"""

from datetime import datetime, timedelta, UTC
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, get_user_company
from app.core.database import get_db
from app.infrastructure.database.models import (
    User,
    Company,
    TeamInvitation,
    UserRole,
    InvitationStatus,
)
import secrets

router = APIRouter(prefix="/team", tags=["Team Management"])


# Request/Response Models
class TeamMemberBase(BaseModel):
    """Base team member model"""

    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    role: str = Field(description="Role: admin, editor, viewer")
    department: Optional[str] = Field(None, max_length=100)


class TeamMemberInvite(TeamMemberBase):
    """Team member invitation model"""

    send_email: bool = Field(default=True, description="Send invitation email")


class TeamMember(TeamMemberBase):
    """Team member response model"""

    id: str
    is_active: bool = Field(default=True)
    joined_at: datetime
    last_active: datetime
    avatar_url: Optional[str] = None
    invitation_status: Optional[str] = Field(
        None, description="pending, accepted, expired"
    )
    invited_by: Optional[str] = None
    invited_at: Optional[datetime] = None


class TeamMemberUpdate(BaseModel):
    """Team member update model"""

    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class TeamStats(BaseModel):
    """Team statistics"""

    total_members: int
    active_members: int
    pending_invitations: int
    members_by_role: dict
    members_by_department: dict
    recent_activity: List[dict]


class InvitationResend(BaseModel):
    """Invitation resend model"""

    send_email: bool = Field(default=True)


def generate_avatar_url(name: str) -> str:
    """Generate an avatar URL for a user"""
    return f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=3b82f6&color=fff"


def user_to_team_member(
    user: User, invitation: Optional[TeamInvitation] = None
) -> TeamMember:
    """Convert a User model to TeamMember response"""
    return TeamMember(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        department=user.department,
        is_active=user.is_active,
        joined_at=user.created_at,
        last_active=user.last_login_at or user.created_at,
        avatar_url=generate_avatar_url(user.full_name),
        invitation_status=invitation.status.value if invitation else None,
        invited_by=invitation.invited_by if invitation else user.invited_by,
        invited_at=invitation.created_at if invitation else user.invited_at,
    )


def invitation_to_team_member(invitation: TeamInvitation) -> TeamMember:
    """Convert a TeamInvitation to TeamMember response (for pending invitations)"""
    return TeamMember(
        id=f"pending_{invitation.id}",
        full_name=invitation.full_name,
        email=invitation.email,
        role=invitation.role.value,
        department=invitation.department,
        is_active=False,
        joined_at=invitation.created_at,
        last_active=invitation.created_at,
        avatar_url=generate_avatar_url(invitation.full_name),
        invitation_status=invitation.status.value,
        invited_by=invitation.invited_by,
        invited_at=invitation.created_at,
    )


@router.get("/members", response_model=List[TeamMember])
async def get_team_members(
    include_inactive: bool = Query(False, description="Include inactive members"),
    role: Optional[str] = Query(None, description="Filter by role"),
    department: Optional[str] = Query(None, description="Filter by department"),
    company: Company = Depends(get_user_company),
    db: Session = Depends(get_db),
):
    """
    Get team members for the current user's company

    Returns all team members with optional filtering by role, department,
    and active status.
    """
    try:
        # Base query for users in the company
        query = db.query(User).filter(User.company_id == company.id)

        # Apply filters
        if not include_inactive:
            query = query.filter(User.is_active == True)

        if role:
            try:
                role_enum = UserRole(role)
                query = query.filter(User.role == role_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

        if department:
            query = query.filter(User.department == department)

        # Get users
        users = query.order_by(User.created_at.desc()).all()

        # Get pending invitations if including inactive
        team_members = []
        for user in users:
            team_members.append(user_to_team_member(user))

        # Add pending invitations if requested
        if include_inactive:
            pending_invitations = (
                db.query(TeamInvitation)
                .filter(
                    TeamInvitation.company_id == company.id,
                    TeamInvitation.status == InvitationStatus.PENDING,
                )
                .all()
            )

            for invitation in pending_invitations:
                # Apply role filter to invitations too
                if role and invitation.role.value != role:
                    continue
                # Apply department filter to invitations
                if department and invitation.department != department:
                    continue

                team_members.append(invitation_to_team_member(invitation))

        return team_members

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve team members: {str(e)}"
        )


@router.get("/members/{member_id}", response_model=TeamMember)
async def get_team_member(
    member_id: str,
    company: Company = Depends(get_user_company),
    db: Session = Depends(get_db),
):
    """Get a specific team member by ID"""
    try:
        # Check if it's a pending invitation
        if member_id.startswith("pending_"):
            invitation_id = member_id.replace("pending_", "")
            invitation = (
                db.query(TeamInvitation)
                .filter(
                    TeamInvitation.id == invitation_id,
                    TeamInvitation.company_id == company.id,
                )
                .first()
            )

            if not invitation:
                raise HTTPException(status_code=404, detail="Team member not found")

            return invitation_to_team_member(invitation)

        # Look for regular user
        user = (
            db.query(User)
            .filter(User.id == member_id, User.company_id == company.id)
            .first()
        )

        if not user:
            raise HTTPException(status_code=404, detail="Team member not found")

        return user_to_team_member(user)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve team member: {str(e)}"
        )


@router.post("/invite", response_model=TeamMember)
async def invite_team_member(
    invitation: TeamMemberInvite,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_user_company),
    db: Session = Depends(get_db),
):
    """
    Invite a new team member

    Creates a new team member invitation and optionally sends an email.
    The invited user must accept the invitation to become active.
    """
    try:
        # Check if user has permission to invite (admin/contract_manager roles)
        if current_user.role not in [UserRole.ADMIN, UserRole.CONTRACT_MANAGER]:
            raise HTTPException(
                status_code=403,
                detail="Only admin and contract manager users can invite team members",
            )

        # Check if email already exists in the company
        existing_user = (
            db.query(User)
            .filter(User.email == invitation.email, User.company_id == company.id)
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="A user with this email already exists in your company",
            )

        # Check for existing pending invitation
        existing_invitation = (
            db.query(TeamInvitation)
            .filter(
                TeamInvitation.email == invitation.email,
                TeamInvitation.company_id == company.id,
                TeamInvitation.status == InvitationStatus.PENDING,
            )
            .first()
        )

        if existing_invitation:
            raise HTTPException(
                status_code=400,
                detail="An invitation for this email is already pending",
            )

        # Check company user limit based on subscription tier
        current_user_count = (
            db.query(User)
            .filter(User.company_id == company.id, User.is_active == True)
            .count()
        )

        pending_invitations_count = (
            db.query(TeamInvitation)
            .filter(
                TeamInvitation.company_id == company.id,
                TeamInvitation.status == InvitationStatus.PENDING,
            )
            .count()
        )

        total_projected_users = (
            current_user_count + pending_invitations_count + 1
        )  # +1 for this new invitation

        if total_projected_users > company.max_users:
            raise HTTPException(
                status_code=400,
                detail=f"Company user limit exceeded. Your {company.subscription_tier.value} plan allows {company.max_users} users.",
            )

        # Validate role
        try:
            role_enum = UserRole(invitation.role)
        except ValueError:
            raise HTTPException(
                status_code=400, detail=f"Invalid role: {invitation.role}"
            )

        # Generate invitation token
        invitation_token = secrets.token_urlsafe(32)

        # Create invitation
        new_invitation = TeamInvitation(
            email=invitation.email,
            full_name=invitation.full_name,
            role=role_enum,
            department=invitation.department,
            company_id=company.id,
            invited_by=current_user.id,
            invitation_token=invitation_token,
            expires_at=datetime.now(UTC) + timedelta(days=7),  # 7 days to accept
            email_sent=invitation.send_email,
        )

        if invitation.send_email:
            new_invitation.email_sent_at = datetime.now(UTC)
            # TODO: Send invitation email

        db.add(new_invitation)
        db.commit()
        db.refresh(new_invitation)

        return invitation_to_team_member(new_invitation)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to invite team member: {str(e)}"
        )


@router.put("/members/{member_id}/role")
async def update_member_role(
    member_id: str,
    role_update: dict,  # Should contain {"role": "new_role"}
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_user_company),
    db: Session = Depends(get_db),
):
    """
    Update a team member's role

    Only admin users can update roles. Cannot demote the last admin.
    """
    try:
        # Check if current user has admin privileges
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=403, detail="Only admin users can update member roles"
            )

        # Validate new role
        new_role = role_update.get("role")
        if not new_role:
            raise HTTPException(status_code=400, detail="Role is required")

        try:
            role_enum = UserRole(new_role)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid role: {new_role}")

        # Get target user
        target_user = (
            db.query(User)
            .filter(User.id == member_id, User.company_id == company.id)
            .first()
        )

        if not target_user:
            raise HTTPException(status_code=404, detail="Team member not found")

        # Prevent users from changing their own role
        if target_user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot change your own role")

        # Prevent demoting the last admin
        if target_user.role == UserRole.ADMIN and role_enum != UserRole.ADMIN:
            admin_count = (
                db.query(User)
                .filter(
                    User.company_id == company.id,
                    User.role == UserRole.ADMIN,
                    User.is_active == True,
                )
                .count()
            )

            if admin_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot demote the last admin. At least one admin must remain.",
                )

        # Update user role
        old_role = target_user.role
        target_user.role = role_enum
        target_user.updated_at = datetime.now(UTC)

        db.commit()
        db.refresh(target_user)

        return {
            "message": "Member role updated successfully",
            "member_id": member_id,
            "new_role": new_role,
            "old_role": old_role.value,
            "updated_by": current_user.id,
            "updated_at": target_user.updated_at,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to update member role: {str(e)}"
        )


@router.delete("/members/{member_id}")
async def remove_team_member(
    member_id: str,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_user_company),
    db: Session = Depends(get_db),
):
    """
    Remove a team member from the company

    Only admin users can remove members. Cannot remove yourself or the last admin.
    """
    try:
        # Check if current user has admin privileges
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=403, detail="Only admin users can remove team members"
            )

        # Prevent self-removal
        if member_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot remove yourself")

        # Check if it's a pending invitation
        if member_id.startswith("pending_"):
            invitation_id = member_id.replace("pending_", "")
            invitation = (
                db.query(TeamInvitation)
                .filter(
                    TeamInvitation.id == invitation_id,
                    TeamInvitation.company_id == company.id,
                )
                .first()
            )

            if not invitation:
                raise HTTPException(status_code=404, detail="Team member not found")

            # Remove the invitation
            db.delete(invitation)
            db.commit()

            return {
                "message": "Pending invitation removed successfully",
                "member_id": member_id,
                "removed_by": current_user.id,
                "removed_at": datetime.now(UTC),
            }

        # Get target user
        target_user = (
            db.query(User)
            .filter(User.id == member_id, User.company_id == company.id)
            .first()
        )

        if not target_user:
            raise HTTPException(status_code=404, detail="Team member not found")

        # Prevent removing the last admin
        if target_user.role == UserRole.ADMIN:
            admin_count = (
                db.query(User)
                .filter(
                    User.company_id == company.id,
                    User.role == UserRole.ADMIN,
                    User.is_active == True,
                )
                .count()
            )

            if admin_count <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot remove the last admin. At least one admin must remain.",
                )

        # Deactivate user instead of hard delete (to preserve data integrity)
        target_user.is_active = False
        target_user.updated_at = datetime.now(UTC)

        # Note: In a more sophisticated implementation, we would:
        # 1. Transfer ownership of their contracts to another user
        # 2. Create an audit log entry
        # 3. Send notification emails
        # 4. Handle any pending workflows they're involved in

        db.commit()
        db.refresh(target_user)

        return {
            "message": "Team member removed successfully",
            "member_id": member_id,
            "removed_by": current_user.id,
            "removed_at": target_user.updated_at,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to remove team member: {str(e)}"
        )


@router.post("/members/{member_id}/resend-invite")
async def resend_invitation(
    member_id: str,
    resend_request: InvitationResend,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_user_company),
    db: Session = Depends(get_db),
):
    """
    Resend invitation to a pending team member

    Generates a new invitation token and optionally sends a new email.
    """
    try:
        # Check if current user has permission to invite
        if current_user.role not in [UserRole.ADMIN, UserRole.CONTRACT_MANAGER]:
            raise HTTPException(
                status_code=403,
                detail="Only admin and contract manager users can resend invitations",
            )

        # Check if it's a pending invitation
        if not member_id.startswith("pending_"):
            raise HTTPException(
                status_code=400,
                detail="Can only resend invitations for pending team members",
            )

        invitation_id = member_id.replace("pending_", "")
        invitation = (
            db.query(TeamInvitation)
            .filter(
                TeamInvitation.id == invitation_id,
                TeamInvitation.company_id == company.id,
                TeamInvitation.status == InvitationStatus.PENDING,
            )
            .first()
        )

        if not invitation:
            raise HTTPException(
                status_code=404,
                detail="Pending invitation not found or already processed",
            )

        # Check if invitation has expired
        if invitation.expires_at < datetime.now(UTC):
            # Update status to expired
            invitation.status = InvitationStatus.EXPIRED
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Invitation has expired. Please create a new invitation.",
            )

        # Generate new invitation token
        new_token = secrets.token_urlsafe(32)
        invitation.invitation_token = new_token
        invitation.updated_at = datetime.now(UTC)

        # Extend expiry date
        invitation.expires_at = datetime.now(UTC) + timedelta(days=7)

        # Update email sending flags
        if resend_request.send_email:
            invitation.email_sent = True
            invitation.email_sent_at = datetime.now(UTC)
            # TODO: Send actual email using email service

        db.commit()
        db.refresh(invitation)

        return {
            "message": "Invitation resent successfully",
            "member_id": member_id,
            "email_sent": resend_request.send_email,
            "resent_by": current_user.id,
            "resent_at": invitation.updated_at,
            "expires_at": invitation.expires_at,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to resend invitation: {str(e)}"
        )


@router.get("/stats", response_model=TeamStats)
async def get_team_stats(
    company: Company = Depends(get_user_company), db: Session = Depends(get_db)
):
    """Get team statistics for the current user's company"""
    try:
        # Get active users
        active_users = (
            db.query(User)
            .filter(User.company_id == company.id, User.is_active == True)
            .all()
        )

        # Get all users (including inactive)
        all_users = db.query(User).filter(User.company_id == company.id).all()

        # Get pending invitations
        pending_invitations = (
            db.query(TeamInvitation)
            .filter(
                TeamInvitation.company_id == company.id,
                TeamInvitation.status == InvitationStatus.PENDING,
            )
            .all()
        )

        # Group by role
        members_by_role = {}
        for user in active_users:
            role = user.role.value
            members_by_role[role] = members_by_role.get(role, 0) + 1

        # Group by department
        members_by_department = {}
        for user in active_users:
            dept = user.department or "Unassigned"
            members_by_department[dept] = members_by_department.get(dept, 0) + 1

        # Recent activity (last 30 days)
        thirty_days_ago = datetime.now(UTC) - timedelta(days=30)

        recent_users = (
            db.query(User)
            .filter(User.company_id == company.id, User.created_at >= thirty_days_ago)
            .order_by(User.created_at.desc())
            .limit(5)
            .all()
        )

        recent_invitations = (
            db.query(TeamInvitation)
            .filter(
                TeamInvitation.company_id == company.id,
                TeamInvitation.created_at >= thirty_days_ago,
            )
            .order_by(TeamInvitation.created_at.desc())
            .limit(5)
            .all()
        )

        recent_activity = []

        for user in recent_users:
            recent_activity.append(
                {
                    "type": "member_joined",
                    "member_name": user.full_name,
                    "date": user.created_at,
                }
            )

        for invitation in recent_invitations:
            recent_activity.append(
                {
                    "type": "invitation_sent",
                    "member_name": invitation.full_name,
                    "date": invitation.created_at,
                }
            )

        # Sort by date (most recent first)
        recent_activity.sort(key=lambda x: x["date"], reverse=True)
        recent_activity = recent_activity[:10]  # Keep only top 10

        return TeamStats(
            total_members=len(all_users) + len(pending_invitations),
            active_members=len(active_users),
            pending_invitations=len(pending_invitations),
            members_by_role=members_by_role,
            members_by_department=members_by_department,
            recent_activity=recent_activity,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve team statistics: {str(e)}"
        )


@router.get("/roles")
async def get_available_roles(current_user: User = Depends(get_current_user)):
    """Get available roles and their descriptions"""
    return {
        "success": True,
        "data": {
            "roles": [
                {
                    "value": "admin",
                    "name": "Admin",
                    "description": "Full access to all features",
                    "permissions": "All permissions",
                },
                {
                    "value": "editor",
                    "name": "Editor",
                    "description": "Can create and edit contracts",
                    "permissions": "Create, edit, view contracts",
                },
                {
                    "value": "viewer",
                    "name": "Viewer",
                    "description": "Read-only access to contracts",
                    "permissions": "View contracts only",
                },
            ]
        },
    }
