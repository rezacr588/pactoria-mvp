#!/bin/bash

# ===============================================================================
# PACTORIA MVP - FIXED AZURE DEPLOYMENT SCRIPT
# ===============================================================================
# Optimized deployment with all issues resolved
# Cost: ~$15-25/month with scale-to-zero capability
# ===============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ===============================================================================
# CONFIGURATION
# ===============================================================================
RESOURCE_GROUP="pactoria-rg"
LOCATION="eastus"
ACR_NAME="pactoriaacr"
STATIC_APP_NAME="pactoria-frontend"
CONTAINER_APP_NAME="pactoria-backend"
ENVIRONMENT_NAME="pactoria-env"
STORAGE_ACCOUNT="pactoriastore"
FILE_SHARE_NAME="sqlite-data"

# ===============================================================================
# HELPER FUNCTIONS
# ===============================================================================
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# ===============================================================================
# PREREQUISITES CHECK
# ===============================================================================
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        error "Azure CLI not installed. Install from: https://docs.microsoft.com/cli/azure/install-azure-cli"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker not installed. Please install Docker Desktop."
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js not installed. Please install Node.js 18+"
    fi
    
    # Check Azure login
    if ! az account show &> /dev/null; then
        error "Not logged into Azure. Run: az login"
    fi
    
    log "✅ Prerequisites check passed"
}

# ===============================================================================
# ENVIRONMENT VALIDATION
# ===============================================================================
validate_environment() {
    log "Validating environment variables..."
    
    # GROQ API Key
    if [ -z "$GROQ_API_KEY" ]; then
        warn "GROQ_API_KEY not set. AI features will not work."
        warn "Get your API key from: https://console.groq.com/keys"
        read -p "Enter GROQ_API_KEY (or press Enter to skip): " GROQ_API_KEY
        if [ -n "$GROQ_API_KEY" ]; then
            export GROQ_API_KEY
        fi
    fi
    
    # JWT Secret Key
    if [ -z "$JWT_SECRET_KEY" ]; then
        warn "JWT_SECRET_KEY not set. Generating random key..."
        export JWT_SECRET_KEY=$(openssl rand -base64 32)
        log "Generated JWT_SECRET_KEY (save this): $JWT_SECRET_KEY"
    fi
    
    # App Secret Key
    if [ -z "$SECRET_KEY" ]; then
        warn "SECRET_KEY not set. Generating random key..."
        export SECRET_KEY=$(openssl rand -base64 32)
        log "Generated SECRET_KEY (save this): $SECRET_KEY"
    fi
    
    log "✅ Environment validation complete"
}

# ===============================================================================
# RESOURCE GROUP CREATION
# ===============================================================================
create_resource_group() {
    log "Creating resource group: $RESOURCE_GROUP"
    
    if az group exists --name $RESOURCE_GROUP 2>/dev/null; then
        log "Resource group already exists"
    else
        az group create \
            --name $RESOURCE_GROUP \
            --location $LOCATION \
            --output none
        log "✅ Resource group created"
    fi
}

# ===============================================================================
# STORAGE ACCOUNT SETUP (for SQLite)
# ===============================================================================
create_storage_account() {
    log "Setting up storage account for SQLite..."
    
    # Check if storage account exists
    if az storage account show --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP &>/dev/null; then
        log "Storage account already exists"
    else
        az storage account create \
            --name $STORAGE_ACCOUNT \
            --resource-group $RESOURCE_GROUP \
            --location $LOCATION \
            --sku Standard_LRS \
            --kind StorageV2 \
            --access-tier Cool \
            --output none
        log "✅ Storage account created"
    fi
    
    # Get storage key
    STORAGE_KEY=$(az storage account keys list \
        --account-name $STORAGE_ACCOUNT \
        --resource-group $RESOURCE_GROUP \
        --query '[0].value' -o tsv)
    
    # Create file share if not exists
    if ! az storage share exists \
        --name $FILE_SHARE_NAME \
        --account-name $STORAGE_ACCOUNT \
        --account-key "$STORAGE_KEY" \
        --output tsv | grep -q "true"; then
        
        az storage share create \
            --name $FILE_SHARE_NAME \
            --account-name $STORAGE_ACCOUNT \
            --account-key "$STORAGE_KEY" \
            --quota 5 \
            --output none
        log "✅ File share created"
    else
        log "File share already exists"
    fi
}

# ===============================================================================
# CONTAINER REGISTRY SETUP
# ===============================================================================
create_container_registry() {
    log "Setting up Container Registry..."
    
    if az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP &>/dev/null; then
        log "Container Registry already exists"
    else
        az acr create \
            --resource-group $RESOURCE_GROUP \
            --name $ACR_NAME \
            --sku Basic \
            --location $LOCATION \
            --admin-enabled true \
            --output none
        log "✅ Container Registry created"
    fi
    
    # Enable admin user and get credentials
    az acr update --name $ACR_NAME --admin-enabled true --output none
    
    REGISTRY_USERNAME=$(az acr credential show \
        --name $ACR_NAME \
        --query username -o tsv)
    REGISTRY_PASSWORD=$(az acr credential show \
        --name $ACR_NAME \
        --query passwords[0].value -o tsv)
    
    log "Registry ready: $ACR_NAME.azurecr.io"
}

# ===============================================================================
# CONTAINER APPS ENVIRONMENT
# ===============================================================================
create_container_environment() {
    log "Setting up Container Apps environment..."
    
    # Add Container Apps extension
    az extension add --name containerapp --upgrade -y 2>/dev/null || true
    
    # Register providers
    az provider register --namespace Microsoft.App --wait
    az provider register --namespace Microsoft.OperationalInsights --wait
    
    # Check if environment exists
    if az containerapp env show \
        --name $ENVIRONMENT_NAME \
        --resource-group $RESOURCE_GROUP &>/dev/null; then
        log "Container environment already exists"
    else
        # Create without Log Analytics to save costs
        az containerapp env create \
            --name $ENVIRONMENT_NAME \
            --resource-group $RESOURCE_GROUP \
            --location $LOCATION \
            --output none
        log "✅ Container environment created"
    fi
    
    # Set up storage mount
    log "Configuring storage mount..."
    az containerapp env storage set \
        --name $ENVIRONMENT_NAME \
        --resource-group $RESOURCE_GROUP \
        --storage-name sqlite-storage \
        --storage-type AzureFile \
        --account-name $STORAGE_ACCOUNT \
        --account-key "$STORAGE_KEY" \
        --share-name $FILE_SHARE_NAME \
        --access-mode ReadWrite \
        --output none || true
}

# ===============================================================================
# BACKEND BUILD AND DEPLOY
# ===============================================================================
deploy_backend() {
    log "Building and deploying backend..."
    
    cd backend
    
    # Fix requirements file reference
    if [ ! -f "requirements-azure.txt" ]; then
        warn "requirements-azure.txt not found, using requirements.txt"
        cp requirements.txt requirements-azure.txt
    fi
    
    # Build and push image using ACR tasks (more reliable)
    log "Building Docker image with ACR..."
    az acr build \
        --registry $ACR_NAME \
        --image pactoria-backend:latest \
        --image pactoria-backend:$(date +%Y%m%d%H%M%S) \
        . \
        --output none
    
    cd ..
    
    # Deploy or update Container App
    log "Deploying Container App..."
    
    if az containerapp show \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP &>/dev/null; then
        
        # Update existing app
        az containerapp update \
            --name $CONTAINER_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --image $ACR_NAME.azurecr.io/pactoria-backend:latest \
            --cpu 0.25 \
            --memory 0.5Gi \
            --min-replicas 0 \
            --max-replicas 2 \
            --set-env-vars \
                ENVIRONMENT=production \
                DEBUG=false \
                DATABASE_URL="sqlite:///./data/pactoria_mvp.db" \
                GROQ_API_KEY="$GROQ_API_KEY" \
                JWT_SECRET_KEY="$JWT_SECRET_KEY" \
                SECRET_KEY="$SECRET_KEY" \
            --output none
        log "✅ Container App updated"
    else
        # Create new app
        az containerapp create \
            --name $CONTAINER_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --environment $ENVIRONMENT_NAME \
            --image $ACR_NAME.azurecr.io/pactoria-backend:latest \
            --target-port 8000 \
            --ingress external \
            --registry-server $ACR_NAME.azurecr.io \
            --registry-username $REGISTRY_USERNAME \
            --registry-password $REGISTRY_PASSWORD \
            --cpu 0.25 \
            --memory 0.5Gi \
            --min-replicas 0 \
            --max-replicas 2 \
            --env-vars \
                ENVIRONMENT=production \
                DEBUG=false \
                DATABASE_URL="sqlite:///./data/pactoria_mvp.db" \
                GROQ_API_KEY="$GROQ_API_KEY" \
                JWT_SECRET_KEY="$JWT_SECRET_KEY" \
                SECRET_KEY="$SECRET_KEY" \
            --output none
        log "✅ Container App created"
    fi
    
    # Get backend URL
    BACKEND_URL=$(az containerapp show \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --query "properties.configuration.ingress.fqdn" -o tsv)
    
    log "Backend URL: https://$BACKEND_URL"
}

# ===============================================================================
# FRONTEND BUILD AND DEPLOY
# ===============================================================================
deploy_frontend() {
    log "Building and deploying frontend..."
    
    cd frontend
    
    # Create production environment file
    cat > .env.production << EOF
VITE_API_URL=https://$BACKEND_URL/api/v1
VITE_APP_NAME=Pactoria
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=production
EOF
    
    # Install dependencies and build
    log "Installing dependencies..."
    npm ci --prefer-offline --no-audit
    
    log "Building frontend..."
    npm run build
    
    # Deploy to Static Web Apps
    if az staticwebapp show \
        --name $STATIC_APP_NAME \
        --resource-group $RESOURCE_GROUP &>/dev/null; then
        log "Static Web App already exists"
        
        # Get deployment token
        DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
            --name $STATIC_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --query "properties.apiKey" -o tsv)
        
        # Deploy using SWA CLI if available
        if command -v swa &> /dev/null; then
            swa deploy ./dist --deployment-token $DEPLOYMENT_TOKEN
        else
            warn "SWA CLI not installed. Manual deployment required."
            log "Deployment token: $DEPLOYMENT_TOKEN"
        fi
    else
        # Create new Static Web App
        log "Creating Static Web App..."
        az staticwebapp create \
            --name $STATIC_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --source . \
            --location $LOCATION \
            --branch main \
            --app-location "/" \
            --output-location "dist" \
            --sku Free \
            --output none
        log "✅ Static Web App created"
    fi
    
    # Get frontend URL
    FRONTEND_URL=$(az staticwebapp show \
        --name $STATIC_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --query "defaultHostname" -o tsv)
    
    cd ..
    log "Frontend URL: https://$FRONTEND_URL"
}

# ===============================================================================
# HEALTH CHECK
# ===============================================================================
health_check() {
    log "Running health checks..."
    
    # Wait for backend to be ready
    log "Waiting for backend to start (this may take 2-3 minutes for cold start)..."
    sleep 30
    
    # Check backend health
    for i in {1..10}; do
        if curl -f -s "https://$BACKEND_URL/health" > /dev/null; then
            log "✅ Backend health check passed"
            break
        fi
        log "Attempt $i/10: Backend not ready yet..."
        sleep 15
    done
    
    # Check frontend
    if curl -f -s "https://$FRONTEND_URL" > /dev/null; then
        log "✅ Frontend is accessible"
    else
        warn "Frontend may still be deploying. Check in a few minutes."
    fi
}

# ===============================================================================
# MAIN DEPLOYMENT
# ===============================================================================
main() {
    echo -e "${BLUE}"
    echo "======================================================"
    echo "   PACTORIA MVP - AZURE DEPLOYMENT (FIXED)"
    echo "   Estimated Cost: \$15-25/month"
    echo "======================================================"
    echo -e "${NC}"
    
    # Run deployment steps
    check_prerequisites
    validate_environment
    create_resource_group
    create_storage_account
    create_container_registry
    create_container_environment
    deploy_backend
    deploy_frontend
    health_check
    
    # Print summary
    echo -e "${GREEN}"
    echo "======================================================"
    echo "   DEPLOYMENT COMPLETE!"
    echo "======================================================"
    echo -e "${NC}"
    echo
    echo "🌐 Application URLs:"
    echo "   Frontend:  https://$FRONTEND_URL"
    echo "   Backend:   https://$BACKEND_URL"
    echo "   API Docs:  https://$BACKEND_URL/docs"
    echo
    echo "💰 Cost Optimization:"
    echo "   - Container Apps: ~\$10-15/month (scale-to-zero)"
    echo "   - Static Web Apps: FREE"
    echo "   - Storage: ~\$2-4/month"
    echo "   - Registry: ~\$5/month"
    echo "   - Total: ~\$17-24/month"
    echo
    echo "🔑 Important:"
    echo "   - Save your JWT_SECRET_KEY and SECRET_KEY"
    echo "   - Backend scales to zero when idle (saves costs)"
    echo "   - First request after idle will be slower (cold start)"
    echo
    echo "📝 Next Steps:"
    echo "   1. Test the application at: https://$FRONTEND_URL"
    echo "   2. Monitor costs in Azure Portal"
    echo "   3. Set up GitHub Actions for CI/CD"
    echo
}

# Run main function
main
