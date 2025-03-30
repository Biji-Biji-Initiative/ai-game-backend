#!/bin/bash
echo "Stopping all PM2 processes..."
pm2 stop all
pm2 delete all
pm2 kill

echo "Checking for processes using port 3000..."
PORT_PIDS=$(lsof -ti:3000)
if [ -n "$PORT_PIDS" ]; then
  echo "Killing processes using port 3000: $PORT_PIDS"
  kill -9 $PORT_PIDS
fi

echo "Waiting for port to be released..."
sleep 2
if lsof -ti:3000 > /dev/null; then
  echo "Port 3000 is still in use. Please check manually."
  exit 1
fi
echo "Port 3000 is free. Ready to start application."
