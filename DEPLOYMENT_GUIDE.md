# Pactoria MVP - Azure Deployment Guide

## Overview

This guide provides complete instructions for deploying the Pactoria MVP to Azure using free tier and cost-optimized services. The deployment achieves a target cost of £16-35/month after the free trial period.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Static Web Apps │────│  App Service F1  │────│ PostgreSQL B1ms │
│   (Frontend)    │    │    (Backend)     │    │   (Database)    │
│     FREE        │    │      FREE        │    │   £15-25/mo     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Azure Functions │    │ Storage Account  │    │Application      │
│  (AI Services)  │    │  (File Storage)  │    │   Insights      │
│   Consumption   │    │  Standard_LRS    │    │  (Monitoring)   │
│    £0-5/mo      │    │    £1-3/mo       │    │     FREE        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Cost Breakdown

### Free Tier (First Month)
- **App Service F1**: £0 (60 minutes/day limit)
- **PostgreSQL B1ms**: £0 (750 hours free)
- **Static Web Apps**: £0 (100GB bandwidth)
- **Azure Functions**: £0 (1M requests)
- **Storage Account**: £1-2
- **Application Insights**: £0 (1GB ingestion)
- **Total**: £1-2/month

### After Free Tier
- **App Service F1**: £0 (always free with limits)
- **PostgreSQL B1ms**: £15-25/month
- **Static Web Apps**: £0
- **Azure Functions**: £0-5/month
- **Storage Account**: £1-3/month
- **Application Insights**: £0-2/month
- **Total**: £16-35/month

## Prerequisites

### Required Software
```bash
# Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 3.11+
sudo apt-get update
sudo apt-get install python3.11 python3.11-venv

# Azure Functions Core Tools
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### Azure Account Setup
1. Create an Azure account with free tier
2. Ensure you have an active subscription
3. Login to Azure CLI: `az login`

## Deployment Steps

### Step 1: Clone and Prepare Repository

```bash
# Clone the repository
git clone <your-repo-url>
cd Pactoria-MVP

# Verify all deployment files exist
ls -la backend/Dockerfile
ls -la backend/startup.py
ls -la frontend/staticwebapp.config.json
ls -la deployment/azure-deploy.sh
```

### Step 2: Configure Environment Variables

Create a `.env` file with your secrets:

```bash
# backend/.env.production
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here
```

### Step 3: Run Azure Deployment Script

```bash
cd deployment
chmod +x azure-deploy.sh
./azure-deploy.sh
```

The script will create:
- Resource Group
- Storage Account
- PostgreSQL Flexible Server (B1ms)
- App Service (F1 tier)
- Function App (Consumption plan)
- Application Insights

### Step 4: Set Up Database Schema

```bash
# Install Python dependencies for database setup
pip install psycopg2-binary sqlalchemy python-dotenv

# Run database initialization
cd database
python azure-database-config.py
```

Or manually with psql:
```bash
# Get connection string from deployment output
psql "postgresql://user:pass@server.postgres.database.azure.com:5432/pactoria_mvp?sslmode=require" -f azure-postgresql-setup.sql
```

### Step 5: Deploy Backend Code

```bash
cd backend

# Create deployment package
zip -r deployment.zip . \
  --exclude="*.pyc" "__pycache__/*" "venv/*" "tests/*" "*.log" \
  "*.db" ".env*" "*.md" "docs/*" ".git/*"

# Deploy to App Service
az webapp deployment source config-zip \
  --src deployment.zip \
  --name pactoria-backend \
  --resource-group pactoria-mvp-rg
```

### Step 6: Deploy Azure Functions

```bash
cd functions

# Deploy functions
func azure functionapp publish pactoria-ai-functions
```

### Step 7: Set Up Static Web Apps

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new Static Web App
3. Connect to your GitHub repository
4. Configure build settings:
   - **App location**: `frontend`
   - **Output location**: `dist`
   - **API location**: (leave empty)

### Step 8: Configure GitHub Actions

Add the following secrets to your GitHub repository:

```bash
# Get deployment token for Static Web Apps
az staticwebapp secrets list --name pactoria-frontend --query "properties.apiKey" -o tsv

# Set up secrets in GitHub:
AZURE_STATIC_WEB_APPS_API_TOKEN=<token-from-above>
AZURE_CREDENTIALS=<service-principal-json>
GROQ_API_KEY=<your-groq-key>
VITE_API_URL=https://pactoria-backend.azurewebsites.net/api
```

### Step 9: Configure Custom Domain (Optional)

```bash
# Add custom domain to Static Web App
az staticwebapp hostname set \
  --name pactoria-frontend \
  --hostname your-domain.com

# Configure SSL certificate (automatic with Azure)
```

## Configuration Details

### App Service F1 Tier Optimizations

The deployment includes several optimizations for F1 tier:

1. **Single Worker Process**: Configured for 1 worker, 2 threads
2. **Keep-Alive Service**: Prevents sleep with internal health checks
3. **Memory Optimization**: Minimal dependencies, efficient startup
4. **Connection Pooling**: Optimized database connections

### PostgreSQL B1ms Optimizations

1. **Burstable Performance**: Scales CPU as needed
2. **Connection Limits**: Configured for small connection pool
3. **Storage Optimization**: 32GB SSD storage
4. **Backup Configuration**: 7-day retention

### Security Configuration

```bash
# Update App Service settings for security
az webapp config appsettings set \
  --name pactoria-backend \
  --resource-group pactoria-mvp-rg \
  --settings \
    "HTTPS_ONLY=true" \
    "TLS_VERSION=1.2" \
    "ENABLE_CORS=false"

# Configure PostgreSQL firewall
az postgres flexible-server firewall-rule create \
  --name "AllowAppService" \
  --resource-group pactoria-mvp-rg \
  --server-name pactoria-db \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## Monitoring and Maintenance

### Set Up Cost Monitoring

```bash
# Run cost monitoring script
cd deployment
./azure-cost-monitor.sh

# Set up budget alerts
az consumption budget create \
  --resource-group pactoria-mvp-rg \
  --budget-name 'pactoria-monthly-budget' \
  --amount 50 \
  --time-grain 'Monthly'
```

### Daily Monitoring Tasks

1. **Check App Service Status**: Monitor for sleep/wake cycles
2. **Database Performance**: Review slow queries and connections
3. **Function Execution**: Monitor AI service usage and costs
4. **Storage Usage**: Clean up old files periodically

### Weekly Optimization Tasks

1. **Database Maintenance**:
   ```sql
   -- Run optimization queries
   psql -f database/database-optimization.sql
   
   -- Vacuum and analyze
   VACUUM ANALYZE;
   ```

2. **Cost Review**: Run cost monitoring script
3. **Performance Review**: Check Application Insights metrics
4. **Security Updates**: Review and apply updates

## Troubleshooting

### Common Issues and Solutions

#### App Service F1 Tier Sleep Issues
```bash
# Check keep-alive service status
az webapp log tail --name pactoria-backend --resource-group pactoria-mvp-rg

# Restart if needed
az webapp restart --name pactoria-backend --resource-group pactoria-mvp-rg
```

#### Database Connection Issues
```bash
# Test database connectivity
python database/azure-database-config.py

# Check firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group pactoria-mvp-rg \
  --server-name pactoria-db
```

#### Function App Cold Start Issues
```bash
# Check function status
az functionapp list --resource-group pactoria-mvp-rg \
  --query '[].{Name:name,State:state}'

# View function logs
az functionapp logs tail --name pactoria-ai-functions \
  --resource-group pactoria-mvp-rg
```

### Performance Optimization

#### Backend Optimization
1. **Memory Usage**: Monitor with Application Insights
2. **Response Times**: Optimize database queries
3. **Error Rates**: Check logs and fix issues promptly

#### Database Optimization
1. **Index Usage**: Review and optimize indexes
2. **Query Performance**: Use `EXPLAIN ANALYZE`
3. **Connection Pooling**: Monitor connection efficiency

#### Function Optimization
1. **Cold Starts**: Minimize dependencies
2. **Execution Time**: Optimize AI processing
3. **Memory Usage**: Monitor and adjust timeout settings

## Scaling Considerations

### When to Scale Up

#### App Service F1 → Basic B1 (£12.41/month)
- **Trigger**: Exceeding 60 minutes/day consistently
- **Benefits**: No time limits, custom domains, SSL certificates
- **Migration**: Update App Service Plan SKU

#### PostgreSQL B1ms → B2s (£30-40/month)
- **Trigger**: CPU consistently > 80%
- **Benefits**: 2 vCores, better performance
- **Migration**: Scale up through Azure Portal

#### Functions Consumption → Premium (£50+/month)
- **Trigger**: > 1M requests/month or need faster cold starts
- **Benefits**: No cold starts, VNet integration
- **Migration**: Create Premium plan and migrate

### Horizontal Scaling Options

1. **CDN**: Add Azure CDN for static content (£5-10/month)
2. **Load Balancer**: Multiple App Service instances
3. **Read Replicas**: PostgreSQL read replicas for scaling reads
4. **Caching**: Redis Cache for session/data caching

## Security Best Practices

### Authentication & Authorization
1. **JWT Tokens**: Implement proper token validation
2. **Role-Based Access**: Use defined user roles
3. **API Keys**: Secure Groq API key in Key Vault
4. **CORS**: Configure proper CORS origins

### Data Protection
1. **Encryption**: All data encrypted in transit and at rest
2. **SSL/TLS**: Force HTTPS for all connections
3. **Database**: SSL required for PostgreSQL connections
4. **Backup**: Regular database backups enabled

### Network Security
1. **Firewall Rules**: Restrict database access
2. **Private Endpoints**: Consider for production
3. **VNet Integration**: Isolate function apps
4. **DDoS Protection**: Enable if needed

## Backup and Disaster Recovery

### Database Backups
- **Automatic**: 7-day retention enabled
- **Manual**: Create before major changes
- **Testing**: Test restore procedures monthly

### Application Backups
- **Source Code**: GitHub repository
- **Configuration**: Document all settings
- **Database Schema**: Version controlled migrations

### Recovery Procedures
1. **App Service**: Redeploy from GitHub
2. **Database**: Restore from backup
3. **Static Web App**: Automatic from GitHub
4. **Functions**: Redeploy from source

## Cost Optimization Strategies

### Immediate Optimizations
1. **App Service**: Use F1 tier effectively
2. **Database**: Optimize queries and indexes
3. **Storage**: Implement lifecycle policies
4. **Functions**: Cache AI responses

### Long-term Strategies
1. **Reserved Instances**: 1-3 year commitments for 30-60% savings
2. **Dev/Test Pricing**: Development environments
3. **Azure Hybrid Benefit**: Use existing licenses
4. **Spot Instances**: For non-critical workloads

### Cost Monitoring Tools
1. **Azure Cost Management**: Built-in cost analysis
2. **Budgets**: Set spending limits and alerts
3. **Resource Tags**: Track costs by component
4. **Usage Metrics**: Monitor resource utilization

## Support and Maintenance

### Regular Maintenance Schedule
- **Daily**: Monitor health checks and errors
- **Weekly**: Review costs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review architecture and scaling needs

### Support Resources
- **Azure Support**: Basic support included
- **Documentation**: Azure docs and Stack Overflow
- **Community**: Azure forums and Reddit
- **Professional**: Consider paid support for production

This deployment guide ensures your Pactoria MVP runs efficiently on Azure with minimal cost while maintaining good performance and security standards.