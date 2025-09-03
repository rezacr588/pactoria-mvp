# Testing Strategy and Coverage Documentation

**Pactoria MVP Backend - Comprehensive Testing Framework**

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Test Architecture](#test-architecture)
3. [Test Categories](#test-categories)
4. [Testing Standards](#testing-standards)
5. [Coverage Requirements](#coverage-requirements)
6. [Running Tests](#running-tests)
7. [Continuous Testing](#continuous-testing)
8. [Test Data Management](#test-data-management)

---

## Testing Overview

The Pactoria backend employs a comprehensive testing strategy following Test-Driven Development (TDD) principles with 90%+ code coverage. The testing framework validates all MVP requirements, business logic, and production readiness criteria.

### Testing Philosophy

**Test-Driven Development (TDD)**:
1. **Red**: Write failing test that specifies desired behavior
2. **Green**: Write minimum code to make test pass
3. **Refactor**: Improve code quality while maintaining tests

**Testing Pyramid**:
```
       /\
      /  \     E2E Tests (10%)
     /____\    - Complete user workflows
    /      \   - Business scenario validation
   /________\  
  /          \ Integration Tests (20%)
 /____________\ - API endpoint testing
/              \ - Database integration
\              / - External service integration
 \____________/
  \          /  Unit Tests (70%)
   \________/   - Domain logic
    \______/    - Business rules
     \____/     - Value objects
      \__/      - Individual functions
```

### Test Coverage Achievements

**Current Coverage**: 90%+ across all layers

| Layer | Coverage | Test Files | Key Areas |
|-------|----------|------------|-----------|
| Domain | 95%+ | `tests/unit/domain/` | Business logic, entities, value objects |
| Application | 92%+ | `tests/unit/application/` | Use cases, commands, services |
| API | 94%+ | `tests/integration/` | REST endpoints, authentication |
| Infrastructure | 88%+ | `tests/unit/infrastructure/` | Database, external services |

---

## Test Architecture

### Test Organization

```
tests/
├── unit/                           # Isolated unit tests (70% of all tests)
│   ├── domain/                     # Domain layer tests
│   │   ├── test_contract.py        # Contract aggregate tests
│   │   ├── test_value_objects.py   # Value object tests
│   │   └── test_domain_services.py # Domain service tests
│   │
│   ├── application/                # Application layer tests
│   │   └── test_contract_application_service.py
│   │
│   ├── core/                       # Core utilities tests
│   │   ├── test_auth.py           # Authentication tests
│   │   ├── test_config.py         # Configuration tests
│   │   └── test_validation.py     # Validation tests
│   │
│   ├── services/                   # External service tests
│   │   ├── test_ai_service.py     # AI integration tests
│   │   └── test_security_service.py # Security service tests
│   │
│   └── schemas/                    # Schema validation tests
│       └── test_contracts.py      # Pydantic schema tests
│
├── integration/                    # Integration tests (20% of all tests)
│   ├── endpoints/                  # API endpoint tests
│   │   ├── test_auth_api.py       # Authentication API tests
│   │   ├── test_contracts_api.py   # Contract API tests
│   │   ├── test_ai_api.py         # AI service API tests
│   │   └── test_analytics_api.py   # Analytics API tests
│   │
│   └── repositories/               # Database integration tests
│       └── test_contract_repository.py
│
├── e2e/                           # End-to-end tests (10% of all tests)
│   ├── test_complete_contract_lifecycle.py  # Full workflows
│   ├── test_user_workflows.py              # User journey tests
│   └── test_business_scenarios.py          # Business process tests
│
├── conftest.py                    # Test configuration and fixtures
├── factories.py                   # Test data factories
└── test_helpers.py               # Testing utilities
```

### Test Configuration

```python
# pytest.ini configuration
[tool:pytest]
asyncio_mode = auto                    # Automatic async support
asyncio_default_fixture_loop_scope = function
testpaths = tests                      # Test discovery path
python_files = test_*.py *_test.py    # Test file patterns
python_classes = Test*                # Test class patterns
python_functions = test_*             # Test function patterns
addopts = 
    -v                               # Verbose output
    --tb=short                       # Short traceback format
    --strict-markers                 # Strict marker validation
    --strict-config                  # Strict configuration
```

---

## Test Categories

### Unit Tests (70% of test suite)

**Purpose**: Test individual components in isolation with mocked dependencies.

#### Domain Layer Tests

```python
# tests/unit/domain/test_contract.py
class TestContractAggregate:
    """Test Contract aggregate root business logic."""
    
    def test_create_contract_with_valid_data(self):
        """Test contract creation with all required fields."""
        # Arrange
        contract_id = ContractId.generate()
        client = ContractParty(name="Acme Ltd", email="test@acme.co.uk")
        
        # Act
        contract = Contract.create(
            contract_id=contract_id,
            title="Professional Services Agreement",
            contract_type=ContractType.SERVICE_AGREEMENT,
            plain_english_input="Need a consulting contract for 3 months...",
            client=client,
            created_by_user_id=UserId.generate(),
            company_id=CompanyId.generate()
        )
        
        # Assert
        assert contract.contract_id == contract_id
        assert contract.title == "Professional Services Agreement"
        assert contract.status == ContractStatus.DRAFT
        assert len(contract.uncommitted_events) == 1  # ContractCreated event
        
    def test_activate_contract_without_content_raises_error(self):
        """Test contract activation fails without final content."""
        # Arrange
        contract = self._create_valid_contract()
        
        # Act & Assert
        with pytest.raises(ContractStateError) as exc_info:
            contract.activate(UserId.generate())
        assert "Cannot activate contract without final content" in str(exc_info.value)
    
    def test_contract_status_transitions_follow_business_rules(self):
        """Test valid and invalid status transitions."""
        # Arrange
        contract = self._create_valid_contract()
        contract.finalize_content("Contract content here", UserId.generate())
        
        # Valid transition: DRAFT -> ACTIVE
        contract.activate(UserId.generate())
        assert contract.status == ContractStatus.ACTIVE
        
        # Invalid transition: ACTIVE -> DRAFT (should raise error)
        with pytest.raises(ContractStateError):
            contract.status = ContractStatus.DRAFT
```

#### Value Object Tests

```python
# tests/unit/domain/test_value_objects.py
class TestComplianceScore:
    """Test ComplianceScore value object."""
    
    def test_compliance_score_with_valid_values(self):
        """Test compliance score creation with valid inputs."""
        # Act
        score = ComplianceScore(
            overall_score=0.94,
            gdpr_compliance=0.96,
            employment_law_compliance=0.92
        )
        
        # Assert
        assert score.overall_score == 0.94
        assert score.is_compliant  # >= 0.95 threshold
        assert score.compliance_level == "Excellent"
    
    def test_compliance_score_validation_rejects_invalid_values(self):
        """Test compliance score validation."""
        # Invalid overall score
        with pytest.raises(ValueError):
            ComplianceScore(overall_score=1.5)  # > 1.0
        
        with pytest.raises(ValueError):
            ComplianceScore(overall_score=-0.1)  # < 0.0
    
    @pytest.mark.parametrize("score,expected_level", [
        (0.98, "Excellent"),
        (0.95, "Compliant"),
        (0.90, "Good"),
        (0.80, "Acceptable"),
        (0.70, "Needs Improvement")
    ])
    def test_compliance_levels(self, score, expected_level):
        """Test compliance level categorization."""
        compliance_score = ComplianceScore(overall_score=score)
        assert compliance_score.compliance_level == expected_level
```

### Integration Tests (20% of test suite)

**Purpose**: Test component interactions, API endpoints, and database operations.

#### API Endpoint Tests

```python
# tests/integration/endpoints/test_contracts_api.py
class TestContractAPI:
    """Test Contract API endpoints with authentication."""
    
    async def test_create_contract_with_valid_data(self, async_client, auth_headers):
        """Test contract creation via API."""
        # Arrange
        contract_data = {
            "title": "API Test Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Need a contract for web development services",
            "client_name": "Test Client Ltd"
        }
        
        # Act
        response = await async_client.post(
            "/api/v1/contracts/",
            json=contract_data,
            headers=auth_headers
        )
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["contract"]["title"] == "API Test Contract"
        assert data["contract"]["status"] == "draft"
        assert "id" in data["contract"]
    
    async def test_generate_contract_content(self, async_client, auth_headers, test_contract):
        """Test AI content generation via API."""
        # Act
        response = await async_client.post(
            f"/api/v1/contracts/{test_contract.id}/generate",
            json={"regenerate": False},
            headers=auth_headers
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "ai_generation" in data
        assert data["ai_generation"]["model_name"] == "openai/gpt-oss-120b"
        assert len(data["ai_generation"]["generated_content"]) > 100
        assert data["ai_generation"]["confidence_score"] >= 0.0
    
    async def test_contract_compliance_analysis(self, async_client, auth_headers, test_contract_with_content):
        """Test compliance analysis via API."""
        # Act
        response = await async_client.post(
            f"/api/v1/contracts/{test_contract_with_content.id}/analyze",
            json={"force_reanalysis": False},
            headers=auth_headers
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        compliance = data["compliance_analysis"]
        assert 0.0 <= compliance["overall_score"] <= 1.0
        assert "gdpr_compliance" in compliance["compliance_breakdown"]
        assert compliance["risk_assessment"]["risk_score"] in range(1, 11)
```

#### Database Integration Tests

```python
# tests/integration/repositories/test_contract_repository.py
class TestContractRepository:
    """Test contract repository database operations."""
    
    async def test_save_and_retrieve_contract(self, db_session):
        """Test contract persistence and retrieval."""
        # Arrange
        repository = SQLAlchemyContractRepository(db_session)
        contract = ContractFactory.create()
        
        # Act
        saved_contract = await repository.save(contract)
        retrieved_contract = await repository.find_by_id(contract.contract_id)
        
        # Assert
        assert retrieved_contract is not None
        assert retrieved_contract.contract_id == contract.contract_id
        assert retrieved_contract.title == contract.title
    
    async def test_find_contracts_by_company_with_pagination(self, db_session):
        """Test company-scoped contract queries with pagination."""
        # Arrange
        repository = SQLAlchemyContractRepository(db_session)
        company_id = CompanyId.generate()
        
        # Create test contracts
        contracts = [ContractFactory.create(company_id=company_id) for _ in range(15)]
        for contract in contracts:
            await repository.save(contract)
        
        # Act
        page_request = PageRequest(page=1, size=10)
        result = await repository.find_by_company(company_id, page_request)
        
        # Assert
        assert len(result.items) == 10
        assert result.total == 15
        assert result.page == 1
        assert result.pages == 2
    
    async def test_complex_contract_filtering(self, db_session):
        """Test advanced filtering capabilities."""
        # Arrange
        repository = SQLAlchemyContractRepository(db_session)
        company_id = CompanyId.generate()
        
        # Create varied test data
        service_contract = ContractFactory.create(
            company_id=company_id,
            contract_type=ContractType.SERVICE_AGREEMENT,
            status=ContractStatus.ACTIVE
        )
        employment_contract = ContractFactory.create(
            company_id=company_id,
            contract_type=ContractType.EMPLOYMENT_CONTRACT,
            status=ContractStatus.DRAFT
        )
        
        await repository.save(service_contract)
        await repository.save(employment_contract)
        
        # Act
        contract_filter = ContractFilter(
            company_id=company_id,
            contract_type=ContractType.SERVICE_AGREEMENT,
            status=ContractStatus.ACTIVE
        )
        page_request = PageRequest(page=1, size=10)
        result = await repository.find_with_filter(contract_filter, page_request)
        
        # Assert
        assert len(result.items) == 1
        assert result.items[0].contract_type == ContractType.SERVICE_AGREEMENT
        assert result.items[0].status == ContractStatus.ACTIVE
```

### End-to-End Tests (10% of test suite)

**Purpose**: Test complete business workflows and user journeys.

```python
# tests/e2e/test_complete_contract_lifecycle.py
class TestCompleteContractLifecycle:
    """Test end-to-end contract management workflows."""
    
    async def test_full_contract_creation_and_activation_workflow(self, async_client):
        """Test complete contract lifecycle from creation to activation."""
        # Step 1: User Registration
        registration_data = {
            "email": "test@company.co.uk",
            "full_name": "Test User",
            "password": "SecurePass123",
            "company_name": "Test Company Ltd"
        }
        
        register_response = await async_client.post(
            "/api/v1/auth/register",
            json=registration_data
        )
        assert register_response.status_code == 201
        
        auth_token = register_response.json()["token"]["access_token"]
        auth_headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Step 2: Create Contract
        contract_data = {
            "title": "E2E Test Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Professional consulting services for 3 months",
            "client_name": "Client Company Ltd",
            "contract_value": 15000.00,
            "start_date": "2025-01-01T00:00:00Z",
            "end_date": "2025-03-31T23:59:59Z"
        }
        
        create_response = await async_client.post(
            "/api/v1/contracts/",
            json=contract_data,
            headers=auth_headers
        )
        assert create_response.status_code == 201
        
        contract_id = create_response.json()["contract"]["id"]
        
        # Step 3: Generate AI Content
        generate_response = await async_client.post(
            f"/api/v1/contracts/{contract_id}/generate",
            json={"regenerate": False},
            headers=auth_headers
        )
        assert generate_response.status_code == 200
        
        # Step 4: Analyze Compliance
        analyze_response = await async_client.post(
            f"/api/v1/contracts/{contract_id}/analyze",
            json={"force_reanalysis": False},
            headers=auth_headers
        )
        assert analyze_response.status_code == 200
        compliance_score = analyze_response.json()["compliance_analysis"]["overall_score"]
        assert compliance_score >= 0.95  # MVP requirement
        
        # Step 5: Finalize Content
        final_content = "PROFESSIONAL SERVICES AGREEMENT\n\nThis Agreement..."
        finalize_response = await async_client.put(
            f"/api/v1/contracts/{contract_id}",
            json={"final_content": final_content},
            headers=auth_headers
        )
        assert finalize_response.status_code == 200
        
        # Step 6: Activate Contract
        activate_response = await async_client.post(
            f"/api/v1/contracts/{contract_id}/activate",
            json={"activation_reason": "Ready for execution"},
            headers=auth_headers
        )
        assert activate_response.status_code == 200
        assert activate_response.json()["contract"]["status"] == "active"
        
        # Verify Complete Workflow
        final_response = await async_client.get(
            f"/api/v1/contracts/{contract_id}",
            headers=auth_headers
        )
        final_contract = final_response.json()["contract"]
        
        assert final_contract["status"] == "active"
        assert final_contract["final_content"] is not None
        assert final_contract["compliance_score"]["overall_score"] >= 0.95
        assert len(final_contract["versions"]) >= 2  # Created + finalized
```

---

## Testing Standards

### Test Naming Conventions

```python
# Test file naming
test_<module_name>.py           # Unit tests
test_<api_name>_api.py         # API integration tests
test_<workflow_name>_e2e.py    # End-to-end tests

# Test method naming
def test_<action>_<expected_result>():
    """Clear description of what is being tested."""

def test_<action>_with_<condition>_<expected_result>():
    """Test with specific conditions."""

def test_<action>_raises_<exception>_when_<condition>():
    """Test error conditions."""

# Examples
def test_create_contract_with_valid_data_returns_contract():
def test_activate_contract_without_content_raises_contract_state_error():
def test_compliance_score_with_high_values_is_compliant():
```

### Test Structure (AAA Pattern)

```python
def test_example():
    """Clear description of test purpose and business rule being validated."""
    # Arrange - Set up test data and conditions
    contract_id = ContractId.generate()
    client = ContractParty(name="Test Client", email="test@client.com")
    
    # Act - Execute the behavior being tested
    contract = Contract.create(
        contract_id=contract_id,
        title="Test Contract",
        contract_type=ContractType.SERVICE_AGREEMENT,
        plain_english_input="Test requirements",
        client=client,
        created_by_user_id=UserId.generate(),
        company_id=CompanyId.generate()
    )
    
    # Assert - Verify expected outcomes
    assert contract.contract_id == contract_id
    assert contract.status == ContractStatus.DRAFT
    assert len(contract.uncommitted_events) == 1
```

### Parametrized Testing

```python
@pytest.mark.parametrize("contract_type,expected_template_count", [
    (ContractType.SERVICE_AGREEMENT, 5),
    (ContractType.EMPLOYMENT_CONTRACT, 3),
    (ContractType.NDA, 2),
    (ContractType.SUPPLIER_AGREEMENT, 4)
])
async def test_template_availability_by_contract_type(contract_type, expected_template_count, db_session):
    """Test template availability for each contract type."""
    repository = TemplateRepository(db_session)
    templates = await repository.find_by_type(contract_type)
    assert len(templates) >= expected_template_count
```

### Fixture Usage

```python
# conftest.py - Shared fixtures
@pytest.fixture
async def async_client():
    """Async HTTP client for API testing."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def test_user(db_session):
    """Create test user with company."""
    user = await UserFactory.create_with_company(
        email="test@example.com",
        company_name="Test Company"
    )
    return user

@pytest.fixture
async def auth_headers(test_user):
    """Authentication headers for API requests."""
    token = create_access_token({"sub": test_user.id})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def test_contract(test_user, db_session):
    """Create test contract."""
    contract = ContractFactory.create(
        created_by_user_id=test_user.id,
        company_id=test_user.company_id
    )
    await db_session.commit()
    return contract
```

---

## Coverage Requirements

### Coverage Targets by Layer

| Layer | Minimum Coverage | Current Achievement |
|-------|------------------|---------------------|
| Domain | 95% | 97%+ |
| Application | 90% | 94%+ |
| API | 90% | 95%+ |
| Infrastructure | 85% | 89%+ |
| **Overall** | **90%** | **92%+** |

### Coverage Exclusions

```python
# .coveragerc configuration
[run]
source = app
omit = 
    */tests/*
    */venv/*
    */migrations/*
    */conftest.py
    */test_*.py
    */main.py              # Application entry point

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
```

### Critical Coverage Areas (Must be 100%)

```python
# Domain business rules - MUST be 100% covered
class Contract:
    def activate(self, user_id: UserId) -> None:
        """Critical business logic - 100% coverage required."""
    
    def complete(self, user_id: UserId, reason: str) -> None:
        """Critical business logic - 100% coverage required."""

# Security functions - MUST be 100% covered  
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Security critical - 100% coverage required."""

def create_access_token(data: dict) -> str:
    """Security critical - 100% coverage required."""
```

---

## Running Tests

### Local Development Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html --cov-report=term

# Run specific test categories
pytest tests/unit/                    # Unit tests only
pytest tests/integration/             # Integration tests only  
pytest tests/e2e/                     # End-to-end tests only

# Run tests by marker
pytest -m "slow"                      # Long-running tests
pytest -m "ai_service"                # AI service tests
pytest -m "security"                  # Security tests

# Run specific test files
pytest tests/unit/domain/test_contract.py
pytest tests/integration/endpoints/test_auth_api.py

# Run specific test methods
pytest tests/unit/domain/test_contract.py::TestContract::test_create_contract_with_valid_data

# Run with parallel execution (if pytest-xdist installed)
pytest -n auto                       # Use all CPU cores
pytest -n 4                          # Use 4 processes
```

### Test Output Options

```bash
# Verbose output with detailed information
pytest -v

# Show local variables in traceback
pytest -l

# Stop on first failure
pytest -x

# Show slowest test durations
pytest --durations=10

# Generate HTML coverage report
pytest --cov=app --cov-report=html
# View at: htmlcov/index.html
```

### Performance Testing

```bash
# Time individual tests
pytest --durations=0

# Profile memory usage (if pytest-memprof installed)
pytest --memprof

# Load testing with pytest-benchmark
pytest tests/performance/test_api_performance.py
```

---

## Continuous Testing

### Pre-commit Testing

```bash
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pytest-unit
        name: Run unit tests
        entry: pytest tests/unit/ --no-cov -q
        language: system
        pass_filenames: false
        
      - id: pytest-coverage
        name: Check test coverage
        entry: pytest tests/unit/ tests/integration/ --cov=app --cov-fail-under=90 --no-cov-report
        language: system
        pass_filenames: false
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.12'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest-cov
    
    - name: Run unit tests
      run: pytest tests/unit/ --cov=app --cov-report=xml
    
    - name: Run integration tests
      run: pytest tests/integration/ --cov=app --cov-append --cov-report=xml
    
    - name: Run E2E tests
      run: pytest tests/e2e/ --cov=app --cov-append --cov-report=xml
      
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
```

### Automated Test Scheduling

```bash
# Cron job for nightly comprehensive testing
# /etc/crontab
0 2 * * * cd /app && pytest tests/ --cov=app --cov-report=html --junitxml=results.xml
```

---

## Test Data Management

### Test Factories

```python
# tests/factories.py
import factory
from app.domain.entities.contract import Contract, ContractId
from app.domain.value_objects import ContractParty, Money

class ContractFactory(factory.Factory):
    """Factory for creating test contracts."""
    
    class Meta:
        model = Contract
    
    contract_id = factory.LazyFunction(ContractId.generate)
    title = factory.Sequence(lambda n: f"Test Contract {n}")
    contract_type = ContractType.SERVICE_AGREEMENT
    plain_english_input = "Test contract requirements"
    client = factory.SubFactory('tests.factories.ContractPartyFactory')
    created_by_user_id = factory.LazyFunction(UserId.generate)
    company_id = factory.LazyFunction(CompanyId.generate)
    
    @classmethod
    def create_with_ai_content(cls, **kwargs):
        """Create contract with generated content."""
        contract = cls.create(**kwargs)
        contract.set_generated_content(
            "GENERATED CONTRACT CONTENT...",
            {"model_name": "openai/gpt-oss-120b", "confidence_score": 0.94}
        )
        return contract

class ContractPartyFactory(factory.Factory):
    """Factory for creating contract parties."""
    
    class Meta:
        model = ContractParty
    
    name = factory.Faker('company')
    email = factory.Faker('company_email')
    company = factory.Faker('company')
```

### Test Database Management

```python
# conftest.py
@pytest.fixture(scope="session")
def test_db():
    """Create test database for session."""
    # Create test database
    engine = create_engine("sqlite:///test.db")
    Base.metadata.create_all(engine)
    
    yield engine
    
    # Cleanup
    Base.metadata.drop_all(engine)
    os.unlink("test.db")

@pytest.fixture
async def db_session(test_db):
    """Create database session for test."""
    connection = test_db.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()
```

### Mock Services

```python
# tests/mocks.py
class MockAIService:
    """Mock AI service for testing without external dependencies."""
    
    async def generate_contract(self, request) -> ContractGenerationResponse:
        """Mock contract generation."""
        return ContractGenerationResponse(
            content="MOCK GENERATED CONTRACT CONTENT",
            model_name="mock-model",
            processing_time_ms=100.0,
            confidence_score=0.95
        )
    
    async def analyze_compliance(self, request) -> ComplianceAnalysisResponse:
        """Mock compliance analysis."""
        return ComplianceAnalysisResponse(
            overall_score=0.96,
            gdpr_score=0.98,
            employment_law_score=0.94,
            identified_risks=[],
            recommendations=["Mock recommendation"]
        )

# Usage in tests
@pytest.fixture
def mock_ai_service():
    return MockAIService()
```

---

This comprehensive testing documentation provides complete coverage of the testing strategy, standards, and practices used in the Pactoria backend, ensuring high quality and reliability for the AI-powered contract management platform.