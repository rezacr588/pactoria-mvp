"""
Pytest configuration and shared fixtures for Pactoria MVP tests
"""
import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, Mock
from typing import Dict, Any

from app.main import app
from app.services.ai_service import GroqAIService
# Removed duplicate contract service import
from app.core.config import settings


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client():
    """Create a test client for FastAPI application"""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def mock_groq_service():
    """Mock Groq AI service for testing"""
    service = Mock(spec=GroqAIService)
    
    # Mock contract generation
    service.generate_contract = AsyncMock(return_value=(
        "MOCK_CONTRACT_CONTENT",
        {
            "model_used": "llama3-70b-8192",
            "processing_time_ms": 1500,
            "prompt_tokens": 150,
            "completion_tokens": 800,
            "total_tokens": 950,
            "confidence_score": 0.85,
            "input_prompt": "Mock input prompt..."
        }
    ))
    
    # Mock compliance validation
    service.validate_contract_compliance = AsyncMock(return_value={
        "overall_score": 0.92,
        "gdpr_compliance": 0.95,
        "employment_law_compliance": 0.90,
        "consumer_rights_compliance": 0.88,
        "commercial_terms_compliance": 0.94,
        "risk_score": 3,
        "risk_factors": ["Standard commercial terms", "Minor compliance gaps"],
        "recommendations": ["Add specific GDPR clauses", "Clarify termination terms"],
        "analysis_raw": "Mock compliance analysis...",
        "validation_method": "ai"
    })
    
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
            "address": "123 Test St, London, UK"
        },
        "compliance_level": "standard"
    }


@pytest.fixture
def sample_user_data():
    """Sample user data for testing with unique email"""
    import uuid
    return {
        "email": f"test-{uuid.uuid4().hex[:8]}@example.com",
        "password": "TestPassword123!",
        "full_name": "Test User",
        "company_name": "Test Company Ltd"
    }


@pytest.fixture
def mock_contract_service():
    """Mock contract application service for testing"""
    from app.application.services.contract_application_service import ContractApplicationService
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
        APP_VERSION="1.0.0"
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
            "registration_number": "12345678"
        },
        "compliance_level": "standard"
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