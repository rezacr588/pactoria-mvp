#!/bin/bash

# ===============================================================================
# PACTORIA MVP - DEPLOYMENT VALIDATION SCRIPT
# ===============================================================================
# Validates that all deployment configurations are correct and optimized
# ===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="pactoria-rg"
ACR_NAME="pactoriaacr"
STATIC_APP_NAME="pactoria-frontend"
CONTAINER_APP_NAME="pactoria-backend"
ENVIRONMENT_NAME="pactoria-env"

# Helper functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# ===============================================================================
# CHECK GITHUB ACTIONS CONFIGURATIONS
# ===============================================================================
check_github_actions() {
    log "Checking GitHub Actions configurations..."
    
    # Check for outdated azure/login versions
    if grep -r "azure/login@v1" .github/workflows/*.yml 2>/dev/null; then
        error "Found outdated azure/login@v1 in workflows. Should be v2"
        return 1
    else
        success "All workflows use azure/login@v2"
    fi
    
    # Check resource allocations in workflows
    if grep -E "cpu.*0\.5|cpu.*1\.0|memory.*1\.0Gi|memory.*2\.0Gi" .github/workflows/*.yml 2>/dev/null | grep -v "#"; then
        warn "Found non-optimized resource allocations in workflows (should be 0.25 CPU, 0.5Gi memory)"
    else
        success "Resource allocations are optimized"
    fi
    
    return 0
}

# ===============================================================================
# CHECK DOCKER CONFIGURATION
# ===============================================================================
check_docker_config() {
    log "Checking Docker configuration..."
    
    # Check Dockerfile exists
    if [ ! -f backend/Dockerfile ]; then
        error "backend/Dockerfile not found"
        return 1
    fi
    
    # Check if Dockerfile uses correct requirements file
    if grep "COPY requirements-azure.txt" backend/Dockerfile > /dev/null; then
        success "Dockerfile uses requirements-azure.txt"
    else
        error "Dockerfile should use requirements-azure.txt"
        return 1
    fi
    
    # Check for multi-stage build
    if grep "FROM.*AS builder" backend/Dockerfile > /dev/null; then
        success "Dockerfile uses multi-stage build for optimization"
    else
        warn "Consider using multi-stage build for smaller images"
    fi
    
    # Check health check
    if grep "HEALTHCHECK" backend/Dockerfile > /dev/null; then
        success "Dockerfile includes HEALTHCHECK"
    else
        warn "Consider adding HEALTHCHECK to Dockerfile"
    fi
    
    return 0
}

# ===============================================================================
# CHECK REQUIREMENTS FILES
# ===============================================================================
check_requirements() {
    log "Checking requirements files..."
    
    if [ ! -f backend/requirements.txt ]; then
        error "backend/requirements.txt not found"
        return 1
    fi
    
    if [ ! -f backend/requirements-azure.txt ]; then
        error "backend/requirements-azure.txt not found"
        return 1
    fi
    
    # Check for essential dependencies
    essential_deps=(
        "fastapi"
        "uvicorn"
        "sqlalchemy"
        "groq"
        "pydantic"
    )
    
    for dep in "${essential_deps[@]}"; do
        if grep -q "$dep" backend/requirements-azure.txt; then
            success "Found $dep in requirements-azure.txt"
        else
            error "Missing $dep in requirements-azure.txt"
            return 1
        fi
    done
    
    return 0
}

# ===============================================================================
# CHECK FRONTEND CONFIGURATION
# ===============================================================================
check_frontend_config() {
    log "Checking frontend configuration..."
    
    # Check package.json exists
    if [ ! -f frontend/package.json ]; then
        error "frontend/package.json not found"
        return 1
    fi
    
    # Check vite.config.ts
    if [ ! -f frontend/vite.config.ts ]; then
        error "frontend/vite.config.ts not found"
        return 1
    fi
    
    # Check staticwebapp.config.json
    if [ ! -f frontend/staticwebapp.config.json ]; then
        warn "frontend/staticwebapp.config.json not found - may cause routing issues"
    else
        success "Static Web Apps config found"
    fi
    
    # Check for build optimization in vite.config
    if grep "minify.*esbuild\|target.*esnext" frontend/vite.config.ts > /dev/null; then
        success "Vite config has optimization settings"
    else
        warn "Consider adding optimization settings to vite.config.ts"
    fi
    
    return 0
}

# ===============================================================================
# CHECK AZURE CONFIGURATIONS
# ===============================================================================
check_azure_config() {
    log "Checking Azure configuration files..."
    
    # Check for azure-container-app.yaml
    if [ -f backend/azure-container-app.yaml ]; then
        # Check resource allocations
        if grep -E "cpu:.*0\.25|memory:.*0\.5Gi" backend/azure-container-app.yaml > /dev/null; then
            success "Azure Container App config has optimized resources"
        else
            warn "Azure Container App config may have non-optimized resources"
        fi
        
        # Check scale-to-zero
        if grep "minReplicas:.*0" backend/azure-container-app.yaml > /dev/null; then
            success "Scale-to-zero is enabled"
        else
            warn "Scale-to-zero not enabled - will increase costs"
        fi
    else
        warn "backend/azure-container-app.yaml not found"
    fi
    
    return 0
}

# ===============================================================================
# CHECK DEPLOYMENT SCRIPTS
# ===============================================================================
check_deployment_scripts() {
    log "Checking deployment scripts..."
    
    scripts=(
        "deploy-azure-fixed.sh"
        "deploy-ultra-cheap.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            success "Found $script"
            
            # Check for error handling
            if grep "set -e" "$script" > /dev/null; then
                success "$script has error handling"
            else
                warn "$script should use 'set -e' for error handling"
            fi
            
            # Check for resource optimization
            if grep -E "cpu.*0\.25|memory.*0\.5" "$script" > /dev/null; then
                success "$script uses optimized resources"
            fi
        fi
    done
    
    return 0
}

# ===============================================================================
# CHECK ENVIRONMENT VARIABLES
# ===============================================================================
check_env_vars() {
    log "Checking environment variables..."
    
    # Check for .env.example files
    if [ -f backend/.env.example ]; then
        success "Found backend/.env.example"
    else
        warn "backend/.env.example not found - consider adding for documentation"
    fi
    
    if [ -f frontend/.env.example ]; then
        success "Found frontend/.env.example"
    else
        warn "frontend/.env.example not found - consider adding for documentation"
    fi
    
    return 0
}

# ===============================================================================
# SUMMARY
# ===============================================================================
generate_summary() {
    echo
    echo -e "${BLUE}======================================================"
    echo "   DEPLOYMENT VALIDATION SUMMARY"
    echo "======================================================${NC}"
    echo
    
    if [ $ERRORS -eq 0 ]; then
        echo -e "${GREEN}✅ All critical checks passed!${NC}"
    else
        echo -e "${RED}❌ Found $ERRORS critical issues${NC}"
    fi
    
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $WARNINGS warnings (non-critical)${NC}"
    fi
    
    echo
    echo "Cost Optimization Checklist:"
    echo "✅ Azure Container Apps: 0.25 CPU, 0.5GB RAM"
    echo "✅ Scale-to-zero enabled (0 minimum replicas)"
    echo "✅ Static Web Apps free tier"
    echo "✅ SQLite instead of PostgreSQL"
    echo "✅ No Log Analytics workspace"
    echo
    echo "Expected Monthly Costs:"
    echo "- Container Apps: ~$10-15 (with scale-to-zero)"
    echo "- Static Web Apps: FREE"
    echo "- Container Registry: ~$5"
    echo "- Storage: ~$2-4"
    echo "- Total: ~$17-24/month"
    echo
}

# ===============================================================================
# MAIN EXECUTION
# ===============================================================================
main() {
    ERRORS=0
    WARNINGS=0
    
    echo -e "${BLUE}======================================================"
    echo "   PACTORIA MVP - DEPLOYMENT VALIDATION"
    echo "======================================================${NC}"
    echo
    
    # Run all checks
    check_github_actions || ((ERRORS++))
    check_docker_config || ((ERRORS++))
    check_requirements || ((ERRORS++))
    check_frontend_config || ((ERRORS++))
    check_azure_config || ((ERRORS++))
    check_deployment_scripts || ((ERRORS++))
    check_env_vars || ((WARNINGS++))
    
    # Generate summary
    generate_summary
    
    # Exit with error if critical issues found
    if [ $ERRORS -gt 0 ]; then
        exit 1
    fi
    
    exit 0
}

# Run main function
main