#!/bin/bash

# Pactoria MVP - Run Backend and Frontend Services
# This script starts both backend and frontend services and keeps them running

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port)
    if [ ! -z "$pid" ]; then
        print_warning "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Clean up function
cleanup() {
    print_warning "Shutting down services..."
    
    # Kill backend process
    if [ ! -z "$BACKEND_PID" ]; then
        print_info "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
        wait $BACKEND_PID 2>/dev/null
    fi
    
    # Kill frontend process
    if [ ! -z "$FRONTEND_PID" ]; then
        print_info "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
        wait $FRONTEND_PID 2>/dev/null
    fi
    
    # Clean up any remaining processes on ports
    kill_port 8000
    kill_port 5173
    
    print_status "Services stopped."
    exit 0
}

# Trap signals for cleanup
trap cleanup INT TERM EXIT

# Check and create log directory
LOG_DIR="./logs"
mkdir -p $LOG_DIR

# Get current timestamp for log files
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

print_info "======================================"
print_info "   Pactoria MVP Services Launcher    "
print_info "======================================"

# Check if ports are already in use
if check_port 8000; then
    print_warning "Port 8000 is already in use."
    read -p "Kill existing process? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 8000
    else
        print_error "Cannot start backend. Port 8000 is in use."
        exit 1
    fi
fi

if check_port 5173; then
    print_warning "Port 5173 is already in use."
    read -p "Kill existing process? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 5173
    else
        print_error "Cannot start frontend. Port 5173 is in use."
        exit 1
    fi
fi

# Start Backend Service
print_status "Starting Backend Service..."

cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
print_info "Activating virtual environment and checking dependencies..."
source venv/bin/activate

# Check if requirements are installed
pip show fastapi > /dev/null 2>&1
if [ $? -ne 0 ]; then
    print_info "Installing backend dependencies..."
    pip install -r requirements.txt
fi

# Run database migrations
print_info "Running database migrations..."
alembic upgrade head 2>/dev/null || print_warning "Migration already up to date or no migrations found"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_warning "Creating default .env file for backend..."
    cat > .env << EOF
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET_KEY=your-jwt-secret-change-in-production
GROQ_API_KEY=gsk_your_groq_api_key_here
DATABASE_URL=sqlite:///./pactoria_mvp.db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
ENVIRONMENT=development
DEBUG=true
EOF
    print_warning "Please update .env file with your actual API keys!"
fi

# Start backend in background with logging
print_status "Launching backend on port 8000..."
nohup python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 \
    > "$LOG_DIR/backend_${TIMESTAMP}.log" 2>&1 &
BACKEND_PID=$!

print_info "Backend PID: $BACKEND_PID"
print_info "Backend log: $LOG_DIR/backend_${TIMESTAMP}.log"

# Wait for backend to start
sleep 3

# Check if backend started successfully
if ! check_port 8000; then
    print_error "Failed to start backend! Check logs at $LOG_DIR/backend_${TIMESTAMP}.log"
    tail -n 20 "$LOG_DIR/backend_${TIMESTAMP}.log"
    exit 1
fi

print_status "Backend is running at http://localhost:8000"
print_info "API documentation available at http://localhost:8000/docs"

cd ..

# Start Frontend Service
print_status "Starting Frontend Service..."

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_warning "Creating default .env file for frontend..."
    cat > .env << EOF
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_APP_NAME=Pactoria
VITE_DEBUG_API_CALLS=true
EOF
fi

# Start frontend in background with logging
print_status "Launching frontend on port 5173..."
nohup npm run dev -- --host 0.0.0.0 \
    > "$LOG_DIR/frontend_${TIMESTAMP}.log" 2>&1 &
FRONTEND_PID=$!

print_info "Frontend PID: $FRONTEND_PID"
print_info "Frontend log: $LOG_DIR/frontend_${TIMESTAMP}.log"

# Wait for frontend to start
sleep 5

# Check if frontend started successfully
if ! check_port 5173; then
    print_error "Failed to start frontend! Check logs at $LOG_DIR/frontend_${TIMESTAMP}.log"
    tail -n 20 "$LOG_DIR/frontend_${TIMESTAMP}.log"
    exit 1
fi

cd ..

print_status "Frontend is running at http://localhost:5173"

print_info "======================================"
print_status "All services are running!"
print_info "======================================"
print_info ""
print_info "📱 Frontend: http://localhost:5173"
print_info "🔧 Backend API: http://localhost:8000/api/v1"
print_info "📚 API Docs: http://localhost:8000/docs"
print_info ""
print_info "📁 Logs:"
print_info "  Backend: $LOG_DIR/backend_${TIMESTAMP}.log"
print_info "  Frontend: $LOG_DIR/frontend_${TIMESTAMP}.log"
print_info ""
print_info "Press Ctrl+C to stop all services"
print_info "======================================"

# Function to show logs
show_logs() {
    print_info "Showing last 10 lines of logs..."
    echo ""
    print_info "Backend logs:"
    tail -n 10 "$LOG_DIR/backend_${TIMESTAMP}.log"
    echo ""
    print_info "Frontend logs:"
    tail -n 10 "$LOG_DIR/frontend_${TIMESTAMP}.log"
}

# Monitor services
while true; do
    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend crashed! Restarting..."
        cd backend
        source venv/bin/activate
        nohup python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 \
            > "$LOG_DIR/backend_${TIMESTAMP}.log" 2>&1 &
        BACKEND_PID=$!
        cd ..
        print_status "Backend restarted with PID: $BACKEND_PID"
    fi
    
    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend crashed! Restarting..."
        cd frontend
        nohup npm run dev -- --host 0.0.0.0 \
            > "$LOG_DIR/frontend_${TIMESTAMP}.log" 2>&1 &
        FRONTEND_PID=$!
        cd ..
        print_status "Frontend restarted with PID: $FRONTEND_PID"
    fi
    
    # Sleep for 5 seconds before next check
    sleep 5
done
