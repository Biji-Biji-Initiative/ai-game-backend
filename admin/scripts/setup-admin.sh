#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  API Admin UI Setup and Installation${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Default configuration
DEFAULT_PORT=8080
DEFAULT_API_PORT=3000

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Change to admin directory
echo -e "${BLUE}> Navigating to admin directory...${NC}"
cd admin || { 
    echo -e "${RED}Error: admin directory not found. Please run this script from the project root.${NC}"
    exit 1
}

# Install dependencies
echo -e "${BLUE}> Installing dependencies...${NC}"
npm install || {
    echo -e "${RED}Error: Failed to install dependencies.${NC}"
    exit 1
}

# Build frontend assets
echo -e "${BLUE}> Building frontend assets...${NC}"
npm run build || {
    echo -e "${RED}Error: Failed to build frontend assets.${NC}"
    exit 1
}

# Prompt for port configuration
read -p "Enter port for Admin UI [default: $DEFAULT_PORT]: " PORT
PORT=${PORT:-$DEFAULT_PORT}

read -p "Enter port for API server [default: $DEFAULT_API_PORT]: " API_PORT
API_PORT=${API_PORT:-$DEFAULT_API_PORT}

# Create .env file with configuration
echo -e "${BLUE}> Creating environment configuration...${NC}"
cat > .env << EOF
PORT=$PORT
API_HOST=localhost
API_PORT=$API_PORT
NODE_ENV=development
EOF

echo -e "${GREEN}✓ Installation complete!${NC}"
echo -e "${GREEN}✓ Configuration saved to admin/.env${NC}"
echo ""
echo -e "${BLUE}To start the Admin UI in development mode:${NC}"
echo -e "  cd admin && npm run start:dev"
echo ""
echo -e "${BLUE}To start the Admin UI in production mode:${NC}"
echo -e "  cd admin && npm start"
echo ""
echo -e "${BLUE}The Admin UI will be available at:${NC} http://localhost:$PORT"
echo -e "${BLUE}API requests will be proxied to:${NC} http://localhost:$API_PORT"
echo ""

# Ask if user wants to start the UI now
read -p "Do you want to start the Admin UI now? (y/n): " START_NOW
if [[ $START_NOW =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}> Starting Admin UI in development mode...${NC}"
    npm run start:dev
fi

exit 0 