# GitHub Secrets Setup for Pactoria MVP

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

### 1. GROQ_API_KEY
**Value:** Your GROQ API key from https://console.groq.com/keys

### 2. AZURE_CREDENTIALS
Create a service principal for Azure deployment:

```bash
az ad sp create-for-rbac --name "pactoria-github-actions" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID \
  --sdk-auth
```

Use the JSON output as the value for AZURE_CREDENTIALS.

### 3. SECRET_KEY
Generate a random secret key:
```bash
openssl rand -base64 32
```

### 4. AZURE_STATIC_WEB_APPS_API_TOKEN
Get this from your Azure Static Web Apps resource in the Azure Portal.

## How to Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Secrets and variables** > **Actions** 
4. Click **New repository secret**
5. Add each secret with the name and value

## Quick Setup Commands

Run these commands to set up your Azure resources and get the required tokens:

```bash
# Set variables
RESOURCE_GROUP="pactoria-rg"
STATIC_APP_NAME="pactoria-frontend"
ACR_NAME="pactoriaacr"
CONTAINER_APP_NAME="pactoria-backend"

# Create service principal
az ad sp create-for-rbac --name "pactoria-github-actions" \
  --role contributor \
  --scopes /subscriptions/$(az account show --query id -o tsv) \
  --sdk-auth

# Get Static Web App token
az staticwebapp secrets list \
  --name $STATIC_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.apiKey" -o tsv
```

## Verification

Once all secrets are added, you can trigger a deployment by:

1. Making any commit to the main branch, OR
2. Going to Actions tab and manually triggering the "Simplified Pactoria Deployment" workflow

The deployment should take about 5-10 minutes and will provide URLs for your live application.