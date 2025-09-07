# Pactoria MVP Services - Quick Start Guide

## Installation Complete! ✅

The macOS background service setup has been successfully created. Your services are configured but not yet installed as background tasks.

## Current Status

- **Manual Services Running**: Your backend (port 8000) and frontend (port 5173) are currently running manually
- **Service Files Created**: All necessary configuration files are in `/Users/rezazeraat/Desktop/Pactoria-MVP/services/`
- **Command Available**: The `pactoria-service` command has been added to your PATH

## Quick Setup Instructions

### Step 1: Update Your Terminal Session

For the current terminal session:
```bash
export PATH="$HOME/.local/bin:$PATH"
```

Or restart your terminal to load the PATH changes automatically.

### Step 2: Stop Current Manual Services (Optional)

If you want to switch from manual to background services:
```bash
# Find and stop current services
kill $(lsof -t -i:8000)  # Stop backend
kill $(lsof -t -i:5173)  # Stop frontend
```

### Step 3: Install Background Services

Install the services to run automatically on login:
```bash
pactoria-service install
```

### Step 4: Start Services Now

Start the services immediately:
```bash
pactoria-service start
```

### Step 5: Verify Everything is Working

Check the status:
```bash
pactoria-service status
```

## Most Common Commands

| Command | Description |
|---------|-------------|
| `pactoria-service status` | Check if services are running |
| `pactoria-service start` | Start both services |
| `pactoria-service stop` | Stop both services |
| `pactoria-service restart` | Restart both services |
| `pactoria-service logs` | View recent logs |
| `pactoria-service follow` | Watch logs in real-time |
| `pactoria-service dev` | Run in foreground for development |

## Service URLs

- **Backend API**: http://localhost:8000
- **Backend Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:5173

## Features Configured

✅ **Auto-start on login** - Services start when you log into macOS  
✅ **Auto-restart on crash** - Services automatically restart if they fail  
✅ **Hot reload** - Code changes trigger automatic reload  
✅ **Centralized logging** - All output saved to log files  
✅ **Environment variables** - Loads from .env files  
✅ **Easy management** - Single command to control both services  

## Log Locations

- Backend output: `/Users/rezazeraat/Desktop/Pactoria-MVP/services/logs/backend-stdout.log`
- Backend errors: `/Users/rezazeraat/Desktop/Pactoria-MVP/services/logs/backend-stderr.log`
- Frontend output: `/Users/rezazeraat/Desktop/Pactoria-MVP/services/logs/frontend-stdout.log`
- Frontend errors: `/Users/rezazeraat/Desktop/Pactoria-MVP/services/logs/frontend-stderr.log`

## Troubleshooting

### Command not found
```bash
export PATH="$HOME/.local/bin:$PATH"
```

### Services won't start
```bash
# Check what's using the ports
lsof -i :8000
lsof -i :5173

# View error logs
pactoria-service logs
```

### Permission denied
```bash
chmod +x /Users/rezazeraat/Desktop/Pactoria-MVP/services/*.sh
chmod +x /Users/rezazeraat/Desktop/Pactoria-MVP/services/pactoria-service
```

## Development Mode

For active development with visible output:
```bash
pactoria-service dev
```
This runs both services in the foreground. Press `Ctrl+C` to stop.

## Next Steps

1. Install the services: `pactoria-service install`
2. Start developing! The services will auto-reload when you change code
3. Check logs if something goes wrong: `pactoria-service logs`

For detailed documentation, see the [README.md](README.md) file.