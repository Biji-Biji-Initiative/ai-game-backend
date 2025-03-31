#!/bin/bash

# Colors for console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Print header
echo -e "${BOLD}${BLUE}=============================================${NC}"
echo -e "${BOLD}${BLUE} AI Fight Club API - PM2 Deployment Script ${NC}"
echo -e "${BOLD}${BLUE}=============================================${NC}"

# Default environment is development
ENVIRONMENT=${1:-development}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    development|dev)
      ENVIRONMENT="development"
      shift
      ;;
    production|prod)
      ENVIRONMENT="production"
      shift
      ;;
    testing|test)
      ENVIRONMENT="testing"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Set environment-specific variables
case $ENVIRONMENT in
  development)
    PORT=3000
    echo -e "${GREEN}Starting in DEVELOPMENT mode on port $PORT${NC}"
    ;;
  production)
    PORT=9000
    echo -e "${GREEN}Starting in PRODUCTION mode on port $PORT${NC}"
    ;;
  testing)
    PORT=3002
    echo -e "${GREEN}Starting in TESTING mode on port $PORT${NC}"
    ;;
  *)
    echo -e "${RED}Unknown environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Valid options: development, production, testing${NC}"
    exit 1
    ;;
esac

# Ensure .env file exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${YELLOW}Created .env file from template. Please update with actual values.${NC}"
  else
    echo -e "${RED}No .env.example file found. Creating empty .env file.${NC}"
    touch .env
    echo -e "${RED}WARNING: Missing environment variables. App may not function correctly.${NC}"
  fi
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}PM2 not found. Installing PM2...${NC}"
  npm install -g pm2
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install PM2. Please install it manually: npm install -g pm2${NC}"
    exit 1
  fi
fi

# Check if port is already in use
if lsof -i :$PORT -sTCP:LISTEN &> /dev/null; then
  echo -e "${YELLOW}Port $PORT is already in use.${NC}"
  echo -e "${BLUE}Checking what's using port $PORT:${NC}"
  lsof -i :$PORT -sTCP:LISTEN
  
  read -p "Do you want to kill the process using port $PORT? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    pid=$(lsof -i :$PORT -sTCP:LISTEN -t)
    echo -e "${YELLOW}Killing process with PID: $pid${NC}"
    kill -9 $pid
    sleep 2
  else
    echo -e "${RED}Aborting startup. Please free port $PORT and try again.${NC}"
    exit 1
  fi
fi

# Check environment variables
echo -e "${BLUE}Checking environment variables...${NC}"
node --experimental-loader=./src/importResolver.js scripts/check-env.js

# Exit if env check fails (only happens in production/testing)
if [ $? -ne 0 ]; then
  echo -e "${RED}Environment check failed. Please fix the issues above.${NC}"
  exit 1
fi

# Stop any existing instances of our app
echo -e "${BLUE}Stopping any existing instances...${NC}"
pm2 stop ai-fight-club-api 2>/dev/null || true
pm2 delete ai-fight-club-api 2>/dev/null || true

# Start the application with PM2
echo -e "${BLUE}Starting application with PM2 in $ENVIRONMENT mode...${NC}"
pm2 start ecosystem.config.cjs --env $ENVIRONMENT

# Check if application started successfully
if pm2 list | grep "ai-fight-club-api" | grep -q "online"; then
  echo -e "${GREEN}Application started successfully!${NC}"
  # Save PM2 process list to persist across reboots
  pm2 save
  
  # Display running processes
  pm2 list
  
  echo -e "${GREEN}Application is running in $ENVIRONMENT mode on port $PORT${NC}"
  echo -e "${BLUE}View logs with: ${YELLOW}pm2 logs ai-fight-club-api${NC}"
  echo -e "${BLUE}Monitor with: ${YELLOW}pm2 monit${NC}"
  echo -e "${BLUE}Stop with: ${YELLOW}npm run stop${NC}"
  echo -e "${BLUE}Restart with: ${YELLOW}npm run restart${NC}"
else
  echo -e "${RED}Failed to start application. Checking logs...${NC}"
  pm2 logs ai-fight-club-api --lines 20
  exit 1
fi

# Run verification in production mode
if [ "$ENVIRONMENT" = "production" ]; then
  echo -e "${BLUE}Running production verification...${NC}"
  node scripts/verify-server.js --production
  
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Verification failed! The server is running but might have issues.${NC}"
  else
    echo -e "${GREEN}✅ Verification passed! The server is running correctly.${NC}"
  fi
fi 