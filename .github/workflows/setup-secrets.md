# GitHub Secrets Configuration Guide

## Overview
This document provides step-by-step instructions for configuring GitHub secrets required for the Pactoria MVP CI/CD pipeline.

## Required GitHub Secrets

### 1. Azure Authentication Secrets

#### `AZURE_CREDENTIALS` (Required)
Azure Service Principal credentials for authentication.

**Setup Steps:**
1. Create a Service Principal in Azure:
```bash
az ad sp create-for-rbac --name "github-actions-pactoria" \
  --role contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth
```

2. Copy the entire JSON output to the `AZURE_CREDENTIALS` secret:
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

#### `ACR_PASSWORD` (Required)
Azure Container Registry admin password.

**Setup Steps:**
1. Get ACR admin credentials:
```bash
az acr credential show --name pactoriaacr --query "passwords[0].value" -o tsv
```

2. Copy the password value to the `ACR_PASSWORD` secret.

### 2. Application Secrets

#### `GROQ_API_KEY` (Required)
API key for Groq AI services.

**Setup Steps:**
1. Sign up at https://groq.com/ and get your API key
2. Add the key to `GROQ_API_KEY` secret

#### `SECRET_KEY` (Required)
Application secret key for JWT tokens and general security.

**Setup Steps:**
1. Generate a secure random key:
```bash
openssl rand -base64 32
```

2. Add the generated key to `SECRET_KEY` secret.

### 3. Static Web Apps Tokens

#### `AZURE_STATIC_WEB_APPS_API_TOKEN` (Production)
Deployment token for production Static Web App.

**Setup Steps:**
1. In Azure Portal, go to your Static Web App
2. Navigate to "Overview" → "Manage deployment token"
3. Copy the deployment token
4. Add to `AZURE_STATIC_WEB_APPS_API_TOKEN` secret

#### `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` (Development)
Deployment token for development Static Web App.

**Setup Steps:**
1. Create development Static Web App in Azure
2. Get deployment token as above
3. Add to `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV` secret

#### `AZURE_STATIC_WEB_APPS_API_TOKEN_STAGING` (Staging)
Deployment token for staging Static Web App.

**Setup Steps:**
1. Create staging Static Web App in Azure
2. Get deployment token as above
3. Add to `AZURE_STATIC_WEB_APPS_API_TOKEN_STAGING` secret

### 4. Optional Monitoring Secrets

#### `LOG_ANALYTICS_WORKSPACE_ID` (Optional)
Log Analytics workspace for monitoring.

**Setup Steps:**
1. Create Log Analytics workspace in Azure:
```bash
az monitor log-analytics workspace create \
  --resource-group pactoria-rg \
  --workspace-name pactoria-logs
```

2. Get workspace ID:
```bash
az monitor log-analytics workspace show \
  --resource-group pactoria-rg \
  --workspace-name pactoria-logs \
  --query "customerId" -o tsv
```

3. Add the ID to `LOG_ANALYTICS_WORKSPACE_ID` secret.

## Setting Secrets in GitHub

### Using GitHub Web Interface
1. Go to your repository on GitHub
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add each secret with the exact name and value

### Using GitHub CLI
```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Set each secret (replace with actual values)
gh secret set AZURE_CREDENTIALS --body "$(cat azure-credentials.json)"
gh secret set GROQ_API_KEY --body "your-groq-api-key"
gh secret set SECRET_KEY --body "your-secret-key"
gh secret set ACR_PASSWORD --body "your-acr-password"
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body "your-static-app-token"
```

## Verification Script

Create and run this verification script to check your setup:

```bash
#!/bin/bash
# verify-secrets.sh

echo "🔍 Verifying GitHub Secrets Configuration..."

# Check if secrets are set (GitHub CLI required)
REQUIRED_SECRETS=(
  "AZURE_CREDENTIALS"
  "GROQ_API_KEY"
  "SECRET_KEY"
  "ACR_PASSWORD"
  "AZURE_STATIC_WEB_APPS_API_TOKEN"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
  if gh secret list | grep -q "$secret"; then
    echo "✅ $secret - Set"
  else
    echo "❌ $secret - Missing"
  fi
done

# Test Azure authentication
echo "🔐 Testing Azure authentication..."
if az account show >/dev/null 2>&1; then
  echo "✅ Azure CLI authenticated"
else
  echo "❌ Azure CLI not authenticated - run 'az login'"
fi

# Test Container Registry access
echo "🐳 Testing Container Registry access..."
if az acr show --name pactoriaacr >/dev/null 2>&1; then
  echo "✅ Container Registry accessible"
else
  echo "❌ Container Registry not accessible"
fi

echo "✨ Verification complete!"
```

## Security Best Practices

1. **Rotate Secrets Regularly**
   - Service Principal credentials: Every 90 days
   - API keys: As recommended by provider
   - Application secrets: Every 6 months

2. **Use Least Privilege**
   - Service Principal should only have necessary permissions
   - Consider using separate service principals for different environments

3. **Monitor Secret Usage**
   - Enable Azure AD audit logs
   - Monitor failed authentication attempts
   - Set up alerts for unusual activity

4. **Environment Isolation**
   - Use separate secrets for dev/staging/production
   - Never share production secrets with development environments

## Troubleshooting

### Common Issues

1. **Azure authentication fails**
   - Check if Service Principal exists: `az ad sp list --display-name "github-actions-pactoria"`
   - Verify JSON format in AZURE_CREDENTIALS
   - Ensure Service Principal has correct permissions

2. **Container Registry access denied**
   - Check ACR admin user is enabled: `az acr update --name pactoriaacr --admin-enabled true`
   - Verify ACR_PASSWORD matches admin password

3. **Static Web Apps deployment fails**
   - Check deployment token is valid
   - Verify Static Web App exists in correct resource group
   - Ensure token hasn't expired

### Testing Commands

```bash
# Test Azure authentication
az account show

# Test Container Registry access
az acr login --name pactoriaacr

# Test Static Web App token (replace with actual values)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://management.azure.com/subscriptions/YOUR_SUBSCRIPTION/resourceGroups/YOUR_RG/providers/Microsoft.Web/staticSites/YOUR_APP"
```

## Support

If you encounter issues:
1. Check the GitHub Actions logs for specific error messages
2. Verify all secrets are correctly set with no extra spaces
3. Test Azure CLI commands locally with the same credentials
4. Review Azure resource permissions and configurations

For additional support, refer to:
- [Azure DevOps Documentation](https://docs.microsoft.com/en-us/azure/devops/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)