# Pactoria MVP macOS Background Services

This directory contains the configuration and scripts to run Pactoria MVP services as background tasks on macOS using `launchd`.

## Features

- **Automatic Startup**: Services start automatically on system login
- **Auto-Restart**: Services restart automatically if they crash
- **Hot Reload**: Both frontend and backend auto-reload when code changes
- **Centralized Logging**: All output is logged to files for debugging
- **Easy Management**: Simple commands to control services
- **Environment Support**: Properly loads .env files for both services

## Quick Start

### Installation

1. First, run the installer script to set up everything:
```bash
cd /Users/rezazeraat/Desktop/Pactoria-MVP/services
chmod +x install.sh
./install.sh
```

2. Install the services (they will auto-start on login):
```bash
pactoria-service install
```

3. Start the services immediately:
```bash
pactoria-service start
```

## Service Management Commands

The `pactoria-service` command is available system-wide after installation.

### Basic Commands

```bash
# Install services (enables auto-start on login)
pactoria-service install

# Uninstall services (removes auto-start)
pactoria-service uninstall

# Start services
pactoria-service start           # Start both
pactoria-service start backend   # Start backend only
pactoria-service start frontend  # Start frontend only

# Stop services
pactoria-service stop            # Stop both
pactoria-service stop backend    # Stop backend only
pactoria-service stop frontend   # Stop frontend only

# Restart services
pactoria-service restart         # Restart both
pactoria-service restart backend # Restart backend only
pactoria-service restart frontend # Restart frontend only

# Check status
pactoria-service status          # Show status and port usage
```

### Log Management

```bash
# View logs (last 50 lines by default)
pactoria-service logs            # Show logs for both services
pactoria-service logs backend    # Show backend logs only
pactoria-service logs frontend   # Show frontend logs only
pactoria-service logs backend 100 # Show last 100 lines of backend logs

# Follow logs in real-time
pactoria-service follow          # Follow both services
pactoria-service follow backend  # Follow backend only
pactoria-service follow frontend # Follow frontend only

# Clean log files
pactoria-service clean-logs      # Clear all log files
```

### Development Mode

For active development, you can run services in the foreground:

```bash
# Stop background services and run in foreground
pactoria-service dev
```

Press `Ctrl+C` to stop both services when in dev mode.

## File Structure

```
services/
├── com.pactoria.backend.plist   # Backend LaunchAgent configuration
├── com.pactoria.frontend.plist  # Frontend LaunchAgent configuration
├── backend-start.sh             # Backend startup script
├── frontend-start.sh            # Frontend startup script
├── pactoria-service             # Main management script
├── install.sh                   # Installation helper
├── README.md                    # This file
└── logs/                        # Log directory (created on first run)
    ├── backend-stdout.log       # Backend output
    ├── backend-stderr.log       # Backend errors
    ├── backend-startup.log      # Backend startup times
    ├── frontend-stdout.log      # Frontend output
    ├── frontend-stderr.log      # Frontend errors
    └── frontend-startup.log     # Frontend startup times
```

## Service Details

### Backend Service
- **Port**: 8000
- **URL**: http://localhost:8000
- **Technology**: FastAPI with Uvicorn
- **Auto-reload**: Watches `/app` directory for changes
- **Environment**: Loads from `.env` file
- **Virtual Environment**: Uses `venv` if present

### Frontend Service
- **Port**: 5173
- **URL**: http://localhost:5173
- **Technology**: React with Vite
- **Auto-reload**: Built-in Vite HMR (Hot Module Replacement)
- **Environment**: Loads from `.env.development`
- **Dependencies**: Auto-installs if `node_modules` missing

## LaunchAgent Configuration

The services are configured with:
- `RunAtLoad`: Start automatically on login
- `KeepAlive`: Restart if crashed
- `ThrottleInterval`: 30 seconds between restart attempts
- `ProcessType`: Interactive (for development features)
- `StandardOutPath/StandardErrorPath`: Separate log files

## Troubleshooting

### Services Won't Start

1. Check the status:
```bash
pactoria-service status
```

2. Check the logs for errors:
```bash
pactoria-service logs
# or
tail -f /Users/rezazeraat/Desktop/Pactoria-MVP/services/logs/backend-stderr.log
tail -f /Users/rezazeraat/Desktop/Pactoria-MVP/services/logs/frontend-stderr.log
```

3. Verify ports are not in use:
```bash
lsof -i :8000   # Check backend port
lsof -i :5173   # Check frontend port
```

4. Kill any existing processes:
```bash
# Find and kill process using port 8000
kill -9 $(lsof -t -i:8000)
# Find and kill process using port 5173
kill -9 $(lsof -t -i:5173)
```

### Python Virtual Environment Issues

If the backend fails with module import errors:

```bash
cd /Users/rezazeraat/Desktop/Pactoria-MVP/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend Dependencies Issues

If the frontend fails with module errors:

```bash
cd /Users/rezazeraat/Desktop/Pactoria-MVP/frontend
rm -rf node_modules package-lock.json
npm install
```

### Permission Issues

If you get permission errors:

```bash
# Make scripts executable
chmod +x /Users/rezazeraat/Desktop/Pactoria-MVP/services/*.sh
chmod +x /Users/rezazeraat/Desktop/Pactoria-MVP/services/pactoria-service
```

### Services Not Starting on Login

1. Verify the plist files are in LaunchAgents:
```bash
ls -la ~/Library/LaunchAgents/com.pactoria.*
```

2. Reload the services:
```bash
pactoria-service uninstall
pactoria-service install
```

### Clean Start

For a completely fresh start:

```bash
# Stop and uninstall services
pactoria-service stop
pactoria-service uninstall

# Clean logs
pactoria-service clean-logs

# Reinstall and start
pactoria-service install
pactoria-service start
```

## Environment Variables

### Backend (.env)
The backend service automatically loads environment variables from:
- `/Users/rezazeraat/Desktop/Pactoria-MVP/backend/.env`

### Frontend (.env.development)
The frontend service automatically loads environment variables from:
- `/Users/rezazeraat/Desktop/Pactoria-MVP/frontend/.env.development`

## Manual Service Control

If you need to control services directly with `launchctl`:

```bash
# Load service
launchctl load -w ~/Library/LaunchAgents/com.pactoria.backend.plist

# Unload service
launchctl unload -w ~/Library/LaunchAgents/com.pactoria.backend.plist

# Start service
launchctl start com.pactoria.backend

# Stop service
launchctl stop com.pactoria.backend

# List services
launchctl list | grep pactoria
```

## Uninstallation

To completely remove the background services:

```bash
# Uninstall services
pactoria-service uninstall

# Remove symlink
sudo rm /usr/local/bin/pactoria-service

# Optionally, remove the services directory
# rm -rf /Users/rezazeraat/Desktop/Pactoria-MVP/services
```

## Security Notes

- Services run under your user account
- Log files may contain sensitive information
- Environment variables are loaded from .env files
- Services bind to all interfaces (0.0.0.0) for backend

## Performance Notes

- Services have a 30-second throttle interval to prevent rapid restarts
- Logs are not rotated automatically (use `clean-logs` periodically)
- Both services run with auto-reload in development mode
- Consider disabling auto-reload for production use

## Support

For issues or questions:
1. Check the logs first: `pactoria-service logs`
2. Verify status: `pactoria-service status`
3. Try a clean restart: `pactoria-service restart`
4. Check this README's troubleshooting section