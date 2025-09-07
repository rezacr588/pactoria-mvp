#!/bin/bash

# Frontend startup script for Pactoria MVP
# This script starts the React frontend with Vite

# Set up the environment
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:$PATH"
export NODE_ENV="development"

# Change to frontend directory
cd /Users/rezazeraat/Desktop/Pactoria-MVP/frontend

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..." >> /Users/rezazeraat/Desktop/Pactoria-MVP/services/logs/frontend-startup.log
    npm install
fi

# Load environment variables from .env.development file
if [ -f ".env.development" ]; then
    export $(cat .env.development | grep -v '^#' | xargs)
fi

# Create logs directory if it doesn't exist
mkdir -p /Users/rezazeraat/Desktop/Pactoria-MVP/services/logs

# Log startup time
echo "Starting frontend server at $(date)" >> /Users/rezazeraat/Desktop/Pactoria-MVP/services/logs/frontend-startup.log

# Start the Vite development server
# Using exec to replace the shell process with npm
exec npm run dev