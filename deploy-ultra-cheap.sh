#!/bin/bash

# Ultra-Low-Cost Azure Deployment Script for Pactoria MVP
# Estimated cost: $15-25/month

set -e

# Configuration
RESOURCE_GROUP="pactoria-rg"
LOCATION="eastus"  # Cheapest Azure region
ACR_NAME="pactoriaacr"
STATIC_APP_NAME="pactoria-frontend"
CONTAINER_APP_NAME="pactoria-backend"
ENVIRONMENT_NAME="pactoria-env"
STORAGE_ACCOUNT="pactoriastore"
FILE_SHARE_NAME="sqlite-data"

echo "🚀 Starting Ultra-Low-Cost Azure Deployment..."

# Step 1: Create Resource Group
echo "📁 Creating resource group..."
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# Step 2: Create Storage Account for SQLite persistence (cheapest option)
echo "💾 Creating storage account for database persistence..."
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Cool  # Cheaper access tier

# Create file share for SQLite database
STORAGE_KEY=$(az storage account keys list \
  --account-name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query '[0].value' -o tsv)

az storage share create \
  --name $FILE_SHARE_NAME \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --quota 5  # Minimum 5GB (way more than needed)

# Step 3: Create Container Registry (Basic tier - cheapest)
echo "📦 Creating container registry..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --location $LOCATION

# Step 4: Build and Push Backend Image
echo "🔨 Building backend container..."
cd backend
az acr build --registry $ACR_NAME --image pactoria-backend:latest .
cd ..

# Step 5: Create Container Apps Environment
echo "🌐 Creating container apps environment..."
az containerapp env create \
  --name $ENVIRONMENT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --logs-workspace-id ""  # No logs workspace to save money

# Step 6: Create storage mount for SQLite
echo "🗄️ Creating storage mount..."
az containerapp env storage set \
  --name $ENVIRONMENT_NAME \
  --resource-group $RESOURCE_GROUP \
  --storage-name pactoria-sqlite \
  --storage-type AzureFile \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --share-name $FILE_SHARE_NAME \
  --access-mode ReadWrite

# Step 7: Deploy Backend Container App (MINIMAL RESOURCES)
echo "🚀 Deploying backend container app..."
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $ACR_NAME.azurecr.io/pactoria-backend:latest \
  --target-port 8000 \
  --ingress external \
  --secrets groq-api-key="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" \
  --env-vars GROQ_API_KEY=secretref:groq-api-key DATABASE_URL="sqlite:///./data/pactoria_mvp.db" ENVIRONMENT="production" DEBUG="false" \
  --cpu 0.25 \
  --memory 0.5Gi \
  --min-replicas 0 \
  --max-replicas 2

# Mount storage for SQLite
az containerapp update \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars DATABASE_URL="sqlite:///./data/pactoria_mvp.db"

# Step 8: Build Frontend
echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Step 9: Deploy Frontend to Static Web Apps (FREE)
echo "📱 Deploying frontend to Static Web Apps..."
az staticwebapp create \
  --name $STATIC_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --source frontend/dist \
  --location $LOCATION \
  --branch main \
  --app-location "frontend" \
  --output-location "dist" \
  --sku Free

echo ""
echo "✅ ULTRA-LOW-COST DEPLOYMENT COMPLETE!"
echo ""
echo "💰 ESTIMATED MONTHLY COSTS:"
echo "   - Static Web Apps (Frontend): $0 (Free tier)"
echo "   - Container Apps (Backend): $8-15 (Consumption, minimal resources)"
echo "   - Storage Account (SQLite): $2-4 (Basic LRS, 5GB)"
echo "   - Container Registry: $5 (Basic tier)"
echo "   - TOTAL: ~$15-25/month"
echo ""
echo "🌐 Your app URLs:"
echo "   - Frontend: Will be provided after deployment"
echo "   - Backend API: https://$CONTAINER_APP_NAME.$LOCATION.azurecontainerapps.io"
echo ""
echo "⚠️  COST OPTIMIZATION NOTES:"
echo "   - Container scales to ZERO when not in use"
echo "   - Using SQLite (no database costs)"
echo "   - Frontend is completely FREE"
echo "   - Using cheapest Azure regions and tiers"