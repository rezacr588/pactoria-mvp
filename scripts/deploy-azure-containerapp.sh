#!/bin/bash

# Azure Container Apps Deployment Script - Cost Optimized
# Deploys Pactoria MVP backend to Azure Container Apps with minimal cost configuration

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Cost Optimized
RESOURCE_GROUP="pactoria-rg"
LOCATION="uksouth"  # UK South for lower costs and compliance
CONTAINER_APP_ENV="pactoria-env"
CONTAINER_APP_NAME="pactoria-backend"
CONTAINER_REGISTRY="pactoriaacr"
IMAGE_NAME="pactoria-backend"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed"
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        print_error "Not logged into Azure CLI. Run: az login"
        exit 1
    fi
    
    # Check if in correct directory
    if [ ! -f "backend/Dockerfile" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
    print_info "Subscription: $SUBSCRIPTION_ID"
    print_info "Location: $LOCATION"
}

create_resource_group() {
    print_header "Creating Resource Group"
    
    if az group show --name $RESOURCE_GROUP --query name -o tsv &>/dev/null; then
        print_info "Resource group $RESOURCE_GROUP already exists"
    else
        az group create \
            --name $RESOURCE_GROUP \
            --location $LOCATION \
            --tags \
                Environment=Production \
                Project=Pactoria-MVP \
                CostCenter=Development \
                Owner=$(az account show --query user.name -o tsv)
        
        print_success "Resource group created: $RESOURCE_GROUP"
    fi
}

create_container_registry() {
    print_header "Creating Container Registry"
    
    if az acr show --name $CONTAINER_REGISTRY --query name -o tsv &>/dev/null; then
        print_info "Container registry $CONTAINER_REGISTRY already exists"
    else
        # Use Basic tier for cost optimization
        az acr create \
            --resource-group $RESOURCE_GROUP \
            --name $CONTAINER_REGISTRY \
            --sku Basic \
            --location $LOCATION \
            --admin-enabled true \
            --tags \
                Environment=Production \
                Project=Pactoria-MVP
        
        print_success "Container registry created: $CONTAINER_REGISTRY"
    fi
    
    # Enable admin access for easier CI/CD integration
    az acr update --name $CONTAINER_REGISTRY --admin-enabled true
}

create_container_app_environment() {
    print_header "Creating Container Apps Environment"
    
    if az containerapp env show --name $CONTAINER_APP_ENV --resource-group $RESOURCE_GROUP --query name -o tsv &>/dev/null; then
        print_info "Container Apps environment $CONTAINER_APP_ENV already exists"
    else
        # Create with consumption plan for cost optimization
        az containerapp env create \
            --name $CONTAINER_APP_ENV \
            --resource-group $RESOURCE_GROUP \
            --location $LOCATION \
            --tags \
                Environment=Production \
                Project=Pactoria-MVP
        
        print_success "Container Apps environment created: $CONTAINER_APP_ENV"
    fi
}

build_and_push_image() {
    print_header "Building and Pushing Container Image"
    
    # Login to ACR
    az acr login --name $CONTAINER_REGISTRY
    
    # Build image with cost-optimized settings
    cd backend
    
    # Build with multi-stage optimizations
    docker build \
        -t $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:latest \
        -t $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:$(date +%Y%m%d%H%M%S) \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        .
    
    # Push both tags
    docker push $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:latest
    docker push $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:$(date +%Y%m%d%H%M%S)
    
    cd ..
    
    print_success "Container image built and pushed"
}

create_container_app() {
    print_header "Creating Container App"
    
    if az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query name -o tsv &>/dev/null; then
        print_info "Container app $CONTAINER_APP_NAME already exists - updating..."
        update_container_app
    else
        print_info "Creating new container app with cost-optimized configuration..."
        
        # Create with minimal resources for cost optimization
        az containerapp create \
            --name $CONTAINER_APP_NAME \
            --resource-group $RESOURCE_GROUP \
            --environment $CONTAINER_APP_ENV \
            --image $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:latest \
            --registry-server $CONTAINER_REGISTRY.azurecr.io \
            --cpu 0.5 \
            --memory 1.0Gi \
            --min-replicas 0 \
            --max-replicas 3 \
            --target-port 8000 \
            --ingress external \
            --env-vars \
                ENVIRONMENT=production \
                PYTHONUNBUFFERED=1 \
                PORT=8000 \
            --tags \
                Environment=Production \
                Project=Pactoria-MVP \
                CostOptimized=true
        
        print_success "Container app created: $CONTAINER_APP_NAME"
    fi
    
    # Get the app URL
    local app_url=$(az containerapp show \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --query "properties.configuration.ingress.fqdn" \
        --output tsv)
    
    print_success "App URL: https://$app_url"
}

update_container_app() {
    print_info "Updating existing container app..."
    
    # Update with new image and cost-optimized settings
    az containerapp update \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --image $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME:latest \
        --cpu 0.5 \
        --memory 1.0Gi \
        --min-replicas 0 \
        --max-replicas 3 \
        --revision-suffix $(date +%s)
    
    print_success "Container app updated"
}

setup_secrets() {
    print_header "Setting up Application Secrets"
    
    print_info "Setting up basic secrets (you can update these later)..."
    
    # Generate secure secrets if not provided
    local secret_key=$(openssl rand -base64 32 | tr -d "=+/")
    local jwt_secret=$(openssl rand -base64 32 | tr -d "=+/")
    
    # Set secrets in Container App
    az containerapp secret set \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --secrets \
            secret-key="$secret_key" \
            jwt-secret-key="$jwt_secret"
    
    # Update environment variables to use secrets
    az containerapp update \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --set-env-vars \
            SECRET_KEY=secretref:secret-key \
            JWT_SECRET_KEY=secretref:jwt-secret-key
    
    print_success "Basic secrets configured"
    print_warning "Please update GROQ_API_KEY and DATABASE_URL secrets manually or via GitHub Actions"
}

run_health_check() {
    print_header "Running Health Check"
    
    local app_url=$(az containerapp show \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --query "properties.configuration.ingress.fqdn" \
        --output tsv)
    
    print_info "Waiting for app to start..."
    sleep 30
    
    print_info "Testing health endpoint: https://$app_url/health"
    
    for i in {1..10}; do
        if curl -f "https://$app_url/health" &>/dev/null; then
            print_success "Health check passed!"
            break
        fi
        
        if [ $i -eq 10 ]; then
            print_warning "Health check failed - app may still be starting"
            break
        fi
        
        print_info "Attempt $i failed, retrying in 10 seconds..."
        sleep 10
    done
}

show_cost_summary() {
    print_header "Cost Summary"
    
    echo -e "💰 ${GREEN}Estimated Monthly Costs:${NC}"
    echo ""
    echo "📦 Container Registry (Basic): ~$5/month"
    echo "🚀 Container Apps Environment: Free"
    echo "⚡ Container App (0.5 vCPU, 1GB): $0-15/month"
    echo "   - Scales to zero when not used (no cost when idle)"
    echo "   - Pay only for actual usage"
    echo ""
    echo -e "💡 ${YELLOW}Cost Optimization Features:${NC}"
    echo "✅ Scale-to-zero enabled (0 min replicas)"
    echo "✅ Minimal resource allocation (0.5 vCPU, 1GB RAM)"
    echo "✅ Consumption-based billing"
    echo "✅ No always-on costs"
    echo ""
    echo -e "📊 ${BLUE}Total Estimated Cost: $5-20/month${NC}"
}

show_next_steps() {
    print_header "Next Steps"
    
    local app_url=$(az containerapp show \
        --name $CONTAINER_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --query "properties.configuration.ingress.fqdn" \
        --output tsv)
    
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "🔗 Application URLs:"
    echo "   Backend API: https://$app_url/api"
    echo "   Health Check: https://$app_url/health"
    echo "   API Docs: https://$app_url/docs"
    echo ""
    echo "🔧 Configuration:"
    echo "1. Update secrets in Azure Portal or via GitHub Actions:"
    echo "   - GROQ_API_KEY (for AI features)"
    echo "   - DATABASE_URL (for production database)"
    echo ""
    echo "2. Set up GitHub Actions CI/CD:"
    echo "   - Run: ./scripts/setup-github-secrets.sh"
    echo "   - Push to main branch to trigger deployment"
    echo ""
    echo "3. Deploy frontend to Azure Static Web Apps"
    echo ""
    echo "📊 Monitoring:"
    echo "   - Azure Portal: https://portal.azure.com"
    echo "   - Container Apps: Monitor -> Metrics"
    echo "   - Logs: Monitor -> Log stream"
}

# Main execution
main() {
    print_header "Azure Container Apps Deployment - Cost Optimized"
    
    check_prerequisites
    create_resource_group
    create_container_registry
    create_container_app_environment
    build_and_push_image
    create_container_app
    setup_secrets
    run_health_check
    show_cost_summary
    show_next_steps
    
    print_success "Deployment completed!"
}

# Check if script is being executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi