#!/bin/bash
# Set up PM2 with proper environment

echo "🚀 Setting up PM2 environment for AI Fight Club"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create logs directory
mkdir -p logs
echo "📁 Created logs directory"

# Create .env files if they don't exist
if [ ! -f packages/api/.env ]; then
  cp packages/api/.env.example packages/api/.env
  echo "📄 Created API .env file from example"
fi

# Build packages
echo "🔨 Building packages..."
pnpm build

# Stop any running PM2 processes
echo "🛑 Stopping any running PM2 processes..."
npx pm2 stop all 2>/dev/null || true

# Clear PM2 saved state
echo "🧹 Clearing PM2 saved state..."
npx pm2 cleardump 2>/dev/null || true

# Save PM2 processes
echo "💾 Saving PM2 processes..."
npx pm2 save

# Setup PM2 startup
echo "🔄 Setting up PM2 startup..."
npx pm2 startup

# Start PM2 development environment
echo "🚀 Starting development environment..."
pnpm dev

# Show status
echo "📊 Current status:"
npx pm2 ls

echo ""
echo "✅ PM2 setup complete!"
echo ""
echo "📝 PM2 Commands Quick Reference:"
echo " - pnpm dev       : Start development environment"
echo " - pnpm start     : Start production environment"
echo " - pnpm stop      : Stop all processes"
echo " - pnpm status    : Show process status"
echo " - pnpm logs      : Show logs"
echo " - pnpm monitor   : Open PM2 monitoring dashboard"
echo " - pnpm restart   : Restart all processes"
echo ""
echo "📊 Access your applications at:"
echo " - API:       http://localhost:3002/api/v1"
echo " - API Docs:  http://localhost:3002/api-docs"
echo " - UI Tester: http://localhost:5173"
echo ""
