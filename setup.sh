#!/bin/bash
# AI Fight Club Monorepo Setup Script

set -e

# Initialize with colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}     AI Fight Club Monorepo Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ $NODE_MAJOR -lt 18 ]; then
  echo -e "${RED}❌ Node.js 18+ is required (found v${NODE_VERSION})${NC}"
  echo "Please install a compatible version using nvm or your preferred method."
  exit 1
else
  echo -e "${GREEN}✅ Node.js v${NODE_VERSION} detected${NC}"
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}❌ pnpm is not installed.${NC}"
  read -p "Do you want to install pnpm now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm install -g pnpm
  else
    echo "Please install pnpm: npm install -g pnpm"
    exit 1
  fi
else
  echo -e "${GREEN}✅ pnpm detected${NC}"
fi

# Clean up
echo -e "\n${YELLOW}Cleaning up existing installation...${NC}"
./cleanup-monorepo.sh

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
pnpm install

# Set up environment variables
if [ ! -f .env ]; then
  echo -e "\n${YELLOW}Creating .env file from example...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✅ Created .env file - please update with your actual values${NC}"
else
  echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Running validation
echo -e "\n${YELLOW}Validating dependencies...${NC}"
./validate-deps.sh

# Start the API in development mode
echo -e "\n${GREEN}Setup completed successfully!${NC}"
echo -e "To start the API server run: ${YELLOW}pnpm dev:api${NC}"
echo -e "To start the UI tester run: ${YELLOW}pnpm dev:ui-tester${NC}"
