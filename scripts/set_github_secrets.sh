#!/bin/bash

# Script to set GitHub repository secrets for CI/CD
# Run this script after creating your GitHub repository
# Usage: ./set_github_secrets.sh <github-username> <repo-name>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI (gh) is not installed. Please install it first.${NC}"
    echo "Visit: https://cli.github.com/"
    exit 1
fi

# Check arguments
if [ "$#" -ne 2 ]; then
    echo -e "${YELLOW}Usage: $0 <github-username> <repo-name>${NC}"
    exit 1
fi

GITHUB_USER=$1
REPO_NAME=$2
REPO="$GITHUB_USER/$REPO_NAME"

echo -e "${GREEN}Setting GitHub secrets for repository: $REPO${NC}"

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}Not authenticated with GitHub. Running 'gh auth login'...${NC}"
    gh auth login
fi

# Function to set a secret
set_secret() {
    local name=$1
    local value=$2
    echo -e "${YELLOW}Setting secret: $name${NC}"
    echo "$value" | gh secret set "$name" --repo="$REPO"
}

# Set Groq API Key
echo -e "${GREEN}Setting Groq API Key...${NC}"
echo -e "${YELLOW}Please enter your Groq API Key:${NC}"
read -s GROQ_API_KEY
set_secret "GROQ_API_KEY" "$GROQ_API_KEY"

# Set other production secrets (you'll need to replace these with your actual values)
echo -e "${GREEN}Setting application secrets...${NC}"

# Generate secure random secrets if not provided
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)

set_secret "SECRET_KEY" "$SECRET_KEY"
set_secret "JWT_SECRET_KEY" "$JWT_SECRET_KEY"

# Azure Configuration (you'll need to get these from Azure Portal)
echo -e "${YELLOW}Note: You'll need to manually set Azure-related secrets after creating Azure resources${NC}"
echo -e "${YELLOW}Required Azure secrets:${NC}"
echo "  - AZURE_STATIC_WEB_APP_API_TOKEN (from Azure Static Web Apps)"
echo "  - AZURE_CREDENTIALS (Service Principal JSON)"
echo "  - AZURE_RESOURCE_GROUP (your resource group name)"
echo "  - AZURE_CONTAINER_APP_NAME (your container app name)"
echo "  - AZURE_ACR_REGISTRY (your container registry name)"
echo "  - AZURE_STORAGE_CONNECTION_STRING (for file storage)"

# Optional: Set Azure secrets if you have them
# Uncomment and fill in your values:
# set_secret "AZURE_STATIC_WEB_APP_API_TOKEN" "your-token-here"
# set_secret "AZURE_CREDENTIALS" '{"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}'
# set_secret "AZURE_RESOURCE_GROUP" "pactoria-rg"
# set_secret "AZURE_CONTAINER_APP_NAME" "pactoria-backend"
# set_secret "AZURE_ACR_REGISTRY" "pactoriaacr"

echo -e "${GREEN}✅ GitHub secrets have been set successfully!${NC}"
echo -e "${YELLOW}Remember to set the Azure-related secrets after creating your Azure resources.${NC}"

# List all secrets (names only, not values)
echo -e "${GREEN}Current secrets in repository:${NC}"
gh secret list --repo="$REPO"
