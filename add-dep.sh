#!/bin/bash
set -e

# Helper script to add dependencies to the root node_modules without adding to individual packages

if [ $# -eq 0 ]; then
  echo "Usage: ./add-dep.sh [--dev] package1 package2 ..."
  echo "Example: ./add-dep.sh express axios"
  echo "Example with dev dependencies: ./add-dep.sh --dev jest chai"
  exit 1
fi

DEV_FLAG=""
if [ "$1" == "--dev" ]; then
  DEV_FLAG="--save-dev"
  shift
fi

echo "Installing dependencies at the root level..."

# Install packages
npm install $DEV_FLAG --no-workspace $@

# Verify no packages have node_modules
if [ -n "$(find packages -name 'node_modules' -type d)" ]; then
  echo "⚠️ Warning: node_modules found in packages directory after installation!"
  echo "This breaks dependency hoisting. You might need to run ./setup-monorepo.sh"
  echo "Found in:"
  find packages -name 'node_modules' -type d
fi

echo "✅ Dependencies added successfully!"
