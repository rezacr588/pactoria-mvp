# Pactoria MVP - CI/CD Pipeline Guide

## Overview

This document provides complete instructions for setting up and monitoring the CI/CD pipeline for the Pactoria MVP project. The pipeline is optimized for cost efficiency and reliability, using Azure Container Apps and Static Web Apps.

## Architecture

- **Frontend**: React app deployed to Azure Static Web Apps (Free tier)
- **Backend**: FastAPI deployed to Azure Container Apps (Scale-to-zero)
- **Database**: SQLite with Azure Files persistence (Cost-optimized)
- **Registry**: Azure Container Registry (Basic tier)

**Estimated Monthly Cost: $5-20**

## Prerequisites

Before setting up the CI/CD pipeline, ensure you have:

1. **Azure Subscription** with sufficient permissions
2. **GitHub Repository** with admin access
3. **Azure CLI** installed locally
4. **Docker** installed for local testing

## Initial Azure Setup

### 1. Create Resource Group and Core Resources

```bash
# Set variables
SUBSCRIPTION_ID="your-subscription-id"
RESOURCE_GROUP="pactoria-rg"
LOCATION="eastus"
ACR_NAME="pactoriaacr"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Container Registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Create Container Apps Environment
az containerapp env create \
  --name pactoria-env \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### 2. Create Container App for Backend

```bash
# Create the container app (initial deployment)
az containerapp create \
  --name pactoria-backend \
  --resource-group $RESOURCE_GROUP \
  --environment pactoria-env \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 8000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 2 \
  --cpu 0.5 \
  --memory 1.0Gi
```

### 3. Create Static Web App for Frontend

```bash
# Create Static Web App
az staticwebapp create \
  --name pactoria-frontend \
  --resource-group $RESOURCE_GROUP \
  --source https://github.com/YOUR-USERNAME/Pactoria-MVP \
  --branch main \
  --app-location "frontend" \
  --output-location "dist" \
  --login-with-github
```

## GitHub Secrets Configuration

### Required Secrets

Go to your GitHub repository: **Settings → Secrets and Variables → Actions**

#### 1. AZURE_CREDENTIALS

Create a service principal for GitHub Actions:

```bash
az ad sp create-for-rbac \
  --name "pactoria-github-actions" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
```

Copy the entire JSON output and add as `AZURE_CREDENTIALS` secret.

#### 2. AZURE_STATIC_WEB_APPS_API_TOKEN

1. Go to Azure Portal → Your Static Web App
2. Navigate to **Overview → Manage deployment token**
3. Copy the token and add as `AZURE_STATIC_WEB_APPS_API_TOKEN` secret

#### 3. STATIC_WEB_APP_URL

Add your Static Web App URL (e.g., `https://pactoria-frontend.azurestaticapps.net`)

### Optional Secrets

- `GROQ_API_KEY`: Your Groq API key for AI features
- `JWT_SECRET_KEY`: Custom JWT secret (auto-generated if not provided)
- `VITE_API_URL`: Custom API URL override

## Container Apps Secrets Setup

Run the "Setup Azure Container Apps Secrets" workflow or use Azure CLI:

```bash
# Set secrets in Container Apps
az containerapp secret set \
  --name pactoria-backend \
  --resource-group pactoria-rg \
  --secrets \
    secret-key="your-production-secret-key" \
    jwt-secret-key="your-jwt-secret-key" \
    groq-api-key="your-groq-api-key" \
    database-url="sqlite:///./data/pactoria_mvp.db"
```

## Available Workflows

### 1. Main Deployment Pipeline (`deploy-main.yml`)

**Trigger**: Push to main branch or manual dispatch

**Features**:
- Intelligent change detection
- Parallel backend/frontend builds
- Health checks and validation
- Cost monitoring
- Deployment summary

**Usage**:
```bash
# Automatic on push to main
git push origin main

# Manual trigger
# Go to Actions → Main Deployment Pipeline → Run workflow
```

### 2. Secrets Validation (`validate-secrets.yml`)

**Trigger**: Manual or weekly schedule

**Features**:
- Validates all required secrets
- Checks Azure resource existence
- Provides setup instructions

**Usage**:
```bash
# Manual validation
# Go to Actions → Validate Secrets Configuration → Run workflow
```

### 3. Individual Component Workflows

- `azure-backend-containerapp.yml`: Backend-only deployments
- `azure-frontend-staticapp.yml`: Frontend-only deployments
- `azure-full-deployment.yml`: Comprehensive deployment with E2E tests

## Monitoring and Troubleshooting

### Health Check Endpoints

- **Backend Health**: `https://pactoria-backend.azurecontainerapps.io/health`
- **Backend API**: `https://pactoria-backend.azurecontainerapps.io/api/v1/health`
- **Frontend**: `https://pactoria-frontend.azurestaticapps.net`

### Common Issues

#### 1. Backend Health Check Failures

**Symptoms**: Health check fails after deployment

**Solutions**:
- Check Container Apps logs: `az containerapp logs show --name pactoria-backend --resource-group pactoria-rg`
- Verify secrets are properly set
- Ensure database path is writable

#### 2. Frontend Build Failures

**Symptoms**: Frontend build fails in workflow

**Solutions**:
- Check if `VITE_API_URL` is correctly set
- Verify Node.js version compatibility
- Check for TypeScript errors locally: `npm run type-check`

#### 3. Secret Configuration Issues

**Symptoms**: App starts but features don't work

**Solutions**:
- Run the "Validate Secrets Configuration" workflow
- Check Container Apps environment variables
- Verify service principal permissions

### Cost Monitoring

Monitor costs using:

```bash
# Check monthly costs for resource group
az costmanagement query \
  --type Usage \
  --dataset-aggregation '{"totalCost":{"name":"PreTaxCost","function":"Sum"}}' \
  --dataset-grouping name=ResourceGroup type=Dimension \
  --dataset-filter '{"dimensions":{"name":"ResourceGroup","operator":"In","values":["pactoria-rg"]}}' \
  --timeframe MonthToDate
```

### Performance Optimization

#### Backend Optimization

- Container Apps scale to zero when idle (saves cost)
- Use minimal resource allocation (0.5 CPU, 1GB RAM)
- SQLite for cost-effective storage

#### Frontend Optimization

- Static Web Apps with global CDN
- Gzip compression for large assets
- Cache-control headers optimized
- Bundle size monitoring

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# Push to GitHub
git push origin feature/new-feature

# Create Pull Request
# Staging environments will be automatically created
```

### 2. Testing Deployments

```bash
# Run main deployment manually
# Go to Actions → Main Deployment Pipeline → Run workflow
# Select components to deploy

# Test specific environments
# Backend staging: Check PR comments for staging URL
# Frontend staging: Automatic PR deployment preview
```

### 3. Production Deployment

```bash
# Merge to main branch
git checkout main
git merge feature/new-feature
git push origin main

# Automatic deployment will trigger
# Monitor in Actions tab
```

## Security Best Practices

1. **Secrets Management**:
   - Never commit secrets to code
   - Use GitHub Secrets for CI/CD
   - Use Container Apps secrets for runtime

2. **Access Control**:
   - Limit service principal permissions
   - Use branch protection rules
   - Require PR reviews

3. **Monitoring**:
   - Enable Azure Monitor alerts
   - Monitor failed deployments
   - Regular security audits

## Troubleshooting Checklist

### Pre-Deployment

- [ ] All required secrets configured
- [ ] Azure resources exist
- [ ] Service principal has correct permissions
- [ ] Local builds work (Docker + npm)

### During Deployment

- [ ] GitHub Actions logs show no errors
- [ ] Azure CLI commands succeed
- [ ] Health checks pass
- [ ] Resources are properly updated

### Post-Deployment

- [ ] Applications are accessible
- [ ] API endpoints respond correctly
- [ ] Frontend connects to backend
- [ ] Monitor costs and resource usage

## Support

For issues with the CI/CD pipeline:

1. Check the GitHub Actions logs
2. Run the "Validate Secrets Configuration" workflow
3. Verify Azure resource status in Azure Portal
4. Check application logs in Azure Monitor

## Cost Optimization Tips

1. **Container Apps**:
   - Scale to zero enabled (no cost when idle)
   - Minimal resource allocation
   - Use staging revisions for testing

2. **Static Web Apps**:
   - Free tier with 100GB bandwidth/month
   - Global CDN included
   - No additional charges for PR environments

3. **Container Registry**:
   - Basic tier ($5/month)
   - Image cleanup policies
   - Multi-stage Docker builds

4. **General**:
   - Monitor resource usage weekly
   - Clean up unused resources
   - Use Azure Cost Management alerts

## Next Steps

1. Set up the initial Azure resources
2. Configure GitHub secrets
3. Test the deployment pipeline
4. Set up monitoring and alerts
5. Train your team on the deployment process

This pipeline is designed to be cost-effective, reliable, and easy to maintain while providing enterprise-grade deployment capabilities for your MVP.