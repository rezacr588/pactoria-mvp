#!/bin/bash

# ===============================================================================
# PACTORIA MVP - CI/CD SETUP SCRIPT
# ===============================================================================
# Quick setup script for GitHub Actions CI/CD pipeline migration
# This script helps automate the initial setup and configuration
# ===============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

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

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Configuration
RESOURCE_GROUP_PREFIX="pactoria"
LOCATION="eastus"
ACR_NAME="pactoriaacr"
SUBSCRIPTION_ID=""
SP_NAME="github-actions-pactoria"

echo "======================================================"
echo "   PACTORIA MVP - CI/CD SETUP"
echo "======================================================"
echo ""

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v az >/dev/null 2>&1 || error "Azure CLI not installed. Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    command -v gh >/dev/null 2>&1 || error "GitHub CLI not installed. Install from: https://cli.github.com/"
    command -v openssl >/dev/null 2>&1 || error "OpenSSL not available"
    
    # Check Azure login
    if ! az account show >/dev/null 2>&1; then
        warn "Not logged into Azure"
        read -p "Run 'az login' now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            az login
        else
            error "Please login to Azure first: az login"
        fi
    fi
    
    # Check GitHub login
    if ! gh auth status >/dev/null 2>&1; then
        warn "Not logged into GitHub"
        read -p "Run 'gh auth login' now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            gh auth login
        else
            error "Please login to GitHub first: gh auth login"
        fi
    fi
    
    # Get subscription ID
    SUBSCRIPTION_ID=$(az account show --query "id" -o tsv)
    info "Using subscription: $SUBSCRIPTION_ID"
    
    log "✅ Prerequisites OK"
}

# Setup Azure resources
setup_azure_resources() {
    log "Setting up Azure resources..."
    
    # Create resource groups
    log "Creating resource groups..."
    az group create --name "${RESOURCE_GROUP_PREFIX}-dev-rg" --location $LOCATION || warn "Dev resource group might already exist"
    az group create --name "${RESOURCE_GROUP_PREFIX}-staging-rg" --location $LOCATION || warn "Staging resource group might already exist"
    az group create --name "${RESOURCE_GROUP_PREFIX}-rg" --location $LOCATION || warn "Production resource group might already exist"
    
    # Create Container Apps environments
    log "Creating Container Apps environments..."
    az containerapp env create \
        --name pactoria-dev-env \
        --resource-group "${RESOURCE_GROUP_PREFIX}-dev-rg" \
        --location $LOCATION || warn "Dev environment might already exist"
        
    az containerapp env create \
        --name pactoria-staging-env \
        --resource-group "${RESOURCE_GROUP_PREFIX}-staging-rg" \
        --location $LOCATION || warn "Staging environment might already exist"
        
    # Check if production environment exists
    if ! az containerapp env show --name pactoria-env --resource-group "${RESOURCE_GROUP_PREFIX}-rg" >/dev/null 2>&1; then
        warn "Production environment 'pactoria-env' not found. Please create it manually or update the configuration."
    fi
    
    log "✅ Azure resources setup complete"
}

# Create service principal
create_service_principal() {
    log "Creating Azure Service Principal..."
    
    # Check if service principal already exists
    if az ad sp list --display-name "$SP_NAME" --query "[0]" -o tsv >/dev/null 2>&1; then
        warn "Service Principal '$SP_NAME' already exists. Skipping creation."
        info "If you need to recreate it, delete it first: az ad sp delete --id \$(az ad sp list --display-name '$SP_NAME' --query '[0].appId' -o tsv)"
        return
    fi
    
    # Create service principal
    log "Creating service principal with Contributor role..."
    SP_OUTPUT=$(az ad sp create-for-rbac \
        --name "$SP_NAME" \
        --role contributor \
        --scopes "/subscriptions/$SUBSCRIPTION_ID" \
        --sdk-auth)
    
    if [ $? -eq 0 ]; then
        log "✅ Service Principal created successfully"
        echo ""
        info "Service Principal JSON (save this for AZURE_CREDENTIALS secret):"
        echo "================================================"
        echo "$SP_OUTPUT"
        echo "================================================"
        echo ""
        
        # Save to temporary file
        echo "$SP_OUTPUT" > azure-credentials.json
        info "Service Principal credentials saved to: azure-credentials.json"
        warn "Remember to delete this file after setting up GitHub secrets!"
    else
        error "Failed to create Service Principal"
    fi
}

# Generate application secrets
generate_secrets() {
    log "Generating application secrets..."
    
    # Generate SECRET_KEY
    SECRET_KEY=$(openssl rand -base64 32)
    echo "SECRET_KEY=$SECRET_KEY" > app-secrets.txt
    
    info "Generated SECRET_KEY (save this for SECRET_KEY secret): $SECRET_KEY"
    
    # Get ACR password
    log "Getting Azure Container Registry password..."
    
    # Enable admin user on ACR
    az acr update --name $ACR_NAME --admin-enabled true >/dev/null 2>&1 || warn "Could not enable ACR admin user"
    
    ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv 2>/dev/null || echo "ACR_PASSWORD_NOT_FOUND")
    
    if [ "$ACR_PASSWORD" != "ACR_PASSWORD_NOT_FOUND" ]; then
        echo "ACR_PASSWORD=$ACR_PASSWORD" >> app-secrets.txt
        info "Retrieved ACR password: $ACR_PASSWORD"
    else
        warn "Could not retrieve ACR password. Please get it manually: az acr credential show --name $ACR_NAME"
    fi
    
    info "Application secrets saved to: app-secrets.txt"
    warn "Remember to delete this file after setting up GitHub secrets!"
    
    log "✅ Secrets generated"
}

# Setup GitHub secrets
setup_github_secrets() {
    log "Setting up GitHub secrets..."
    
    # Check if in git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "Not in a git repository. Please run this script from your project root."
    fi
    
    # Set AZURE_CREDENTIALS
    if [ -f "azure-credentials.json" ]; then
        log "Setting AZURE_CREDENTIALS secret..."
        gh secret set AZURE_CREDENTIALS < azure-credentials.json
        log "✅ AZURE_CREDENTIALS secret set"
    else
        warn "azure-credentials.json not found. Please set AZURE_CREDENTIALS manually."
    fi
    
    # Set SECRET_KEY
    if grep -q "SECRET_KEY=" app-secrets.txt 2>/dev/null; then
        SECRET_KEY_VALUE=$(grep "SECRET_KEY=" app-secrets.txt | cut -d'=' -f2)
        gh secret set SECRET_KEY --body "$SECRET_KEY_VALUE"
        log "✅ SECRET_KEY secret set"
    fi
    
    # Set ACR_PASSWORD
    if grep -q "ACR_PASSWORD=" app-secrets.txt 2>/dev/null; then
        ACR_PASSWORD_VALUE=$(grep "ACR_PASSWORD=" app-secrets.txt | cut -d'=' -f2)
        gh secret set ACR_PASSWORD --body "$ACR_PASSWORD_VALUE"
        log "✅ ACR_PASSWORD secret set"
    fi
    
    # Prompt for GROQ_API_KEY
    echo ""
    read -p "Enter your GROQ API key: " GROQ_API_KEY
    if [ ! -z "$GROQ_API_KEY" ]; then
        gh secret set GROQ_API_KEY --body "$GROQ_API_KEY"
        log "✅ GROQ_API_KEY secret set"
    else
        warn "GROQ_API_KEY not set. Please set it manually: gh secret set GROQ_API_KEY --body 'your-api-key'"
    fi
    
    log "✅ GitHub secrets setup complete"
}

# Backup old deployment scripts
backup_old_scripts() {
    log "Backing up old deployment scripts..."
    
    if [ -f "deploy-simple.sh" ]; then
        mv deploy-simple.sh deploy-simple.sh.backup
        log "Backed up deploy-simple.sh"
    fi
    
    if [ -f "deploy-azure-production.sh" ]; then
        mv deploy-azure-production.sh deploy-azure-production.sh.backup
        log "Backed up deploy-azure-production.sh"
    fi
    
    if [ -f "deploy-ultra-cheap.sh" ]; then
        mv deploy-ultra-cheap.sh deploy-ultra-cheap.sh.backup
        log "Backed up deploy-ultra-cheap.sh"
    fi
    
    log "✅ Old scripts backed up"
}

# Test the pipeline
test_pipeline() {
    log "Testing the CI/CD pipeline..."
    
    # Create a test branch and commit
    TEST_BRANCH="test/cicd-setup-$(date +%s)"
    git checkout -b "$TEST_BRANCH"
    
    # Make a small change
    echo "# CI/CD Pipeline Setup Test - $(date)" >> README.md
    git add README.md
    git commit -m "test: CI/CD pipeline setup verification"
    git push origin "$TEST_BRANCH"
    
    info "Created test branch: $TEST_BRANCH"
    info "Check GitHub Actions to see if the pipeline runs successfully"
    
    log "✅ Pipeline test initiated"
}

# Cleanup temporary files
cleanup() {
    log "Cleaning up temporary files..."
    
    if [ -f "azure-credentials.json" ]; then
        rm azure-credentials.json
        log "Removed azure-credentials.json"
    fi
    
    if [ -f "app-secrets.txt" ]; then
        rm app-secrets.txt
        log "Removed app-secrets.txt"
    fi
    
    log "✅ Cleanup complete"
}

# Main setup function
main() {
    echo "This script will help you migrate from shell script deployments"
    echo "to a professional GitHub Actions CI/CD pipeline."
    echo ""
    echo "What this script will do:"
    echo "1. Check prerequisites (Azure CLI, GitHub CLI, etc.)"
    echo "2. Create Azure resource groups and environments"
    echo "3. Create Azure Service Principal for authentication"
    echo "4. Generate application secrets"
    echo "5. Setup GitHub repository secrets"
    echo "6. Backup old deployment scripts"
    echo "7. Test the new pipeline"
    echo ""
    
    read -p "Do you want to continue? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    echo ""
    log "Starting CI/CD setup..."
    
    check_prerequisites
    setup_azure_resources
    create_service_principal
    generate_secrets
    setup_github_secrets
    backup_old_scripts
    test_pipeline
    
    echo ""
    echo "======================================================"
    echo "   CI/CD SETUP COMPLETE!"
    echo "======================================================"
    echo ""
    info "Next Steps:"
    echo "1. Check GitHub Actions tab to verify pipeline execution"
    echo "2. Review the migration guide: CICD-MIGRATION-GUIDE.md"
    echo "3. Setup Static Web Apps tokens for frontend deployment"
    echo "4. Configure branch protection rules"
    echo "5. Setup Azure cost monitoring alerts"
    echo ""
    info "Documentation:"
    echo "- Migration Guide: ./CICD-MIGRATION-GUIDE.md"
    echo "- Secrets Setup: ./.github/workflows/setup-secrets.md"
    echo ""
    info "Support:"
    echo "- Check GitHub Actions logs for any issues"
    echo "- Review Azure Portal for resource status"
    echo "- Monitor cost dashboard for optimization opportunities"
    echo ""
    
    cleanup
    
    log "🎉 Setup complete! Your CI/CD pipeline is ready."
}

# Run main function
main