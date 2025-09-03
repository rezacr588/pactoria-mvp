#!/bin/bash

# GitHub Secrets Setup Script for Pactoria MVP CI/CD
# This script helps configure all required GitHub secrets for Azure deployments

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
    
    # Check if GitHub CLI is installed
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI (gh) is not installed"
        print_info "Install it from: https://cli.github.com/"
        exit 1
    fi
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed"
        print_info "Install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    
    # Check if logged into GitHub
    if ! gh auth status &> /dev/null; then
        print_error "Not logged into GitHub CLI"
        print_info "Run: gh auth login"
        exit 1
    fi
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        print_error "Not logged into Azure CLI"
        print_info "Run: az login"
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
}

get_azure_credentials() {
    print_header "Setting up Azure Service Principal for GitHub Actions"
    
    local subscription_id=$(az account show --query id -o tsv)
    local resource_group="pactoria-rg"
    
    print_info "Subscription ID: $subscription_id"
    print_info "Resource Group: $resource_group"
    
    # Create service principal for GitHub Actions
    print_info "Creating service principal for GitHub Actions..."
    local sp_output=$(az ad sp create-for-rbac \
        --name "pactoria-github-actions" \
        --role contributor \
        --scopes "/subscriptions/$subscription_id/resourceGroups/$resource_group" \
        --sdk-auth)
    
    echo "$sp_output"
}

setup_github_secrets() {
    print_header "Configuring GitHub Secrets"
    
    local repo_name="Pactoria-MVP"
    
    print_info "Setting up secrets for repository: $repo_name"
    
    # Get Azure credentials
    print_info "Getting Azure service principal credentials..."
    local azure_credentials=$(get_azure_credentials)
    
    # Set Azure credentials secret
    echo "$azure_credentials" | gh secret set AZURE_CREDENTIALS --repo "$repo_name"
    print_success "AZURE_CREDENTIALS secret set"
    
    # Interactive setup for other secrets
    echo -e "\n${YELLOW}Please provide the following secrets:${NC}\n"
    
    # JWT Secret Key
    echo -n "Enter JWT Secret Key (press Enter to generate): "
    read jwt_secret
    if [ -z "$jwt_secret" ]; then
        jwt_secret=$(openssl rand -base64 32)
        print_info "Generated JWT secret key"
    fi
    echo "$jwt_secret" | gh secret set JWT_SECRET_KEY --repo "$repo_name"
    print_success "JWT_SECRET_KEY secret set"
    
    # Application Secret Key
    echo -n "Enter Application Secret Key (press Enter to generate): "
    read app_secret
    if [ -z "$app_secret" ]; then
        app_secret=$(openssl rand -base64 32)
        print_info "Generated application secret key"
    fi
    echo "$app_secret" | gh secret set SECRET_KEY --repo "$repo_name"
    print_success "SECRET_KEY secret set"
    
    # Groq API Key
    echo -n "Enter Groq API Key: "
    read -s groq_key
    echo
    if [ -n "$groq_key" ]; then
        echo "$groq_key" | gh secret set GROQ_API_KEY --repo "$repo_name"
        print_success "GROQ_API_KEY secret set"
    else
        print_warning "GROQ_API_KEY not set - AI features will not work"
    fi
    
    # Database URL
    echo -n "Enter Database Connection String: "
    read database_url
    if [ -n "$database_url" ]; then
        echo "$database_url" | gh secret set DATABASE_URL --repo "$repo_name"
        print_success "DATABASE_URL secret set"
    else
        print_warning "DATABASE_URL not set - using SQLite fallback"
    fi
    
    # Azure Static Web Apps API Token
    print_info "To get Azure Static Web Apps API Token:"
    print_info "1. Go to Azure Portal -> Static Web Apps -> Your App"
    print_info "2. Go to 'Deployment tokens' -> Copy deployment token"
    echo -n "Enter Azure Static Web Apps API Token: "
    read -s swa_token
    echo
    if [ -n "$swa_token" ]; then
        echo "$swa_token" | gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --repo "$repo_name"
        print_success "AZURE_STATIC_WEB_APPS_API_TOKEN secret set"
    else
        print_warning "AZURE_STATIC_WEB_APPS_API_TOKEN not set - frontend deployment will fail"
    fi
    
    # Frontend and Backend URLs
    echo -n "Enter Frontend URL (Static Web App URL): "
    read frontend_url
    if [ -n "$frontend_url" ]; then
        echo "$frontend_url" | gh secret set STATIC_WEB_APP_URL --repo "$repo_name"
        echo "$frontend_url" | gh secret set FRONTEND_URL --repo "$repo_name"
        print_success "Frontend URL secrets set"
    fi
    
    # API URLs for frontend
    local backend_url="https://pactoria-backend.azurecontainerapps.io/api"
    echo "$backend_url" | gh secret set VITE_API_URL --repo "$repo_name"
    print_success "VITE_API_URL secret set"
    
    # Optional: Azure Storage
    echo -n "Enter Azure Storage Account Name (optional): "
    read storage_name
    if [ -n "$storage_name" ]; then
        echo "$storage_name" | gh secret set AZURE_STORAGE_ACCOUNT_NAME --repo "$repo_name"
        
        echo -n "Enter Azure Storage Account Key: "
        read -s storage_key
        echo
        if [ -n "$storage_key" ]; then
            echo "$storage_key" | gh secret set AZURE_STORAGE_ACCOUNT_KEY --repo "$repo_name"
            print_success "Azure Storage secrets set"
        fi
    fi
}

verify_secrets() {
    print_header "Verifying GitHub Secrets"
    
    local repo_name="Pactoria-MVP"
    
    print_info "Checking configured secrets..."
    
    # List all secrets (names only)
    gh secret list --repo "$repo_name"
    
    print_success "Secret verification complete"
}

create_environment_protection() {
    print_header "Setting up Environment Protection"
    
    local repo_name="Pactoria-MVP"
    
    print_info "Creating protected environments..."
    
    # Note: Environment protection setup via CLI is limited
    # This would typically be done via GitHub UI or API
    
    print_info "Please manually configure the following environments in GitHub:"
    print_info "1. Go to Settings -> Environments"
    print_info "2. Create 'production' environment with protection rules"
    print_info "3. Create 'staging' environment"
    print_info "4. Add required reviewers for production deployments"
}

show_summary() {
    print_header "Setup Summary"
    
    echo -e "🎉 ${GREEN}GitHub Secrets setup completed!${NC}\n"
    
    echo "📋 Next steps:"
    echo "1. Verify Azure resources exist:"
    echo "   - Resource Group: pactoria-rg"
    echo "   - Container Registry: pactoriaacr"
    echo "   - Container App: pactoria-backend"
    echo "   - Static Web App: pactoria-frontend"
    echo ""
    echo "2. Configure environment protection rules in GitHub UI"
    echo "3. Test deployments by pushing to main branch"
    echo ""
    echo "🔍 To test the setup:"
    echo "   git add -A && git commit -m 'test: trigger CI/CD' && git push origin main"
    echo ""
    echo "📊 Monitor deployments:"
    echo "   - GitHub Actions: https://github.com/YOUR_USERNAME/Pactoria-MVP/actions"
    echo "   - Azure Portal: https://portal.azure.com"
}

# Main execution
main() {
    print_header "Pactoria MVP - GitHub Secrets Setup"
    
    check_prerequisites
    setup_github_secrets
    verify_secrets
    create_environment_protection
    show_summary
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi