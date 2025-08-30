#!/bin/bash

# Pactoria MVP Backend Startup Script
echo "🚀 Starting Pactoria MVP Backend..."

# Activate virtual environment
source backend/venv/bin/activate

# Check if all required packages are installed
echo "📦 Checking dependencies..."
pip check

# Set environment variables for development
export ENV=development
export DEBUG=True
export GROQ_API_KEY=${GROQ_API_KEY:-"your-groq-api-key-here"}
export SECRET_KEY="dev-secret-key-change-in-production"

# Navigate to backend directory
cd backend

# Start FastAPI server with hot reload
echo "🌟 Starting FastAPI server on http://localhost:8000"
echo "📚 API Documentation available at http://localhost:8000/docs"
echo "🔍 Alternative docs at http://localhost:8000/redoc"
echo ""
echo "💡 To stop the server, press Ctrl+C"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload