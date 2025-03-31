#!/bin/bash
set -e

echo "Setting up monorepo with dependency hoisting..."

# Step 1: Clean existing installation
echo "Removing existing node_modules directories and lock files..."
sudo find . -name "node_modules" -type d -prune -exec rm -rf {} \; 2>/dev/null || true
find . -name "package-lock.json" -type f -delete

# Step 2: Configure npm
echo "Configuring npm for dependency hoisting and compatibility..."
echo "hoist=*" > .npmrc
npm config set legacy-peer-deps=true

# Step 3: Install root dependencies first
echo "Installing root dependencies..."
npm install --no-package-lock

# Step 4: Install package dependencies with proper hoisting
echo "Installing package dependencies..."
npm install --workspaces --no-package-lock

# Step 5: Install any specific missing dependencies
echo "Installing commonly missing dependencies..."
npm install opossum dataloader awilix --no-package-lock

# Step 6: Verify the setup
echo "Verifying monorepo setup..."
find packages -name "node_modules" -type d > node_modules_in_packages.txt
if [ -s node_modules_in_packages.txt ]; then
  echo "Warning: node_modules directories found in packages:"
  cat node_modules_in_packages.txt
  echo "These may need to be removed manually."
else
  echo "Success! All dependencies are properly hoisted to the root."
  rm node_modules_in_packages.txt
fi

echo "Monorepo setup complete."
echo "Run 'npm run dev:api' to start the API server."
