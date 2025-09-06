# Azure Deployment Secrets Configuration

This document outlines the required secrets and environment variables that need to be configured in Azure for the Pactoria MVP deployment.

## Required Azure Secrets

The following secrets must be configured in your Azure repository secrets (GitHub Actions secrets):

### 1. Azure Authentication
```
AZURE_CREDENTIALS
```
**Value**: JSON credentials for Azure service principal with Contributor role
```json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret", 
  "subscriptionId": "your-subscription-id",
  "tenantId": "your-tenant-id"
}
```

### 2. Azure Container Registry
```
ACR_PASSWORD
```
**Value**: Password for the Azure Container Registry `pactoriaacr`

### 3. Application Secrets
```
SECRET_KEY
```
**Value**: `LnssnWN@YGZK$hbqdqQWVL@l&KbvvYqEWSE#XmmrPA6AOGgHkVB6TBJ!R7exlIcp`

```
JWT_SECRET_KEY
```
**Value**: `yIlZm6y110%Ctr5V^w$4pZbIi!jE4zxN5mk3A82o1eTZ%E69erGuZjbpmPJT84wy`

```
GROQ_API_KEY
```
**Value**: Your actual Groq API key (replace the placeholder)

### 4. Azure Static Web Apps
```
AZURE_STATIC_WEB_APPS_API_TOKEN
```
**Value**: Deployment token from Azure Static Web Apps

## Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret" for each secret above
4. Enter the name and value exactly as specified

## Setting Up Azure Resources

### 1. Create Resource Group
```bash
az group create --name pactoria-mvp-rg --location eastus
```

### 2. Create Container Registry
```bash
az acr create --name pactoriaacr --resource-group pactoria-mvp-rg --sku Basic
```

### 3. Create Container Apps Environment  
```bash
az containerapp env create \
  --name pactoria-env \
  --resource-group pactoria-mvp-rg \
  --location eastus
```

### 4. Create Static Web App
```bash
az staticwebapp create \
  --name pactoria-frontend \
  --resource-group pactoria-mvp-rg \
  --source https://github.com/YOUR_USERNAME/Pactoria-MVP \
  --branch main \
  --app-location "frontend" \
  --output-location "dist" \
  --location eastus2
```

## Security Best Practices

1. **Rotate secrets regularly** - Change the SECRET_KEY and JWT_SECRET_KEY at least every 90 days
2. **Use Azure Key Vault** - For production, consider moving secrets to Azure Key Vault
3. **Monitor access** - Enable audit logging for secret access
4. **Principle of least privilege** - Ensure service principal has minimal required permissions

## Cost Optimization

The current configuration is optimized for minimal cost:

- **Container Apps**: Scales to zero when not in use
- **Container Registry**: Basic SKU (cheapest option)
- **Static Web Apps**: Free tier for development
- **Database**: SQLite (no additional charges)

**Expected monthly cost**: ~$15-25 USD

## Troubleshooting

### Common Issues:

1. **ACR Authentication Failed**: Ensure `ACR_PASSWORD` is correctly set
2. **Container App Creation Failed**: Check resource group and environment exist
3. **Frontend Build Failed**: Verify `AZURE_STATIC_WEB_APPS_API_TOKEN` is valid
4. **API Connection Failed**: Check the API URL in frontend production environment

### Debug Commands:
```bash
# Check container app logs
az containerapp logs show --name pactoria-backend --resource-group pactoria-mvp-rg

# Check container registry
az acr repository list --name pactoriaacr

# Check static web app status  
az staticwebapp show --name pactoria-frontend --resource-group pactoria-mvp-rg
```

## Production Checklist

Before deploying to production:

- [ ] All secrets configured in GitHub
- [ ] Azure resources created
- [ ] GROQ_API_KEY set to real value
- [ ] Frontend API URL updated
- [ ] SSL certificates configured
- [ ] Monitoring and alerts set up
- [ ] Backup strategy implemented
- [ ] Security review completed