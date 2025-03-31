#!/bin/bash
# Clean up monorepo structure

echo "🧹 Cleaning up monorepo..."

# Remove all node_modules folders in packages
echo "Removing node_modules folders from packages..."
find packages -name "node_modules" -type d -exec rm -rf {} \; 2>/dev/null || true

# Clean pnpm store cache if requested
if [[ "$1" == "--deep" ]]; then
  echo "Deep cleaning - clearing pnpm store cache..."
  pnpm store prune
fi

# Remove all build artifacts
echo "Removing build artifacts..."
find packages -name "dist" -type d -exec rm -rf {} \; 2>/dev/null || true
find packages -name "build" -type d -exec rm -rf {} \; 2>/dev/null || true
find packages -name ".next" -type d -exec rm -rf {} \; 2>/dev/null || true

# Remove all log files
echo "Removing log files..."
find . -name "*.log" -type f -delete

# Fresh install
echo "Running fresh pnpm install..."
pnpm install

echo "✅ Monorepo cleaned successfully!"
