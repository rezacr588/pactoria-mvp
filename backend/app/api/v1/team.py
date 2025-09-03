"""
Team Management API endpoints
Provides team member management, invitations, and role management
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr

from app.core.auth import get_current_user
from app.infrastructure.database.models import User

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
    invitation_status: Optional[str] = Field(None, description="pending, accepted, expired")
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


# Mock data for demonstration
def get_mock_team_members(company_id: str) -> List[TeamMember]:
    """Get mock team members for a company"""
    return [
        TeamMember(
            id="user-123",
            full_name="Sarah Johnson",
            email="sarah.johnson@techcorp.com",
            role="admin",
            department="Legal",
            is_active=True,
            joined_at=datetime.now() - timedelta(days=120),
            last_active=datetime.now() - timedelta(hours=2),
            avatar_url="https://ui-avatars.com/api/?name=Sarah Johnson&background=3b82f6&color=fff"
        ),
        TeamMember(
            id="user-456",
            full_name="Michael Chen",
            email="michael.chen@techcorp.com",
            role="editor",
            department="Operations",
            is_active=True,
            joined_at=datetime.now() - timedelta(days=85),
            last_active=datetime.now() - timedelta(hours=8),
            avatar_url="https://ui-avatars.com/api/?name=Michael Chen&background=10b981&color=fff"
        ),
        TeamMember(
            id="user-789",
            full_name="Emma Wilson",
            email="emma.wilson@techcorp.com",
            role="viewer",
            department="HR",
            is_active=True,
            joined_at=datetime.now() - timedelta(days=45),
            last_active=datetime.now() - timedelta(days=3),
            avatar_url="https://ui-avatars.com/api/?name=Emma Wilson&background=f59e0b&color=fff"
        ),
        TeamMember(
            id="user-101",
            full_name="David Thompson",
            email="david.thompson@techcorp.com",
            role="editor",
            department="Finance",
            is_active=True,
            joined_at=datetime.now() - timedelta(days=30),
            last_active=datetime.now() - timedelta(hours=12),
            avatar_url="https://ui-avatars.com/api/?name=David Thompson&background=8b5cf6&color=fff"
        ),
        TeamMember(
            id="user-202",
            full_name="Lisa Anderson",
            email="lisa.anderson@techcorp.com",
            role="viewer",
            department="Marketing",
            is_active=False,
            joined_at=datetime.now() - timedelta(days=15),
            last_active=datetime.now() - timedelta(days=7),
            invitation_status="pending",
            invited_at=datetime.now() - timedelta(days=15),
            invited_by="user-123"
        )
    ]


@router.get("/members", response_model=List[TeamMember])
async def get_team_members(
    include_inactive: bool = Query(False, description="Include inactive members"),
    role: Optional[str] = Query(None, description="Filter by role"),
    department: Optional[str] = Query(None, description="Filter by department"),
    current_user: User = Depends(get_current_user)
):
    """
    Get team members for the current user's company
    
    Returns all team members with optional filtering by role, department,
    and active status.
    """
    try:
        # TODO: Implement actual database query
        # For now, return mock data
        team_members = get_mock_team_members(current_user.company_id)
        
        # Apply filters
        if not include_inactive:
            team_members = [m for m in team_members if m.is_active]
        
        if role:
            team_members = [m for m in team_members if m.role == role]
        
        if department:
            team_members = [m for m in team_members if m.department == department]
        
        # Sort by joined_at (newest first)
        team_members.sort(key=lambda x: x.joined_at, reverse=True)
        
        return team_members
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve team members: {str(e)}")


@router.get("/members/{member_id}", response_model=TeamMember)
async def get_team_member(
    member_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific team member by ID"""
    try:
        # TODO: Implement actual database query
        team_members = get_mock_team_members(current_user.company_id)
        
        for member in team_members:
            if member.id == member_id:
                return member
        
        raise HTTPException(status_code=404, detail="Team member not found")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve team member: {str(e)}")


@router.post("/invite", response_model=TeamMember)
async def invite_team_member(
    invitation: TeamMemberInvite,
    current_user: User = Depends(get_current_user)
):
    """
    Invite a new team member
    
    Creates a new team member invitation and optionally sends an email.
    The invited user must accept the invitation to become active.
    """
    try:
        # TODO: Check if user has permission to invite (admin/editor roles)
        # TODO: Check company user limit (Professional plan: 5 users)
        # TODO: Check if email already exists in the company
        # TODO: Generate invitation token
        # TODO: Send invitation email if requested
        
        # Mock implementation
        new_member = TeamMember(
            id=f"user_{int(datetime.now().timestamp())}",
            full_name=invitation.full_name,
            email=invitation.email,
            role=invitation.role,
            department=invitation.department,
            is_active=False,
            joined_at=datetime.now(),
            last_active=datetime.now(),
            invitation_status="pending",
            invited_at=datetime.now(),
            invited_by=current_user.id
        )
        
        return new_member
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to invite team member: {str(e)}")


@router.put("/members/{member_id}/role")
async def update_member_role(
    member_id: str,
    role_update: dict,  # Should contain {"role": "new_role"}
    current_user: User = Depends(get_current_user)
):
    """
    Update a team member's role
    
    Only admin users can update roles. Cannot demote the last admin.
    """
    try:
        # TODO: Implement permission check (only admin can update roles)
        # TODO: Prevent removing the last admin
        # TODO: Update database record
        # TODO: Log audit trail
        
        new_role = role_update.get("role")
        if new_role not in ["admin", "editor", "viewer"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        return {
            "success": True,
            "data": {
                "message": "Member role updated successfully",
                "member_id": member_id,
                "new_role": new_role,
                "updated_by": current_user.id,
                "updated_at": datetime.now()
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update member role: {str(e)}")


@router.delete("/members/{member_id}")
async def remove_team_member(
    member_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Remove a team member from the company
    
    Only admin users can remove members. Cannot remove yourself or the last admin.
    """
    try:
        # TODO: Implement permission check (only admin can remove members)
        # TODO: Prevent self-removal
        # TODO: Prevent removing the last admin
        # TODO: Deactivate user and transfer their contracts
        # TODO: Log audit trail
        
        if member_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot remove yourself")
        
        return {
            "success": True,
            "data": {
                "message": "Team member removed successfully",
                "member_id": member_id,
                "removed_by": current_user.id,
                "removed_at": datetime.now()
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove team member: {str(e)}")


@router.post("/members/{member_id}/resend-invite")
async def resend_invitation(
    member_id: str,
    resend_request: InvitationResend,
    current_user: User = Depends(get_current_user)
):
    """
    Resend invitation to a pending team member
    
    Generates a new invitation token and optionally sends a new email.
    """
    try:
        # TODO: Check if member exists and has pending invitation
        # TODO: Generate new invitation token
        # TODO: Send invitation email if requested
        # TODO: Update invitation timestamp
        
        return {
            "success": True,
            "data": {
                "message": "Invitation resent successfully",
                "member_id": member_id,
                "email_sent": resend_request.send_email,
                "resent_by": current_user.id,
                "resent_at": datetime.now()
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resend invitation: {str(e)}")


@router.get("/stats", response_model=TeamStats)
async def get_team_stats(
    current_user: User = Depends(get_current_user)
):
    """Get team statistics for the current user's company"""
    try:
        # TODO: Implement actual database queries
        team_members = get_mock_team_members(current_user.company_id)
        
        active_members = [m for m in team_members if m.is_active]
        pending_invitations = [m for m in team_members if m.invitation_status == "pending"]
        
        # Group by role
        members_by_role = {}
        for member in active_members:
            members_by_role[member.role] = members_by_role.get(member.role, 0) + 1
        
        # Group by department
        members_by_department = {}
        for member in active_members:
            dept = member.department or "Unassigned"
            members_by_department[dept] = members_by_department.get(dept, 0) + 1
        
        return TeamStats(
            total_members=len(team_members),
            active_members=len(active_members),
            pending_invitations=len(pending_invitations),
            members_by_role=members_by_role,
            members_by_department=members_by_department,
            recent_activity=[
                {
                    "type": "member_joined",
                    "member_name": "David Thompson",
                    "date": datetime.now() - timedelta(days=1)
                },
                {
                    "type": "invitation_sent",
                    "member_name": "Lisa Anderson",
                    "date": datetime.now() - timedelta(days=3)
                }
            ]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve team statistics: {str(e)}")


@router.get("/roles")
async def get_available_roles(
    current_user: User = Depends(get_current_user)
):
    """Get available roles and their descriptions"""
    return {
        "success": True,
        "data": {
            "roles": [
                {
                    "value": "admin",
                    "name": "Admin",
                    "description": "Full access to all features",
                    "permissions": "All permissions"
                },
                {
                    "value": "editor", 
                    "name": "Editor",
                    "description": "Can create and edit contracts",
                    "permissions": "Create, edit, view contracts"
                },
                {
                    "value": "viewer",
                    "name": "Viewer", 
                    "description": "Read-only access to contracts",
                    "permissions": "View contracts only"
                }
            ]
        }
    }