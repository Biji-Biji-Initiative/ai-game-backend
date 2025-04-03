#!/bin/bash

# Exit on error
set -e

echo "Setting up Codespaces environment..."

# Create environment files from templates if they don't exist
if [ ! -f ".env" ]; then
    echo "Creating root .env file from template..."
    cp .devcontainer/.env.codespaces.template .env
fi

# Handle backend .env
if [ -d "backend" ]; then
    if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
        echo "Creating backend .env file from example..."
        cp backend/.env.example backend/.env
    elif [ ! -f "backend/.env" ]; then
        echo "Creating backend .env file from root template..."
        cp .devcontainer/.env.codespaces.template backend/.env
    fi
    
    echo "Installing backend dependencies..."
    cd backend && npm install
    cd ..
fi

# Handle frontend .env
if [ -d "frontend" ]; then
    if [ ! -f "frontend/.env.local" ] && [ -f "frontend/env.local.template" ]; then
        echo "Creating frontend .env.local file from template..."
        cp frontend/env.local.template frontend/.env.local
    elif [ ! -f "frontend/.env.local" ] && [ ! -f "frontend/.env" ]; then
        echo "Creating frontend .env file..."
        echo "NEXT_PUBLIC_API_URL=http://localhost:3080/api" > frontend/.env.local
    fi
    
    echo "Installing frontend dependencies..."
    cd frontend && npm install
    cd ..
fi

# Handle api-tester-ui .env
if [ -d "api-tester-ui" ]; then
    if [ ! -f "api-tester-ui/.env" ]; then
        echo "Linking api-tester-ui to use root .env file..."
        ln -sf ../.env api-tester-ui/.env
    fi
    
    echo "Installing api-tester-ui dependencies..."
    cd api-tester-ui && npm install
    cd ..
fi

# Handle admin .env
if [ -d "admin" ]; then
    if [ ! -f "admin/.env" ]; then
        echo "Creating admin .env file..."
        cp .devcontainer/.env.codespaces.template admin/.env
    fi
    
    echo "Installing admin dependencies..."
    cd admin && npm install
    cd ..
fi

# Install root dependencies
echo "Installing root dependencies..."
npm install

echo "Setup complete! Your workspace is now ready to use in Codespaces."
echo ""
echo "To run different projects:"
echo "1. Backend: cd backend && npm run dev"
echo "2. Frontend: cd frontend && npm run dev"
echo "3. API Tester UI: cd api-tester-ui && npm start"
if [ -d "admin" ]; then
    echo "4. Admin: cd admin && npm start"
fi

echo ""
echo "Note about environment variables:"
echo "- Check each project's .env file to ensure all required variables are set"
echo "- For security, don't commit actual API keys to GitHub"
echo "- Use Codespaces Secrets for sensitive values: https://docs.github.com/en/codespaces/managing-your-codespaces/managing-secrets-for-your-codespaces" 