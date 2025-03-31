#!/bin/bash
set -e

echo "Removing all node_modules directories..."
sudo find . -name "node_modules" -type d -prune -exec rm -rf {} \; 2>/dev/null || true

echo "Removing package-lock.json files..."
find . -name "package-lock.json" -type f -delete

echo "Creating .npmrc with hoisting enabled..."
echo "hoist=*" > .npmrc

echo "Installing dependencies with hoisting enabled..."
npm install

echo "Completed! Your dependencies are now hoisted to the root node_modules."
