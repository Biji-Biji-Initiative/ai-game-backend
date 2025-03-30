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
echo -e "${BOLD}${BLUE} AI Fight Club API - Stop Script ${NC}"
echo -e "${BOLD}${BLUE}=============================================${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo -e "${RED}PM2 is not installed. Cannot stop the application.${NC}"
  exit 1
fi

# Check if the application is running
if ! pm2 list | grep -q "ai-fight-club-api"; then
  echo -e "${YELLOW}No running instance of AI Fight Club API found.${NC}"
  exit 0
fi

# Stop the application
echo -e "${BLUE}Stopping AI Fight Club API...${NC}"
pm2 stop ai-fight-club-api

# Verify it's stopped
if pm2 list | grep "ai-fight-club-api" | grep -q "stopped"; then
  echo -e "${GREEN}Successfully stopped the application!${NC}"
  
  # Ask if we should delete the process
  read -p "Do you want to remove the process from PM2? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 delete ai-fight-club-api
    echo -e "${GREEN}Process removed from PM2.${NC}"
  else
    echo -e "${BLUE}Process kept in PM2. It can be restarted later.${NC}"
  fi
else
  echo -e "${RED}Failed to stop the application.${NC}"
  exit 1
fi 