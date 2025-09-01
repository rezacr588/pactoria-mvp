#!/bin/bash

# Pactoria MVP - Azure Deployment Script (Free Tier Optimized)
# This script deploys the application using Azure's free tier services

set -e  # Exit on any error

echo "🚀 Pactoria MVP - Azure Deployment Starting..."

# Configuration
RESOURCE_GROUP="pactoria-rg"
LOCATION="eastus"
APP_NAME="pactoria-backend"
STATIC_APP_NAME="pactoria-frontend"
ACR_NAME="pactoriaacr"
DATABASE_SERVER_NAME="pactoria-db"
DATABASE_NAME="pactoria"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if Azure CLI is installed and logged in
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    print_error "Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

print_status "Azure CLI is ready"

# Get subscription info
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
print_status "Using subscription: $SUBSCRIPTION_ID"

# Check if GROQ_API_KEY is set
if [ -z "$GROQ_API_KEY" ]; then
    print_warning "GROQ_API_KEY not set as environment variable"
    read -p "Enter your Groq API key: " GROQ_API_KEY
    if [ -z "$GROQ_API_KEY" ]; then
        print_error "Groq API key is required for AI features"
        exit 1
    fi
fi

print_status "Groq API key configured"

# Create resource group
echo "📦 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION
print_status "Resource group '$RESOURCE_GROUP' created"

# Create Container Registry (Basic tier - $5/month)
echo "🗃️ Creating Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --location $LOCATION
print_status "Container Registry '$ACR_NAME' created"

# Enable admin access for the registry
az acr update -n $ACR_NAME --admin-enabled true

# Build and push Docker image
echo "🐳 Building and pushing Docker image..."
cd backend
az acr build --registry $ACR_NAME --image pactoria-backend:latest .
cd ..
print_status "Docker image built and pushed"

# Create Container App Environment
echo "🌐 Creating Container App Environment..."
CONTAINER_ENV_NAME="pactoria-env"
az containerapp env create \
    --name $CONTAINER_ENV_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION

print_status "Container App Environment created"

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer -o tsv)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

# Create Container App (Consumption tier - scales to zero)
echo "🚀 Creating Container App..."
az containerapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $CONTAINER_ENV_NAME \
    --image $ACR_LOGIN_SERVER/pactoria-backend:latest \
    --registry-server $ACR_LOGIN_SERVER \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --target-port 8000 \
    --ingress external \
    --min-replicas 0 \
    --max-replicas 1 \
    --cpu 0.25 \
    --memory 0.5Gi \
    --env-vars GROQ_API_KEY=$GROQ_API_KEY DATABASE_URL=sqlite:///./data/pactoria_mvp.db ENVIRONMENT=production

print_status "Container App '$APP_NAME' created"

# Get backend URL
BACKEND_URL=$(az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
print_status "Backend deployed at: https://$BACKEND_URL"

# Deploy Static Web App (Frontend)
echo "🌐 Deploying frontend to Static Web Apps..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_warning "Not in a git repository. Creating one..."
    git init
    git add .
    git commit -m "Initial commit for deployment"
fi

# Create Static Web App
az staticwebapp create \
    --name $STATIC_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --source . \
    --branch main \
    --app-location "frontend" \
    --output-location "dist" \
    --login-with-github

print_status "Static Web App '$STATIC_APP_NAME' created"

# Get Static Web App URL
FRONTEND_URL=$(az staticwebapp show --name $STATIC_APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostname -o tsv)
print_status "Frontend deployed at: https://$FRONTEND_URL"

# Update frontend environment variable
echo "🔧 Updating frontend configuration..."
az staticwebapp appsettings set \
    --name $STATIC_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --setting-names VITE_API_URL=https://$BACKEND_URL/api/v1

print_status "Frontend configured with backend URL"

# Set up monitoring (Free tier Application Insights)
echo "📊 Setting up monitoring..."
INSIGHTS_NAME="pactoria-insights"
az monitor app-insights component create \
    --app $INSIGHTS_NAME \
    --location $LOCATION \
    --resource-group $RESOURCE_GROUP \
    --application-type web

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show --app $INSIGHTS_NAME --resource-group $RESOURCE_GROUP --query instrumentationKey -o tsv)

# Update container app with instrumentation key
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --set-env-vars APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY

print_status "Monitoring configured"

# Create cost budget
echo "💰 Setting up cost monitoring..."
az consumption budget create \
    --resource-group $RESOURCE_GROUP \
    --budget-name 'pactoria-monthly-budget' \
    --amount 50 \
    --time-grain 'Monthly' \
    --start-date $(date +%Y-%m-01) \
    --end-date $(date -d '+1 year' +%Y-%m-01) \
    --category 'Cost'

print_status "Cost monitoring configured"

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📋 Deployment Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Frontend URL:  https://$FRONTEND_URL"
echo "🚀 Backend URL:   https://$BACKEND_URL"
echo "📊 Insights:      Application Insights configured"
echo "💰 Budget:        \$50/month budget alert set"
echo ""
echo "💡 Next Steps:"
echo "1. Visit your frontend URL to test the application"
echo "2. Set up GitHub Actions for CI/CD (optional)"
echo "3. Configure your custom domain (optional)"
echo "4. Monitor costs in Azure Portal"
echo ""
echo "📊 Estimated Monthly Costs:"
echo "• Static Web Apps (Frontend): \$0 (Free tier)"
echo "• Container Apps (Backend): \$8-15 (Consumption tier)"
echo "• Container Registry: \$5 (Basic tier)" 
echo "• Application Insights: \$0-5 (Free tier)"
echo "• Total: ~\$13-25/month"
echo ""
print_status "Deployment successful! 🚀"