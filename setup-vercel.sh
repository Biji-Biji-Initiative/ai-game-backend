#!/bin/bash

# Exit on error
set -e

echo "Setting up Vercel deployment for all projects..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Login to Vercel if not already logged in
vercel whoami &> /dev/null || vercel login

# Function to deploy a project
deploy_project() {
    local project_dir=$1
    local project_name=$2
    
    echo "Setting up $project_name..."
    cd $project_dir
    
    # Create or link project
    echo "Initializing Vercel project for $project_name..."
    vercel --confirm
    
    echo "$project_name setup complete!"
    cd ..
}

# Deploy backend
deploy_project "backend" "API Backend"

# Get the production URL of the backend
BACKEND_URL=$(cd backend && vercel ls --production | grep -o 'https://[^ ]*' | head -1)
echo "Backend deployed at: $BACKEND_URL"

# Update frontend and admin vercel.json with the backend URL
if [ ! -z "$BACKEND_URL" ]; then
    echo "Updating frontend and admin configuration to use backend URL: $BACKEND_URL"
    
    # Update frontend vercel.json
    sed -i.bak "s|https://api.\${VERCEL_URL}/api|$BACKEND_URL/api|g" frontend/vercel.json
    
    # Update admin vercel.json
    sed -i.bak "s|https://api.\${VERCEL_URL}/api|$BACKEND_URL/api|g" admin/vercel.json
    
    # Update api-tester-ui vercel.json
    sed -i.bak "s|https://api.\${VERCEL_URL}/api|$BACKEND_URL/api|g" api-tester-ui/vercel.json
    
    # Cleanup backup files
    rm -f frontend/vercel.json.bak admin/vercel.json.bak api-tester-ui/vercel.json.bak
fi

# Deploy frontend
deploy_project "frontend" "Frontend App"

# Deploy admin
deploy_project "admin" "Admin Dashboard"

# Deploy api-tester-ui
deploy_project "api-tester-ui" "API Tester UI"

echo "All projects have been set up for Vercel deployment!"
echo "Next steps:"
echo "1. Configure custom domains in the Vercel dashboard"
echo "2. Set up environment variables for each project"
echo "3. Ensure proper CORS configuration in the backend"
echo ""
echo "For more information, see VERCEL-DEPLOYMENT.md" 