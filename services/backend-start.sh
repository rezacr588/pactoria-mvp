#!/bin/bash

# Backend startup script for Pactoria MVP
# This script starts the FastAPI backend with uvicorn

# Set up the environment
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:$PATH"

# Change to backend directory
cd /Users/rezazeraat/Desktop/Pactoria-MVP/backend

# Source the Python virtual environment if it exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Load environment variables from .env file
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Create logs directory if it doesn't exist
mkdir -p /Users/rezazeraat/Desktop/Pactoria-MVP/services/logs

# Log startup time
echo "Starting backend server at $(date)" >> /Users/rezazeraat/Desktop/Pactoria-MVP/services/logs/backend-startup.log

# Start the FastAPI server with uvicorn
# Using exec to replace the shell process with uvicorn
exec python -m uvicorn app.main:app \
    --reload \
    --host 0.0.0.0 \
    --port 8000 \
    --reload-dir /Users/rezazeraat/Desktop/Pactoria-MVP/backend/app \
    --log-level info