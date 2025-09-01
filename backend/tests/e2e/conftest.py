"""
E2E Test Configuration and Shared Fixtures
Provides comprehensive test setup for end-to-end testing scenarios
"""
import pytest
import asyncio
from typing import Dict, Any, List, AsyncGenerator, Generator
import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch
import time
import json
import websockets
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from app.main import app
from app.core.database import get_db, Base
from app.core.security import create_access_token, get_password_hash
from app.core.config import settings
from app.infrastructure.database.models import (
    User, Company, Contract, Template, AIGeneration, 
    ComplianceScore, AuditLog, ContractVersion,
    ContractType, ContractStatus, SubscriptionTier, UserRole
)
from app.services.ai_service import GroqAIService


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


class TestDataFactory:
    """Factory for creating consistent test data"""
    
    @staticmethod
    def create_company_data(name: str = None) -> Dict[str, Any]:
        """Create company test data"""
        unique_id = uuid.uuid4().hex[:8]
        return {
            "id": str(uuid.uuid4()),
            "name": name or f"Test Company {unique_id}",
            "registration_number": f"TC{unique_id.upper()}",
            "address": f"123 Test Street, London, SW1A 1AA",
            "subscription_tier": SubscriptionTier.STARTER,
            "max_users": 5
        }
    
    @staticmethod
    def create_user_data(email: str = None, company_id: str = None) -> Dict[str, Any]:
        """Create user test data"""
        unique_id = uuid.uuid4().hex[:8]
        return {
            "id": str(uuid.uuid4()),
            "email": email or f"user-{unique_id}@testcompany.com",
            "full_name": f"Test User {unique_id}",
            "password": "TestPassword123!",
            "hashed_password": get_password_hash("TestPassword123!"),
            "company_id": company_id,
            "role": UserRole.CONTRACT_MANAGER,
            "is_active": True,
            "timezone": "Europe/London"
        }
    
    @staticmethod
    def create_admin_user_data(company_id: str) -> Dict[str, Any]:
        """Create admin user test data"""
        data = TestDataFactory.create_user_data(company_id=company_id)
        data.update({
            "role": UserRole.ADMIN,
            "full_name": "Admin User",
            "email": f"admin-{uuid.uuid4().hex[:8]}@testcompany.com"
        })
        return data
    
    @staticmethod
    def create_contract_data(company_id: str, created_by: str, template_id: str = None) -> Dict[str, Any]:
        """Create contract test data"""
        unique_id = uuid.uuid4().hex[:8]
        return {
            "id": str(uuid.uuid4()),
            "title": f"Test Contract {unique_id}",
            "contract_type": ContractType.SERVICE_AGREEMENT,
            "status": ContractStatus.DRAFT,
            "plain_english_input": "Professional services agreement for consulting work with confidentiality clauses and payment terms.",
            "client_name": f"Client Corp {unique_id}",
            "client_email": f"client-{unique_id}@clientcorp.com",
            "supplier_name": f"Supplier Ltd {unique_id}",
            "contract_value": 50000.0,
            "currency": "GBP",
            "start_date": datetime.utcnow() + timedelta(days=1),
            "end_date": datetime.utcnow() + timedelta(days=365),
            "company_id": company_id,
            "template_id": template_id,
            "created_by": created_by,
            "version": 1,
            "is_current_version": True
        }
    
    @staticmethod
    def create_template_data(contract_type: ContractType = ContractType.SERVICE_AGREEMENT) -> Dict[str, Any]:
        """Create template test data"""
        return {
            "id": str(uuid.uuid4()),
            "name": f"Standard {contract_type.value.replace('_', ' ').title()}",
            "category": contract_type.value,
            "contract_type": contract_type,
            "description": f"Standard UK {contract_type.value.replace('_', ' ')} template",
            "template_content": "TEMPLATE_CONTENT_PLACEHOLDER",
            "compliance_features": ["gdpr", "commercial_law"],
            "version": "1.0",
            "is_active": True,
            "suitable_for": ["SMEs", "startups", "consulting"]
        }


@pytest.fixture
def test_data_factory():
    """Provide test data factory"""
    return TestDataFactory


@pytest.fixture
def mock_ai_service():
    """Comprehensive AI service mock"""
    mock = Mock(spec=GroqAIService)
    
    # Mock contract generation
    mock.generate_contract = AsyncMock(return_value=Mock(
        content="GENERATED_CONTRACT_CONTENT",
        model_name="llama3-70b-8192",
        model_version="1.0",
        processing_time_ms=2500,
        token_usage={"prompt_tokens": 200, "completion_tokens": 1200, "total_tokens": 1400},
        confidence_score=0.92
    ))
    
    # Mock compliance analysis
    mock.analyze_compliance = AsyncMock(return_value=Mock(
        overall_score=0.94,
        gdpr_compliance=0.96,
        employment_law_compliance=0.92,
        consumer_rights_compliance=0.90,
        commercial_terms_compliance=0.95,
        risk_score=2,
        risk_factors=["Minor termination clause gaps", "Standard liability terms"],
        recommendations=["Add GDPR Article 28 clauses", "Clarify IP ownership", "Define liability caps"],
        analysis_raw="Comprehensive compliance analysis completed"
    ))
    
    # Mock health check
    mock.health_check = AsyncMock(return_value={
        "status": "healthy",
        "model": "llama3-70b-8192",
        "response_time_ms": 45
    })
    
    return mock


@pytest.fixture
def client(test_database, mock_ai_service):
    """Test client with mocked AI service"""
    with patch('app.services.ai_service.ai_service', mock_ai_service):
        with TestClient(app) as client:
            yield client


class E2ETestBase:
    """Base class for E2E tests with common utilities"""
    
    def __init__(self, client: TestClient, db: Session):
        self.client = client
        self.db = db
        self.created_entities = {
            'users': [],
            'companies': [],
            'contracts': [],
            'templates': []
        }
    
    def create_test_company(self, data: Dict[str, Any] = None) -> Company:
        """Create a test company in database"""
        company_data = data or TestDataFactory.create_company_data()
        
        company = Company(**{k: v for k, v in company_data.items() if k != 'password'})
        self.db.add(company)
        self.db.commit()
        self.db.refresh(company)
        
        self.created_entities['companies'].append(company.id)
        return company
    
    def create_test_user(self, company: Company, data: Dict[str, Any] = None) -> User:
        """Create a test user in database"""
        user_data = data or TestDataFactory.create_user_data(company_id=company.id)
        
        user = User(**{k: v for k, v in user_data.items() if k != 'password'})
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        self.created_entities['users'].append(user.id)
        return user
    
    def create_test_contract(self, company: Company, user: User, data: Dict[str, Any] = None) -> Contract:
        """Create a test contract in database"""
        contract_data = data or TestDataFactory.create_contract_data(
            company_id=company.id,
            created_by=user.id
        )
        
        contract = Contract(**contract_data)
        self.db.add(contract)
        self.db.commit()
        self.db.refresh(contract)
        
        self.created_entities['contracts'].append(contract.id)
        return contract
    
    def create_test_template(self, data: Dict[str, Any] = None) -> Template:
        """Create a test template in database"""
        template_data = data or TestDataFactory.create_template_data()
        
        template = Template(**template_data)
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        
        self.created_entities['templates'].append(template.id)
        return template
    
    def get_auth_headers(self, user: User) -> Dict[str, str]:
        """Generate authentication headers for user"""
        token = create_access_token(subject=user.id)
        return {"Authorization": f"Bearer {token}"}
    
    def assert_response_success(self, response, expected_status: int = 200):
        """Assert response is successful"""
        assert response.status_code == expected_status, f"Expected {expected_status}, got {response.status_code}. Response: {response.text}"
    
    def assert_response_error(self, response, expected_status: int):
        """Assert response has expected error status"""
        assert response.status_code == expected_status, f"Expected {expected_status}, got {response.status_code}"
    
    def cleanup(self):
        """Clean up created test entities"""
        for contract_id in self.created_entities['contracts']:
            self.db.query(Contract).filter(Contract.id == contract_id).delete()
        
        for user_id in self.created_entities['users']:
            self.db.query(User).filter(User.id == user_id).delete()
        
        for company_id in self.created_entities['companies']:
            self.db.query(Company).filter(Company.id == company_id).delete()
        
        for template_id in self.created_entities['templates']:
            self.db.query(Template).filter(Template.id == template_id).delete()
        
        self.db.commit()


@pytest.fixture
def e2e_test_base(client, test_database):
    """Provide E2E test base with automatic cleanup"""
    db = next(get_db())
    test_base = E2ETestBase(client, db)
    
    yield test_base
    
    # Cleanup after test
    test_base.cleanup()


class WebSocketTestHelper:
    """Helper for WebSocket testing"""
    
    def __init__(self, base_url: str = "ws://localhost:8000"):
        self.base_url = base_url
        self.connections: List[websockets.WebSocketServerProtocol] = []
    
    @asynccontextmanager
    async def websocket_connection(self, token: str, endpoint: str = "/api/v1/ws/connect"):
        """Create WebSocket connection with authentication"""
        uri = f"{self.base_url}{endpoint}?token={token}"
        
        try:
            websocket = await websockets.connect(uri)
            self.connections.append(websocket)
            yield websocket
        finally:
            if websocket in self.connections:
                await websocket.close()
                self.connections.remove(websocket)
    
    async def send_message(self, websocket, message_type: str, data: Dict[str, Any] = None):
        """Send structured message to WebSocket"""
        message = {
            "type": message_type,
            "data": data or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        await websocket.send(json.dumps(message))
    
    async def receive_message(self, websocket, timeout: float = 5.0) -> Dict[str, Any]:
        """Receive and parse WebSocket message"""
        try:
            message_str = await asyncio.wait_for(websocket.recv(), timeout=timeout)
            return json.loads(message_str)
        except asyncio.TimeoutError:
            raise TimeoutError(f"No message received within {timeout} seconds")
    
    async def cleanup(self):
        """Close all open connections"""
        for websocket in self.connections[:]:
            await websocket.close()
        self.connections.clear()


@pytest.fixture
def websocket_helper():
    """Provide WebSocket test helper"""
    helper = WebSocketTestHelper()
    yield helper
    # Cleanup handled by WebSocketTestHelper


class PerformanceTestHelper:
    """Helper for performance testing"""
    
    def __init__(self):
        self.metrics = {}
    
    def measure_time(self, operation_name: str):
        """Context manager for measuring operation time"""
        return self._TimeContext(self, operation_name)
    
    class _TimeContext:
        def __init__(self, helper, operation_name):
            self.helper = helper
            self.operation_name = operation_name
            self.start_time = None
        
        def __enter__(self):
            self.start_time = time.time()
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            if self.start_time:
                duration_ms = (time.time() - self.start_time) * 1000
                self.helper.record_metric(self.operation_name, duration_ms)
    
    def record_metric(self, name: str, value: float):
        """Record performance metric"""
        if name not in self.metrics:
            self.metrics[name] = []
        self.metrics[name].append(value)
    
    def get_average(self, metric_name: str) -> float:
        """Get average value for metric"""
        if metric_name not in self.metrics:
            return 0.0
        values = self.metrics[metric_name]
        return sum(values) / len(values)
    
    def get_max(self, metric_name: str) -> float:
        """Get maximum value for metric"""
        if metric_name not in self.metrics:
            return 0.0
        return max(self.metrics[metric_name])
    
    def assert_performance(self, metric_name: str, max_time_ms: float):
        """Assert performance meets requirements"""
        avg_time = self.get_average(metric_name)
        max_time = self.get_max(metric_name)
        
        assert avg_time <= max_time_ms, f"Average {metric_name} time {avg_time:.2f}ms exceeds limit {max_time_ms}ms"
        assert max_time <= max_time_ms * 2, f"Max {metric_name} time {max_time:.2f}ms exceeds limit {max_time_ms * 2}ms"


@pytest.fixture
def performance_helper():
    """Provide performance test helper"""
    return PerformanceTestHelper()


# Test scenarios data
@pytest.fixture
def contract_scenarios():
    """Different contract test scenarios"""
    return [
        {
            "name": "simple_service_agreement",
            "data": {
                "title": "Simple Consulting Agreement",
                "contract_type": "service_agreement",
                "plain_english_input": "Basic consulting services with monthly payments",
                "contract_value": 25000,
                "currency": "GBP"
            }
        },
        {
            "name": "complex_employment_contract",
            "data": {
                "title": "Senior Developer Employment Contract",
                "contract_type": "employment_contract", 
                "plain_english_input": "Full-time employment with equity, benefits, and remote work provisions",
                "contract_value": 85000,
                "currency": "GBP"
            }
        },
        {
            "name": "nda_with_suppliers",
            "data": {
                "title": "Supplier Non-Disclosure Agreement",
                "contract_type": "nda",
                "plain_english_input": "Confidentiality agreement for sharing proprietary information with suppliers",
                "contract_value": 0,
                "currency": "GBP"
            }
        }
    ]


@pytest.fixture
def bulk_operation_data():
    """Data for bulk operations testing"""
    return {
        "contract_updates": [
            {"contract_id": "contract-1", "status": "active"},
            {"contract_id": "contract-2", "status": "completed"},
            {"contract_id": "contract-3", "client_name": "Updated Client"}
        ],
        "user_invitations": [
            {"email": "newuser1@company.com", "role": "contract_manager", "department": "Legal"},
            {"email": "newuser2@company.com", "role": "legal_reviewer", "department": "Compliance"},
            {"email": "newuser3@company.com", "role": "viewer", "department": "Finance"}
        ],
        "export_requests": [
            {"format": "csv", "fields": ["title", "status", "client_name", "contract_value"]},
            {"format": "excel", "fields": ["title", "contract_type", "created_at", "compliance_score"]},
            {"format": "json", "include_content": True}
        ]
    }


@pytest.fixture
def error_scenarios():
    """Error scenarios for testing"""
    return {
        "invalid_auth": [
            {"token": None, "expected_status": 401},
            {"token": "invalid_token", "expected_status": 401},
            {"token": "expired_token", "expected_status": 401}
        ],
        "validation_errors": [
            {"data": {"title": ""}, "field": "title", "expected_status": 422},
            {"data": {"contract_type": "invalid"}, "field": "contract_type", "expected_status": 422},
            {"data": {"plain_english_input": "x"}, "field": "plain_english_input", "expected_status": 422}
        ],
        "business_rule_violations": [
            {"scenario": "exceed_user_limit", "expected_status": 400},
            {"scenario": "duplicate_email", "expected_status": 409},
            {"scenario": "invalid_company_access", "expected_status": 403}
        ]
    }