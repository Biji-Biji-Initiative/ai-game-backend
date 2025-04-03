#!/bin/bash

# Script to reliably start the server from any directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/backend"

echo "Starting server from backend directory: $(pwd)"
echo "Using PORT=3081"

# Always use the correct port and run from the backend directory
PORT=3081 npm run start 