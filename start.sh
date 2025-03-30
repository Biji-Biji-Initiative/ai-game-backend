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
echo -e "${BOLD}${BLUE} AI Fight Club API - Startup Script ${NC}"
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

# Check if we have a .env file
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${YELLOW}Please update the .env file with your actual environment variables.${NC}"
  else
    echo -e "${RED}No .env.example file found. Cannot create .env file.${NC}"
    exit 1
  fi
fi

# Verify required env variables
echo -e "${BLUE}Checking environment variables...${NC}"
required_vars=("SUPABASE_URL" "SUPABASE_KEY" "SUPABASE_SERVICE_ROLE_KEY")
missing_vars=false

for var in "${required_vars[@]}"; do
  if ! grep -q "$var=" .env; then
    echo -e "${RED}Missing required environment variable: $var${NC}"
    missing_vars=true
  fi
done

if [ "$missing_vars" = true ]; then
  echo -e "${RED}Please add the missing environment variables to your .env file.${NC}"
  exit 1
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
  
  # Ask if we should kill the process
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

# Stop any existing instances
echo -e "${BLUE}Stopping any existing instances...${NC}"
pm2 stop ai-fight-club-api 2>/dev/null || true
pm2 delete ai-fight-club-api 2>/dev/null || true

# Set NODE_ENV environment variable
export NODE_ENV=$ENVIRONMENT
export PORT=$PORT

# Test the database connection
echo "Testing database connection..."
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
supabase.from('users').select('count').then(result => {
  if (result.error) {
    console.error('Database connection error:', result.error);
    process.exit(1);
  }
  console.log('Database connection successful!');
  process.exit(0);
}).catch(err => {
  console.error('Supabase connection error:', err);
  process.exit(1);
});
"

# Check if database test was successful
if [ $? -ne 0 ]; then
  echo "Database connection failed. Please check your SUPABASE_URL and SUPABASE_KEY in .env"
  exit 1
fi

# Start the application with PM2
echo -e "${BLUE}Starting application in $ENVIRONMENT mode on port $PORT...${NC}"
pm2 start ecosystem.config.cjs --env $ENVIRONMENT

# Check if application started successfully
if pm2 list | grep "ai-fight-club-api" | grep -q "online"; then
  echo -e "${GREEN}Application started successfully!${NC}"
else
  echo -e "${RED}Failed to start application. Check logs for details.${NC}"
  pm2 logs ai-fight-club-api --lines 20
  exit 1
fi

# Save PM2 process list
pm2 save

# Display running processes
pm2 list

echo -e "${GREEN}Application started in $ENVIRONMENT mode on port $PORT${NC}"
echo -e "${BLUE}View logs with: ${YELLOW}pm2 logs ai-fight-club-api${NC}"
echo -e "${BLUE}Monitor with: ${YELLOW}pm2 monit${NC}"
echo -e "${BLUE}Stop with: ${YELLOW}npm run stop${NC}"
echo -e "${BLUE}Restart with: ${YELLOW}npm run restart${NC}"

# Run verification if we're in production mode
if [ "$ENVIRONMENT" = "production" ]; then
  echo -e "${BLUE}Running production verification...${NC}"
  node scripts/verify-server.js --production
  
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Verification failed! The server is running but might have issues.${NC}"
  else
    echo -e "${GREEN}✅ Verification passed! The server is running correctly.${NC}"
  fi
fi 