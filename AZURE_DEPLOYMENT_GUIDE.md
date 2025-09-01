# Pactoria MVP - Azure Production Deployment Guide

## 🚀 Overview

This guide provides step-by-step instructions for deploying Pactoria MVP to Azure with cost optimization. The deployment uses:

- **Azure Container Apps** for the backend (with scale-to-zero)
- **Azure Static Web Apps** for the frontend
- **SQLite** for the database (cost-optimized)
- **Azure Container Registry** for container images

**Estimated Monthly Cost: $5-30** (depending on usage)

## 📋 Prerequisites

### Required Tools
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (latest version)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) (version 18+)

### Required Accounts
- Azure Subscription with Owner/Contributor access
- GitHub account (for Static Web Apps deployment)
- [Groq API Key](https://console.groq.com/keys) (free tier available)

### Environment Setup
```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "your-subscription-id"

# Install required extensions
az extension add --name containerapp --upgrade
az extension add --name staticwebapp
```

## 🔑 Environment Variables Setup

### 1. Backend Environment Variables

Copy the template and set your values:
```bash
cp backend/.env.production.template backend/.env.production
```

**Critical Variables to Set:**
- `JWT_SECRET_KEY` - Generate: `openssl rand -base64 32`
- `SECRET_KEY` - Generate: `openssl rand -base64 32`
- `GROQ_API_KEY` - Get from [Groq Console](https://console.groq.com/keys)

### 2. Frontend Environment Variables

The deployment script will generate this automatically, but you can create it manually:
```bash
cp frontend/.env.production.template frontend/.env.production
```

Edit `VITE_API_URL` to match your backend URL after deployment.

## 🚀 Automated Deployment

### Option 1: Using the Deployment Script (Recommended)

```bash
# Set environment variables
export JWT_SECRET_KEY=$(openssl rand -base64 32)
export SECRET_KEY=$(openssl rand -base64 32)
export GROQ_API_KEY="your-groq-api-key-here"

# Run deployment script
chmod +x deploy-azure-production.sh
./deploy-azure-production.sh
```

### Option 2: Manual Deployment

If you prefer to deploy manually, follow these steps:

#### Step 1: Create Resource Group
```bash
az group create \
    --name pactoria-rg \
    --location eastus
```

#### Step 2: Create Container Registry
```bash
az acr create \
    --resource-group pactoria-rg \
    --name pactoriaacr \
    --sku Basic \
    --admin-enabled true
```

#### Step 3: Build and Push Backend
```bash
cd backend

# Build image
docker build -t pactoriaacr.azurecr.io/pactoria-backend:latest .

# Login and push
az acr login --name pactoriaacr
docker push pactoriaacr.azurecr.io/pactoria-backend:latest
```

#### Step 4: Create Container Apps Environment
```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
    --resource-group pactoria-rg \
    --workspace-name pactoria-logs \
    --location eastus

# Get workspace details
LOG_WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --resource-group pactoria-rg \
    --workspace-name pactoria-logs \
    --query customerId \
    --output tsv)

LOG_WORKSPACE_SECRET=$(az monitor log-analytics workspace get-shared-keys \
    --resource-group pactoria-rg \
    --workspace-name pactoria-logs \
    --query primarySharedKey \
    --output tsv)

# Create Container Apps environment
az containerapp env create \
    --name pactoria-env \
    --resource-group pactoria-rg \
    --location eastus \
    --logs-workspace-id $LOG_WORKSPACE_ID \
    --logs-workspace-key $LOG_WORKSPACE_SECRET
```

#### Step 5: Deploy Backend Container App
```bash
az containerapp create \
    --name pactoria-backend \
    --resource-group pactoria-rg \
    --environment pactoria-env \
    --image pactoriaacr.azurecr.io/pactoria-backend:latest \
    --target-port 8000 \
    --ingress 'external' \
    --registry-server pactoriaacr.azurecr.io \
    --secrets \
        jwt-secret-key="your-jwt-secret" \
        secret-key="your-secret-key" \
        groq-api-key="your-groq-key" \
    --env-vars \
        JWT_SECRET_KEY=secretref:jwt-secret-key \
        SECRET_KEY=secretref:secret-key \
        GROQ_API_KEY=secretref:groq-api-key \
        ENVIRONMENT=production \
        DEBUG=false \
    --cpu 0.25 \
    --memory 0.5Gi \
    --min-replicas 0 \
    --max-replicas 2
```

#### Step 6: Deploy Frontend to Static Web Apps

1. **Create Static Web App in Azure Portal:**
   - Go to Azure Portal
   - Create new resource → Static Web App
   - Connect to your GitHub repository
   - Set build configuration:
     - App location: `/frontend`
     - Build location: `/frontend/dist`
     - API location: (leave empty)

2. **Configure Environment Variables:**
   - In Azure Portal → Static Web App → Configuration
   - Add environment variable: `VITE_API_URL` = your backend URL

3. **Build Settings (GitHub Actions):**
   The deployment will create a GitHub Actions workflow. Ensure it includes:
   ```yaml
   app_build_command: 'npm run build:prod'
   ```

## 🏗️ Architecture Overview

```
┌─────────────────────┐    ┌──────────────────────┐
│   Azure Static      │    │  Azure Container     │
│   Web Apps          │────│  Apps                │
│   (Frontend)        │    │  (Backend API)       │
│   • React App       │    │  • FastAPI           │
│   • Vite Build      │    │  • Scale-to-zero     │
│   • CDN             │    │  • SQLite DB         │
└─────────────────────┘    └──────────────────────┘
           │                          │
           └──────────────────────────┘
                     HTTPS/API
```

## 💰 Cost Optimization Features

### Backend Optimization
- ✅ **Scale-to-zero**: Container scales to 0 replicas when idle
- ✅ **Minimum resources**: 0.25 CPU, 0.5Gi memory
- ✅ **SQLite database**: No separate database costs
- ✅ **Single worker**: Gunicorn optimized for minimal footprint
- ✅ **Disabled features**: Redis caching, detailed logging

### Frontend Optimization
- ✅ **Static Web Apps Free Tier**: Up to 100GB bandwidth
- ✅ **Global CDN**: Included at no extra cost
- ✅ **Optimized builds**: Tree-shaking, minification
- ✅ **Efficient caching**: Long-term caching for assets

### Estimated Costs (Monthly)
| Component | Low Usage | Medium Usage | High Usage |
|-----------|-----------|--------------|------------|
| Container Apps | $2-5 | $10-20 | $30-50 |
| Static Web Apps | Free | Free | $0-10 |
| Container Registry | $5 | $5 | $5-15 |
| Log Analytics | Free | $2-5 | $10-20 |
| **Total** | **$7-10** | **$17-30** | **$45-95** |

## 🔧 Configuration Details

### Backend Configuration
The backend is configured with production-ready settings:

- **Health checks**: `/health`, `/ready`, `/ping` endpoints
- **Security headers**: CORS, CSP, security headers
- **Environment-based config**: Dynamic CORS, database selection
- **Logging**: Structured logging with configurable levels
- **Error handling**: Global exception handling

### Frontend Configuration
The frontend is optimized for production:

- **Build optimization**: Code splitting, tree-shaking
- **Security headers**: CSP, HSTS, X-Frame-Options
- **Caching strategy**: Aggressive caching for assets
- **Error boundaries**: Graceful error handling
- **API integration**: Environment-based API URLs

## 🧪 Testing the Deployment

### Health Checks
```bash
# Backend health check
curl https://your-backend-url/health

# Frontend accessibility
curl -I https://your-frontend-url
```

### API Testing
```bash
# Test API endpoints
curl https://your-backend-url/api/v1/

# Test authentication
curl -X POST https://your-backend-url/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","full_name":"Test User"}'
```

## 🚨 Security Considerations

### Secrets Management
- ✅ All secrets stored in Azure Container Apps secrets
- ✅ Environment variables for non-sensitive config
- ✅ No hardcoded credentials in code

### Network Security
- ✅ HTTPS enforced everywhere
- ✅ CORS properly configured
- ✅ Security headers implemented
- ✅ No direct database access

### Application Security
- ✅ JWT authentication
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection

## 🔄 CI/CD Pipeline

### GitHub Actions (Auto-created for Static Web Apps)
```yaml
# .github/workflows/azure-static-web-apps-*.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main]

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          app_location: "/frontend"
          api_location: ""
          output_location: "dist"
          app_build_command: "npm run build:prod"
```

### Container Apps Deployment
For backend updates:
```bash
# Rebuild and push
docker build -t pactoriaacr.azurecr.io/pactoria-backend:latest backend/
docker push pactoriaacr.azurecr.io/pactoria-backend:latest

# Update container app
az containerapp update \
    --name pactoria-backend \
    --resource-group pactoria-rg \
    --image pactoriaacr.azurecr.io/pactoria-backend:latest
```

## 📊 Monitoring and Logging

### Application Insights (Optional)
```bash
# Create Application Insights
az extension add --name application-insights
az monitor app-insights component create \
    --app pactoria-insights \
    --location eastus \
    --resource-group pactoria-rg
```

### Log Analytics Queries
```kusto
// Container Apps logs
ContainerAppConsoleLogs_CL
| where ContainerName_s == "pactoria-backend"
| order by TimeGenerated desc

// Error analysis
ContainerAppConsoleLogs_CL
| where Log_s contains "ERROR"
| order by TimeGenerated desc
```

## 🛠️ Troubleshooting

### Common Issues

#### Backend Not Starting
```bash
# Check container logs
az containerapp logs show \
    --name pactoria-backend \
    --resource-group pactoria-rg \
    --follow

# Check environment variables
az containerapp show \
    --name pactoria-backend \
    --resource-group pactoria-rg \
    --query properties.template.containers[0].env
```

#### Frontend Build Failing
```bash
# Check GitHub Actions logs
# Go to GitHub → Actions tab → View failed workflow

# Common fixes:
# 1. Check Node.js version in workflow
# 2. Verify environment variables
# 3. Check package.json scripts
```

#### Database Connection Issues
```bash
# For SQLite - check volume mounts
az containerapp show \
    --name pactoria-backend \
    --resource-group pactoria-rg \
    --query properties.template.containers[0].volumeMounts

# For PostgreSQL - test connection
az postgres flexible-server connect \
    --name your-server \
    --admin-user your-user \
    --database pactoria_mvp
```

## 🔄 Updates and Maintenance

### Scaling Adjustments
```bash
# Increase max replicas if needed
az containerapp update \
    --name pactoria-backend \
    --resource-group pactoria-rg \
    --max-replicas 5

# Increase resources if needed
az containerapp update \
    --name pactoria-backend \
    --resource-group pactoria-rg \
    --cpu 0.5 \
    --memory 1Gi
```

### Database Migrations
```bash
# For SQLite - backup before updates
az containerapp exec \
    --name pactoria-backend \
    --resource-group pactoria-rg \
    --command "sqlite3 /app/data/pactoria_mvp.db .backup backup.db"
```

## 📞 Support

### Getting Help
- **Azure Support**: Azure Portal → Help + Support
- **GitHub Issues**: Create issues in the repository
- **Documentation**: [Azure Container Apps](https://docs.microsoft.com/en-us/azure/container-apps/)

### Useful Commands
```bash
# View all resources
az resource list --resource-group pactoria-rg --output table

# Check costs
az consumption usage list --output table

# Delete everything (careful!)
az group delete --name pactoria-rg --yes --no-wait
```

---

## 🎉 Congratulations!

You've successfully deployed Pactoria MVP to Azure with cost optimization. The deployment includes:

- ✅ Production-ready backend with health checks
- ✅ Optimized frontend with global CDN
- ✅ Security best practices
- ✅ Cost-efficient scaling
- ✅ Comprehensive monitoring

Your application is now live and ready to serve customers!