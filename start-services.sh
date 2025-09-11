#!/bin/bash

# Pactoria MVP - Start Services Script
echo "🚀 Starting Pactoria MVP Services..."

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Check if ports are available
echo "🔍 Checking ports..."
check_port 8000 || { echo "❌ Backend port 8000 is busy. Please stop the existing service."; exit 1; }
check_port 5173 || { echo "❌ Frontend port 5173 is busy. Please stop the existing service."; exit 1; }

# Start backend
echo "🔧 Starting backend server..."
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services started successfully!"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "👤 Demo Login Credentials:"
echo "   Email: demo@pactoria.com"
echo "   Password: Demo123!"
echo ""
echo "📝 To stop services, press Ctrl+C or run:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Wait for user interrupt
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait