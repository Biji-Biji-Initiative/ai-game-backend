#!/bin/bash

# Ensure the script is executable with: chmod +x run.sh
# Run with: ./run.sh

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Make patch script executable
chmod +x patch-nextjs.js

# Print header
echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}   AI Fight Club Frontend Server   ${NC}"
echo -e "${BLUE}==================================${NC}"

# Check if port 3333 is already in use
if lsof -i:3333 > /dev/null; then
  echo -e "${YELLOW}Warning: Port 3333 is already in use.${NC}"
  echo -e "${YELLOW}Would you like to kill the process using port 3333? (y/n)${NC}"
  read response
  
  if [[ "$response" == "y" || "$response" == "Y" ]]; then
    pid=$(lsof -i:3333 -t)
    echo -e "${YELLOW}Killing process $pid...${NC}"
    kill -9 $pid
    sleep 1
  else
    echo -e "${RED}Please choose a different port in package.json or close the application using port 3333.${NC}"
    exit 1
  fi
fi

# Always clean the Next.js cache to ensure consistent behavior
echo -e "${YELLOW}Cleaning the Next.js cache (.next directory)...${NC}"
rm -rf .next

# Run our comprehensive patch script instead of the inline JavaScript
echo -e "${GREEN}Running Next.js patch utility...${NC}"
node patch-nextjs.js

# Install the polyfill globally
echo -e "${GREEN}Setting up exports/module polyfills...${NC}"
export NODE_OPTIONS='--require ./fix-exports.js'

# Start the Next.js server
echo -e "${GREEN}Starting server on port 3333...${NC}"
echo -e "${GREEN}You can access the application at:${NC}"
echo -e "${BLUE}http://localhost:3333${NC}"
echo -e "${GREEN}Test pages:${NC}"
echo -e "${BLUE}http://localhost:3333/test${NC}"
echo -e "${BLUE}http://localhost:3333/exports-test${NC}"
echo ""

# Start the server
npm run dev 