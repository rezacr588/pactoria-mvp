#!/bin/bash
# Pactoria MVP - Switch to Production Connection Mode
# Configures local environment to connect to production resources

set -e  # Exit on any error

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "⚠️  PRODUCTION CONNECTION MODE SWITCH"
echo "========================================"
echo "🔴 WARNING: This will configure your LOCAL environment"
echo "🔴          to connect to PRODUCTION resources!"
echo ""
echo "📊 What this does:"
echo "   • Connects local backend to production Azure PostgreSQL"
echo "   • Connects local frontend to production API"
echo "   • All data changes will be REAL and PERMANENT"
echo "   • Intended for data injection, testing, and debugging"
echo ""
echo "🚫 What this is NOT for:"
echo "   • Regular development work"
echo "   • Experimental changes"
echo "   • Learning/training"
echo ""

# Safety confirmation
echo "🔐 Safety Check:"
read -p "   Do you understand the risks? (type 'YES'): " safety_confirm
if [ "$safety_confirm" != "YES" ]; then
    echo "❌ Safety check failed. Setup cancelled."
    exit 1
fi

read -p "   Are you ready to proceed? (type 'PROCEED'): " proceed_confirm
if [ "$proceed_confirm" != "PROCEED" ]; then
    echo "❌ Setup cancelled by user."
    exit 1
fi

echo ""
echo "🔧 Setting up production connection..."

# Check if setup script exists
if [ ! -f "scripts/setup-prod-connection.py" ]; then
    echo "❌ Setup script not found: scripts/setup-prod-connection.py"
    echo "   Please ensure all required files are present."
    exit 1
fi

# Run the Python setup script
echo "🐍 Running credential collection and configuration..."
python3 scripts/setup-prod-connection.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ PRODUCTION CONNECTION ACTIVE"
    echo "========================================"
    echo "🟢 Status: LOCAL → PRODUCTION"
    echo "🟢 Backend: localhost:8000 → Azure PostgreSQL" 
    echo "🟢 Frontend: localhost:5173 → Production API"
    echo ""
    echo "⚠️  CRITICAL REMINDERS:"
    echo "   • All database changes are PERMANENT"
    echo "   • Monitor Azure costs during usage"
    echo "   • Switch back to local when done"
    echo ""
    echo "🚀 Start your application:"
    echo "   1. Backend:  cd backend && python -m app.main"
    echo "   2. Frontend: cd frontend && npm run dev"
    echo ""
    echo "🔄 Return to local development:"
    echo "   ./scripts/switch-to-local.sh"
    echo "========================================"
else
    echo ""
    echo "❌ PRODUCTION CONNECTION SETUP FAILED"
    echo "======================================"
    echo "The setup process encountered errors."
    echo "Your environment remains unchanged."
    echo "Please check the error messages above and try again."
    echo "======================================"
    exit 1
fi