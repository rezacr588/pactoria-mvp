# Pactoria MVP - Optimized Deployment Guide

This deployment configuration has been optimized for **minimal cost** and **simplicity** while maintaining essential functionality.

## Quick Deploy Options

### 1. Automatic Deployment (Recommended)
Push to `main` branch triggers automatic deployment via GitHub Actions:
- Tests code (backend + frontend)
- Builds and deploys to Azure Container Apps
- Deploys frontend to Azure Static Web Apps
- **Estimated Cost**: $5-15 USD/month

### 2. Manual Deployment
Run the deployment script:
```bash
# Set required environment variables
export GROQ_API_KEY="your_groq_api_key"
export SECRET_KEY="your_secret_key"

# Run deployment
chmod +x deploy.sh
./deploy.sh
```

## Required GitHub Secrets
For automatic deployment, set these secrets in your repository:
- `AZURE_CREDENTIALS` - Azure service principal credentials
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - Static Web Apps deployment token  
- `ACR_PASSWORD` - Container Registry password
- `GROQ_API_KEY` - Groq API key for AI features
- `SECRET_KEY` - Application secret key

## Architecture Overview
- **Backend**: Azure Container Apps (0.25 CPU, 0.5GB RAM, scales to zero)
- **Frontend**: Azure Static Web Apps (free tier)
- **Database**: SQLite (no additional costs)
- **Registry**: Azure Container Registry (Basic tier)

## Cost Breakdown
- Container Apps: $5-12/month (with scale-to-zero)
- Static Web Apps: $0/month (free tier)
- Container Registry: $5/month (Basic tier)
- **Total**: $10-17/month

## Key Optimizations
✅ Single workflow instead of 4 complex ones  
✅ Scale-to-zero when idle  
✅ Minimal resource allocation  
✅ SQLite instead of managed database  
✅ Optimized Docker image for fast cold starts  
✅ Automatic old image cleanup  

## Monitoring
- View costs: [Azure Cost Management](https://portal.azure.com/#blade/Microsoft_Azure_CostManagement)
- App health: `https://your-app.azurecontainerapps.io/health`
- API docs: `https://your-app.azurecontainerapps.io/docs`

For issues or questions, check the GitHub Actions logs or Azure Portal.