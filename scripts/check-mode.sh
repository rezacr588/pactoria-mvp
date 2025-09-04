#!/bin/bash
# Pactoria MVP - Check Current Environment Mode
# Displays current configuration and connection status

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 Pactoria MVP - Environment Mode Check"
echo "========================================"

# Check backend environment
echo "🔧 Backend Configuration:"
if [ -f ".env" ]; then
    if grep -q "postgresql://" ".env" 2>/dev/null; then
        echo "   📊 Database: PostgreSQL (Production)"
        
        # Extract database host for display
        DB_HOST=$(grep "DATABASE_URL" .env 2>/dev/null | sed -n 's/.*@\([^:/]*\).*/\1/p' || echo "Unknown")
        echo "   🌐 Host: $DB_HOST"
        
        # Check for production mode indicators
        if grep -q "LOCAL_TO_PROD_MODE=true" ".env" 2>/dev/null; then
            echo "   🔴 Mode: LOCAL → PRODUCTION"
            echo "   ⚠️  WARNING: Connected to production resources!"
        else
            echo "   🟡 Mode: PostgreSQL (Type Unknown)"
        fi
    elif grep -q "sqlite://" ".env" 2>/dev/null; then
        echo "   📊 Database: SQLite (Local)"
        echo "   🟢 Mode: LOCAL DEVELOPMENT"
    else
        echo "   📊 Database: Unknown"
        echo "   ❓ Mode: Cannot determine"
    fi
    
    # Check debug mode
    if grep -q "DEBUG=true" ".env" 2>/dev/null; then
        echo "   🐛 Debug: Enabled"
    else
        echo "   🐛 Debug: Disabled"
    fi
else
    echo "   ❌ No .env file found"
fi

echo ""
echo "🎨 Frontend Configuration:"
if [ -f "frontend/.env.local" ]; then
    API_URL=$(grep "VITE_API_URL" frontend/.env.local 2>/dev/null | cut -d'=' -f2 || echo "Not found")
    
    if echo "$API_URL" | grep -q "localhost" 2>/dev/null; then
        echo "   🌐 API: $API_URL (Local)"
        echo "   🟢 Mode: LOCAL DEVELOPMENT"
    elif echo "$API_URL" | grep -q "azurecontainerapps" 2>/dev/null; then
        echo "   🌐 API: Production Azure Container App"
        echo "   🔴 Mode: LOCAL → PRODUCTION API"
    else
        echo "   🌐 API: $API_URL"
        echo "   ❓ Mode: Unknown"
    fi
    
    # Check for production warnings
    if grep -q "VITE_SHOW_PROD_WARNING=true" "frontend/.env.local" 2>/dev/null; then
        echo "   ⚠️  Production warnings: Enabled"
    fi
else
    echo "   ❌ No frontend/.env.local file found"
fi

echo ""
echo "📋 Current Status Summary:"
echo "=========================="

# Determine overall mode
backend_mode="unknown"
frontend_mode="unknown"

if [ -f ".env" ] && grep -q "sqlite://" ".env" 2>/dev/null; then
    backend_mode="local"
elif [ -f ".env" ] && grep -q "postgresql://" ".env" 2>/dev/null; then
    backend_mode="production"
fi

if [ -f "frontend/.env.local" ]; then
    if grep "VITE_API_URL" "frontend/.env.local" 2>/dev/null | grep -q "localhost"; then
        frontend_mode="local"
    elif grep "VITE_API_URL" "frontend/.env.local" 2>/dev/null | grep -q "azure"; then
        frontend_mode="production"
    fi
fi

if [ "$backend_mode" = "local" ] && [ "$frontend_mode" = "local" ]; then
    echo "🟢 Overall Mode: FULL LOCAL DEVELOPMENT"
    echo "   • Safe for development and experimentation"
    echo "   • All data is local and temporary"
elif [ "$backend_mode" = "production" ] || [ "$frontend_mode" = "production" ]; then
    echo "🔴 Overall Mode: PRODUCTION CONNECTION ACTIVE"
    echo "   • ⚠️  CAUTION: Some or all components connect to production"
    echo "   • All changes may affect live data"
    echo "   • Use only for data injection, testing, or debugging"
else
    echo "❓ Overall Mode: UNCLEAR/MIXED CONFIGURATION"
    echo "   • Check your environment files"
fi

echo ""
echo "🔄 Mode Switching:"
echo "=================="
echo "• Switch to local:     ./scripts/switch-to-local.sh"
echo "• Switch to production: ./scripts/switch-to-prod.sh"
echo "• Check mode:          ./scripts/check-mode.sh"

echo ""
echo "========================================"