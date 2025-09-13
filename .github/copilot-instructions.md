# Pactoria MVP - AI Coding Agent Instructions

## Project Overview
Pactoria is an AI-powered contract management platform for UK SMEs using Domain-Driven Design (DDD), FastAPI, React, and Groq AI. The architecture is a modular monolith designed for future microservices evolution.

## Architecture Patterns

### Domain-Driven Design (DDD) Structure
- **Entities**: Rich domain models in `app/domain/entities/` (Contract, Company, Team, etc.)
- **Value Objects**: Immutable types in `app/domain/value_objects.py` (Money, DateRange, ComplianceScore)
- **Repositories**: Abstract interfaces in `app/domain/repositories/` implemented in `app/infrastructure/repositories/`
- **Domain Events**: Event-driven communication using `AggregateRoot.add_domain_event()`
- **Services**: Business logic in `app/domain/services/` and application services in `app/application/`

Example entity creation:
```python
# Always use factory methods for entities
contract = Contract.create(
    contract_id=ContractId(str(uuid4())),
    title="Service Agreement",
    contract_type=ContractType.SERVICE_AGREEMENT,
    # ... other required fields
)
```

### API Layer Organization
- Routes in `app/api/v1/` follow REST conventions
- All endpoints use dependency injection for services
- Authentication via JWT tokens using `get_current_user` dependency
- Request/response models in `app/schemas/`

## Development Workflows

### Testing Requirements
- **100% domain logic coverage** - All business rules must have tests
- Use `pytest` with `asyncio_mode = auto` 
- Test files: `tests/unit/`, `tests/integration/`, `tests/e2e/`
- Mock external services (Groq API) in tests using `unittest.mock`

Critical test patterns:
```python
# Domain entity tests
async def test_contract_creation_validates_business_rules():
    with pytest.raises(DomainValidationError):
        Contract.create(contract_id=None)  # Should fail

# API endpoint tests  
async def test_create_contract_endpoint(client, auth_headers):
    response = await client.post("/api/v1/contracts", 
                                json=contract_data, 
                                headers=auth_headers)
```

### Database Patterns
- Use Alembic migrations: `alembic revision --autogenerate -m "description"`
- SQLAlchemy async sessions via dependency injection
- Repository pattern: Never access ORM models directly from API layer
- Database models in `app/infrastructure/database/models/`

### Frontend Integration
- React with TypeScript using Vite
- State management via Zustand stores in `src/store/`
- API calls through React Query in `src/api/`
- Component library in `src/components/`

## AI Integration (Groq)

### Service Initialization
```python
# app/services/ai_service.py
ai_service = GroqAIService()  # Global instance
await ai_service.generate_contract(ContractGenerationRequest(...))
```

### Key AI Endpoints
- `/api/v1/ai/generate` - Contract generation from plain English
- `/api/v1/ai/analyze` - Legal compliance analysis
- Uses `llama-3.3-70b-versatile` model for UK legal expertise

## Environment & Deployment

### Local Development
```bash
# Backend
cd backend && python startup.py  # Initializes DB + seeds
uvicorn app.main:app --reload

# Frontend  
cd frontend && npm run dev

# Services (macOS background services)
cd services && ./install.sh && pactoria-service start
```

### Configuration
- Environment variables in `.env` files
- Settings via Pydantic in `app/core/config.py`
- Supports SQLite (dev) and PostgreSQL/Oracle (prod)

## Coding Conventions

### Naming & Structure
- Snake_case for Python, camelCase for TypeScript
- Domain events end with "Event" suffix
- Repository methods: `save()`, `get_by_id()`, `find_by_*()` 
- API routes follow REST: GET `/contracts/{id}`, POST `/contracts`

### UK Legal Compliance
- All contracts must include GDPR compliance clauses
- Use `ComplianceScore` value object for compliance tracking
- Legal templates in `app/core/template_seeder.py`

### Error Handling
- Domain exceptions: `DomainValidationError`, `BusinessRuleViolationError`
- HTTP exceptions with proper status codes in API layer
- Comprehensive logging with structured messages

## Critical Integration Points

### Authentication Flow
1. Login via `/api/v1/auth/login` returns JWT token
2. Include `Authorization: Bearer <token>` in all authenticated requests
3. User context available via `get_current_user()` dependency

### Contract Generation Workflow
1. POST `/api/v1/contracts` creates contract entity
2. POST `/api/v1/contracts/{id}/generate` triggers AI generation
3. Contract status changes: DRAFT → PENDING → ACTIVE
4. Domain events published for audit trail

### File Management
- Upload via `/api/v1/files/upload` 
- Files stored in `uploads/` directory
- PDF export for contracts available

## Quick Reference Commands

```bash
# Run tests
pytest tests/ -v --cov=app

# Database migration
alembic upgrade head

# Format code
black app/ && isort app/

# Frontend type check
cd frontend && npm run type-check

# E2E tests
cd frontend && npm run test:e2e
```

## When Adding Features
1. Start with domain model and tests
2. Implement repository interface in domain layer
3. Create infrastructure implementation
4. Add application service
5. Expose via API endpoint
6. Update frontend components
7. Verify end-to-end functionality