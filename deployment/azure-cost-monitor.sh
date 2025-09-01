#!/bin/bash

# Azure Cost Monitoring and Optimization Script for Pactoria MVP
# Monitors resource usage and provides cost optimization recommendations

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
RESOURCE_GROUP="pactoria-mvp-rg"
SUBSCRIPTION_ID=$(az account show --query "id" -o tsv 2>/dev/null || echo "")

print_header() {
    echo -e "\n${BLUE}$1${NC}"
    echo -e "${BLUE}$(echo "$1" | sed 's/./=/g')${NC}"
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
    if [[ -z "$SUBSCRIPTION_ID" ]]; then
        print_error "Not logged into Azure CLI or no subscription found"
        exit 1
    fi
    
    print_success "Connected to subscription: $SUBSCRIPTION_ID"
}

get_current_costs() {
    print_header "Current Month Costs"
    
    # Get current month costs
    START_DATE=$(date -d "$(date +'%Y-%m-01')" +'%Y-%m-%d')
    END_DATE=$(date +'%Y-%m-%d')
    
    echo "Period: $START_DATE to $END_DATE"
    echo ""
    
    # Check if cost management extension is available
    if ! az extension list --query "[?name=='costmanagement']" -o tsv | grep -q "costmanagement"; then
        print_warning "Installing Cost Management extension..."
        az extension add --name costmanagement
    fi
    
    # Get costs by resource group
    echo "Getting costs for resource group: $RESOURCE_GROUP"
    
    # Note: Cost Management API might not be immediately available for new subscriptions
    COST_DATA=$(az costmanagement query \
        --type "ActualCost" \
        --dataset-granularity "Monthly" \
        --dataset-aggregation '{pretaxCost:{name:PreTaxCost,function:Sum}}' \
        --timeframe "MonthToDate" \
        --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" 2>/dev/null || echo "COST_API_ERROR")
    
    if [[ "$COST_DATA" == "COST_API_ERROR" ]]; then
        print_warning "Cost Management API not available yet (normal for new subscriptions)"
        print_warning "Costs will be available 24-48 hours after resource creation"
        echo ""
        echo "You can check costs manually at:"
        echo "https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/overview"
    else
        echo "$COST_DATA" | jq -r '.properties.rows[] | @csv' | while IFS=',' read -r cost currency date; do
            echo "Cost: $cost $currency (Date: $date)"
        done
    fi
    
    echo ""
}

analyze_resource_usage() {
    print_header "Resource Usage Analysis"
    
    # Get all resources in the resource group
    RESOURCES=$(az resource list --resource-group $RESOURCE_GROUP --query '[].{Name:name,Type:type,Location:location}' -o table)
    
    echo "$RESOURCES"
    echo ""
    
    # App Service analysis
    print_header "App Service Analysis"
    
    WEBAPPS=$(az webapp list --resource-group $RESOURCE_GROUP --query '[].name' -o tsv)
    
    for webapp in $WEBAPPS; do
        echo "Web App: $webapp"
        
        # Get app service plan details
        PLAN_INFO=$(az webapp show --name $webapp --resource-group $RESOURCE_GROUP \
            --query '{plan:appServicePlanId,state:state,sku:sku}' -o json)
        
        echo "  State: $(echo $PLAN_INFO | jq -r '.state')"
        echo "  SKU: $(echo $PLAN_INFO | jq -r '.sku')"
        
        # Get recent logs (if available)
        LOGS=$(az webapp log tail --name $webapp --resource-group $RESOURCE_GROUP --provider application 2>/dev/null | tail -n 5 || echo "Logs not available")
        if [[ "$LOGS" != "Logs not available" ]]; then
            echo "  Recent activity detected"
        else
            print_warning "  No recent logs found"
        fi
        
        echo ""
    done
    
    # PostgreSQL analysis
    print_header "PostgreSQL Analysis"
    
    POSTGRES_SERVERS=$(az postgres flexible-server list --resource-group $RESOURCE_GROUP --query '[].name' -o tsv)
    
    for server in $POSTGRES_SERVERS; do
        echo "PostgreSQL Server: $server"
        
        # Get server details
        SERVER_INFO=$(az postgres flexible-server show --name $server --resource-group $RESOURCE_GROUP \
            --query '{state:state,sku:sku.name,storage:storage.storageSizeGB,backup:backup.backupRetentionDays}' -o json)
        
        echo "  State: $(echo $SERVER_INFO | jq -r '.state')"
        echo "  SKU: $(echo $SERVER_INFO | jq -r '.sku')"
        echo "  Storage: $(echo $SERVER_INFO | jq -r '.storage') GB"
        echo "  Backup Retention: $(echo $SERVER_INFO | jq -r '.backup') days"
        
        # Check if server is actually being used
        print_warning "  Monitor database connections and query performance"
        echo ""
    done
    
    # Storage analysis
    print_header "Storage Analysis"
    
    STORAGE_ACCOUNTS=$(az storage account list --resource-group $RESOURCE_GROUP --query '[].name' -o tsv)
    
    for storage in $STORAGE_ACCOUNTS; do
        echo "Storage Account: $storage"
        
        # Get storage metrics (if available)
        STORAGE_INFO=$(az storage account show --name $storage --resource-group $RESOURCE_GROUP \
            --query '{tier:accessTier,sku:sku.name,kind:kind}' -o json)
        
        echo "  SKU: $(echo $STORAGE_INFO | jq -r '.sku')"
        echo "  Tier: $(echo $STORAGE_INFO | jq -r '.tier')"
        echo "  Kind: $(echo $STORAGE_INFO | jq -r '.kind')"
        
        # List containers and approximate usage
        CONTAINERS=$(az storage container list --account-name $storage --query '[].name' -o tsv 2>/dev/null || echo "Access denied")
        if [[ "$CONTAINERS" != "Access denied" ]]; then
            echo "  Containers: $(echo $CONTAINERS | tr '\n' ' ')"
        else
            print_warning "  Cannot access container details (permissions required)"
        fi
        
        echo ""
    done
    
    # Function Apps analysis  
    print_header "Function Apps Analysis"
    
    FUNCTION_APPS=$(az functionapp list --resource-group $RESOURCE_GROUP --query '[].name' -o tsv)
    
    for func_app in $FUNCTION_APPS; do
        echo "Function App: $func_app"
        
        # Get function app details
        FUNC_INFO=$(az functionapp show --name $func_app --resource-group $RESOURCE_GROUP \
            --query '{state:state,kind:kind,sku:sku}' -o json)
        
        echo "  State: $(echo $FUNC_INFO | jq -r '.state')"
        echo "  Kind: $(echo $FUNC_INFO | jq -r '.kind')"
        
        # List functions
        FUNCTIONS=$(az functionapp function list --name $func_app --resource-group $RESOURCE_GROUP --query '[].name' -o tsv 2>/dev/null || echo "No functions")
        echo "  Functions: $FUNCTIONS"
        
        echo ""
    done
}

provide_cost_optimization_recommendations() {
    print_header "Cost Optimization Recommendations"
    
    echo "Based on free tier limits and best practices:"
    echo ""
    
    echo "1. App Service F1 Tier Optimization:"
    echo "   ✓ Already using F1 free tier (60 minutes/day limit)"
    echo "   • Monitor daily usage with Application Insights"
    echo "   • Implement keep-alive mechanism (already configured)"
    echo "   • Consider scaling to Basic B1 if exceeding limits (£12.41/month)"
    echo ""
    
    echo "2. PostgreSQL Optimization:"
    echo "   ✓ Using Burstable B1ms tier (750 hours free first month)"
    echo "   • Monitor connection pooling efficiency"
    echo "   • Optimize queries to reduce CPU usage"
    echo "   • Consider automated start/stop for development (saves ~70% cost)"
    echo "   • After free trial: Expected cost £15-25/month"
    echo ""
    
    echo "3. Storage Optimization:"
    echo "   ✓ Using Standard_LRS (lowest cost)"
    echo "   • Monitor upload sizes and implement lifecycle policies"
    echo "   • Clean up old contract files periodically"
    echo "   • Expected cost: £1-3/month for typical usage"
    echo ""
    
    echo "4. Function Apps Optimization:"
    echo "   ✓ Using Consumption plan (1M requests free)"
    echo "   • Monitor Groq API usage to avoid unexpected costs"
    echo "   • Implement caching for similar requests"
    echo "   • Expected cost: £0-5/month"
    echo ""
    
    echo "5. Static Web Apps:"
    echo "   ✓ Free tier with 100GB bandwidth"
    echo "   • Monitor bandwidth usage"
    echo "   • Optimize images and assets"
    echo "   • Expected cost: £0/month"
    echo ""
    
    echo "6. Application Insights:"
    echo "   ✓ Free tier with 1GB ingestion"
    echo "   • Monitor log volume"
    echo "   • Configure sampling to stay within limits"
    echo "   • Expected cost: £0-2/month"
    echo ""
    
    print_header "Monthly Cost Estimates"
    echo "Free Tier Period (First month):"
    echo "• App Service F1: £0"
    echo "• PostgreSQL B1ms: £0 (750 hours free)"
    echo "• Storage: £1-2"
    echo "• Functions: £0"
    echo "• Static Web Apps: £0"
    echo "• Application Insights: £0"
    echo "• Total: £1-2/month"
    echo ""
    
    echo "After Free Tier:"
    echo "• App Service F1: £0 (always free with limits)"
    echo "• PostgreSQL B1ms: £15-25"
    echo "• Storage: £1-3"
    echo "• Functions: £0-5"
    echo "• Static Web Apps: £0"
    echo "• Application Insights: £0-2"
    echo "• Total: £16-35/month"
    echo ""
    
    print_header "Cost Alerts Setup"
    echo "Set up cost alerts to monitor spending:"
    echo ""
    echo "1. Budget Alert (Recommended):"
    echo "   az consumption budget create \\"
    echo "     --resource-group $RESOURCE_GROUP \\"
    echo "     --budget-name 'pactoria-monthly-budget' \\"
    echo "     --amount 50 \\"
    echo "     --time-grain 'Monthly' \\"
    echo "     --start-date $(date +'%Y-%m-01') \\"
    echo "     --end-date $(date -d '+1 year' +'%Y-%m-01')"
    echo ""
    echo "2. Portal Setup:"
    echo "   • Go to Cost Management + Billing in Azure Portal"
    echo "   • Set up budgets and alerts"
    echo "   • Configure email notifications"
    echo ""
}

generate_optimization_script() {
    print_header "Generating Optimization Scripts"
    
    # Create database optimization script
    cat > database-optimization.sql << 'EOF'
-- PostgreSQL Optimization Queries for Cost Reduction

-- 1. Find unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
ORDER BY schemaname, tablename, indexname;

-- 2. Find tables with high dead tuple ratio
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    ROUND((n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0))::numeric, 2) AS dead_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY dead_percentage DESC;

-- 3. Database size analysis
SELECT 
    pg_size_pretty(pg_total_relation_size(oid)) AS table_size,
    relname AS table_name
FROM pg_class 
WHERE relkind = 'r' 
ORDER BY pg_total_relation_size(oid) DESC 
LIMIT 10;

-- 4. Long running queries (if pg_stat_statements is enabled)
-- SELECT query, calls, total_time, mean_time 
-- FROM pg_stat_statements 
-- ORDER BY total_time DESC 
-- LIMIT 10;
EOF
    
    # Create monitoring script
    cat > monitor-resources.sh << 'EOF'
#!/bin/bash
# Resource monitoring script - run daily

RESOURCE_GROUP="pactoria-mvp-rg"
DATE=$(date +'%Y-%m-%d %H:%M:%S')

echo "[$DATE] Resource Monitoring Report" >> monitor.log

# Check App Service status
az webapp list --resource-group $RESOURCE_GROUP --query '[].{Name:name,State:state}' -o table >> monitor.log 2>&1

# Check PostgreSQL status  
az postgres flexible-server list --resource-group $RESOURCE_GROUP --query '[].{Name:name,State:state}' -o table >> monitor.log 2>&1

# Check Function App status
az functionapp list --resource-group $RESOURCE_GROUP --query '[].{Name:name,State:state}' -o table >> monitor.log 2>&1

echo "----------------------------------------" >> monitor.log

# Make it executable
chmod +x monitor-resources.sh
EOF
    
    chmod +x monitor-resources.sh
    
    print_success "Created database-optimization.sql"
    print_success "Created monitor-resources.sh"
    echo ""
    echo "Run these regularly to maintain optimal performance and cost:"
    echo "• ./monitor-resources.sh (daily)"
    echo "• psql -f database-optimization.sql (weekly)"
}

main() {
    print_header "Pactoria MVP - Cost Monitoring & Optimization"
    
    echo "This script analyzes your current Azure resource usage and provides cost optimization recommendations."
    echo ""
    
    check_prerequisites
    get_current_costs
    analyze_resource_usage
    provide_cost_optimization_recommendations
    generate_optimization_script
    
    print_success "Cost analysis complete!"
    echo ""
    echo "Key recommendations:"
    echo "1. Monitor daily App Service usage (60 min/day limit)"
    echo "2. Optimize database queries and connections"  
    echo "3. Set up cost alerts and budgets"
    echo "4. Review usage monthly and adjust resources"
    echo ""
    echo "Estimated monthly cost after free tier: £16-35"
}

main "$@"