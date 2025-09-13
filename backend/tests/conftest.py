"""
Pytest configuration and shared fixtures for Pactoria MVP tests
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, Mock, patch
from typing import Dict, Any
import os
import tempfile

from app.main import app
from app.services.ai_service import GroqAIService

# Removed duplicate contract service import
from app.core.config import settings
from app.core.database import Base, create_tables
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def test_database():
    """Set up isolated test database with all tables using in-memory SQLite"""
    # Create a test engine with in-memory database (unique per test)
    test_engine = create_engine(
        f"sqlite:///:memory:", connect_args={"check_same_thread": False}
    )

    # Import all models to ensure they're registered with Base
    from app.infrastructure.database.models import (
        User,
        Company,
        Contract,
        Template,
        AIGeneration,
        ComplianceScore,
        AuditLog,
        ContractVersion,
        SystemMetrics,
        Notification,
        Integration,
        IntegrationConnection,
        TeamInvitation,
        Base,
    )

    # Create all tables for testing
    Base.metadata.create_all(bind=test_engine)

    # Verify tables were created (for debugging)
    from sqlalchemy import inspect

    inspector = inspect(test_engine)
    tables = inspector.get_table_names()
    print(f"Test database created with tables: {tables}")

    # Override the database dependency for testing
    from app.core.database import get_db

    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine
    )

    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()

    # Clear existing overrides first
    app.dependency_overrides.clear()
    # Override dependency and patch direct SessionLocal usage
    app.dependency_overrides[get_db] = override_get_db

    # Patch SessionLocal in database module to prevent direct access
    with patch("app.core.database.SessionLocal", TestingSessionLocal):
        yield test_engine

    # Cleanup
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def isolated_test_db():
    """Use for unit tests that need isolated database"""
    # For unit tests, use isolated database
    pass


@pytest.fixture
def client(test_database):
    """Create a test client for FastAPI application with test database"""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def mock_groq_service():
    """Mock Groq AI service for testing"""
    service = Mock(spec=GroqAIService)

    # Mock contract generation
    service.generate_contract = AsyncMock(
        return_value=(
            "MOCK_CONTRACT_CONTENT",
            {
                "model_used": "llama3-70b-8192",
                "processing_time_ms": 1500,
                "prompt_tokens": 150,
                "completion_tokens": 800,
                "total_tokens": 950,
                "confidence_score": 0.85,
                "input_prompt": "Mock input prompt...",
            },
        )
    )

    # Mock compliance validation
    service.validate_contract_compliance = AsyncMock(
        return_value={
            "overall_score": 0.92,
            "gdpr_compliance": 0.95,
            "employment_law_compliance": 0.90,
            "consumer_rights_compliance": 0.88,
            "commercial_terms_compliance": 0.94,
            "risk_score": 3,
            "risk_factors": ["Standard commercial terms", "Minor compliance gaps"],
            "recommendations": [
                "Add specific GDPR clauses",
                "Clarify termination terms",
            ],
            "analysis_raw": "Mock compliance analysis...",
            "validation_method": "ai",
        }
    )

    return service


@pytest.fixture
def sample_contract_data():
    """Sample contract data for testing"""
    return {
        "title": "Test Service Agreement",
        "contract_type": "service_agreement",
        "plain_english_input": "I need a service agreement for consulting work with payment terms of 30 days and confidentiality clauses.",
        "company_details": {
            "name": "Test Company Ltd",
            "registration_number": "12345678",
            "address": "123 Test St, London, UK",
        },
        "compliance_level": "standard",
    }


@pytest.fixture
def sample_user_data():
    """Sample user data for testing with unique email"""
    import uuid

    return {
        "email": f"test-{uuid.uuid4().hex[:8]}@example.com",
        "password": "TestPassword123!",
        "full_name": "Test User",
        "company_name": "Test Company Ltd",
    }


@pytest.fixture
def mock_contract_service():
    """Mock contract application service for testing"""
    from app.application.services.contract_application_service import (
        ContractApplicationService,
    )

    service = Mock(spec=ContractApplicationService)

    # Mock contract creation
    from app.domain.entities.contract import Contract, ContractId
    from app.domain.value_objects import ContractType, ContractStatus

    mock_contract = Mock(spec=Contract)
    mock_contract.id = ContractId("test-contract-id")
    mock_contract.title = "Test Contract"
    mock_contract.contract_type = ContractType.SERVICE_AGREEMENT
    mock_contract.status = ContractStatus.DRAFT
    mock_contract.version = 1

    service.create_contract = AsyncMock(return_value=mock_contract)

    # Mock contract listing with PageResult
    from app.domain.repositories.contract_repository import PageResult

    mock_page_result = Mock(spec=PageResult)
    mock_page_result.items = []
    mock_page_result.total = 0
    mock_page_result.page = 1
    mock_page_result.size = 20
    mock_page_result.pages = 0

    service.get_contracts_by_company = AsyncMock(return_value=mock_page_result)

    return service


@pytest.fixture
def auth_headers():
    """Generate auth headers for authenticated requests"""
    # Mock JWT token - in real tests, generate proper token
    mock_token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNjk5OTk5OTk5fQ.mock_signature"
    return {"Authorization": f"Bearer {mock_token}"}


@pytest.fixture
def mock_settings():
    """Mock settings for testing"""
    from types import SimpleNamespace

    return SimpleNamespace(
        SECRET_KEY="test-secret-key",
        GROQ_API_KEY="test-groq-key",
        GROQ_MODEL="openai/gpt-oss-120b",
        JWT_ALGORITHM="HS256",
        JWT_EXPIRATION_HOURS=24,
        MAX_USERS_PER_ACCOUNT=5,
        MIN_COMPLIANCE_SCORE=0.95,
        APP_VERSION="1.0.0",
    )


# Test data fixtures
@pytest.fixture
def valid_contract_request():
    """Valid contract generation request"""
    return {
        "title": "Professional Services Agreement",
        "contract_type": "service_agreement",
        "plain_english_input": "I need a contract for professional consulting services. The work involves business analysis and recommendations. Payment should be monthly within 30 days. The contract should include confidentiality clauses and IP ownership terms.",
        "company_details": {
            "name": "Example Consulting Ltd",
            "registration_number": "12345678",
        },
        "compliance_level": "standard",
    }


@pytest.fixture
def invalid_contract_request():
    """Invalid contract generation request"""
    return {
        "title": "",  # Invalid: empty title
        "contract_type": "invalid_type",  # Invalid: not in enum
        "plain_english_input": "Too short",  # Invalid: too short
    }


@pytest.fixture
def sample_generated_contract():
    """Sample generated contract content"""
    return """
PROFESSIONAL SERVICES AGREEMENT

This Professional Services Agreement ("Agreement") is entered into on [DATE] between:

1. CLIENT: [CLIENT_NAME], a company incorporated in England and Wales with company number [COMPANY_NUMBER], having its registered office at [CLIENT_ADDRESS] ("Client")

2. SERVICE PROVIDER: [PROVIDER_NAME], a company incorporated in England and Wales with company number [PROVIDER_NUMBER], having its registered office at [PROVIDER_ADDRESS] ("Service Provider")

WHEREAS, Client desires to obtain certain professional services from Service Provider, and Service Provider is willing to provide such services subject to the terms and conditions set forth herein;

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, the parties agree as follows:

1. SERVICES
Service Provider shall provide business analysis and recommendation services as detailed in Schedule A attached hereto and incorporated herein by reference.

2. PAYMENT TERMS
Client shall pay Service Provider the fees set forth in Schedule B. Payment is due within thirty (30) days of invoice date.

3. CONFIDENTIALITY
Both parties acknowledge they may have access to confidential information and agree to maintain strict confidentiality.

4. INTELLECTUAL PROPERTY
All work product created by Service Provider in the course of providing services shall be the exclusive property of Client.

5. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of England and Wales.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.
"""


# Helper functions for database setup
def create_test_company(db=None, **kwargs):
    """Create a test company with default values"""
    from app.infrastructure.database.models import Company, SubscriptionTier, User, UserRole
    from app.domain.entities.company import CompanyType, IndustryType
    from app.core.security import get_password_hash
    import uuid

    # If no created_by_user_id is provided, create a minimal admin user first
    if 'created_by_user_id' not in kwargs:
        # Create a temporary admin user for the company
        admin_user_id = str(uuid.uuid4())
        temp_company_id = str(uuid.uuid4())  # We'll use this as the final company ID
        
        admin_user = User(
            id=admin_user_id,
            email=f"admin-{uuid.uuid4().hex[:8]}@example.com",
            full_name="Test Admin",
            hashed_password=get_password_hash("testpassword"),
            is_active=True,
            is_admin=True,
            role=UserRole.ADMIN,
            company_id=temp_company_id,
            department="Administration",
            timezone="Europe/London",
            notification_preferences={}
        )
        
        if db:
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        
        kwargs['created_by_user_id'] = admin_user_id
        kwargs['id'] = temp_company_id  # Use the same ID we referenced in the user

    defaults = {
        "id": str(uuid.uuid4()),
        "name": "Test Company Ltd",
        "company_number": "12345678",  # Changed from registration_number
        "company_type": CompanyType.PRIVATE_LIMITED,  # Use correct enum value
        "industry": IndustryType.TECHNOLOGY,  # Add required industry  
        "primary_contact_email": "test@company.com",  # Add required email
        "address_line1": "123 Test St",  # Changed from address
        "city": "London",  # Add required city
        "postcode": "SW1A 1AA",  # Add required postcode
        "subscription_tier": SubscriptionTier.PROFESSIONAL,
        "max_users": 10,
    }
    defaults.update(kwargs)

    company = Company(**defaults)

    if db:
        db.add(company)
        db.commit()
        db.refresh(company)

    return company


def create_test_user(db, company_id, role=None, **kwargs):
    """Create a test user with default values"""
    from app.infrastructure.database.models import User, UserRole
    from app.core.security import get_password_hash
    import uuid

    defaults = {
        "id": str(uuid.uuid4()),
        "email": f"test-{uuid.uuid4().hex[:8]}@example.com",
        "full_name": "Test User",
        "hashed_password": get_password_hash("testpassword"),
        "is_active": True,
        "is_admin": False,
        "role": role or UserRole.CONTRACT_MANAGER,
        "company_id": company_id,
        "department": "Test Department",
        "timezone": "Europe/London",
        "notification_preferences": {},
    }
    defaults.update(kwargs)

    user = User(**defaults)

    if db:
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def override_get_db():
    """Override database dependency for tests"""
    pass  # This will be implemented per test fixture


@pytest.fixture
def db_session(test_database):
    """Provide database session for tests"""
    from sqlalchemy.orm import sessionmaker

    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_database
    )
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
