# Pactoria MVP - AI Coding Agent Instructions

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Project Overview
Pactoria is an AI-powered contract management platform for UK SMEs using Domain-Driven Design (DDD), FastAPI, React, and Groq AI. The architecture is a modular monolith designed for future microservices evolution.

## Architecture Patterns (VALIDATED IMPLEMENTATION)

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
- API documentation available at `http://localhost:8000/docs`

### Database & Testing Patterns
- SQLAlchemy async sessions with SQLite (dev) and PostgreSQL/Oracle (prod)
- Alembic migrations: `alembic revision --autogenerate -m "description"`
- Repository pattern: Never access ORM models directly from API layer
- Tests configured with `pytest.ini` - use `pytest tests/unit/` for unit tests
- Mock external services (Groq API) using `unittest.mock`

### Frontend Architecture
- React with TypeScript using Vite build system
- State management via Zustand stores in `src/store/`
- API calls through React Query in `src/api/`
- Component library in `src/components/`
- Development errors expected: 46 TypeScript, 217 ESLint issues (normal for MVP)

## Working Effectively

### Bootstrap, Build, and Test (ALL COMMANDS VALIDATED)
```bash
# 1. Backend Setup (REQUIRED FIRST)
cd backend && pip install -r requirements.txt  # Takes 36 seconds
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000  # Starts in 1 second

# 2. Frontend Setup  
cd ../frontend && npm install  # Takes 17 seconds  
npm run build  # Takes 4.6 seconds
npm run dev  # Starts in 185ms

# 3. Database Operations
cd backend && alembic current  # Check migration status
# Database auto-initializes on server startup

# 4. Testing
cd backend && python -m pytest tests/unit/ -v  # Takes 5 seconds (some schema issues in MVP)
cd ../frontend && npm run type-check  # Takes 7 seconds (46 dev-stage errors expected)
cd ../frontend && npm run lint  # Takes 3.7 seconds (217 dev-stage issues expected)
```

**TIMING NOTES**: All build operations are fast (<1 minute). No "NEVER CANCEL" warnings needed for this codebase.

### Environment Setup Requirements
```bash
# Backend requires environment variables - create .env file:
cd backend && cp .env.example .env
# Edit .env to set: SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL, GROQ_API_KEY (optional)

# Frontend runs without additional configuration
# Backend runs on port 8000, frontend on port 5173
```

## Validation Scenarios

### ALWAYS Test Complete User Scenarios After Changes
1. **Authentication Flow**: Test registration and login via API:
   ```bash
   # Start backend first
   cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
   
   # Test registration
   curl -X POST http://localhost:8000/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!","full_name":"Test User","company_name":"Test Company"}'
   
   # Test login  
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!"}'
   ```

2. **Full Stack Integration**: Start both servers and verify they communicate:
   ```bash
   # Backend: http://localhost:8000 (API docs at /docs)
   # Frontend: http://localhost:5173 (React app)
   ```

3. **Database Operations**: Ensure database initializes and migrations work:
   ```bash
   cd backend && alembic current  # Should show current migration
   ```

### Development Workflow Standards
- **Testing**: Use `pytest` for backend (`pytest.ini` configured), Vitest for frontend
- **TypeScript**: 46 dev-stage errors expected, 217 lint issues expected in MVP
- **Database**: SQLite auto-initializes, PostgreSQL for production via DATABASE_URL
- **AI Features**: Require GROQ_API_KEY in .env, otherwise gracefully disabled

## Environment & Deployment

### Local Development Setup (VALIDATED WORKING)
```bash
# 1. Install backend dependencies (REQUIRED FIRST)
cd backend && pip install -r requirements.txt  # Takes 36 seconds

# 2. Create environment file for development
cp .env.example .env
# Edit .env to set SECRET_KEY and JWT_SECRET_KEY (required)

# 3. Start backend server  
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000  # Starts in 1 second

# 4. Install frontend dependencies (new terminal)
cd ../frontend && npm install  # Takes 17 seconds

# 5. Start frontend development server
npm run dev  # Starts in 185ms

# 6. Optional: Services (macOS background services)
cd ../services && ./install.sh && pactoria-service start
```

### Common Setup Issues (VALIDATED SOLUTIONS)
- **Missing backend dependencies**: Always run `pip install -r requirements.txt` first (36 seconds)
- **"SECRET_KEY must be set"**: Copy `.env.example` to `.env` and set required keys
- **Frontend dependencies**: Run `npm install` (17 seconds) - TypeScript errors are expected in development
- **Port conflicts**: Backend runs on 8000, frontend on 5173 by default
- **Database errors**: Database auto-initializes on server startup, no manual setup needed

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

## Quick Reference Commands (ALL VALIDATED)

```bash
# Backend operations (always from /backend directory)
pip install -r requirements.txt          # 36 seconds - install dependencies
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000  # Start server (1s startup)
python -m pytest tests/unit/ -v         # 5 seconds - run unit tests  
alembic current                          # Check migration status
alembic upgrade head                     # Apply migrations

# Frontend operations (always from /frontend directory)  
npm install                              # 17 seconds - install dependencies
npm run dev                              # 185ms startup - dev server on :5173
npm run build                            # 4.6 seconds - production build
npm run type-check                       # 7 seconds (46 errors expected in MVP)
npm run lint                             # 3.7 seconds (217 issues expected in MVP)

# Service management (macOS only)
cd services && ./install.sh             # Setup background services
pactoria-service start                   # Start both servers
pactoria-service status                  # Check service status
```

**IMPORTANT**: No long-running operations in this codebase - all builds complete in <1 minute.

## Key Project Structure

```
/home/runner/work/pactoria-mvp/pactoria-mvp/
├── backend/                 # Python FastAPI application
│   ├── app/                # Main application code
│   │   ├── api/v1/        # REST API endpoints
│   │   ├── domain/        # DDD entities and business logic
│   │   ├── infrastructure/ # Database models and repositories
│   │   └── core/          # Configuration and database setup
│   ├── tests/             # Test suites (unit, integration, e2e)
│   ├── requirements.txt   # Python dependencies
│   ├── alembic.ini       # Database migration config
│   └── .env.example      # Environment template
├── frontend/              # React TypeScript application  
│   ├── src/              # Source code
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route components
│   │   ├── store/        # Zustand state management
│   │   └── services/     # API client services
│   ├── package.json      # Node.js dependencies
│   └── vite.config.ts    # Build configuration
├── services/             # macOS background service scripts
└── .github/              # CI/CD workflows and this file
```

### Frequently Used Files
- `backend/app/main.py` - FastAPI application entry point
- `backend/app/core/config.py` - Application configuration and settings
- `frontend/src/main.tsx` - React application entry point
- `frontend/src/services/api.ts` - API client for backend communication
- `backend/tests/conftest.py` - Test configuration and fixtures

## AI Integration & Features

### Groq AI Service (Optional)
- Set `GROQ_API_KEY` in `.env` for AI contract generation features
- Uses `llama-3.3-70b-versatile` model for UK legal expertise
- Key endpoints: `/api/v1/ai/generate`, `/api/v1/ai/analyze`
- Gracefully disabled if API key not provided

```python
# Example AI service usage from app/services/ai_service.py
ai_service = GroqAIService()
request = ContractGenerationRequest(
    plain_english_input="Create a service agreement...",
    contract_type="service_agreement"
)
response = await ai_service.generate_contract(request)
```

## Coding Conventions

### Naming & Structure
- Snake_case for Python, camelCase for TypeScript
- Domain events end with "Event" suffix
- Repository methods: `save()`, `get_by_id()`, `find_by_*()`
- API routes follow REST: `GET /contracts/{id}`, `POST /contracts`

### UK Legal Compliance Features
- All contracts include GDPR compliance clauses
- Use `ComplianceScore` value object for compliance tracking
- Legal templates in `app/core/template_seeder.py`

### Error Handling
- Domain exceptions: `DomainValidationError`, `BusinessRuleViolationError`
- HTTP exceptions with proper status codes in API layer
- Comprehensive logging with structured messages

## When Adding Features
1. Start with domain model and tests in `app/domain/`
2. Implement repository interface in domain layer
3. Create infrastructure implementation in `app/infrastructure/`
4. Add application service in `app/application/`
5. Expose via API endpoint in `app/api/v1/`
6. Update frontend components in `src/components/` or `src/pages/`
7. Verify end-to-end functionality using validation scenarios above

## Troubleshooting Common Issues

### Backend Issues
- **"SECRET_KEY must be set"**: Create `.env` file from `.env.example` and set SECRET_KEY, JWT_SECRET_KEY
- **"No module named pytest"**: Run `pip install -r requirements.txt` (includes pytest)
- **Import errors**: Always run commands from `/backend` directory
- **Port 8000 in use**: Kill existing process with `kill $(lsof -ti:8000)` or use `--port 8001`
- **Database errors**: Database auto-initializes on server startup, no manual setup needed

### Frontend Issues  
- **"Cannot find module"**: Run `npm install` to install dependencies (17 seconds)
- **Type checking fails**: 46 errors expected in MVP development stage
- **Build errors**: Ensure backend is running on port 8000 if doing full-stack testing
- **Dev server won't start**: Check port 5173 isn't in use

### Testing Issues
- **Backend tests fail**: Schema mismatches expected in MVP stage - tests run but may fail
- **Frontend tests**: No unit tests configured yet (normal for MVP)
- **E2E tests**: Missing `faker` dependency, install with `pip install faker` if needed

### Development Workflow Issues
- **Formatting tools missing**: Backend formatting (black, isort) not in requirements.txt
- **AI generation not working**: Set GROQ_API_KEY in .env file (optional - gracefully disabled if missing)
- **CORS errors**: Backend allows all origins in development mode via CORS_ALLOW_ALL=true