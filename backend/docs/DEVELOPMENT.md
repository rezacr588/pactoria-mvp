# Development Guide

**Pactoria MVP Backend - Developer Setup and Contribution Guidelines**

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Testing Guidelines](#testing-guidelines)
5. [Code Quality Standards](#code-quality-standards)
6. [Contribution Guidelines](#contribution-guidelines)
7. [Debugging and Troubleshooting](#debugging-and-troubleshooting)

---

## Development Environment Setup

### Prerequisites

**Required Software:**
- Python 3.12+ (with pip and venv)
- Git 2.30+
- SQLite (for development)
- Code editor with Python support (VS Code recommended)

**Optional but Recommended:**
- Docker (for production-like testing)
- PostgreSQL (for production database testing)
- Postman or similar API testing tool

### Step-by-Step Setup

#### 1. Clone and Navigate

```bash
# Clone the repository
git clone <repository-url>
cd backend/

# Verify you're in the correct directory
ls -la
# Should see: app/, tests/, requirements.txt, etc.
```

#### 2. Python Environment Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Verify Python version
python --version  # Should be 3.12+

# Upgrade pip
pip install --upgrade pip
```

#### 3. Install Dependencies

```bash
# Install all dependencies
pip install -r requirements.txt

# For development with additional tools
pip install -r requirements-dev.txt  # If exists

# Verify critical packages
python -c "import fastapi, sqlalchemy, pytest; print('Core packages installed successfully')"
```

#### 4. Environment Configuration

```bash
# Copy environment template
cp .env.production.template .env

# Edit .env file with your configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables:**
```bash
# Application Settings
DEBUG=true
ENVIRONMENT=development
SECRET_KEY=your-development-secret-key-change-in-production

# Database
DATABASE_URL=sqlite:///./pactoria_mvp.db

# AI Service (get from Groq)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Security
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS (for frontend development)
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"]
```

#### 5. Database Initialization

```bash
# Run the startup script to initialize database and seed data
python startup.py

# Verify database creation
ls -la *.db  # Should see pactoria_mvp.db

# Check if tables are created
python -c "
from app.core.database import engine
from sqlalchemy import inspect
inspector = inspect(engine)
print('Tables created:', inspector.get_table_names())
"
```

#### 6. Verify Installation

```bash
# Run the development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# In another terminal, test the API
curl http://localhost:8000/health
# Should return: {"status":"healthy","timestamp":...}

# Test authenticated endpoint (should fail without auth)
curl http://localhost:8000/api/v1/contracts/
# Should return: {"detail":"Not authenticated"}
```

#### 7. Access Documentation

Once the server is running:
- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

---

## Project Structure

Understanding the codebase organization following Domain-Driven Design:

```
backend/
├── app/                          # Main application package
│   ├── __init__.py
│   ├── main.py                   # FastAPI application entry point
│   │
│   ├── api/                      # API Layer - HTTP endpoints
│   │   ├── __init__.py
│   │   └── v1/                   # API version 1
│   │       ├── __init__.py
│   │       ├── auth.py           # Authentication endpoints
│   │       ├── contracts.py      # Contract management endpoints
│   │       ├── analytics.py      # Business analytics endpoints
│   │       ├── ai.py            # AI service endpoints
│   │       └── security.py      # Security and audit endpoints
│   │
│   ├── application/              # Application Layer - Use cases
│   │   ├── __init__.py
│   │   └── services/
│   │       ├── __init__.py
│   │       └── contract_application_service.py
│   │
│   ├── core/                     # Cross-cutting concerns
│   │   ├── __init__.py
│   │   ├── config.py             # Application configuration
│   │   ├── database.py           # Database setup and session management
│   │   ├── auth.py              # Authentication utilities
│   │   ├── security.py          # Security helpers
│   │   ├── exceptions.py        # Custom exception classes
│   │   ├── validation.py        # Validation utilities
│   │   └── datetime_utils.py    # Date/time utilities
│   │
│   ├── domain/                   # Domain Layer - Business logic
│   │   ├── __init__.py
│   │   ├── entities/             # Domain entities and aggregates
│   │   │   ├── __init__.py
│   │   │   ├── base.py           # Base aggregate root
│   │   │   └── contract.py       # Contract aggregate
│   │   ├── repositories/         # Repository interfaces
│   │   │   ├── __init__.py
│   │   │   └── contract_repository.py
│   │   ├── value_objects.py      # Domain value objects
│   │   └── exceptions.py         # Domain-specific exceptions
│   │
│   ├── infrastructure/           # Infrastructure Layer - External concerns
│   │   ├── __init__.py
│   │   ├── database/             # Database models and connections
│   │   │   ├── __init__.py
│   │   │   └── models.py         # SQLAlchemy models
│   │   └── repositories/         # Repository implementations
│   │       ├── __init__.py
│   │       └── sqlalchemy_contract_repository.py
│   │
│   ├── schemas/                  # Pydantic schemas for API contracts
│   │   ├── __init__.py
│   │   ├── auth.py              # Authentication schemas
│   │   ├── contracts.py         # Contract schemas
│   │   ├── common.py            # Common/shared schemas
│   │   ├── analytics.py         # Analytics schemas
│   │   └── ai.py               # AI service schemas
│   │
│   └── services/                 # External service integrations
│       ├── __init__.py
│       ├── ai_service.py         # Groq AI integration
│       └── security_service.py   # Security monitoring
│
├── tests/                        # Test suites (see Testing section)
├── docs/                         # Documentation
├── requirements.txt              # Python dependencies
├── .env.production.template      # Environment variable template
├── startup.py                    # Database initialization script
├── pytest.ini                   # Test configuration
└── README.md                     # Project overview
```

### Key Architecture Principles

**Layer Dependencies:**
- API Layer depends on Application and Domain layers
- Application Layer depends only on Domain layer
- Domain Layer has no external dependencies
- Infrastructure Layer implements Domain interfaces

**File Naming Conventions:**
- `models.py`: Database models (infrastructure)
- `schemas.py`: Pydantic models (API contracts)
- `entities.py`: Domain entities (business objects)
- `repositories.py`: Data access interfaces and implementations
- `services.py`: External service integrations

---

## Development Workflow

### Daily Development Process

#### 1. Start Development Session

```bash
# Pull latest changes
git pull origin main

# Activate virtual environment
source venv/bin/activate

# Install any new dependencies
pip install -r requirements.txt

# Start development server with hot reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Feature Development

```bash
# Create feature branch
git checkout -b feature/contract-risk-scoring

# Make your changes following TDD approach:
# 1. Write failing tests
# 2. Implement minimum code to pass tests
# 3. Refactor for quality

# Run tests frequently
pytest tests/ -v

# Check code quality
python -m pytest --cov=app --cov-report=html
```

#### 3. Code Quality Checks

```bash
# Type checking
mypy app/

# Code formatting (if black is installed)
black app/ tests/

# Import sorting (if isort is installed)
isort app/ tests/

# Run full test suite with coverage
pytest --cov=app --cov-report=html --cov-report=term
```

#### 4. Commit and Push

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "Add contract risk scoring feature

- Implement RiskAssessment value object
- Add risk scoring domain service
- Create risk analysis API endpoint
- Add comprehensive tests with 95% coverage

Resolves: #123"

# Push feature branch
git push origin feature/contract-risk-scoring
```

### Branch Strategy

**Main Branches:**
- `main`: Production-ready code
- `develop`: Integration branch for features

**Feature Branches:**
- `feature/feature-name`: New features
- `bugfix/bug-description`: Bug fixes
- `hotfix/critical-fix`: Critical production fixes

### Testing During Development

```bash
# Run specific test files
pytest tests/unit/domain/ -v

# Run tests matching pattern
pytest -k "contract" -v

# Run tests with coverage for specific module
pytest tests/unit/domain/test_contract.py --cov=app.domain.entities.contract

# Run tests with detailed output
pytest -v -s --tb=short

# Run only failed tests from last run
pytest --lf
```

---

## Testing Guidelines

### Test Organization

```
tests/
├── unit/                         # Isolated unit tests
│   ├── domain/                   # Domain layer tests
│   │   ├── test_contract.py      # Contract entity tests
│   │   └── test_value_objects.py # Value object tests
│   ├── application/              # Application service tests
│   ├── core/                     # Core utilities tests
│   └── services/                 # External service tests
├── integration/                  # Integration tests
│   ├── test_api_contracts.py     # Contract API tests
│   └── test_database.py         # Database integration tests
├── e2e/                         # End-to-end tests
│   └── test_contract_workflows.py
└── conftest.py                  # Test configuration and fixtures
```

### Writing Tests

#### Domain Layer Tests (Pure Business Logic)

```python
# tests/unit/domain/test_contract.py
import pytest
from app.domain.entities.contract import Contract, ContractId
from app.domain.value_objects import ContractParty, Money
from app.domain.exceptions import ContractStateError

class TestContract:
    def test_create_contract_with_valid_data(self):
        """Test contract creation with all required fields"""
        # Arrange
        contract_id = ContractId.generate()
        client = ContractParty(name="Acme Ltd", email="contact@acme.co.uk")
        
        # Act
        contract = Contract.create(
            contract_id=contract_id,
            title="Professional Services Agreement",
            contract_type="service_agreement",
            plain_english_input="Need a consulting contract...",
            client=client,
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        # Assert
        assert contract.contract_id == contract_id
        assert contract.title == "Professional Services Agreement"
        assert contract.status == "draft"
        assert len(contract.uncommitted_events) == 1  # ContractCreated event
        
    def test_activate_contract_with_final_content(self):
        """Test contract activation when final content exists"""
        # Arrange
        contract = self._create_valid_contract()
        contract.finalize_content("PROFESSIONAL SERVICES AGREEMENT...", "user-123")
        
        # Act
        contract.activate("user-123")
        
        # Assert
        assert contract.status == "active"
        
    def test_activate_contract_without_content_raises_error(self):
        """Test contract activation fails without final content"""
        # Arrange
        contract = self._create_valid_contract()
        
        # Act & Assert
        with pytest.raises(ContractStateError) as exc_info:
            contract.activate("user-123")
        assert "Cannot activate contract without final content" in str(exc_info.value)
```

#### Application Service Tests

```python
# tests/unit/application/test_contract_application_service.py
import pytest
from unittest.mock import Mock, AsyncMock
from app.application.services.contract_application_service import ContractApplicationService
from app.application.commands import CreateContractCommand

class TestContractApplicationService:
    def setup_method(self):
        """Setup test dependencies with mocks"""
        self.mock_repository = AsyncMock()
        self.mock_ai_service = AsyncMock()
        self.service = ContractApplicationService(
            repository=self.mock_repository,
            ai_service=self.mock_ai_service
        )
    
    async def test_create_contract_success(self):
        """Test successful contract creation through application service"""
        # Arrange
        command = CreateContractCommand(
            title="Test Contract",
            contract_type="service_agreement",
            plain_english_input="Test requirements",
            client_name="Test Client",
            created_by_user_id="user-123",
            company_id="company-456"
        )
        
        # Act
        result = await self.service.create_contract(command)
        
        # Assert
        assert result.title == "Test Contract"
        self.mock_repository.save.assert_called_once()
```

#### API Integration Tests

```python
# tests/integration/test_api_contracts.py
import pytest
from httpx import AsyncClient
from app.main import app

class TestContractAPI:
    async def test_create_contract_authenticated(self, async_client: AsyncClient, auth_headers):
        """Test contract creation via API with authentication"""
        # Arrange
        contract_data = {
            "title": "API Test Contract",
            "contract_type": "service_agreement",
            "plain_english_input": "Test contract creation via API",
            "client_name": "API Test Client"
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
```

### Test Data Management

```python
# conftest.py - Shared test fixtures
import pytest
import asyncio
from httpx import AsyncClient
from app.main import app
from app.core.database import get_db, create_tables
from tests.factories import UserFactory, ContractFactory

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def test_user():
    """Create a test user with company"""
    return await UserFactory.create_with_company(
        email="test@example.com",
        company_name="Test Company"
    )

@pytest.fixture
async def auth_headers(test_user):
    """Generate authentication headers for test user"""
    token = create_access_token({"sub": test_user.id})
    return {"Authorization": f"Bearer {token}"}
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html --cov-report=term

# Run specific test categories
pytest tests/unit/        # Unit tests only
pytest tests/integration/ # Integration tests only
pytest tests/e2e/         # End-to-end tests only

# Run tests matching pattern
pytest -k "contract and not ai"

# Run tests with detailed output
pytest -v -s

# Run failed tests only
pytest --lf

# Run tests in parallel (if pytest-xdist installed)
pytest -n auto
```

---

## Code Quality Standards

### Python Code Style

**Follow PEP 8 with these specific guidelines:**

```python
# Line length: 88 characters (Black formatter default)
# Imports: Absolute imports preferred, grouped by standard/third-party/local
from typing import Optional, List, Dict, Any
import asyncio
from datetime import datetime

from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session

from app.domain.entities.contract import Contract
from app.core.database import get_db

# Type hints: Always use type hints for function signatures
async def create_contract(
    contract_data: ContractCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Contract:
    """Create new contract with validation."""
    pass

# Docstrings: Use Google-style docstrings
def calculate_risk_score(contract: Contract) -> int:
    """Calculate contract risk score based on multiple factors.
    
    Args:
        contract: The contract to analyze for risks
        
    Returns:
        Risk score from 1 (low risk) to 10 (high risk)
        
    Raises:
        ValueError: If contract has no content to analyze
    """
    pass
```

### Domain-Driven Design Patterns

```python
# Aggregate Root Pattern
class Contract(AggregateRoot[ContractId]):
    """Contract aggregate root managing business invariants."""
    
    def __init__(self, ...):
        super().__init__()
        # Initialize properties
    
    def activate(self, user_id: str) -> None:
        """Activate contract after validation."""
        # Business rule validation
        if not self.final_content:
            raise ContractStateError("Cannot activate without final content")
        
        # State change
        self.status = ContractStatus.ACTIVE
        
        # Raise domain event
        self.add_domain_event(ContractActivated(
            contract_id=self.contract_id,
            activated_by=user_id,
            activated_at=datetime.utcnow()
        ))

# Value Object Pattern
@dataclass(frozen=True)
class Money:
    """Immutable money value object."""
    amount: Decimal
    currency: str = "GBP"
    
    def __post_init__(self):
        """Validate invariants."""
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")

# Repository Pattern
class ContractRepository(ABC):
    """Abstract repository interface."""
    
    @abstractmethod
    async def save(self, contract: Contract) -> Contract:
        """Save contract maintaining domain integrity."""
        pass
    
    @abstractmethod
    async def find_by_id(self, contract_id: ContractId) -> Optional[Contract]:
        """Find contract by ID."""
        pass
```

### Error Handling Standards

```python
# Domain Exceptions
class ContractDomainException(Exception):
    """Base exception for contract domain."""
    pass

class ContractStateError(ContractDomainException):
    """Invalid contract state transition."""
    def __init__(self, message: str, current_state: str, expected_state: str = None):
        self.current_state = current_state
        self.expected_state = expected_state
        super().__init__(message)

# API Error Handling
from app.core.exceptions import APIException

@router.post("/contracts/")
async def create_contract(contract_data: ContractCreate):
    try:
        contract = await contract_service.create_contract(contract_data)
        return {"contract": contract}
    except ContractDomainException as e:
        raise APIException(
            status_code=400,
            error_code="DOMAIN_VIOLATION",
            message=str(e),
            details={"domain": "contract"}
        )
    except Exception as e:
        logger.error(f"Unexpected error creating contract: {e}", exc_info=True)
        raise APIException(
            status_code=500,
            error_code="INTERNAL_ERROR",
            message="An unexpected error occurred"
        )
```

### Performance Guidelines

```python
# Database Queries: Use select/prefetch to avoid N+1 queries
async def get_contracts_with_relations(self, company_id: str) -> List[Contract]:
    contracts = await self.db.execute(
        select(ContractModel)
        .options(selectinload(ContractModel.compliance_scores))
        .options(selectinload(ContractModel.ai_generation))
        .filter(ContractModel.company_id == company_id)
    )
    return [self._to_domain(contract) for contract in contracts.scalars()]

# Async/Await: Use async for I/O operations
async def generate_contract_content(self, contract: Contract) -> str:
    """Generate content using async AI service."""
    ai_response = await self.ai_service.generate_contract({
        "contract_type": contract.contract_type,
        "requirements": contract.plain_english_input
    })
    return ai_response.content

# Caching: Cache expensive operations where appropriate
from functools import lru_cache

@lru_cache(maxsize=100)
def get_template_by_type(template_type: str) -> Optional[Template]:
    """Get template with caching for performance."""
    # Implementation here
```

---

## Contribution Guidelines

### Before Contributing

1. **Read Documentation**: Understand the architecture and patterns
2. **Check Issues**: Look for existing issues or create new ones
3. **Discuss Major Changes**: Open discussion for significant features
4. **Follow TDD**: Write tests first, then implement features

### Pull Request Process

#### 1. Fork and Branch

```bash
# Fork repository on GitHub, then:
git clone https://github.com/your-username/pactoria-backend.git
cd pactoria-backend/backend

# Create feature branch
git checkout -b feature/your-feature-name
```

#### 2. Development

```bash
# Follow TDD approach:
# 1. Write failing tests
pytest tests/unit/your-new-tests.py

# 2. Implement minimum code to pass
# 3. Refactor for quality
# 4. Ensure all tests pass
pytest --cov=app --cov-report=term

# 5. Check code quality
mypy app/
black app/ tests/
```

#### 3. Documentation

- Update relevant documentation in `docs/`
- Add docstrings to new functions and classes
- Update API documentation if adding endpoints
- Include examples in docstrings

#### 4. Commit Message Format

```
feat(domain): add contract risk assessment feature

- Implement RiskAssessment value object with 1-10 scoring
- Add RiskAnalysisService for complex risk calculations  
- Create /api/v1/contracts/{id}/risk endpoint
- Add comprehensive tests achieving 95% coverage
- Update domain documentation with risk concepts

Resolves: #123
Breaking-Change: None
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix  
- `docs`: Documentation changes
- `style`: Code style changes (no logic change)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Maintenance tasks

#### 5. Pull Request

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)  
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated  
- [ ] All tests pass locally
- [ ] Test coverage maintained/improved

## Domain Design
- [ ] Follows DDD patterns
- [ ] Business rules properly encapsulated
- [ ] Domain events added where appropriate
- [ ] Repository interfaces defined

## Code Quality
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Type hints added
- [ ] Documentation updated
```

### Code Review Criteria

**Reviewers will check:**

1. **Architecture Alignment**: Follows DDD principles and clean architecture
2. **Business Logic**: Correctly implements business rules and invariants
3. **Test Coverage**: Comprehensive tests with good coverage
4. **Code Quality**: Readable, maintainable, and well-documented code
5. **Performance**: No obvious performance issues or anti-patterns
6. **Security**: No security vulnerabilities introduced
7. **Breaking Changes**: Properly communicated and justified

---

## Debugging and Troubleshooting

### Common Issues and Solutions

#### Database Connection Issues

```bash
# Check database file exists
ls -la *.db

# Verify database tables
python -c "
from app.core.database import engine
from sqlalchemy import inspect
inspector = inspect(engine)
print('Tables:', inspector.get_table_names())
"

# Reinitialize database if needed
rm pactoria_mvp.db
python startup.py
```

#### Import Errors

```bash
# Verify Python path
python -c "import sys; print(sys.path)"

# Check package installation
pip list | grep fastapi
pip list | grep sqlalchemy

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

#### Authentication Issues

```bash
# Test JWT token generation
python -c "
from app.core.auth import create_access_token
token = create_access_token({'sub': 'test-user'})
print(f'Test token: {token}')
"

# Verify environment variables
python -c "
from app.core.config import settings
print(f'SECRET_KEY set: {bool(settings.SECRET_KEY)}')
print(f'JWT_ALGORITHM: {settings.JWT_ALGORITHM}')
"
```

#### AI Service Integration

```bash
# Test Groq API connection
python -c "
import os
from groq import Groq
client = Groq(api_key=os.getenv('GROQ_API_KEY'))
try:
    response = client.chat.completions.create(
        model='openai/gpt-oss-120b',
        messages=[{'role': 'user', 'content': 'Hello'}],
        max_tokens=10
    )
    print('Groq API connection successful')
except Exception as e:
    print(f'Groq API error: {e}')
"
```

### Debugging Tools

#### Logging Configuration

```python
# Add to your development environment
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Use in code
import logging
logger = logging.getLogger(__name__)

async def some_function():
    logger.debug("Debug information")
    logger.info("General information") 
    logger.warning("Warning message")
    logger.error("Error occurred", exc_info=True)
```

#### Database Query Debugging

```python
# Enable SQLAlchemy query logging
# In app/core/database.py
engine = create_engine(
    DATABASE_URL,
    echo=True  # Enables SQL query logging
)
```

#### API Request Debugging

```bash
# Use httpie for testing (install with: pip install httpie)
http POST localhost:8000/api/v1/auth/login email=test@example.com password=test123

# Use curl with verbose output
curl -v -X POST http://localhost:8000/api/v1/contracts/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title": "Test Contract", ...}'
```

### Performance Profiling

```python
# Profile function execution time
import time
import functools

def profile_time(func):
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.time()
        result = await func(*args, **kwargs)
        duration = time.time() - start
        print(f"{func.__name__} took {duration:.3f} seconds")
        return result
    return wrapper

# Usage
@profile_time
async def slow_function():
    # Your code here
    pass
```

---

This development guide provides everything needed to set up, develop, test, and contribute to the Pactoria backend while maintaining high code quality and architectural consistency.