#!/bin/bash

# Pactoria MVP Service Installer
# Quick setup script for macOS background services

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  Pactoria MVP Service Installer${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Error: This installer is for macOS only${NC}"
    exit 1
fi

# Set up paths
SERVICES_DIR="/Users/rezazeraat/Desktop/Pactoria-MVP/services"
PACTORIA_SERVICE="$SERVICES_DIR/pactoria-service"

# Make scripts executable
echo -e "${BLUE}Setting up executable permissions...${NC}"
chmod +x "$SERVICES_DIR/backend-start.sh"
chmod +x "$SERVICES_DIR/frontend-start.sh"
chmod +x "$PACTORIA_SERVICE"

# Create logs directory
echo -e "${BLUE}Creating logs directory...${NC}"
mkdir -p "$SERVICES_DIR/logs"

# Add pactoria-service to PATH
echo -e "${BLUE}Setting up command line access...${NC}"

# Create local bin directory if it doesn't exist
LOCAL_BIN="$HOME/.local/bin"
if [ ! -d "$LOCAL_BIN" ]; then
    echo -e "${BLUE}Creating local bin directory...${NC}"
    mkdir -p "$LOCAL_BIN"
fi

# Create symlink for easy access
if [ -L "$LOCAL_BIN/pactoria-service" ]; then
    echo -e "${YELLOW}Removing existing symlink...${NC}"
    rm "$LOCAL_BIN/pactoria-service"
fi

echo -e "${BLUE}Creating symlink for pactoria-service command...${NC}"
ln -sf "$PACTORIA_SERVICE" "$LOCAL_BIN/pactoria-service"

# Check if local bin is in PATH
if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
    echo -e "${YELLOW}Adding $LOCAL_BIN to PATH...${NC}"
    
    # Add to shell config files
    for config in ~/.bash_profile ~/.bashrc ~/.zshrc; do
        if [ -f "$config" ]; then
            if ! grep -q "export PATH=\"\$HOME/.local/bin:\$PATH\"" "$config"; then
                echo "" >> "$config"
                echo "# Added by Pactoria service installer" >> "$config"
                echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$config"
                echo -e "${GREEN}✓ Updated $config${NC}"
            fi
        fi
    done
    
    echo -e "${YELLOW}Note: Restart your terminal or run: export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
fi

# Check if Python virtual environment exists
if [ ! -d "/Users/rezazeraat/Desktop/Pactoria-MVP/backend/venv" ]; then
    echo -e "${YELLOW}Warning: Python virtual environment not found${NC}"
    echo -e "${YELLOW}You may need to create it with: python -m venv venv${NC}"
fi

# Check if node_modules exists
if [ ! -d "/Users/rezazeraat/Desktop/Pactoria-MVP/frontend/node_modules" ]; then
    echo -e "${YELLOW}Frontend dependencies not installed. Installing...${NC}"
    cd /Users/rezazeraat/Desktop/Pactoria-MVP/frontend
    npm install
    cd - > /dev/null
fi

echo ""
echo -e "${GREEN}✓ Installation preparation complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1. Install the services (will start on login):"
echo -e "   ${GREEN}pactoria-service install${NC}"
echo ""
echo "2. Start the services now:"
echo -e "   ${GREEN}pactoria-service start${NC}"
echo ""
echo "3. Check service status:"
echo -e "   ${GREEN}pactoria-service status${NC}"
echo ""
echo "4. View help for all commands:"
echo -e "   ${GREEN}pactoria-service help${NC}"
echo ""
echo -e "${BLUE}Service URLs when running:${NC}"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""
echo -e "${YELLOW}Note: Services will automatically start on system login once installed.${NC}"