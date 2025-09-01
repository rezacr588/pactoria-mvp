# ULTRA-LOW-COST Azure Deployment Guide
**Target Cost: $15-25/month**

## Overview
This deployment strategy uses the cheapest possible Azure services while maintaining full functionality:
- **Frontend**: Azure Static Web Apps (FREE)
- **Backend**: Azure Container Apps (Consumption, minimal resources)
- **Database**: SQLite with Azure Files persistence
- **Total Estimated Cost**: $15-25/month

## Prerequisites
1. Azure CLI installed and logged in
2. Node.js 18+ for frontend build
3. Docker (optional, for local testing)

## Quick Deployment

### Option 1: Automated Script
```bash
chmod +x deploy-ultra-cheap.sh
./deploy-ultra-cheap.sh
```

### Option 2: Manual Steps

#### 1. Deploy Backend
```bash
# Create resource group
az group create --name pactoria-rg --location eastus

# Create storage for SQLite persistence
az storage account create \
  --name pactoriastore \
  --resource-group pactoria-rg \
  --sku Standard_LRS \
  --kind StorageV2

# Create container registry
az acr create \
  --resource-group pactoria-rg \
  --name pactoriaacr \
  --sku Basic

# Build and push backend
cd backend
az acr build --registry pactoriaacr --image pactoria-backend:latest .

# Create container apps environment
az containerapp env create \
  --name pactoria-env \
  --resource-group pactoria-rg \
  --location eastus

# Deploy backend with MINIMAL resources
az containerapp create \
  --name pactoria-backend \
  --resource-group pactoria-rg \
  --environment pactoria-env \
  --image pactoriaacr.azurecr.io/pactoria-backend:latest \
  --target-port 8000 \
  --ingress external \
  --cpu 0.25 \
  --memory 0.5Gi \
  --min-replicas 0 \
  --max-replicas 2
```

#### 2. Deploy Frontend
```bash
# Build frontend
cd frontend
npm install
npm run build

# Deploy to Static Web Apps (FREE)
az staticwebapp create \
  --name pactoria-frontend \
  --resource-group pactoria-rg \
  --source ./dist \
  --location eastus \
  --sku Free
```

## Cost Breakdown

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| Static Web Apps | FREE tier | $0 |
| Container Apps | 0.25 CPU, 0.5GB RAM, Consumption | $8-15 |
| Storage Account | Basic LRS, 5GB | $2-4 |
| Container Registry | Basic tier | $5 |
| **TOTAL** | | **$15-25** |

## Extreme Cost Optimization Features

### 1. Scale-to-Zero Backend
- Container Apps scales to 0 replicas when idle
- Only pay when requests are being processed
- Cold start ~2-3 seconds (acceptable for MVP)

### 2. SQLite Database
- No database server costs
- File-based database stored in Azure Files
- Perfect for MVP with <1000 users

### 3. FREE Frontend Hosting
- Azure Static Web Apps free tier
- Global CDN included
- 100GB bandwidth/month included

### 4. Minimal Resource Allocation
- Backend: 0.25 vCPU, 0.5GB RAM (absolute minimum)
- Single worker process
- Basic monitoring only

## Production Considerations

### Security
- HTTPS enabled by default
- Environment variables for secrets
- Basic security headers configured

### Monitoring
- Basic Azure Monitor (included)
- Application Insights disabled (saves $10-20/month)
- Health check endpoints implemented

### Backup Strategy
- SQLite database backed by Azure Files
- Automatic file versioning available
- Manual backup scripts provided

## Scaling Path (When Budget Increases)

1. **$50/month budget**: Add Application Insights, upgrade to Standard Container Apps
2. **$100/month budget**: Switch to Azure Database for PostgreSQL
3. **$200/month budget**: Add Redis cache, multiple regions

## Troubleshooting

### Backend Issues
```bash
# Check container logs
az containerapp logs show --name pactoria-backend --resource-group pactoria-rg

# Restart container
az containerapp restart --name pactoria-backend --resource-group pactoria-rg
```

### Frontend Issues
```bash
# Redeploy frontend
az staticwebapp deploy --name pactoria-frontend --resource-group pactoria-rg --source ./frontend/dist
```

### Database Issues
```bash
# Check storage account
az storage account show --name pactoriastore --resource-group pactoria-rg

# List files in share
az storage file list --share-name sqlite-data --account-name pactoriastore
```

## Important Notes

⚠️ **This is a BARE-MINIMUM deployment focused solely on cost reduction**

✅ **What works:**
- Full application functionality
- AI contract generation
- User authentication
- File uploads
- Database persistence

❌ **What's missing (to save costs):**
- High availability/redundancy
- Advanced monitoring
- Automated backups
- Performance optimization
- Premium support
- Multiple environments

**Perfect for**: MVP testing, proof of concept, very low budget deployments
**Not suitable for**: Production systems requiring high availability or performance