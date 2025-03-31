#!/bin/bash

# Stop any running PM2 processes
echo "Stopping any running PM2 processes..."
pm2 stop all
pm2 delete all

# Run the development server
echo "Starting development server..."
node --experimental-loader=./src/importResolver.js dev.js

# This script will exit when the development server is stopped with Ctrl+C 