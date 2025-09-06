# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

# Pactoria MVP - AI-Powered Contract Management Platform

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Running the Application
```bash
# Clone and setup
git clone <repository-url>
cd Pactoria-MVP

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Add your GROQ_API_KEY
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Visit http://localhost:5173

## Common Commands

### Backend Development
```bash
# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest                           # All tests
pytest tests/unit               # Unit tests only
pytest tests/integration        # Integration tests
pytest tests/e2e               # E2E tests
pytest --cov=app --cov-report=html  # With coverage

# Database migrations
alembic revision --autogenerate -m "Description"
alembic upgrade head
alembic downgrade -1

# Code quality (if installed)
black app tests                # Format code
ruff check app tests --fix     # Lint and fix
mypy app                       # Type checking
```

### Frontend Development
```bash
# Development
npm run dev                    # Start dev server
npm run dev:prod-backend       # Dev with production backend

# Building
npm run build                  # Production build
npm run preview               # Preview production build

# Testing
npm test                      # Run Vitest
npm run test:coverage         # With coverage
npm run test:e2e              # Playwright E2E tests
npm run test:e2e:headed       # E2E with browser
npm run test:e2e:debug        # Debug E2E tests

# Code quality
npm run lint                  # ESLint
npm run type-check           # TypeScript checking

# Utilities
npm run check-backend         # Health check backend
npm run warmup-backend        # Warm up backend
```

### Deployment
```bash
# GitHub Actions (automatic on push to main)
# Manual: Actions → Deploy → Run workflow

# Local deployment scripts
./fix_critical_security.sh     # Apply security patches

# Docker build (if needed)
cd backend && docker build -t pactoria-backend .
```

## Architecture

```
Azure Cloud
├── Static Web App (Frontend) - React + Vite
├── Container Apps (Backend) - FastAPI + Python
└── Azure Files (SQLite Storage)
     └── Groq API (LLM Processing)

Key Decisions:
- SQLite over PostgreSQL: Cost-optimized for MVP
- Container Apps with scale-to-zero: ~70% compute savings
- Groq over OpenAI: 10x faster at ~$0.27/million tokens
```

## Project Structure

```
Pactoria-MVP/
├── frontend/
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/        # Route pages
│   │   ├── services/     # API clients
│   │   ├── hooks/        # React hooks
│   │   ├── store/        # Zustand state
│   │   └── types/        # TypeScript types
│   ├── e2e/              # Playwright tests
│   └── scripts/          # Utility scripts
├── backend/
│   ├── app/
│   │   ├── api/v1/       # API endpoints
│   │   ├── core/         # Config, security
│   │   ├── domain/       # Domain models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   └── tests/            # Test suites
└── .github/workflows/    # CI/CD pipelines
```

## Environment Variables

### Backend (required)
```bash
SECRET_KEY=<generate-secure-key>
JWT_SECRET_KEY=<generate-secure-key>
GROQ_API_KEY=gsk_<your-key>
DATABASE_URL=sqlite:///./pactoria_mvp.db
```

### Frontend (required)
```bash
VITE_API_URL=http://localhost:8000/api/v1
```

### Optional
```bash
# Backend
ENVIRONMENT=development/production
DEBUG=true/false
CORS_ORIGINS=http://localhost:5173
REDIS_URL=redis://localhost:6379/0

# Frontend
VITE_APP_NAME=Pactoria
VITE_ENABLE_DEBUG=true
```

## CI/CD & Deployment

### GitHub Actions Workflow
- **File**: `.github/workflows/deploy.yml`
- **Trigger**: Push to `main` branch
- **Process**: Test → Build → Deploy to Azure

### Required GitHub Secrets
```
AZURE_CREDENTIALS          # Azure service principal
AZURE_STATIC_WEB_APPS_API_TOKEN
GROQ_API_KEY
SECRET_KEY
JWT_SECRET_KEY
ACR_PASSWORD               # Azure Container Registry
```

### Azure Resources
- **Resource Group**: pactoria-mvp-rg
- **Container App**: pactoria-backend
- **ACR**: pactoriaacr
- **Location**: eastus

## Troubleshooting

### CORS Errors
- Check `CORS_ORIGINS` in backend `.env`
- Ensure frontend URL is whitelisted

### Database Issues
```bash
# Reset database
rm pactoria_mvp.db && alembic upgrade head

# Backup database
cp pactoria_mvp.db pactoria_mvp_backup_$(date +%Y%m%d).db
```

### Build Failures
```bash
# Frontend
rm -rf node_modules package-lock.json && npm install

# Backend
rm -rf venv && python -m venv venv && pip install -r requirements.txt
```

### Container Apps Logs
```bash
az containerapp logs show --name pactoria-backend --resource-group pactoria-mvp-rg
```

## Working with AI Features

### Groq Integration
```python
# Simple completion
from groq import Groq
client = Groq(api_key=settings.GROQ_API_KEY)

# Complex chains
from langchain_groq import ChatGroq
llm = ChatGroq(model="llama-3.1-70b", temperature=0.3)
```

### Available Models
- Llama 3.1 70B (primary)
- Mixtral 8x7B (fallback)

## Key Dependencies

### Backend
- FastAPI 0.115.5
- SQLAlchemy 2.0.35
- Alembic 1.14.0
- Groq 0.9.0
- LangChain 0.3.9

### Frontend
- React 18.2.0
- TypeScript 5.0.2
- Vite 4.4.5
- TanStack Query 5.85.6
- Zustand 5.0.8
- Playwright 1.55.0

## Security Notes

- Never commit `.env` files
- Rotate secrets regularly
- Use environment-specific configs
- Apply security patches with `./fix_critical_security.sh`
