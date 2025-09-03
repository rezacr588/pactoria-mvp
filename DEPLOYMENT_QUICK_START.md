# Pactoria MVP - Deployment Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Prerequisites
- Azure CLI installed and logged in (`az login`)
- GitHub CLI installed and logged in (`gh auth login`)
- Docker installed and running

### Step 1: Setup GitHub Secrets
```bash
# Run the automated setup script
./scripts/setup-github-secrets.sh
```

### Step 2: Deploy Azure Infrastructure
```bash
# Deploy backend to Azure Container Apps
./scripts/deploy-azure-containerapp.sh
```

### Step 3: Test the Pipeline
```bash
# Make a small change and push to trigger CI/CD
echo "# Test deployment" >> README.md
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

---

## 📋 Common Operations

### Deploy Backend Only
Push changes to `backend/` directory:
```bash
git add backend/
git commit -m "feat: update backend API"
git push origin main
```

### Deploy Frontend Only
Push changes to `frontend/` directory:
```bash
git add frontend/
git commit -m "feat: update UI components"
git push origin main
```

### Manual Deployment (Both)
```bash
gh workflow run "Full Stack Deployment"
```

### Create Staging Environment (PR)
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and push
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create PR
gh pr create --title "Add new feature" --body "Description of changes"
```

---

## 🔧 Configuration

### Required GitHub Secrets
```
AZURE_CREDENTIALS              # Azure service principal
JWT_SECRET_KEY                 # JWT signing key  
SECRET_KEY                     # App secret key
GROQ_API_KEY                  # AI API key
DATABASE_URL                  # Database connection
AZURE_STATIC_WEB_APPS_API_TOKEN # Static Web Apps token
STATIC_WEB_APP_URL            # Frontend URL
```

### Azure Resources Created
- **Resource Group**: `pactoria-rg`
- **Container Registry**: `pactoriaacr` 
- **Container App**: `pactoria-backend`
- **Static Web App**: `pactoria-frontend`

---

## 📊 Monitoring

### Check Deployment Status
```bash
# GitHub Actions
gh run list

# Azure Container Apps
az containerapp show --name pactoria-backend --resource-group pactoria-rg --query "properties.latestRevisionName"

# Static Web Apps
az staticwebapp show --name pactoria-frontend --resource-group pactoria-rg --query "defaultHostname"
```

### View Logs
```bash
# Container Apps logs
az containerapp logs show --name pactoria-backend --resource-group pactoria-rg --follow

# GitHub Actions logs
gh run view --log
```

### Cost Monitoring
```bash
# Monthly costs for resource group
az costmanagement query \
  --type Usage \
  --dataset-aggregation '{"totalCost":{"name":"PreTaxCost","function":"Sum"}}' \
  --dataset-filter '{"dimensions":{"name":"ResourceGroup","operator":"In","values":["pactoria-rg"]}}' \
  --timeframe MonthToDate
```

---

## 🔐 Security

### Update Secrets
```bash
# Via GitHub CLI
gh secret set SECRET_NAME --body "new-secret-value"

# Via Azure (Container Apps)
az containerapp secret set \
  --name pactoria-backend \
  --resource-group pactoria-rg \
  --secrets secret-name="new-value"
```

### Rotate Keys
1. Generate new keys
2. Update GitHub secrets
3. Run secret setup workflow
4. Verify deployment health

---

## 🛠️ Troubleshooting

### Deployment Failed
```bash
# Check workflow status
gh run list --limit 5

# View failed run details
gh run view <run-id>

# Check Azure resource status
az containerapp show --name pactoria-backend --resource-group pactoria-rg --query "properties.provisioningState"
```

### Health Check Failed
```bash
# Test endpoints manually
curl -f https://pactoria-backend.azurecontainerapps.io/health
curl -f https://pactoria-frontend.azurestaticapps.net

# Check logs
az containerapp logs show --name pactoria-backend --resource-group pactoria-rg --tail 50
```

### Cost Issues
```bash
# Check resource utilization
az monitor metrics list --resource /subscriptions/SUBSCRIPTION-ID/resourceGroups/pactoria-rg/providers/Microsoft.App/containerApps/pactoria-backend

# Scale down if needed
az containerapp update --name pactoria-backend --resource-group pactoria-rg --max-replicas 1
```

---

## 🎯 Production Checklist

### Before First Deployment
- [ ] Azure resources created
- [ ] GitHub secrets configured
- [ ] Environment protection rules set
- [ ] DNS/Custom domains configured (optional)

### After Each Deployment
- [ ] Health checks passing
- [ ] Frontend accessible
- [ ] API endpoints responding
- [ ] Performance within acceptable range

### Weekly Maintenance
- [ ] Review deployment logs
- [ ] Check cost metrics
- [ ] Update dependencies (if needed)
- [ ] Monitor resource utilization

### Monthly Review
- [ ] Analyze costs and optimize
- [ ] Review security alerts
- [ ] Update documentation
- [ ] Plan capacity for growth

---

## 📞 Support

### Common Issues
1. **"Health check failed"** → Check application logs and environment variables
2. **"Build failed"** → Review workflow logs and dependency conflicts  
3. **"High costs"** → Check auto-scaling settings and resource utilization
4. **"Slow performance"** → Review resource allocation and scaling policies

### Resources
- **Azure Documentation**: [Container Apps](https://docs.microsoft.com/azure/container-apps/)
- **GitHub Actions**: [Workflow Documentation](https://docs.github.com/actions)
- **Repository Issues**: Create issue for application-specific problems

---

**Quick Reference URLs:**
- Frontend: `https://pactoria-frontend.azurestaticapps.net`
- Backend API: `https://pactoria-backend.azurecontainerapps.io/api`
- API Docs: `https://pactoria-backend.azurecontainerapps.io/docs`
- Health Check: `https://pactoria-backend.azurecontainerapps.io/health`