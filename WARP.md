# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

# Pactoria MVP - AI-Powered Contract Management Platform

## Table of Contents
- [Project Overview](#project-overview)
- [Common Commands](#common-commands)
- [High-Level Architecture](#high-level-architecture)
- [Project Structure](#project-structure)
- [Development Workflows](#development-workflows)
- [Testing Strategy](#testing-strategy)
- [Deployment Process](#deployment-process)
- [Troubleshooting](#troubleshooting)

## Project Overview

Pactoria is an AI-powered contract management platform for UK SMEs that leverages Groq API for ultra-fast contract generation and analysis. The platform uses a cost-optimized architecture with Azure deployment (~$15-25/month).

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: FastAPI (Python 3.11+) + SQLAlchemy
- Database: SQLite (cost-optimized, with Azure Files persistence in production)
- AI/LLM: Groq API (Llama 3.1 70B, Mixtral 8x7B)
- Infrastructure: Azure Container Apps (backend) + Azure Static Web Apps (frontend)

## Common Commands

### Development
```bash
# Start backend (from /backend)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend (from /frontend)
npm run dev

# Start frontend with production backend
npm run dev:prod-backend

# Start both concurrently (from root)
./start_backend.sh & cd frontend && npm run dev
```

### Testing
```bash
# Backend tests (from /backend)
pytest                           # Run all tests
pytest tests/unit               # Unit tests only
pytest tests/integration        # Integration tests
pytest tests/e2e               # E2E backend tests
pytest --cov=app --cov-report=html  # With coverage

# Frontend tests (from /frontend)
npm test                        # Run Vitest tests
npm run test:coverage           # With coverage
npm run test:e2e               # Playwright E2E tests
npm run test:e2e:headed        # E2E with browser UI
npm run test:e2e:debug         # Debug E2E tests
```

### Build & Deploy
```bash
# Build frontend for production
cd frontend && npm run build

# Build backend Docker image
cd backend && docker build -t pactoria-backend .

# Deploy to Azure (from root)
./deploy-ultra-cheap.sh         # Cost-optimized deployment (~$15-25/month)
./deploy-azure-production.sh    # Full production deployment

# GitHub Actions deployment (automatic on push to main)
# Manual trigger: Go to Actions → Main Deployment Pipeline → Run workflow
```

### Database
```bash
# Create migration (from /backend)
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Reset database
rm pactoria_mvp.db && alembic upgrade head

# Backup database
cp pactoria_mvp.db pactoria_mvp_backup_$(date +%Y%m%d).db
```

### Code Quality
```bash
# Backend linting/formatting
black app tests                # Format Python code
ruff check app tests           # Lint Python code
mypy app                       # Type checking

# Frontend linting
npm run lint                   # ESLint
npm run type-check            # TypeScript checking
```

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Azure Cloud                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐        ┌────────────────────┐       │
│  │  Static Web App  │◄──────►│  Container Apps    │       │
│  │   (Frontend)     │        │    (Backend)       │       │
│  │                  │        │                    │       │
│  │  React + Vite    │        │  FastAPI + Python  │       │
│  └──────────────────┘        └─────────┬──────────┘       │
│                                        │                   │
│                              ┌─────────▼──────────┐       │
│                              │   Azure Files      │       │
│                              │  (SQLite Storage)  │       │
│                              └────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     Groq API        │
                    │  (LLM Processing)   │
                    └────────────────────┘
```

### Key Architecture Decisions
1. **SQLite over PostgreSQL**: Reduces costs by ~$50/month while maintaining sufficient performance for MVP
2. **Container Apps with scale-to-zero**: Backend only runs when needed, saving ~70% on compute costs
3. **Static Web Apps**: Frontend hosting is completely free
4. **Groq over OpenAI**: 10x faster inference at lower cost (~$0.27/million tokens)

## Project Structure

```
Pactoria-MVP/
├── frontend/                    # React Frontend Application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components (routes)
│   │   ├── services/          # API service layer
│   │   ├── hooks/             # Custom React hooks
│   │   ├── store/             # Zustand state management
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Helper functions
│   ├── e2e/                   # Playwright E2E tests
│   ├── package.json          # Frontend dependencies
│   └── vite.config.ts        # Vite configuration
│
├── backend/                   # FastAPI Backend Application
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   │   └── v1/          # API version 1
│   │   ├── core/            # Core functionality (config, security)
│   │   ├── domain/          # Domain models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic services
│   │   └── main.py         # FastAPI app entry point
│   ├── tests/              # Test suites
│   │   ├── unit/          # Unit tests
│   │   ├── integration/   # Integration tests
│   │   └── e2e/          # End-to-end tests
│   ├── migrations/        # Alembic database migrations
│   └── requirements.txt   # Python dependencies
│
├── .github/workflows/     # GitHub Actions CI/CD
│   ├── deploy-main.yml   # Main deployment pipeline
│   ├── azure-backend-containerapp.yml
│   └── azure-frontend-staticapp.yml
│
├── scripts/              # Utility scripts
├── database/            # Database scripts and backups
└── deployment/          # Deployment configurations
```

## Development Workflows

### Local Development Setup
1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/Pactoria-MVP.git
   cd Pactoria-MVP
   
   # Backend setup
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Frontend setup
   cd ../frontend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   # Backend (.env in /backend)
   SECRET_KEY=your-secret-key
   JWT_SECRET_KEY=your-jwt-secret
   GROQ_API_KEY=gsk_your_groq_api_key
   DATABASE_URL=sqlite:///./pactoria_mvp.db
   
   # Frontend (.env in /frontend)
   VITE_API_URL=http://localhost:8000/api/v1
   ```

3. **Initialize database:**
   ```bash
   cd backend
   alembic upgrade head
   python setup_test_data.py  # Optional: seed test data
   ```

### API Development
When adding new endpoints:
1. Create schema in `/backend/app/schemas/`
2. Add endpoint in `/backend/app/api/v1/endpoints/`
3. Implement business logic in `/backend/app/services/`
4. Add tests in `/backend/tests/`
5. Update API documentation (auto-generated via FastAPI)

### Frontend Component Development
1. Components go in `/frontend/src/components/`
2. Use TypeScript interfaces in `/frontend/src/types/`
3. API calls via services in `/frontend/src/services/`
4. State management with Zustand in `/frontend/src/store/`
5. Add tests alongside components (`*.test.tsx`)

### AI Feature Integration
Groq API integration patterns:
```python
# backend/app/services/ai_service.py
from groq import Groq
from langchain_groq import ChatGroq

# Use for simple completions
client = Groq(api_key=settings.GROQ_API_KEY)

# Use for complex chains
llm = ChatGroq(model="llama-3.1-70b", temperature=0.3)
```

## Testing Strategy

### Backend Testing
- **Unit Tests**: Test individual functions and methods in isolation
- **Integration Tests**: Test API endpoints with database
- **E2E Tests**: Full user workflow testing

Run with: `pytest tests/unit` or `pytest tests/integration`

### Frontend Testing
- **Component Tests**: Using Vitest and React Testing Library
- **E2E Tests**: Playwright tests for critical user flows
  - Authentication flows
  - Contract creation workflow
  - Document management

Run with: `npm test` or `npm run test:e2e`

### Test Coverage Requirements
- Backend: Minimum 80% coverage for core services
- Frontend: Minimum 70% coverage for components
- E2E: Cover all critical user paths

## Deployment Process

### CI/CD Pipeline
The project uses GitHub Actions for automated deployment:

1. **Push to main branch** triggers deployment
2. **Validate secrets** workflow checks configuration
3. **Build & Test** runs all tests
4. **Deploy Backend** to Azure Container Apps
5. **Deploy Frontend** to Azure Static Web Apps

### Environment Configuration
- **Development**: Local SQLite, debug mode enabled
- **Production**: Azure Files for SQLite persistence, HTTPS only

### Azure Deployment
```bash
# One-time setup
az group create --name pactoria-rg --location eastus
az acr create --resource-group pactoria-rg --name pactoriaacr --sku Basic

# Deploy
./deploy-ultra-cheap.sh  # Automated deployment script
```

### Database Migrations in Production
1. Backup current database
2. Run migrations locally first for testing
3. Apply to production via Container Apps console
4. Verify application health

## Troubleshooting

### Common Issues

**CORS Errors:**
- Check `CORS_ORIGINS` in backend `.env`
- Ensure frontend URL is whitelisted
- Verify API URL in frontend `.env`

**Database Connection Issues:**
- Check `DATABASE_URL` environment variable
- Ensure SQLite file has write permissions
- Verify Azure Files mount in Container Apps

**Build Failures:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Python cache: `find . -type d -name __pycache__ -exec rm -rf {} +`
- Check Node version (18+) and Python version (3.11+)

**Azure Deployment Errors:**
- Verify all GitHub secrets are set correctly
- Check Azure subscription has sufficient quota
- Review Container Apps logs: `az containerapp logs show --name pactoria-backend`

### Performance Tips
- Enable Redis caching for frequently accessed data
- Use Groq API's streaming for long responses
- Implement pagination for large datasets
- Use React Query for frontend caching

### Environment Variables Reference
```bash
# Backend Required
SECRET_KEY            # Application secret key
JWT_SECRET_KEY       # JWT token signing key
GROQ_API_KEY        # Groq API key for AI features
DATABASE_URL        # Database connection string

# Backend Optional
REDIS_URL           # Redis connection for caching
ENVIRONMENT         # development/production
DEBUG              # true/false
CORS_ORIGINS       # Comma-separated allowed origins

# Frontend
VITE_API_URL       # Backend API URL
VITE_APP_NAME      # Application name
VITE_APP_VERSION   # Application version
```

## Key Dependencies

### Backend
- FastAPI 0.115.5
- SQLAlchemy 2.0.35
- Alembic 1.14.0
- Groq 0.9.0
- LangChain 0.3.9
- Pydantic 2.10.2

### Frontend
- React 18.2.0
- TypeScript 5.0.2
- Vite 4.4.5
- TanStack Query 5.85.6
- Zustand 5.0.8
- Playwright 1.55.0

## Notes for Future Development

1. **Scaling Considerations**: When user base grows beyond 1000 active users, consider migrating from SQLite to PostgreSQL
2. **Caching Strategy**: Implement Redis for session management and API response caching
3. **Monitoring**: Add Azure Application Insights for production monitoring
4. **Security**: Implement rate limiting and API key rotation
5. **Feature Flags**: Consider implementing feature toggles for gradual rollouts
