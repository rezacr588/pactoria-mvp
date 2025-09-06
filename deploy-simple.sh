#!/bin/bash

# ===============================================================================
# PACTORIA MVP - SIMPLE DEPLOYMENT SCRIPT
# ===============================================================================
# Minimal deployment script for Azure Container Apps + Static Web Apps
# Cost: ~$5-20/month with scale-to-zero
# ===============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
RESOURCE_GROUP="pactoria-rg"
LOCATION="eastus"
ACR_NAME="pactoriaacr"
STATIC_APP_NAME="pactoria-frontend"
CONTAINER_APP_NAME="pactoria-backend"
ENVIRONMENT_NAME="pactoria-env"

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v az >/dev/null 2>&1 || error "Azure CLI not installed"
    command -v docker >/dev/null 2>&1 || error "Docker not installed"
    command -v node >/dev/null 2>&1 || error "Node.js not installed"
    
    az account show >/dev/null 2>&1 || error "Not logged into Azure. Run: az login"
    
    log "✅ Prerequisites OK"
}

# Set up environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    # GROQ API Key
    if [ -z "$GROQ_API_KEY" ]; then
        warn "GROQ_API_KEY not set. Please export it:"
        echo "export GROQ_API_KEY=your_groq_api_key_here"
        read -p "Press Enter to continue or Ctrl+C to exit..."
        read -p "Enter your GROQ API key: " GROQ_API_KEY
        export GROQ_API_KEY
    fi
    
    # Generate secrets if not set
    export SECRET_KEY=${SECRET_KEY:-$(openssl rand -base64 32)}
    
    log "✅ Environment ready"
}

# Deploy backend
deploy_backend() {
    log "Deploying backend..."
    
    # Login to registry
    az acr login --name $ACR_NAME
    
    # Build and push image
    cd backend
    IMAGE_TAG=$(date +%Y%m%d%H%M%S)
    FULL_IMAGE_NAME="$ACR_NAME.azurecr.io/pactoria-backend:$IMAGE_TAG"
    
    log "Building image: $FULL_IMAGE_NAME"
    docker build -t $FULL_IMAGE_NAME .
    docker push $FULL_IMAGE_NAME
    
    cd ..
    
    # Update Container App
    log "Updating Container App..."
    az containerapp update \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --image $FULL_IMAGE_NAME \
        --min-replicas 0 \
        --max-replicas 2 \
        --cpu 0.25 \
        --memory 0.5Gi \
        --set-env-vars \
          GROQ_API_KEY="$GROQ_API_KEY" \
          SECRET_KEY="$SECRET_KEY" \
          ENVIRONMENT=production \
        --revision-suffix $IMAGE_TAG
    
    log "✅ Backend deployed"
}

# Deploy frontend
deploy_frontend() {
    log "Deploying frontend..."
    
    # Get backend URL
    BACKEND_URL=$(az containerapp show \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --query "properties.configuration.ingress.fqdn" -o tsv)
    
    cd frontend
    
    # Build frontend
    export VITE_API_URL="https://$BACKEND_URL/api"
    export VITE_APP_NAME="Pactoria MVP"
    export VITE_ENVIRONMENT="production"
    
    npm ci
    npm run build
    
    cd ..
    
    log "✅ Frontend built (manual upload to Static Web Apps required)"
    log "Backend URL: https://$BACKEND_URL"
}

# Health check
health_check() {
    log "Running health check..."
    
    BACKEND_URL=$(az containerapp show \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --query "properties.configuration.ingress.fqdn" -o tsv)
    
    log "Waiting for backend to start..."
    sleep 30
    
    for i in {1..5}; do
        if curl -f -s "https://$BACKEND_URL/health" >/dev/null; then
            log "✅ Backend is healthy"
            break
        fi
        log "Attempt $i/5: Waiting for backend..."
        sleep 15
    done
    
    log "🎉 Deployment complete!"
    log "Backend: https://$BACKEND_URL"
    log "API Docs: https://$BACKEND_URL/docs"
}

# Main function
main() {
    echo "======================================================"
    echo "   PACTORIA MVP - SIMPLE DEPLOYMENT"
    echo "======================================================"
    
    check_prerequisites
    setup_environment
    deploy_backend
    deploy_frontend
    health_check
    
    echo "======================================================"
    echo "   DEPLOYMENT COMPLETE!"
    echo "======================================================"
}

# Run deployment
main