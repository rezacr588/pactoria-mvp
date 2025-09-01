#!/bin/bash

# Azure Deployment Script for Pactoria MVP
# Optimized for free tier cost efficiency
# Creates all required Azure resources with minimal cost

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="pactoria-mvp-rg"
LOCATION="uksouth"  # UK South for compliance and lower cost
APP_NAME="pactoria-backend"
WEBAPP_NAME="pactoria-backend"
STATIC_APP_NAME="pactoria-frontend"
FUNCTION_APP_NAME="pactoria-ai-functions"
STORAGE_ACCOUNT_NAME="pactoriastorage$(date +%s | tail -c 6)"  # Add random suffix
POSTGRESQL_SERVER_NAME="pactoria-db-$(date +%s | tail -c 6)"
DATABASE_NAME="pactoria_mvp"
DB_ADMIN_USER="pactoria_admin"

# Generate secure password for database
DB_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

print_section() {
    echo -e "\n${BLUE}=================================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================================================${NC}\n"
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

check_prerequisites() {
    print_section "Checking Prerequisites"
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if user is logged in
    if ! az account show &> /dev/null; then
        print_error "You are not logged in to Azure CLI. Please run 'az login' first."
        exit 1
    fi
    
    # Check if required files exist
    if [[ ! -f "../backend/requirements-azure.txt" ]]; then
        print_error "Backend requirements file not found. Please ensure you're running from the deployment directory."
        exit 1
    fi
    
    print_success "All prerequisites met"
    
    # Display current subscription
    SUBSCRIPTION_NAME=$(az account show --query "name" -o tsv)
    SUBSCRIPTION_ID=$(az account show --query "id" -o tsv)
    echo -e "Current subscription: ${YELLOW}$SUBSCRIPTION_NAME${NC} ($SUBSCRIPTION_ID)"
}

create_resource_group() {
    print_section "Creating Resource Group"
    
    if az group show --name $RESOURCE_GROUP &> /dev/null; then
        print_warning "Resource group $RESOURCE_GROUP already exists"
    else
        az group create \
            --name $RESOURCE_GROUP \
            --location $LOCATION \
            --tags "project=pactoria-mvp" "environment=production" "cost-center=free-tier"
        
        print_success "Resource group created: $RESOURCE_GROUP"
    fi
}

create_storage_account() {
    print_section "Creating Storage Account"
    
    # Check if storage account name is available
    if ! az storage account check-name --name $STORAGE_ACCOUNT_NAME --query "nameAvailable" -o tsv | grep -q "true"; then
        STORAGE_ACCOUNT_NAME="pactoriastor$(date +%s | tail -c 8)"
        print_warning "Storage account name not available, using: $STORAGE_ACCOUNT_NAME"
    fi
    
    az storage account create \
        --name $STORAGE_ACCOUNT_NAME \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku "Standard_LRS" \
        --kind "StorageV2" \
        --access-tier "Hot" \
        --https-only true \
        --min-tls-version "TLS1_2" \
        --tags "project=pactoria-mvp"
    
    # Get storage account key
    STORAGE_KEY=$(az storage account keys list \
        --resource-group $RESOURCE_GROUP \
        --account-name $STORAGE_ACCOUNT_NAME \
        --query '[0].value' -o tsv)
    
    # Create container for file uploads
    az storage container create \
        --name "pactoria-uploads" \
        --account-name $STORAGE_ACCOUNT_NAME \
        --account-key $STORAGE_KEY \
        --public-access off
    
    print_success "Storage account created: $STORAGE_ACCOUNT_NAME"
}

create_postgresql_server() {
    print_section "Creating PostgreSQL Flexible Server"
    
    # Check if server name is available
    if ! az postgres flexible-server check-name-availability --name $POSTGRESQL_SERVER_NAME --query "nameAvailable" -o tsv | grep -q "true"; then
        POSTGRESQL_SERVER_NAME="pactoria-db-$(date +%s | tail -c 8)"
        print_warning "PostgreSQL server name not available, using: $POSTGRESQL_SERVER_NAME"
    fi
    
    # Create PostgreSQL Flexible Server (Burstable B1ms for cost efficiency)
    az postgres flexible-server create \
        --name $POSTGRESQL_SERVER_NAME \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --admin-user $DB_ADMIN_USER \
        --admin-password "$DB_ADMIN_PASSWORD" \
        --sku-name "Standard_B1ms" \
        --tier "Burstable" \
        --storage-size 32 \
        --version 14 \
        --backup-retention 7 \
        --geo-redundant-backup Disabled \
        --high-availability Disabled \
        --tags "project=pactoria-mvp"
    
    # Configure firewall to allow Azure services
    az postgres flexible-server firewall-rule create \
        --name "AllowAzureServices" \
        --resource-group $RESOURCE_GROUP \
        --server-name $POSTGRESQL_SERVER_NAME \
        --start-ip-address 0.0.0.0 \
        --end-ip-address 0.0.0.0
    
    # Create database
    az postgres flexible-server db create \
        --resource-group $RESOURCE_GROUP \
        --server-name $POSTGRESQL_SERVER_NAME \
        --database-name $DATABASE_NAME
    
    print_success "PostgreSQL server created: $POSTGRESQL_SERVER_NAME"
}

create_app_service() {
    print_section "Creating App Service (F1 Free Tier)"
    
    # Create App Service Plan (F1 Free tier)
    az appservice plan create \
        --name "pactoria-asp-free" \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku F1 \
        --is-linux \
        --tags "project=pactoria-mvp"
    
    # Create Web App
    az webapp create \
        --name $WEBAPP_NAME \
        --resource-group $RESOURCE_GROUP \
        --plan "pactoria-asp-free" \
        --runtime "PYTHON:3.11" \
        --tags "project=pactoria-mvp"
    
    # Configure app settings
    POSTGRESQL_CONNECTION_STRING="postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${POSTGRESQL_SERVER_NAME}.postgres.database.azure.com:5432/${DATABASE_NAME}?sslmode=require"
    
    az webapp config appsettings set \
        --name $WEBAPP_NAME \
        --resource-group $RESOURCE_GROUP \
        --settings \
            "ENVIRONMENT=production" \
            "DEBUG=false" \
            "ENABLE_KEEPALIVE=true" \
            "GUNICORN_WORKERS=1" \
            "GUNICORN_THREADS=2" \
            "DATABASE_URL=$POSTGRESQL_CONNECTION_STRING" \
            "AZURE_POSTGRESQL_HOST=${POSTGRESQL_SERVER_NAME}.postgres.database.azure.com" \
            "AZURE_POSTGRESQL_DATABASE=$DATABASE_NAME" \
            "AZURE_POSTGRESQL_USER=$DB_ADMIN_USER" \
            "AZURE_POSTGRESQL_PASSWORD=$DB_ADMIN_PASSWORD" \
            "AZURE_STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT_NAME" \
            "AZURE_STORAGE_ACCOUNT_KEY=$STORAGE_KEY" \
            "JWT_SECRET_KEY=$(openssl rand -base64 32)" \
            "GROQ_API_KEY=" \
            "CORS_ORIGINS=https://${STATIC_APP_NAME}.azurestaticapps.net"
    
    # Configure startup command
    az webapp config set \
        --name $WEBAPP_NAME \
        --resource-group $RESOURCE_GROUP \
        --startup-file "python startup.py"
    
    print_success "App Service created: $WEBAPP_NAME"
}

create_static_web_app() {
    print_section "Creating Static Web Apps (Free Tier)"
    
    # Note: Static Web Apps creation requires GitHub integration
    # This will create the resource, but GitHub Actions setup is manual
    
    print_warning "Static Web Apps requires GitHub integration."
    echo "After deployment, please:"
    echo "1. Go to Azure Portal → Static Web Apps"
    echo "2. Create new Static Web App: $STATIC_APP_NAME"
    echo "3. Connect to your GitHub repository"
    echo "4. Set build details:"
    echo "   - App location: /frontend"
    echo "   - Output location: dist"
    echo "   - API location: (leave empty)"
    
    # Create placeholder for now
    echo "Resource name reserved: $STATIC_APP_NAME"
}

create_function_app() {
    print_section "Creating Azure Functions (Consumption Plan)"
    
    # Create Function App with consumption plan (free tier)
    az functionapp create \
        --name $FUNCTION_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --storage-account $STORAGE_ACCOUNT_NAME \
        --consumption-plan-location $LOCATION \
        --runtime python \
        --runtime-version 3.11 \
        --os-type Linux \
        --tags "project=pactoria-mvp"
    
    # Configure function app settings
    az functionapp config appsettings set \
        --name $FUNCTION_APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --settings \
            "GROQ_API_KEY=" \
            "ENVIRONMENT=production" \
            "AZURE_POSTGRESQL_CONNECTION_STRING=$POSTGRESQL_CONNECTION_STRING"
    
    print_success "Function App created: $FUNCTION_APP_NAME"
}

setup_database() {
    print_section "Setting up Database Schema"
    
    # Note: Database setup script needs to be run separately
    print_warning "Database schema setup required."
    echo "Please run the following command to set up the database:"
    echo "python ../database/azure-database-config.py"
    echo ""
    echo "Or use psql to run the setup script:"
    echo "psql \"$POSTGRESQL_CONNECTION_STRING\" -f ../database/azure-postgresql-setup.sql"
}

create_monitoring() {
    print_section "Setting up Basic Monitoring"
    
    # Enable Application Insights (free tier)
    APPINSIGHTS_NAME="pactoria-insights"
    
    # Check if Application Insights extension is installed
    if ! az extension list --query "[?name=='application-insights']" -o tsv | grep -q "application-insights"; then
        print_warning "Installing Application Insights extension..."
        az extension add --name application-insights
    fi
    
    # Create Application Insights
    az monitor app-insights component create \
        --app $APPINSIGHTS_NAME \
        --location $LOCATION \
        --resource-group $RESOURCE_GROUP \
        --kind web \
        --tags "project=pactoria-mvp"
    
    # Get instrumentation key
    INSTRUMENTATION_KEY=$(az monitor app-insights component show \
        --app $APPINSIGHTS_NAME \
        --resource-group $RESOURCE_GROUP \
        --query "instrumentationKey" -o tsv)
    
    # Add to web app settings
    az webapp config appsettings set \
        --name $WEBAPP_NAME \
        --resource-group $RESOURCE_GROUP \
        --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY"
    
    print_success "Application Insights configured: $APPINSIGHTS_NAME"
}

display_deployment_info() {
    print_section "Deployment Complete - Resource Information"
    
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}\n"
    
    echo -e "${BLUE}Resource Group:${NC} $RESOURCE_GROUP"
    echo -e "${BLUE}Location:${NC} $LOCATION"
    echo ""
    
    echo -e "${BLUE}Backend App Service:${NC}"
    echo -e "  Name: $WEBAPP_NAME"
    echo -e "  URL: https://${WEBAPP_NAME}.azurewebsites.net"
    echo -e "  Tier: F1 (Free)"
    echo ""
    
    echo -e "${BLUE}Database:${NC}"
    echo -e "  Server: ${POSTGRESQL_SERVER_NAME}.postgres.database.azure.com"
    echo -e "  Database: $DATABASE_NAME"
    echo -e "  User: $DB_ADMIN_USER"
    echo -e "  Tier: Standard_B1ms (Burstable)"
    echo ""
    
    echo -e "${BLUE}Storage Account:${NC}"
    echo -e "  Name: $STORAGE_ACCOUNT_NAME"
    echo -e "  Tier: Standard_LRS"
    echo ""
    
    echo -e "${BLUE}Function App:${NC}"
    echo -e "  Name: $FUNCTION_APP_NAME"
    echo -e "  Plan: Consumption (Free)"
    echo ""
    
    echo -e "${BLUE}Static Web App:${NC}"
    echo -e "  Name: $STATIC_APP_NAME (manual setup required)"
    echo ""
    
    print_section "Next Steps"
    
    echo "1. Set up GitHub repository and connect Static Web Apps"
    echo "2. Configure GitHub Secrets for CI/CD:"
    echo "   - AZURE_STATIC_WEB_APPS_API_TOKEN"
    echo "   - AZURE_CREDENTIALS" 
    echo "   - GROQ_API_KEY"
    echo "   - Other environment variables"
    echo ""
    echo "3. Deploy backend code:"
    echo "   cd ../backend && zip -r deployment.zip ."
    echo "   az webapp deployment source config-zip --src deployment.zip --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP"
    echo ""
    echo "4. Deploy functions:"
    echo "   cd ../functions && func azure functionapp publish $FUNCTION_APP_NAME"
    echo ""
    echo "5. Set up database schema:"
    echo "   python ../database/azure-database-config.py"
    echo ""
    
    print_section "Important Security Notes"
    
    echo -e "${RED}🔒 Security Configuration Required:${NC}"
    echo "1. Update database admin password (stored in Key Vault recommended)"
    echo "2. Configure proper CORS origins for Static Web App"
    echo "3. Set up proper authentication and authorization"
    echo "4. Enable Web App firewall rules as needed"
    echo "5. Configure custom domain and SSL certificate"
    echo ""
    
    print_section "Cost Monitoring"
    
    echo "Monitor your costs at: https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/overview"
    echo ""
    echo "Free tier limits:"
    echo "- App Service F1: 60 minutes/day compute"
    echo "- PostgreSQL B1ms: 750 hours/month compute (first month free)"
    echo "- Functions: 1M requests/month, 400,000 GB-s/month"
    echo "- Static Web Apps: 100 GB bandwidth/month"
    echo ""
    
    # Save configuration to file
    cat > deployment-info.txt << EOF
Pactoria MVP Deployment Information
Generated: $(date)

Resource Group: $RESOURCE_GROUP
Location: $LOCATION

Backend App Service: $WEBAPP_NAME
URL: https://${WEBAPP_NAME}.azurewebsites.net

Database Server: ${POSTGRESQL_SERVER_NAME}.postgres.database.azure.com
Database: $DATABASE_NAME
Admin User: $DB_ADMIN_USER
Admin Password: $DB_ADMIN_PASSWORD

Storage Account: $STORAGE_ACCOUNT_NAME
Storage Key: $STORAGE_KEY

Function App: $FUNCTION_APP_NAME

Connection String: $POSTGRESQL_CONNECTION_STRING
EOF
    
    print_success "Deployment information saved to deployment-info.txt"
}

# Main execution
main() {
    print_section "Pactoria MVP - Azure Free Tier Deployment"
    
    echo "This script will deploy Pactoria MVP to Azure using free tier resources."
    echo "Estimated monthly cost: £0-15 (depending on usage)"
    echo ""
    
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
    
    check_prerequisites
    create_resource_group
    create_storage_account
    create_postgresql_server
    create_app_service
    create_static_web_app
    create_function_app
    setup_database
    create_monitoring
    display_deployment_info
    
    print_success "Deployment script completed!"
}

# Run main function
main "$@"