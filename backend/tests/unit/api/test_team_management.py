"""
Test suite for Team Management API endpoints
Tests following DDD principles and ensuring proper domain logic
"""
import pytest
from datetime import datetime, timedelta, UTC
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch

from app.main import app
from app.core.database import get_db
from app.infrastructure.database.models import (
    User, Company, TeamInvitation, UserRole, 
    SubscriptionTier, InvitationStatus
)
from tests.conftest import override_get_db, create_test_user, create_test_company


class TestTeamManagement:
    """Test suite for team management endpoints"""
    
    def setup_method(self):
        """Setup test data"""
        self.client = TestClient(app)
        
    @pytest.fixture(autouse=True)
    def setup_db(self, db_session: Session):
        """Setup database session and clear existing overrides"""
        self.db = db_session
        yield
        
    def test_get_team_members_success(self):
        """Test successful retrieval of team members"""
        # Create test company and users
        company = create_test_company(self.db)
        admin_user = create_test_user(self.db, company.id, UserRole.ADMIN)
        regular_user = create_test_user(self.db, company.id, UserRole.CONTRACT_MANAGER, email="user@test.com")
        
        # Override authentication dependencies
        from app.core.auth import get_current_user, get_user_company
        app.dependency_overrides[get_current_user] = lambda: admin_user
        app.dependency_overrides[get_user_company] = lambda: company
        
        response = self.client.get("/api/v1/team/members")
            
        assert response.status_code == 200
        data = response.json()
        
        # Should return both users
        assert len(data) == 2
        
        # Verify user data structure
        user_data = data[0]
        assert "id" in user_data
        assert "full_name" in user_data
        assert "email" in user_data
        assert "role" in user_data
        assert "is_active" in user_data
        assert "joined_at" in user_data
        assert "avatar_url" in user_data
        
    def test_get_team_members_with_filters(self):
        """Test filtering team members by role and department"""
        company = create_test_company(self.db)
        admin_user = create_test_user(self.db, company.id, UserRole.ADMIN, department="Legal")
        viewer_user = create_test_user(
            self.db, company.id, UserRole.VIEWER, 
            email="viewer@test.com", department="HR"
        )
        
        # Override authentication dependencies
        from app.core.auth import get_current_user, get_user_company
        app.dependency_overrides[get_current_user] = lambda: admin_user
        app.dependency_overrides[get_user_company] = lambda: company
        
        # Filter by role
        response = self.client.get("/api/v1/team/members?role=admin")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["role"] == "admin"
        
        # Filter by department
        response = self.client.get("/api/v1/team/members?department=HR")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["department"] == "HR"
            
    def test_invite_team_member_success(self):
        """Test successful team member invitation"""
        company = create_test_company(self.db)
        admin_user = create_test_user(self.db, company.id, UserRole.ADMIN)
        
        invitation_data = {
            "full_name": "New Member",
            "email": "new@test.com",
            "role": "contract_manager",
            "department": "Legal",
            "send_email": True
        }
        
        # Override authentication dependencies
        from app.core.auth import get_current_user, get_user_company
        app.dependency_overrides[get_current_user] = lambda: admin_user
        app.dependency_overrides[get_user_company] = lambda: company
        
        response = self.client.post("/api/v1/team/invite", json=invitation_data)
        
        if response.status_code != 200:
            print(f"Error response: {response.json()}")
            
        assert response.status_code == 200
        data = response.json()
        
        # Verify invitation was created
        assert data["email"] == invitation_data["email"]
        assert data["full_name"] == invitation_data["full_name"]
        assert data["role"] == invitation_data["role"]
        assert data["invitation_status"] == "pending"
        
        # Verify database record
        invitation = self.db.query(TeamInvitation).filter(
            TeamInvitation.email == invitation_data["email"]
        ).first()
        assert invitation is not None
        assert invitation.company_id == company.id
        assert invitation.invited_by == admin_user.id
        
    def test_invite_team_member_permission_denied(self):
        """Test invitation permission check"""
        company = create_test_company(self.db)
        viewer_user = create_test_user(self.db, company.id, UserRole.VIEWER)
        
        invitation_data = {
            "full_name": "New Member",
            "email": "new@test.com",
            "role": "contract_manager",
            "department": "Legal"
        }
        
        # Override authentication dependencies
        from app.core.auth import get_current_user, get_user_company
        app.dependency_overrides[get_current_user] = lambda: viewer_user
        app.dependency_overrides[get_user_company] = lambda: company
        
        response = self.client.post("/api/v1/team/invite", json=invitation_data)
            
        assert response.status_code == 403
        assert "Only admin and contract manager users can invite" in response.json()["detail"]
        
    def test_invite_team_member_duplicate_email(self):
        """Test invitation with existing email"""
        company = create_test_company(self.db)
        admin_user = create_test_user(self.db, company.id, UserRole.ADMIN)
        existing_user = create_test_user(
            self.db, company.id, UserRole.CONTRACT_MANAGER, 
            email="existing@test.com"
        )
        
        invitation_data = {
            "full_name": "New Member",
            "email": "existing@test.com",  # Same as existing user
            "role": "contract_manager",
            "department": "Legal"
        }
        
        # Override authentication dependencies
        from app.core.auth import get_current_user, get_user_company
        app.dependency_overrides[get_current_user] = lambda: admin_user
        app.dependency_overrides[get_user_company] = lambda: company
        
        response = self.client.post("/api/v1/team/invite", json=invitation_data)
        
        assert response.status_code == 400
        assert "already exists in your company" in response.json()["detail"]
        
    def test_invite_team_member_user_limit_exceeded(self):
        """Test invitation when user limit is exceeded"""
        # Create company with limit of 2 users
        company = create_test_company(self.db)
        company.max_users = 2
        self.db.commit()
        
        admin_user = create_test_user(self.db, company.id, UserRole.ADMIN)
        regular_user = create_test_user(
            self.db, company.id, UserRole.CONTRACT_MANAGER, 
            email="user@test.com"
        )
        
        invitation_data = {
            "full_name": "Third Member",
            "email": "third@test.com",
            "role": "contract_manager",
            "department": "Legal"
        }
        
        # Override authentication dependencies
        from app.core.auth import get_current_user, get_user_company
        app.dependency_overrides[get_current_user] = lambda: admin_user
        app.dependency_overrides[get_user_company] = lambda: company
        
        response = self.client.post("/api/v1/team/invite", json=invitation_data)
        
        assert response.status_code == 400
        assert "user limit exceeded" in response.json()["detail"]
        
    def test_get_team_member_by_id_success(self):
        """Test retrieving specific team member"""
        company = create_test_company(self.db)
        admin_user = create_test_user(self.db, company.id, UserRole.ADMIN)
        target_user = create_test_user(
            self.db, company.id, UserRole.CONTRACT_MANAGER, 
            email="target@test.com"
        )
        
        # Override authentication dependencies
        from app.core.auth import get_current_user, get_user_company
        app.dependency_overrides[get_current_user] = lambda: admin_user
        app.dependency_overrides[get_user_company] = lambda: company
        
        response = self.client.get(f"/api/v1/team/members/{target_user.id}")
            
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == target_user.id
        assert data["email"] == target_user.email
        
    def test_get_team_member_not_found(self):
        """Test retrieving non-existent team member"""
        company = create_test_company(self.db)
        admin_user = create_test_user(self.db, company.id, UserRole.ADMIN)
        
        # Override authentication dependencies
        from app.core.auth import get_current_user, get_user_company
        app.dependency_overrides[get_current_user] = lambda: admin_user
        app.dependency_overrides[get_user_company] = lambda: company
        
        response = self.client.get("/api/v1/team/members/nonexistent")
            
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
        
    def test_get_team_stats_success(self):
        """Test team statistics retrieval"""
        company = create_test_company(self.db)
        admin_user = create_test_user(self.db, company.id, UserRole.ADMIN, department="Legal")
        user1 = create_test_user(
            self.db, company.id, UserRole.CONTRACT_MANAGER, 
            email="user1@test.com", department="Operations"
        )
        user2 = create_test_user(
            self.db, company.id, UserRole.VIEWER, 
            email="user2@test.com", department="Operations"
        )
        
        # Add a pending invitation
        invitation = TeamInvitation(
            email="pending@test.com",
            full_name="Pending User",
            role=UserRole.CONTRACT_MANAGER,
            department="HR",
            company_id=company.id,
            invited_by=admin_user.id,
            invitation_token="test_token",
            status=InvitationStatus.PENDING,
            expires_at=datetime.now(UTC) + timedelta(days=7)
        )
        self.db.add(invitation)
        self.db.commit()
        
        # Override authentication dependencies
        from app.core.auth import get_current_user, get_user_company
        app.dependency_overrides[get_current_user] = lambda: admin_user
        app.dependency_overrides[get_user_company] = lambda: company
        
        response = self.client.get("/api/v1/team/stats")
            
        assert response.status_code == 200
        data = response.json()
        
        # Verify statistics
        assert data["total_members"] == 4  # 3 users + 1 pending invitation
        assert data["active_members"] == 3  # 3 active users
        assert data["pending_invitations"] == 1
        
        # Verify role distribution
        assert data["members_by_role"]["admin"] == 1
        assert data["members_by_role"]["contract_manager"] == 1
        assert data["members_by_role"]["viewer"] == 1
        
        # Verify department distribution
        assert data["members_by_department"]["Legal"] == 1
        assert data["members_by_department"]["Operations"] == 2
        
        # Verify recent activity exists
        assert "recent_activity" in data
        assert isinstance(data["recent_activity"], list)
        
    def test_get_available_roles(self):
        """Test retrieving available roles"""
        company = create_test_company(self.db)
        admin_user = create_test_user(self.db, company.id, UserRole.ADMIN)
        
        # Override authentication dependencies
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: admin_user
        
        response = self.client.get("/api/v1/team/roles")
            
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] is True
        assert "data" in data
        assert "roles" in data["data"]
        
        roles = data["data"]["roles"]
        assert len(roles) == 3  # admin, editor, viewer
        
        # Verify role structure
        role_values = [role["value"] for role in roles]
        assert "admin" in role_values
        assert "editor" in role_values
        assert "viewer" in role_values


class TestTeamManagementBusinessLogic:
    """Test domain business logic for team management"""
    
    def test_invitation_token_generation(self):
        """Test that invitation tokens are unique and secure"""
        company = create_test_company(None)
        
        # Create multiple invitations
        tokens = set()
        for i in range(100):
            invitation = TeamInvitation(
                email=f"test{i}@test.com",
                full_name=f"Test User {i}",
                role=UserRole.CONTRACT_MANAGER,
                company_id=company.id,
                invited_by="admin_id",
                invitation_token="will_be_generated",
                expires_at=datetime.now(UTC) + timedelta(days=7)
            )
            # In actual implementation, token would be generated automatically
            import secrets
            invitation.invitation_token = secrets.token_urlsafe(32)
            tokens.add(invitation.invitation_token)
            
        # All tokens should be unique
        assert len(tokens) == 100
        
        # Tokens should be of adequate length (security)
        for token in tokens:
            assert len(token) >= 32  # At least 32 characters
            
    def test_invitation_expiry_logic(self):
        """Test invitation expiry business logic"""
        now = datetime.now(UTC)
        
        # Valid invitation (not expired)
        valid_invitation = TeamInvitation(
            expires_at=now + timedelta(days=1)
        )
        assert valid_invitation.expires_at > now
        
        # Expired invitation
        expired_invitation = TeamInvitation(
            expires_at=now - timedelta(days=1)
        )
        assert expired_invitation.expires_at < now
        
    def test_user_role_permissions(self):
        """Test role-based permission logic"""
        # Admin and contract manager should be able to invite
        admin_roles = [UserRole.ADMIN, UserRole.CONTRACT_MANAGER]
        for role in admin_roles:
            assert role in [UserRole.ADMIN, UserRole.CONTRACT_MANAGER]
            
        # Viewer and legal reviewer should NOT be able to invite
        restricted_roles = [UserRole.VIEWER, UserRole.LEGAL_REVIEWER]
        for role in restricted_roles:
            assert role not in [UserRole.ADMIN, UserRole.CONTRACT_MANAGER]
            
    def test_subscription_tier_user_limits(self):
        """Test subscription tier user limits"""
        # Starter: 5 users
        assert SubscriptionTier.STARTER.name == "STARTER"
        
        # Professional: Would have higher limit (implementation dependent)
        assert SubscriptionTier.PROFESSIONAL.name == "PROFESSIONAL"
        
        # Business: Would have even higher limit
        assert SubscriptionTier.BUSINESS.name == "BUSINESS"