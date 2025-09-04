#!/bin/bash
# Pactoria MVP - Switch to Local Development Mode
# Safely switches from production connection back to local SQLite

set -e  # Exit on any error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔄 Switching to LOCAL development mode..."
echo "================================================"

# Function to restore file with backup
restore_file() {
    local file_path="$1"
    local backup_path="$2"
    local default_content="$3"
    local description="$4"
    
    if [ -f "$backup_path" ]; then
        cp "$backup_path" "$file_path"
        echo "   ✅ Restored $description from backup"
    elif [ ! -z "$default_content" ]; then
        echo "$default_content" > "$file_path"
        echo "   ✅ Created default $description"
    else
        echo "   ⚠️  No backup found for $description"
    fi
}

# Restore backend environment
echo "🔧 Restoring backend environment..."
restore_file ".env" ".env.backup" "DATABASE_URL=sqlite:///./pactoria_mvp.db
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=local-dev-secret-key-not-for-production-use
JWT_SECRET_KEY=local-dev-jwt-secret-key-not-for-production-use
GROQ_API_KEY=
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
PORT=8000
LOG_LEVEL=DEBUG" "backend environment"

# Restore frontend environment
echo "🎨 Restoring frontend environment..."
cd frontend
restore_file ".env.local" ".env.local.backup" "VITE_API_URL=http://localhost:8000/api/v1
VITE_ENVIRONMENT=development
VITE_APP_NAME=Pactoria MVP
VITE_DEBUG_API_CALLS=true
VITE_ENABLE_AI_FEATURES=true" "frontend environment"
cd ..

echo ""
echo "✅ Successfully switched to LOCAL development mode"
echo "================================================"
echo "🔧 Configuration:"
echo "   • Backend: localhost:8000 (SQLite database)"
echo "   • Frontend: localhost:5173"
echo "   • Database: Local SQLite file"
echo "   • All data: Local only"
echo ""
echo "🚀 To start development:"
echo "   1. Backend:  cd backend && python -m app.main"
echo "   2. Frontend: cd frontend && npm run dev"
echo ""
echo "🔄 To switch back to production connection:"
echo "   ./scripts/switch-to-prod.sh"
echo "================================================"