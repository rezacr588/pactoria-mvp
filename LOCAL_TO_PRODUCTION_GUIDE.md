# Pactoria MVP - Local to Production Connection Guide

This guide explains how to safely connect your local development environment to production resources for data injection, testing, and debugging purposes.

## ⚠️ IMPORTANT SAFETY WARNINGS

🔴 **CRITICAL**: When connected to production, ALL changes are REAL and PERMANENT  
🔴 **USE ONLY FOR**: Data injection, production testing, debugging  
🔴 **NOT FOR**: Regular development, experimentation, learning  
🔴 **ALWAYS**: Backup production data before making changes  

## Quick Start

### 1. Check Current Mode
```bash
./scripts/check-mode.sh
```

### 2. Switch to Production Connection
```bash
./scripts/switch-to-prod.sh
```

### 3. Switch Back to Local Development  
```bash
./scripts/switch-to-local.sh
```

## Detailed Setup Process

### Step 1: Prepare Production Credentials

Before connecting, gather these production credentials:
- **Azure PostgreSQL**:
  - Host: `pactoria-db.postgres.database.azure.com` (example)
  - Database: `pactoria_mvp`
  - Username: `pactoria_admin` (example)
  - Password: Your production database password
- **Security Keys**:
  - Production SECRET_KEY
  - Production JWT_SECRET_KEY
- **API Keys**:
  - Production GROQ_API_KEY
- **Azure Storage** (optional):
  - Storage Account Name
  - Storage Account Key

### Step 2: Run Production Connection Setup

```bash
# This will guide you through secure credential entry
./scripts/switch-to-prod.sh
```

The setup process will:
1. Display safety warnings and require confirmation
2. Securely collect your production credentials (no echo)
3. Backup your current environment files
4. Configure backend and frontend for production connection
5. Test the database connection
6. Create mode switching scripts

### Step 3: Start Your Application

After successful setup:

```bash
# Start backend (connects to production database)
cd backend
python -m app.main

# In another terminal, start frontend (connects to production API)
cd frontend
npm run dev
```

### Step 4: Monitor Production Connection

When connected to production, you'll see:
- Warning messages in backend logs
- Safety headers in API responses
- Environment indicators in the application

## Safety Features

### Automatic Warnings
- Backend logs production connection warnings
- API responses include safety headers
- Enhanced logging for all production operations

### Environment Indicators
- Clear mode identification in logs
- Safety confirmations for destructive operations
- Connection status in API responses

### Backup Protection
- Automatic backup of environment files
- Easy restoration to local mode
- Configuration validation

## Mode Switching Commands

### Available Scripts
- `./scripts/switch-to-prod.sh` - Switch to production connection
- `./scripts/switch-to-local.sh` - Switch to local development  
- `./scripts/check-mode.sh` - Check current configuration mode

### What Each Mode Does

#### Local Development Mode (Default)
```
Backend: localhost:8000 → SQLite database
Frontend: localhost:5173 → localhost:8000 API
Data: All local, safe for experimentation
```

#### Local-to-Production Mode  
```
Backend: localhost:8000 → Azure PostgreSQL (Production)
Frontend: localhost:5173 → Production API
Data: PRODUCTION - all changes are permanent
```

## Configuration Files

### Environment Files Created
- `.env.local-to-prod` - Template for production connection
- `frontend/.env.local-to-prod` - Frontend production connection template
- Backups: `.env.backup`, `frontend/.env.local.backup`

### Configuration Structure
```
Pactoria-MVP/
├── .env                     # Current backend config
├── .env.local-to-prod      # Production connection template
├── frontend/
│   ├── .env.local          # Current frontend config
│   └── .env.local-to-prod  # Frontend production template
└── scripts/
    ├── setup-prod-connection.py    # Main setup script
    ├── switch-to-prod.sh          # Switch to production
    ├── switch-to-local.sh         # Switch to local
    └── check-mode.sh              # Check current mode
```

## Troubleshooting

### Connection Issues
1. **Database Connection Failed**:
   - Verify Azure PostgreSQL credentials
   - Check firewall rules (allow your IP)
   - Confirm database exists and user has permissions

2. **API Connection Issues**:
   - Verify production API endpoint is accessible
   - Check CORS configuration
   - Confirm frontend environment variables

3. **Authentication Issues**:
   - Ensure SECRET_KEY and JWT_SECRET_KEY match production
   - Verify API keys are valid
   - Check token expiration settings

### Switching Issues
1. **Cannot Switch Modes**:
   - Check script permissions: `chmod +x scripts/*.sh`
   - Verify all template files exist
   - Run with proper shell: `bash ./scripts/switch-to-prod.sh`

2. **Lost Configuration**:
   - Restore from backups: `cp .env.backup .env`
   - Re-run setup: `./scripts/switch-to-prod.sh`
   - Check for template files

## Security Best Practices

### Credential Management
- Never commit production credentials to git
- Use secure credential entry (passwords not echoed)
- Regularly rotate production keys
- Limit production access to necessary users

### Connection Safety
- Always confirm production connection intent
- Monitor Azure costs during usage sessions
- Use read-only operations when possible
- Switch back to local mode when finished

### Data Protection
- Backup production data before bulk operations
- Test operations on local data first
- Use transactions for multi-step operations
- Monitor application logs for errors

## Cost Considerations

### Azure Resource Usage
- PostgreSQL charges for connection time
- Container Apps charge for requests/compute time
- Storage charges for data transfer and storage

### Optimization Tips
- Minimize connection duration
- Use efficient queries
- Batch operations when possible
- Monitor usage in Azure portal

## Emergency Procedures

### Immediate Disconnect
```bash
# Quickly switch back to local mode
./scripts/switch-to-local.sh

# Stop all running services
pkill -f "python -m app.main"
pkill -f "npm run dev"
```

### Data Recovery
1. Check database backups in Azure
2. Review application logs for recent changes
3. Use Azure portal for manual recovery if needed
4. Contact Azure support for critical issues

## Support and Maintenance

### Regular Maintenance
- Update production credentials when rotated
- Test connection setup periodically
- Review and update safety procedures
- Monitor Azure resource costs

### Getting Help
- Check application logs first
- Review Azure portal for resource status
- Verify network connectivity
- Consult Azure documentation for service-specific issues

---

**Remember**: Production connections are powerful tools that require careful handling. Always prioritize data safety and cost management when using this setup.