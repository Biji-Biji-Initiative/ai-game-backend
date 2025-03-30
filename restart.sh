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
echo -e "${BOLD}${BLUE} AI Fight Club API - Restart Script ${NC}"
echo -e "${BOLD}${BLUE}=============================================${NC}"

# Default environment is the current environment or production
ENVIRONMENT=${1:-$(pm2 describe ai-fight-club-api 2>/dev/null | grep "environment" | awk '{print $2}')}
ENVIRONMENT=${ENVIRONMENT:-production}

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
    echo -e "${GREEN}Restarting in DEVELOPMENT mode on port $PORT${NC}"
    ;;
  production)
    PORT=9000
    echo -e "${GREEN}Restarting in PRODUCTION mode on port $PORT${NC}"
    ;;
  testing)
    PORT=3002
    echo -e "${GREEN}Restarting in TESTING mode on port $PORT${NC}"
    ;;
  *)
    echo -e "${RED}Unknown environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Valid options: development, production, testing${NC}"
    exit 1
    ;;
esac

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo -e "${RED}PM2 is not installed. Cannot restart the application.${NC}"
  exit 1
fi

# Check if the application is running in PM2
if ! pm2 list | grep -q "ai-fight-club-api"; then
  echo -e "${YELLOW}Application is not currently managed by PM2. Starting it...${NC}"
  ./start.sh $ENVIRONMENT
  exit $?
fi

# Restart the application
echo -e "${BLUE}Restarting AI Fight Club API in ${YELLOW}${ENVIRONMENT}${BLUE} mode...${NC}"
pm2 restart ai-fight-club-api --env $ENVIRONMENT

# Set NODE_ENV environment variable for the process
pm2 env ai-fight-club-api NODE_ENV $ENVIRONMENT

# Verify it's running
if pm2 list | grep "ai-fight-club-api" | grep -q "online"; then
  echo -e "${GREEN}Successfully restarted the application!${NC}"
  echo -e "${BLUE}View logs with: ${YELLOW}pm2 logs ai-fight-club-api${NC}"
else
  echo -e "${RED}Failed to restart the application.${NC}"
  echo -e "${YELLOW}Try starting it from scratch:${NC}"
  echo -e "${YELLOW}./start.sh ${ENVIRONMENT}${NC}"
  exit 1
fi 