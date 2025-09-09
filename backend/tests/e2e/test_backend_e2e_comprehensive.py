"""
Comprehensive E2E Tests for Pactoria MVP Backend API
Tests all major endpoints following DDD and TDD principles
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, Mock, patch
import uuid
from datetime import datetime, timedelta
import json

from app.main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token, get_password_hash
from app.infrastructure.database.models import (
    User,
    Company,
    Contract,
    Template,
    ContractStatus,
    ContractType,
    SubscriptionTier,
    UserRole,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


class DatabaseManager:
    """Manages test database setup and cleanup"""

    def __init__(self):
        # Create separate test database for each test session
        self.test_engine = create_engine(
            "sqlite:///./test_e2e.db", connect_args={"check_same_thread": False}
        )
        self.TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=self.test_engine
        )

    def setup_database(self):
        """Create all tables for testing"""
        Base.metadata.create_all(bind=self.test_engine)

    def get_test_db(self):
        """Get test database session"""
        try:
            db = self.TestingSessionLocal()
            yield db
        finally:
            db.close()

    def cleanup_database(self):
        """Drop all test tables"""
        Base.metadata.drop_all(bind=self.test_engine)


@pytest.fixture(scope="class")
def test_db_manager():
    """Provide test database manager"""
    manager = DatabaseManager()
    manager.setup_database()

    # Override database dependency
    app.dependency_overrides[get_db] = manager.get_test_db

    yield manager

    # Cleanup
    app.dependency_overrides.clear()
    manager.cleanup_database()


@pytest.fixture(scope="class")
def test_client(test_db_manager):
    """Create test client with database setup"""
    with TestClient(app) as client:
        yield client


class TestDataFactory:
    """Factory for creating test data following DDD patterns"""

    @staticmethod
    def create_company_data(name: str = None) -> dict:
        """Create valid company data"""
        unique_id = uuid.uuid4().hex[:8]
        return {
            "name": name or f"Test Company {unique_id}",
            "registration_number": f"TC{unique_id.upper()}",
            "address": "123 Test Street, London, SW1A 1AA",
            "subscription_tier": SubscriptionTier.STARTER,
        }

    @staticmethod
    def create_user_data(
        company_id: str = None, role: UserRole = UserRole.CONTRACT_MANAGER
    ) -> dict:
        """Create valid user data"""
        unique_id = uuid.uuid4().hex[:8]
        return {
            "email": f"user-{unique_id}@testcompany.com",
            "full_name": f"Test User {unique_id}",
            "password": "TestPassword123!",
            "company_id": company_id,
            "role": role,
        }

    @staticmethod
    def create_contract_data(company_id: str, created_by: str) -> dict:
        """Create valid contract data"""
        unique_id = uuid.uuid4().hex[:8]
        return {
            "title": f"Test Contract {unique_id}",
            "contract_type": ContractType.SERVICE_AGREEMENT.value,
            "plain_english_input": "Professional services agreement for consulting work with confidentiality clauses and payment terms.",
            "client_name": f"Client Corp {unique_id}",
            "client_email": f"client-{unique_id}@clientcorp.com",
            "supplier_name": f"Supplier Ltd {unique_id}",
            "contract_value": 50000.0,
            "currency": "GBP",
            "company_id": company_id,
            "created_by": created_by,
        }


class E2ETestBase:
    """Base class for E2E tests with common utilities"""

    def __init__(self, client: TestClient, db_manager: DatabaseManager):
        self.client = client
        self.db_manager = db_manager
        self.created_entities = []

    def create_test_company(self, data: dict = None) -> Company:
        """Create a test company in database"""
        company_data = data or TestDataFactory.create_company_data()

        db = next(self.db_manager.get_test_db())
        try:
            company = Company(id=str(uuid.uuid4()), **company_data)
            db.add(company)
            db.commit()
            db.refresh(company)
            self.created_entities.append(("companies", company.id))
            return company
        finally:
            db.close()

    def create_test_user(self, company_id: str, data: dict = None) -> User:
        """Create a test user in database"""
        user_data = data or TestDataFactory.create_user_data(company_id=company_id)

        db = next(self.db_manager.get_test_db())
        try:
            user = User(
                id=str(uuid.uuid4()),
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=get_password_hash(user_data["password"]),
                company_id=company_id,
                role=user_data.get("role", UserRole.CONTRACT_MANAGER),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            self.created_entities.append(("users", user.id))
            return user
        finally:
            db.close()

    def get_auth_headers(self, user_id: str) -> dict:
        """Generate authentication headers"""
        token = create_access_token(subject=user_id)
        return {"Authorization": f"Bearer {token}"}

    def cleanup(self):
        """Clean up created test entities"""
        db = next(self.db_manager.get_test_db())
        try:
            for entity_type, entity_id in reversed(self.created_entities):
                if entity_type == "users":
                    db.query(User).filter(User.id == entity_id).delete()
                elif entity_type == "companies":
                    db.query(Company).filter(Company.id == entity_id).delete()
                elif entity_type == "contracts":
                    db.query(Contract).filter(Contract.id == entity_id).delete()
            db.commit()
        finally:
            db.close()


@pytest.mark.e2e
class TestHealthAndStatusEndpoints:
    """Test health check and status endpoints"""

    def test_root_endpoint(self, test_client):
        """Test root endpoint returns application info"""
        response = test_client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "operational"

    def test_health_check_endpoint(self, test_client):
        """Test health check endpoint"""
        response = test_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data

    def test_detailed_health_check(self, test_client):
        """Test detailed health check endpoint"""
        response = test_client.get("/health/detailed")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "components" in data
        assert "performance" in data
        assert "dependencies" in data

    def test_readiness_check(self, test_client):
        """Test readiness check endpoint"""
        response = test_client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert "ready" in data
        assert "checks" in data


@pytest.mark.e2e
class TestAuthenticationEndpoints:
    """Test authentication and user management endpoints"""

    def test_user_registration_flow(self, test_client, test_db_manager):
        """Test complete user registration workflow"""
        # Test data
        registration_data = {
            "email": f"test-{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPassword123!",
            "full_name": "Test User",
            "company_name": "Test Company Ltd",
        }

        # Register user
        response = test_client.post("/api/v1/auth/register", json=registration_data)
        assert response.status_code == 201
        data = response.json()
        assert "token" in data
        assert "access_token" in data["token"]
        assert "user" in data
        assert data["user"]["email"] == registration_data["email"]

        # Cleanup
        db = next(test_db_manager.get_test_db())
        try:
            user = (
                db.query(User).filter(User.email == registration_data["email"]).first()
            )
            if user:
                db.delete(user)
                if user.company_id:
                    company = (
                        db.query(Company).filter(Company.id == user.company_id).first()
                    )
                    if company:
                        db.delete(company)
                db.commit()
        finally:
            db.close()

    def test_user_login_flow(self, test_client, test_db_manager):
        """Test user login workflow"""
        # Setup: Create user
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id)

        try:
            # Login
            login_data = {"username": user.email, "password": "TestPassword123!"}
            response = test_client.post(
                "/api/v1/auth/login",
                data=login_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"

        finally:
            test_base.cleanup()

    def test_get_user_profile(self, test_client, test_db_manager):
        """Test getting user profile"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id)

        try:
            # Get profile
            headers = test_base.get_auth_headers(user.id)
            response = test_client.get("/api/v1/auth/me", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == user.id
            assert data["email"] == user.email
            assert data["full_name"] == user.full_name

        finally:
            test_base.cleanup()


@pytest.mark.e2e
class TestContractEndpoints:
    """Test contract CRUD operations and workflows"""

    def test_create_contract(self, test_client, test_db_manager):
        """Test contract creation"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id)

        try:
            # Create contract
            contract_data = TestDataFactory.create_contract_data(company.id, user.id)
            headers = test_base.get_auth_headers(user.id)

            with patch("app.services.ai_service.ai_service") as mock_ai:
                mock_ai.generate_contract = AsyncMock(
                    return_value=Mock(
                        content="MOCK_CONTRACT_CONTENT",
                        model_name="test-model",
                        processing_time_ms=1000,
                    )
                )

                response = test_client.post(
                    "/api/v1/contracts/", json=contract_data, headers=headers
                )
                assert response.status_code == 201
                data = response.json()
                assert data["title"] == contract_data["title"]
                assert data["contract_type"] == contract_data["contract_type"]
                assert data["status"] == "draft"

        finally:
            test_base.cleanup()

    def test_list_contracts(self, test_client, test_db_manager):
        """Test contract listing"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id)

        try:
            headers = test_base.get_auth_headers(user.id)
            response = test_client.get("/api/v1/contracts/", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert "contracts" in data or "items" in data
            assert "total" in data
            assert "page" in data
            assert "size" in data

        finally:
            test_base.cleanup()

    def test_get_contract_by_id(self, test_client, test_db_manager):
        """Test getting specific contract"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id)

        try:
            # Create contract first
            contract_data = TestDataFactory.create_contract_data(company.id, user.id)
            headers = test_base.get_auth_headers(user.id)

            with patch("app.services.ai_service.ai_service") as mock_ai:
                mock_ai.generate_contract = AsyncMock(
                    return_value=Mock(
                        content="MOCK_CONTRACT_CONTENT",
                        model_name="test-model",
                        processing_time_ms=1000,
                    )
                )

                create_response = test_client.post(
                    "/api/v1/contracts/", json=contract_data, headers=headers
                )
                assert create_response.status_code == 201
                contract_id = create_response.json()["id"]

                # Get contract
                response = test_client.get(
                    f"/api/v1/contracts/{contract_id}", headers=headers
                )
                assert response.status_code == 200
                data = response.json()
                assert data["id"] == contract_id
                assert data["title"] == contract_data["title"]

        finally:
            test_base.cleanup()


@pytest.mark.e2e
class TestTemplateEndpoints:
    """Test template management endpoints"""

    def test_list_templates(self, test_client, test_db_manager):
        """Test template listing"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id)

        try:
            headers = test_base.get_auth_headers(user.id)
            response = test_client.get("/api/v1/templates/", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)

        finally:
            test_base.cleanup()

    def test_get_template_categories(self, test_client, test_db_manager):
        """Test getting template categories"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id)

        try:
            headers = test_base.get_auth_headers(user.id)
            response = test_client.get("/api/v1/templates/categories/", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)

        finally:
            test_base.cleanup()


@pytest.mark.e2e
class TestAnalyticsEndpoints:
    """Test analytics and reporting endpoints"""

    def test_dashboard_analytics(self, test_client, test_db_manager):
        """Test dashboard analytics endpoint"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id, role=UserRole.ADMIN)

        try:
            headers = test_base.get_auth_headers(user.id)
            response = test_client.get("/api/v1/analytics/dashboard", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert "total_contracts" in data
            assert "active_contracts" in data

        finally:
            test_base.cleanup()

    def test_business_analytics(self, test_client, test_db_manager):
        """Test business analytics endpoint"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id, role=UserRole.ADMIN)

        try:
            headers = test_base.get_auth_headers(user.id)
            response = test_client.get("/api/v1/analytics/business", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert "contract_value_metrics" in data

        finally:
            test_base.cleanup()


@pytest.mark.e2e
class TestSecurityEndpoints:
    """Test security and audit endpoints"""

    def test_security_events(self, test_client, test_db_manager):
        """Test security events endpoint"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id, role=UserRole.ADMIN)

        try:
            headers = test_base.get_auth_headers(user.id)
            response = test_client.get("/api/v1/security/events", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)

        finally:
            test_base.cleanup()

    def test_audit_logs(self, test_client, test_db_manager):
        """Test audit logs endpoint"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id, role=UserRole.ADMIN)

        try:
            headers = test_base.get_auth_headers(user.id)
            response = test_client.get("/api/v1/audit/entries", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "total" in data

        finally:
            test_base.cleanup()


@pytest.mark.e2e
class TestAIServiceEndpoints:
    """Test AI service endpoints"""

    def test_ai_health_check(self, test_client):
        """Test AI service health check"""
        with patch("app.services.ai_service.ai_service") as mock_ai:
            mock_ai.health_check = AsyncMock(
                return_value={
                    "status": "healthy",
                    "model": "test-model",
                    "response_time_ms": 45,
                }
            )

            response = test_client.get("/api/v1/ai/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"

    def test_ai_contract_analysis(self, test_client, test_db_manager):
        """Test AI contract analysis"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id)

        try:
            headers = test_base.get_auth_headers(user.id)
            analysis_request = {
                "contract_content": "TEST CONTRACT CONTENT",
                "analysis_type": "compliance",
            }

            with patch("app.services.ai_service.ai_service") as mock_ai:
                mock_ai.analyze_compliance = AsyncMock(
                    return_value=Mock(
                        overall_score=0.95,
                        risk_score=2,
                        risk_factors=["Standard terms"],
                        recommendations=["Add specific clauses"],
                    )
                )

                response = test_client.post(
                    "/api/v1/ai/analyze-contract",
                    json=analysis_request,
                    headers=headers,
                )
                assert response.status_code == 200
                data = response.json()
                assert "overall_score" in data
                assert "risk_score" in data

        finally:
            test_base.cleanup()


@pytest.mark.e2e
class TestErrorHandling:
    """Test error handling scenarios"""

    def test_unauthenticated_requests(self, test_client):
        """Test unauthenticated requests return 401"""
        response = test_client.get("/api/v1/contracts/")
        assert response.status_code in [401, 403]  # May return 403 for some endpoints

        response = test_client.get("/api/v1/auth/me")
        assert response.status_code in [401, 403]

    def test_invalid_contract_creation(self, test_client, test_db_manager):
        """Test invalid contract creation returns validation errors"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id)

        try:
            headers = test_base.get_auth_headers(user.id)
            invalid_data = {
                "title": "",  # Invalid: empty title
                "contract_type": "invalid_type",  # Invalid: not in enum
                "plain_english_input": "Too short",  # Invalid: too short
            }

            response = test_client.post(
                "/api/v1/contracts/", json=invalid_data, headers=headers
            )
            assert response.status_code == 422
            data = response.json()
            assert "detail" in data

        finally:
            test_base.cleanup()

    def test_nonexistent_resource(self, test_client, test_db_manager):
        """Test accessing nonexistent resources returns 404"""
        # Setup
        test_base = E2ETestBase(test_client, test_db_manager)
        company = test_base.create_test_company()
        user = test_base.create_test_user(company.id)

        try:
            headers = test_base.get_auth_headers(user.id)
            fake_id = str(uuid.uuid4())

            response = test_client.get(f"/api/v1/contracts/{fake_id}", headers=headers)
            assert response.status_code == 404

        finally:
            test_base.cleanup()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
