# Deployment Guide

**Pactoria MVP Backend - Production Deployment and Azure Configuration**

## Table of Contents

1. [Overview](#overview)
2. [Azure Container Apps Deployment](#azure-container-apps-deployment)
3. [Local Production Setup](#local-production-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Migration](#database-migration)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Security Configuration](#security-configuration)
8. [Performance Optimization](#performance-optimization)
9. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Pactoria backend is designed for cloud-native deployment with support for multiple environments. The primary production deployment target is **Azure Container Apps** for scalability and cost-effectiveness.

### Deployment Options

| Environment | Platform | Database | Use Case |
|-------------|----------|----------|----------|
| Development | Local | SQLite | Local development |
| Staging | Azure Container Apps | Azure Database for PostgreSQL | Pre-production testing |
| Production | Azure Container Apps | Azure Database for PostgreSQL | Live production |
| Enterprise | Azure Kubernetes Service | Azure Database for PostgreSQL | High-scale enterprise |

### Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐
│   Azure Front Door  │    │    Azure Monitor    │
│   (Load Balancer)   │    │    (Monitoring)     │
└─────────┬───────────┘    └─────────────────────┘
          │
┌─────────▼───────────┐    ┌─────────────────────┐
│ Azure Container Apps│    │   Key Vault         │
│ (FastAPI Backend)   │    │   (Secrets)         │
└─────────┬───────────┘    └─────────────────────┘
          │
┌─────────▼───────────┐    ┌─────────────────────┐
│ Azure Database      │    │   Groq AI Service   │
│ for PostgreSQL      │    │   (External)        │
└─────────────────────┘    └─────────────────────┘
```

---

## Azure Container Apps Deployment

Azure Container Apps provides a serverless container platform perfect for the Pactoria backend's needs.

### Prerequisites

**Required Tools:**
```bash
# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Docker
# Follow Docker installation guide for your OS

# GitHub CLI (optional, for GitHub Actions)
# Follow GitHub CLI installation guide
```

**Azure Resources:**
- Azure subscription with Container Apps enabled
- Resource group for Pactoria resources
- Azure Database for PostgreSQL flexible server
- Azure Key Vault for secrets management
- Azure Container Registry (ACR) for container images

### Step-by-Step Azure Deployment

#### 1. Azure Resource Setup

```bash
# Login to Azure
az login

# Set subscription (replace with your subscription ID)
az account set --subscription "your-subscription-id"

# Create resource group
az group create \
  --name rg-pactoria-prod \
  --location "UK South"

# Create Azure Container Registry
az acr create \
  --resource-group rg-pactoria-prod \
  --name acrpactoria \
  --sku Standard \
  --location "UK South"

# Enable admin user for ACR
az acr update \
  --name acrpactoria \
  --admin-enabled true
```

#### 2. Database Setup

```bash
# Create Azure Database for PostgreSQL
az postgres flexible-server create \
  --resource-group rg-pactoria-prod \
  --name pactoria-db-prod \
  --location "UK South" \
  --admin-user pactoriaadmin \
  --admin-password "SecurePassword123!" \
  --sku-name Standard_B1ms \
  --version 15 \
  --storage-size 32 \
  --public-access 0.0.0.0

# Create database
az postgres flexible-server db create \
  --resource-group rg-pactoria-prod \
  --server-name pactoria-db-prod \
  --database-name pactoria_prod

# Configure firewall for Azure services
az postgres flexible-server firewall-rule create \
  --resource-group rg-pactoria-prod \
  --name pactoria-db-prod \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

#### 3. Key Vault Setup

```bash
# Create Key Vault
az keyvault create \
  --name pactoria-kv-prod \
  --resource-group rg-pactoria-prod \
  --location "UK South"

# Store secrets
az keyvault secret set \
  --vault-name pactoria-kv-prod \
  --name "DATABASE-URL" \
  --value "postgresql://pactoriaadmin:SecurePassword123!@pactoria-db-prod.postgres.database.azure.com:5432/pactoria_prod"

az keyvault secret set \
  --vault-name pactoria-kv-prod \
  --name "GROQ-API-KEY" \
  --value "your-groq-api-key-here"

az keyvault secret set \
  --vault-name pactoria-kv-prod \
  --name "SECRET-KEY" \
  --value "$(openssl rand -base64 32)"
```

#### 4. Container Image Build

```bash
# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name acrpactoria --resource-group rg-pactoria-prod --query loginServer --output tsv)

# Build and push container image
az acr build \
  --registry acrpactoria \
  --image pactoria-backend:latest \
  --file Dockerfile \
  .
```

#### 5. Container Apps Environment

```bash
# Create Container Apps environment
az containerapp env create \
  --name pactoria-env-prod \
  --resource-group rg-pactoria-prod \
  --location "UK South"

# Create managed identity for Key Vault access
az identity create \
  --resource-group rg-pactoria-prod \
  --name pactoria-identity

# Get identity details
IDENTITY_ID=$(az identity show --resource-group rg-pactoria-prod --name pactoria-identity --query id --output tsv)
IDENTITY_CLIENT_ID=$(az identity show --resource-group rg-pactoria-prod --name pactoria-identity --query clientId --output tsv)

# Grant Key Vault access to managed identity
az keyvault set-policy \
  --name pactoria-kv-prod \
  --object-id $(az identity show --resource-group rg-pactoria-prod --name pactoria-identity --query principalId --output tsv) \
  --secret-permissions get list
```

#### 6. Deploy Container App

```bash
# Create Container App using the provided YAML configuration
az containerapp create \
  --name pactoria-backend-prod \
  --resource-group rg-pactoria-prod \
  --environment pactoria-env-prod \
  --yaml azure-container-app.yaml
```

### Azure Container App Configuration (azure-container-app.yaml)

The repository includes a complete Azure Container App configuration file:

```yaml
# azure-container-app.yaml (already exists in your repo)
location: UK South
resourceGroup: rg-pactoria-prod
name: pactoria-backend-prod

properties:
  environmentId: /subscriptions/{subscription-id}/resourceGroups/rg-pactoria-prod/providers/Microsoft.App/managedEnvironments/pactoria-env-prod
  
  configuration:
    ingress:
      external: true
      targetPort: 8000
      traffic:
        - weight: 100
          latestRevision: true
    
    secrets:
      - name: database-url
        keyVaultUrl: https://pactoria-kv-prod.vault.azure.net/secrets/DATABASE-URL
        identity: /subscriptions/{subscription-id}/resourceGroups/rg-pactoria-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/pactoria-identity
      
      - name: groq-api-key  
        keyVaultUrl: https://pactoria-kv-prod.vault.azure.net/secrets/GROQ-API-KEY
        identity: /subscriptions/{subscription-id}/resourceGroups/rg-pactoria-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/pactoria-identity
        
      - name: secret-key
        keyVaultUrl: https://pactoria-kv-prod.vault.azure.net/secrets/SECRET-KEY  
        identity: /subscriptions/{subscription-id}/resourceGroups/rg-pactoria-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/pactoria-identity
  
  template:
    containers:
      - image: acrpactoria.azurecr.io/pactoria-backend:latest
        name: pactoria-backend
        env:
          - name: ENVIRONMENT
            value: production
          - name: DEBUG
            value: "false"
          - name: DATABASE_URL
            secretRef: database-url
          - name: GROQ_API_KEY
            secretRef: groq-api-key
          - name: SECRET_KEY
            secretRef: secret-key
          - name: CORS_ORIGINS
            value: '["https://app.pactoria.com"]'
        
        resources:
          cpu: 0.5
          memory: 1Gi
        
        probes:
          - type: liveness
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 30
          
          - type: readiness
            httpGet:
              path: /ready  
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
    
    scale:
      minReplicas: 1
      maxReplicas: 10
      rules:
        - name: http-rule
          http:
            metadata:
              concurrentRequests: 100
```

---

## Local Production Setup

For testing production configuration locally before Azure deployment.

### Docker Setup

**Dockerfile (already exists in your repo):**
```dockerfile
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt requirements-azure.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-azure.txt

# Copy application code
COPY app/ ./app/
COPY startup.py ./

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Local Production Testing

```bash
# Build production image
docker build -t pactoria-backend:prod .

# Run with production environment
docker run -d \
  --name pactoria-backend-prod \
  -p 8000:8000 \
  -e ENVIRONMENT=production \
  -e DEBUG=false \
  -e DATABASE_URL="postgresql://user:pass@host:5432/pactoria_prod" \
  -e GROQ_API_KEY="your-groq-api-key" \
  -e SECRET_KEY="your-secret-key" \
  -e CORS_ORIGINS='["https://app.pactoria.com"]' \
  pactoria-backend:prod

# Check logs
docker logs pactoria-backend-prod

# Test health endpoints
curl http://localhost:8000/health
curl http://localhost:8000/ready
```

### Docker Compose for Full Stack

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - DEBUG=false
      - DATABASE_URL=postgresql://pactoria:password@db:5432/pactoria_prod
      - GROQ_API_KEY=${GROQ_API_KEY}
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=pactoria_prod
      - POSTGRES_USER=pactoria
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

---

## Environment Configuration

### Production Environment Variables

```bash
# Application Configuration
ENVIRONMENT=production
DEBUG=false
APP_NAME=Pactoria Contract Management
APP_VERSION=1.0.0

# Database Configuration
DATABASE_URL=postgresql://pactoriaadmin:password@pactoria-db-prod.postgres.database.azure.com:5432/pactoria_prod

# Security Configuration  
SECRET_KEY=your-super-secret-key-minimum-32-characters
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=8  # Shorter for production

# AI Service Configuration
GROQ_API_KEY=gsk_your_production_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b

# CORS Configuration
CORS_ORIGINS=["https://app.pactoria.com", "https://www.pactoria.com"]

# Business Rules (Production Values)
MAX_USERS_PER_ACCOUNT=5
CONTRACT_HISTORY_MONTHS=12  # Longer retention in production
MIN_COMPLIANCE_SCORE=0.95

# Performance Configuration
WORKER_PROCESSES=4
MAX_CONNECTIONS=1000
KEEP_ALIVE_TIMEOUT=30

# Monitoring Configuration
LOG_LEVEL=INFO
ENABLE_METRICS=true
METRICS_PORT=9090

# Rate Limiting (Production)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100
RATE_LIMIT_BURST_SIZE=200
```

### Environment-Specific Settings

**Development (.env.development):**
```bash
DEBUG=true
DATABASE_URL=sqlite:///./pactoria_mvp.db
LOG_LEVEL=DEBUG
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
RATE_LIMIT_ENABLED=false
```

**Staging (.env.staging):**
```bash
ENVIRONMENT=staging
DEBUG=false  
DATABASE_URL=postgresql://staging_user:pass@staging-db.azure.com:5432/pactoria_staging
LOG_LEVEL=INFO
CORS_ORIGINS=["https://staging.pactoria.com"]
RATE_LIMIT_ENABLED=true
```

**Production (.env.production):**
```bash
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql://prod_user:pass@prod-db.azure.com:5432/pactoria_prod
LOG_LEVEL=WARNING
CORS_ORIGINS=["https://app.pactoria.com"]
RATE_LIMIT_ENABLED=true
ENABLE_METRICS=true
```

---

## Database Migration

### Alembic Migration Setup

```bash
# Initialize Alembic (if not already done)
alembic init alembic

# Generate initial migration
alembic revision --autogenerate -m "Initial database schema"

# Apply migrations to production
alembic upgrade head
```

### Production Database Migration Script

```python
# migrate_production.py
import asyncio
import logging
from alembic import command
from alembic.config import Config
from app.core.database import engine
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_migrations():
    """Run database migrations in production."""
    try:
        logger.info("Starting production database migration...")
        
        # Setup Alembic configuration
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        
        # Run migrations
        command.upgrade(alembic_cfg, "head")
        
        logger.info("Database migration completed successfully")
        
    except Exception as e:
        logger.error(f"Database migration failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(run_migrations())
```

### Database Seeding for Production

```python
# seed_production.py
import asyncio
from app.core.database import get_db
from app.core.template_seeder import TemplateSeeder
from app.infrastructure.database.models import Template

async def seed_production_data():
    """Seed production database with templates and reference data."""
    async with get_db() as db:
        # Seed UK legal templates
        template_seeder = TemplateSeeder(db)
        await template_seeder.seed_uk_legal_templates()
        
        # Verify seeding
        template_count = await db.query(Template).count()
        print(f"Seeded {template_count} templates")

if __name__ == "__main__":
    asyncio.run(seed_production_data())
```

---

## Monitoring and Logging

### Azure Monitor Integration

```python
# app/core/monitoring.py
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import trace, metrics
import logging

def setup_azure_monitoring():
    """Configure Azure Application Insights monitoring."""
    if settings.ENVIRONMENT == "production":
        configure_azure_monitor(
            connection_string=settings.APPLICATIONINSIGHTS_CONNECTION_STRING
        )
        
        # Setup custom metrics
        meter = metrics.get_meter(__name__)
        contract_counter = meter.create_counter(
            "contracts_created_total",
            description="Total number of contracts created"
        )
        
        ai_response_time = meter.create_histogram(
            "ai_generation_duration_seconds", 
            description="AI generation response time"
        )

# Usage in application
from app.core.monitoring import contract_counter, ai_response_time
import time

async def create_contract(contract_data):
    start_time = time.time()
    
    # Business logic here
    contract = await contract_service.create(contract_data)
    
    # Record metrics
    contract_counter.add(1, {"contract_type": contract.type})
    ai_response_time.record(time.time() - start_time)
    
    return contract
```

### Structured Logging

```python
# app/core/logging.py
import logging
import json
from datetime import datetime

class ProductionFormatter(logging.Formatter):
    """Structured JSON formatter for production logs."""
    
    def format(self, record):
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add exception information if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
            
        # Add custom fields
        if hasattr(record, 'user_id'):
            log_entry["user_id"] = record.user_id
        if hasattr(record, 'contract_id'):
            log_entry["contract_id"] = record.contract_id
            
        return json.dumps(log_entry)

# Configure logging
def setup_production_logging():
    """Setup structured logging for production."""
    handler = logging.StreamHandler()
    handler.setFormatter(ProductionFormatter())
    
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(handler)
```

### Health Check Endpoints

```python
# app/api/health.py
from fastapi import APIRouter, HTTPException
from app.services.ai_service import GroqAIService
from app.core.database import engine
from sqlalchemy import text

router = APIRouter()

@router.get("/health")
async def health_check():
    """Basic health check for load balancers."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.APP_VERSION
    }

@router.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe - checks dependencies."""
    health_status = {"ready": True, "checks": {}}
    
    # Check database connectivity
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["ready"] = False
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
    
    # Check AI service connectivity
    try:
        ai_service = GroqAIService()
        await ai_service.health_check()
        health_status["checks"]["ai_service"] = "healthy"
    except Exception as e:
        health_status["ready"] = False
        health_status["checks"]["ai_service"] = f"unhealthy: {str(e)}"
    
    if not health_status["ready"]:
        raise HTTPException(status_code=503, detail=health_status)
    
    return health_status
```

---

## Security Configuration

### Production Security Hardening

```python
# app/core/security.py
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

def setup_production_security(app):
    """Configure production security settings."""
    
    # Trusted hosts middleware
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=["app.pactoria.com", "api.pactoria.com"]
    )
    
    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )

@app.middleware("http")
async def security_headers(request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"  
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # HSTS in production
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response
```

### Secrets Management

```bash
# Azure Key Vault integration for secrets
az keyvault secret set --vault-name pactoria-kv-prod --name "DATABASE-PASSWORD" --value "$(openssl rand -base64 32)"
az keyvault secret set --vault-name pactoria-kv-prod --name "JWT-SECRET-KEY" --value "$(openssl rand -base64 64)"

# Rotate secrets regularly
az keyvault secret set --vault-name pactoria-kv-prod --name "GROQ-API-KEY" --value "new-groq-api-key"
```

---

## Performance Optimization

### Azure Container Apps Scaling

```yaml
# Automatic scaling configuration in azure-container-app.yaml
scale:
  minReplicas: 2  # Always have 2 instances minimum
  maxReplicas: 20 # Scale up to 20 instances under load
  rules:
    - name: http-scaling-rule
      http:
        metadata:
          concurrentRequests: 50  # Scale when >50 concurrent requests
    - name: cpu-scaling-rule
      custom:
        type: cpu
        metadata:
          type: Utilization
          value: 70  # Scale when CPU >70%
```

### Database Performance

```python
# Connection pooling configuration
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,          # Connection pool size
    max_overflow=30,       # Maximum overflow connections
    pool_pre_ping=True,    # Validate connections before use
    pool_recycle=3600,     # Recycle connections every hour
)
```

### Caching Strategy

```python
# Redis caching for production
from redis import asyncio as aioredis
from functools import wraps

class CacheService:
    def __init__(self):
        self.redis = aioredis.from_url(settings.REDIS_URL)
    
    async def get(self, key: str):
        """Get cached value."""
        return await self.redis.get(key)
    
    async def set(self, key: str, value: str, expire: int = 3600):
        """Set cached value with expiration."""
        await self.redis.setex(key, expire, value)

# Cached template retrieval
@cache_result(expire=3600)  # Cache for 1 hour
async def get_templates_by_type(contract_type: str):
    """Get templates with caching."""
    return await template_repository.find_by_type(contract_type)
```

---

## Backup and Disaster Recovery

### Database Backup Strategy

```bash
# Automated daily backups
az postgres flexible-server backup create \
  --resource-group rg-pactoria-prod \
  --name pactoria-db-prod \
  --backup-name daily-backup-$(date +%Y%m%d)

# Point-in-time recovery setup
az postgres flexible-server parameter set \
  --resource-group rg-pactoria-prod \
  --server-name pactoria-db-prod \
  --name log_statement \
  --value all
```

### Application Backup

```python
# Export user data for backup
async def export_company_data(company_id: str):
    """Export all company data for backup purposes."""
    export_data = {
        "company": await company_repository.find_by_id(company_id),
        "users": await user_repository.find_by_company(company_id),
        "contracts": await contract_repository.find_by_company(company_id),
        "templates": await template_repository.find_by_company(company_id),
        "audit_logs": await audit_repository.find_by_company(company_id)
    }
    
    return export_data

# Disaster recovery data restoration
async def restore_company_data(company_id: str, backup_data: dict):
    """Restore company data from backup."""
    # Implementation for data restoration
    pass
```

---

## Troubleshooting

### Common Deployment Issues

#### Container Startup Problems

```bash
# Check container logs
az containerapp logs show \
  --name pactoria-backend-prod \
  --resource-group rg-pactoria-prod \
  --follow

# Check container app status
az containerapp show \
  --name pactoria-backend-prod \
  --resource-group rg-pactoria-prod \
  --query properties.provisioningState

# Restart container app
az containerapp revision restart \
  --name pactoria-backend-prod \
  --resource-group rg-pactoria-prod
```

#### Database Connection Issues

```bash
# Test database connectivity
az postgres flexible-server connect \
  --name pactoria-db-prod \
  --admin-user pactoriaadmin \
  --database-name pactoria_prod

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --name pactoria-db-prod \
  --resource-group rg-pactoria-prod

# Update connection string
az keyvault secret set \
  --vault-name pactoria-kv-prod \
  --name "DATABASE-URL" \
  --value "new-connection-string"
```

#### Key Vault Access Issues

```bash
# Check managed identity assignment
az containerapp identity show \
  --name pactoria-backend-prod \
  --resource-group rg-pactoria-prod

# Update Key Vault access policy
az keyvault set-policy \
  --name pactoria-kv-prod \
  --object-id $(az containerapp identity show --name pactoria-backend-prod --resource-group rg-pactoria-prod --query principalId --output tsv) \
  --secret-permissions get list
```

### Performance Troubleshooting

```bash
# Monitor resource usage
az monitor metrics list \
  --resource /subscriptions/{subscription-id}/resourceGroups/rg-pactoria-prod/providers/Microsoft.App/containerapps/pactoria-backend-prod \
  --metric "WorkingSetBytes,CpuUsage"

# Scale manually if needed
az containerapp revision set-mode \
  --name pactoria-backend-prod \
  --resource-group rg-pactoria-prod \
  --mode single

# Check AI service performance
curl -H "Authorization: Bearer $TOKEN" https://your-app.azurecontainerapps.io/api/v1/ai/health
```

This deployment guide provides comprehensive instructions for production deployment with Azure Container Apps, ensuring scalability, security, and reliability for the Pactoria backend.