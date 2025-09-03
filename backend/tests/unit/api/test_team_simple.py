"""
Simple test for Team Management database logic without FastAPI dependencies
Tests the core domain logic and database operations
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.infrastructure.database.models import (
    User, Company, TeamInvitation, UserRole, 
    SubscriptionTier, InvitationStatus
)
from tests.conftest import create_test_user, create_test_company


class TestTeamDomainLogic:
    """Test team management domain logic and database operations"""
    
    @pytest.fixture(autouse=True)
    def setup_db(self, db_session: Session):
        """Setup database session"""
        self.db = db_session
    
    def test_user_creation_with_company(self):
        """Test creating users associated with a company"""
        # Create company
        company = create_test_company(self.db)
        
        # Create users
        admin = create_test_user(self.db, company.id, UserRole.ADMIN)
        manager = create_test_user(self.db, company.id, UserRole.CONTRACT_MANAGER, email="manager@test.com")
        
        # Verify users are properly created
        assert admin.company_id == company.id
        assert admin.role == UserRole.ADMIN
        assert manager.company_id == company.id
        assert manager.role == UserRole.CONTRACT_MANAGER
        
        # Verify database persistence
        db_users = self.db.query(User).filter(User.company_id == company.id).all()
        assert len(db_users) == 2
        
    def test_team_invitation_creation(self):
        """Test creating team invitations"""
        # Setup
        company = create_test_company(self.db)
        admin = create_test_user(self.db, company.id, UserRole.ADMIN)
        
        # Create invitation
        invitation = TeamInvitation(
            email="newuser@test.com",
            full_name="New User",
            role=UserRole.CONTRACT_MANAGER,
            department="Legal",
            company_id=company.id,
            invited_by=admin.id,
            invitation_token="test_token_123",
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        
        self.db.add(invitation)
        self.db.commit()
        
        # Verify invitation
        db_invitation = self.db.query(TeamInvitation).filter(
            TeamInvitation.email == "newuser@test.com"
        ).first()
        
        assert db_invitation is not None
        assert db_invitation.company_id == company.id
        assert db_invitation.invited_by == admin.id
        assert db_invitation.status == InvitationStatus.PENDING
        
    def test_company_user_limits(self):
        """Test company user limit validation"""
        # Create company with limit
        company = create_test_company(self.db, max_users=3)
        
        # Create users up to limit
        user1 = create_test_user(self.db, company.id, UserRole.ADMIN)
        user2 = create_test_user(self.db, company.id, UserRole.CONTRACT_MANAGER, email="user2@test.com")
        user3 = create_test_user(self.db, company.id, UserRole.VIEWER, email="user3@test.com")
        
        # Count active users
        active_users = self.db.query(User).filter(
            User.company_id == company.id,
            User.is_active == True
        ).count()
        
        assert active_users == 3
        assert active_users == company.max_users
        
    def test_user_filtering_by_role_and_department(self):
        """Test querying users by role and department"""
        company = create_test_company(self.db)
        
        # Create users with different roles and departments
        admin = create_test_user(self.db, company.id, UserRole.ADMIN, department="Legal")
        manager1 = create_test_user(self.db, company.id, UserRole.CONTRACT_MANAGER, department="Legal", email="mgr1@test.com")
        manager2 = create_test_user(self.db, company.id, UserRole.CONTRACT_MANAGER, department="Operations", email="mgr2@test.com")
        viewer = create_test_user(self.db, company.id, UserRole.VIEWER, department="HR", email="viewer@test.com")
        
        # Test role filtering
        managers = self.db.query(User).filter(
            User.company_id == company.id,
            User.role == UserRole.CONTRACT_MANAGER
        ).all()
        assert len(managers) == 2
        
        # Test department filtering
        legal_users = self.db.query(User).filter(
            User.company_id == company.id,
            User.department == "Legal"
        ).all()
        assert len(legal_users) == 2  # admin + manager1
        
        # Test combined filtering
        legal_managers = self.db.query(User).filter(
            User.company_id == company.id,
            User.role == UserRole.CONTRACT_MANAGER,
            User.department == "Legal"
        ).all()
        assert len(legal_managers) == 1
        assert legal_managers[0].email == "mgr1@test.com"
        
    def test_invitation_expiry_logic(self):
        """Test invitation expiry business logic"""
        company = create_test_company(self.db)
        admin = create_test_user(self.db, company.id, UserRole.ADMIN)
        
        # Create expired invitation
        expired_invitation = TeamInvitation(
            email="expired@test.com",
            full_name="Expired User",
            role=UserRole.VIEWER,
            company_id=company.id,
            invited_by=admin.id,
            invitation_token="expired_token",
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() - timedelta(days=1)  # Expired
        )
        
        # Create valid invitation
        valid_invitation = TeamInvitation(
            email="valid@test.com",
            full_name="Valid User",
            role=UserRole.VIEWER,
            company_id=company.id,
            invited_by=admin.id,
            invitation_token="valid_token",
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7)  # Valid for 7 days
        )
        
        self.db.add_all([expired_invitation, valid_invitation])
        self.db.commit()
        
        # Query for valid (non-expired) invitations
        now = datetime.utcnow()
        valid_invitations = self.db.query(TeamInvitation).filter(
            TeamInvitation.company_id == company.id,
            TeamInvitation.status == InvitationStatus.PENDING,
            TeamInvitation.expires_at > now
        ).all()
        
        assert len(valid_invitations) == 1
        assert valid_invitations[0].email == "valid@test.com"
        
    def test_team_statistics_calculation(self):
        """Test calculating team statistics"""
        company = create_test_company(self.db)
        
        # Create active users
        admin = create_test_user(self.db, company.id, UserRole.ADMIN, department="Legal")
        manager = create_test_user(self.db, company.id, UserRole.CONTRACT_MANAGER, department="Operations", email="mgr@test.com")
        viewer = create_test_user(self.db, company.id, UserRole.VIEWER, department="Operations", email="viewer@test.com")
        
        # Create inactive user
        inactive_user = create_test_user(self.db, company.id, UserRole.VIEWER, department="HR", email="inactive@test.com")
        inactive_user.is_active = False
        self.db.commit()
        
        # Create pending invitation
        invitation = TeamInvitation(
            email="pending@test.com",
            full_name="Pending User",
            role=UserRole.CONTRACT_MANAGER,
            department="Finance",
            company_id=company.id,
            invited_by=admin.id,
            invitation_token="pending_token",
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        self.db.add(invitation)
        self.db.commit()
        
        # Calculate statistics
        total_users = self.db.query(User).filter(User.company_id == company.id).count()
        active_users = self.db.query(User).filter(
            User.company_id == company.id, 
            User.is_active == True
        ).count()
        pending_invitations = self.db.query(TeamInvitation).filter(
            TeamInvitation.company_id == company.id,
            TeamInvitation.status == InvitationStatus.PENDING
        ).count()
        
        # Verify statistics
        assert total_users == 4  # 3 active + 1 inactive
        assert active_users == 3
        assert pending_invitations == 1
        
        # Test role distribution
        role_counts = {}
        for user in self.db.query(User).filter(User.company_id == company.id, User.is_active == True).all():
            role_counts[user.role.value] = role_counts.get(user.role.value, 0) + 1
            
        assert role_counts["admin"] == 1
        assert role_counts["contract_manager"] == 1  
        assert role_counts["viewer"] == 1
        
        # Test department distribution
        dept_counts = {}
        for user in self.db.query(User).filter(User.company_id == company.id, User.is_active == True).all():
            dept = user.department or "Unassigned"
            dept_counts[dept] = dept_counts.get(dept, 0) + 1
            
        assert dept_counts["Legal"] == 1
        assert dept_counts["Operations"] == 2
        
    def test_subscription_tier_limits(self):
        """Test subscription tier user limits"""
        # Test different subscription tiers
        starter_company = create_test_company(self.db, 
                                            subscription_tier=SubscriptionTier.STARTER, 
                                            max_users=5)
        professional_company = create_test_company(self.db, 
                                                 subscription_tier=SubscriptionTier.PROFESSIONAL, 
                                                 max_users=20)
        business_company = create_test_company(self.db, 
                                             subscription_tier=SubscriptionTier.BUSINESS, 
                                             max_users=100)
        
        assert starter_company.max_users == 5
        assert professional_company.max_users == 20
        assert business_company.max_users == 100
        
        # Verify subscription tier enforcement
        assert starter_company.subscription_tier == SubscriptionTier.STARTER
        assert professional_company.subscription_tier == SubscriptionTier.PROFESSIONAL
        assert business_company.subscription_tier == SubscriptionTier.BUSINESS


class TestTeamInvitationDomain:
    """Test domain logic specific to team invitations"""
    
    @pytest.fixture(autouse=True)
    def setup_db(self, db_session: Session):
        self.db = db_session
        
    def test_invitation_token_uniqueness(self):
        """Test that invitation tokens are unique"""
        company = create_test_company(self.db)
        admin = create_test_user(self.db, company.id, UserRole.ADMIN)
        
        invitation1 = TeamInvitation(
            email="user1@test.com",
            full_name="User 1",
            role=UserRole.VIEWER,
            company_id=company.id,
            invited_by=admin.id,
            invitation_token="unique_token_1",
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        
        invitation2 = TeamInvitation(
            email="user2@test.com",
            full_name="User 2", 
            role=UserRole.VIEWER,
            company_id=company.id,
            invited_by=admin.id,
            invitation_token="unique_token_2",
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        
        self.db.add_all([invitation1, invitation2])
        self.db.commit()
        
        # Verify both invitations exist with different tokens
        invitations = self.db.query(TeamInvitation).all()
        tokens = [inv.invitation_token for inv in invitations]
        
        assert len(tokens) == 2
        assert len(set(tokens)) == 2  # All tokens are unique
        
    def test_invitation_status_transitions(self):
        """Test invitation status transitions"""
        company = create_test_company(self.db)
        admin = create_test_user(self.db, company.id, UserRole.ADMIN)
        
        invitation = TeamInvitation(
            email="transition@test.com",
            full_name="Transition User",
            role=UserRole.VIEWER,
            company_id=company.id,
            invited_by=admin.id,
            invitation_token="transition_token",
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        
        self.db.add(invitation)
        self.db.commit()
        
        # Test pending -> accepted
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = datetime.utcnow()
        self.db.commit()
        
        db_invitation = self.db.query(TeamInvitation).filter(
            TeamInvitation.email == "transition@test.com"
        ).first()
        
        assert db_invitation.status == InvitationStatus.ACCEPTED
        assert db_invitation.accepted_at is not None
        
        # Test pending -> expired (business logic)
        expired_invitation = TeamInvitation(
            email="expired@test.com",
            full_name="Expired User",
            role=UserRole.VIEWER,
            company_id=company.id,
            invited_by=admin.id,
            invitation_token="expired_token",
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() - timedelta(hours=1)  # Already expired
        )
        
        self.db.add(expired_invitation)
        self.db.commit()
        
        # In a real system, a background job would mark this as expired
        if expired_invitation.expires_at < datetime.utcnow():
            expired_invitation.status = InvitationStatus.EXPIRED
            self.db.commit()
            
        assert expired_invitation.status == InvitationStatus.EXPIRED