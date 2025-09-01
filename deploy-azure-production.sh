#!/bin/bash

# =============================================================================
# PACTORIA MVP - AZURE PRODUCTION DEPLOYMENT SCRIPT
# =============================================================================
# This script deploys Pactoria MVP to Azure with cost optimization
# Prerequisites:
# - Azure CLI installed and logged in
# - Docker installed
# - GitHub account for Static Web Apps
# =============================================================================

set -e  # Exit on any error

# =============================================================================
# CONFIGURATION VARIABLES
# =============================================================================
RESOURCE_GROUP="pactoria-rg"
LOCATION="eastus"  # Most cost-effective region
SUBSCRIPTION_ID=""  # Set your subscription ID

# Container Apps
CONTAINER_APP_ENV="pactoria-env"
CONTAINER_APP_NAME="pactoria-backend"
CONTAINER_REGISTRY="pactoria${RANDOM}acr"

# Static Web Apps
STATIC_APP_NAME="pactoria-frontend"

# Database (optional - comment out for SQLite)
# POSTGRES_SERVER="pactoria-postgres"
# POSTGRES_DATABASE="pactoria_mvp"
# POSTGRES_USER="pactoria_admin"

# =============================================================================
# COLORS AND LOGGING
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# =============================================================================
# PREREQUISITES CHECK
# =============================================================================
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        error "Azure CLI is not installed. Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker Desktop."
    fi
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        error "Not logged into Azure. Please run: az login"
    fi
    
    log "Prerequisites check passed ✓"
}

# =============================================================================
# ENVIRONMENT VALIDATION
# =============================================================================
validate_environment() {
    log "Validating environment variables..."
    
    # Check for required environment variables
    if [[ -z "$JWT_SECRET_KEY" ]]; then
        warn "JWT_SECRET_KEY not set. Generating a random key..."
        export JWT_SECRET_KEY=$(openssl rand -base64 32)
        echo "Generated JWT_SECRET_KEY: $JWT_SECRET_KEY"
    fi
    
    if [[ -z "$SECRET_KEY" ]]; then
        warn "SECRET_KEY not set. Generating a random key..."
        export SECRET_KEY=$(openssl rand -base64 32)
        echo "Generated SECRET_KEY: $SECRET_KEY"
    fi
    
    if [[ -z "$GROQ_API_KEY" ]]; then
        warn "GROQ_API_KEY not set. AI features will not work."
        warn "Get your API key from: https://console.groq.com/keys"
    fi
    
    log "Environment validation complete ✓"
}

# =============================================================================
# AZURE RESOURCE CREATION
# =============================================================================
create_resource_group() {
    log "Creating resource group: $RESOURCE_GROUP"
    az group create \
        --name $RESOURCE_GROUP \
        --location $LOCATION \
        --output table
}

create_container_registry() {
    log "Creating Azure Container Registry: $CONTAINER_REGISTRY"
    az acr create \
        --resource-group $RESOURCE_GROUP \
        --name $CONTAINER_REGISTRY \
        --sku Basic \
        --location $LOCATION \
        --admin-enabled true \
        --output table
    
    log "Getting registry credentials..."
    REGISTRY_USERNAME=$(az acr credential show --name $CONTAINER_REGISTRY --query username --output tsv)
    REGISTRY_PASSWORD=$(az acr credential show --name $CONTAINER_REGISTRY --query passwords[0].value --output tsv)
    
    log "Registry created ✓"
}

create_container_environment() {
    log "Creating Container Apps environment: $CONTAINER_APP_ENV"
    
    # Install Container Apps extension if not present
    az extension add --name containerapp --upgrade
    
    # Register providers
    az provider register --namespace Microsoft.App
    az provider register --namespace Microsoft.OperationalInsights
    
    # Create Log Analytics workspace
    LOG_WORKSPACE="pactoria-logs"
    az monitor log-analytics workspace create \
        --resource-group $RESOURCE_GROUP \
        --workspace-name $LOG_WORKSPACE \
        --location $LOCATION \
        --output table
    
    LOG_WORKSPACE_ID=$(az monitor log-analytics workspace show \
        --resource-group $RESOURCE_GROUP \
        --workspace-name $LOG_WORKSPACE \
        --query customerId \
        --output tsv)
    
    LOG_WORKSPACE_SECRET=$(az monitor log-analytics workspace get-shared-keys \
        --resource-group $RESOURCE_GROUP \
        --workspace-name $LOG_WORKSPACE \
        --query primarySharedKey \
        --output tsv)
    
    # Create Container Apps environment
    az containerapp env create \
        --name $CONTAINER_APP_ENV \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --logs-workspace-id $LOG_WORKSPACE_ID \
        --logs-workspace-key $LOG_WORKSPACE_SECRET \
        --output table
    
    log "Container environment created ✓"
}

# =============================================================================
# BACKEND DEPLOYMENT
# =============================================================================
build_and_push_backend() {
    log "Building and pushing backend container..."
    
    cd backend
    
    # Build Docker image
    docker build -t $CONTAINER_REGISTRY.azurecr.io/pactoria-backend:latest .
    
    # Login to registry
    az acr login --name $CONTAINER_REGISTRY
    
    # Push image
    docker push $CONTAINER_REGISTRY.azurecr.io/pactoria-backend:latest
    
    cd ..
    
    log "Backend image built and pushed ✓"
}

deploy_backend() {
    log "Deploying backend container app..."
    
    az containerapp create \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --environment $CONTAINER_APP_ENV \
        --image $CONTAINER_REGISTRY.azurecr.io/pactoria-backend:latest \
        --target-port 8000 \
        --ingress 'external' \
        --registry-server $CONTAINER_REGISTRY.azurecr.io \
        --registry-username $REGISTRY_USERNAME \
        --registry-password $REGISTRY_PASSWORD \
        --secrets \
            jwt-secret-key="$JWT_SECRET_KEY" \
            secret-key="$SECRET_KEY" \
            groq-api-key="$GROQ_API_KEY" \
        --env-vars \
            JWT_SECRET_KEY=secretref:jwt-secret-key \
            SECRET_KEY=secretref:secret-key \
            GROQ_API_KEY=secretref:groq-api-key \
            ENVIRONMENT=production \
            DEBUG=false \
            DATABASE_URL="sqlite:///./data/pactoria_mvp.db" \
            GUNICORN_WORKERS=1 \
            GUNICORN_THREADS=2 \
        --cpu 0.25 \
        --memory 0.5Gi \
        --min-replicas 0 \
        --max-replicas 2 \
        --output table
    
    # Get the backend URL
    BACKEND_URL=$(az containerapp show \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --query properties.configuration.ingress.fqdn \
        --output tsv)
    
    log "Backend deployed at: https://$BACKEND_URL ✓"
}

# =============================================================================
# FRONTEND DEPLOYMENT
# =============================================================================
deploy_frontend() {
    log "Deploying frontend to Azure Static Web Apps..."
    
    # Install Static Web Apps CLI extension
    az extension add --name staticwebapp
    
    # Create production environment file for frontend
    cat > frontend/.env.production << EOF
VITE_API_URL=https://$BACKEND_URL/api/v1
VITE_APP_NAME=Pactoria
VITE_APP_VERSION=1.0.0
VITE_NODE_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_TEMPLATES=true
VITE_ENABLE_DEBUG=false
VITE_DEBUG_API_CALLS=false
VITE_DEBUG_ERRORS=false
VITE_DEFAULT_PAGE_SIZE=10
VITE_MAX_PAGE_SIZE=100
VITE_POLLING_INTERVAL=30000
VITE_CACHE_DURATION=300000
VITE_ERROR_RETRY_ATTEMPTS=3
VITE_ERROR_RETRY_DELAY=1000
VITE_TOKEN_STORAGE_KEY=auth-token
VITE_ENABLE_HTTPS_ONLY=true
VITE_BUILD_SOURCEMAP=false
VITE_BUILD_MINIFY=true
VITE_CONFIG_VERSION=1.0.0
VITE_DEPLOYMENT_TARGET=azure-static-web-apps
EOF
    
    log "Frontend environment configured ✓"
    log "Please manually create Static Web App in Azure Portal with the following settings:"
    log "- Name: $STATIC_APP_NAME"
    log "- Resource Group: $RESOURCE_GROUP"
    log "- Connect to your GitHub repository"
    log "- App location: /frontend"
    log "- Build location: /frontend/dist"
    log "- API location: leave empty"
}

# =============================================================================
# COST OPTIMIZATION REPORT
# =============================================================================
show_cost_optimization() {
    log "=== COST OPTIMIZATION SUMMARY ==="
    echo
    echo "✓ Container Apps with scale-to-zero (saves ~60-80% when idle)"
    echo "✓ Minimum CPU/Memory allocation (0.25 CPU, 0.5Gi RAM)"
    echo "✓ SQLite database (no separate database costs)"
    echo "✓ Static Web Apps free tier"
    echo "✓ Basic Container Registry"
    echo "✓ Disabled expensive features (Redis, detailed logging)"
    echo
    echo "Estimated monthly cost (low usage): $5-15/month"
    echo "Estimated monthly cost (medium usage): $15-30/month"
    echo
    log "=== DEPLOYMENT COMPLETE ==="
    echo
    log "Backend URL: https://$BACKEND_URL"
    log "Frontend: Deploy manually using Static Web Apps"
    echo
    log "Next steps:"
    log "1. Create Static Web App in Azure Portal"
    log "2. Connect to your GitHub repository"
    log "3. Configure build settings"
    log "4. Test the deployment"
    echo
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    log "Starting Pactoria MVP Azure deployment..."
    
    check_prerequisites
    validate_environment
    
    create_resource_group
    create_container_registry
    create_container_environment
    
    build_and_push_backend
    deploy_backend
    
    deploy_frontend
    
    show_cost_optimization
    
    log "Deployment script completed successfully! 🎉"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi