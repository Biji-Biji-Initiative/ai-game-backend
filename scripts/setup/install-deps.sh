#!/bin/bash
# Script to install specific CLI dependencies if needed

echo "Checking and installing necessary CLI dependencies..."

# Example: Install Supabase CLI if not present
if ! command -v supabase &> /dev/null
then
    echo "Supabase CLI not found. Installing globally..."
    npm install -g supabase
    if [ $? -ne 0 ]; then
        echo "Failed to install Supabase CLI. Please install it manually."
        exit 1
    fi
else
    echo "Supabase CLI already installed."
fi

# Example: Install chalk if used by scripts and not a dev dependency
if ! npm list chalk &> /dev/null
then
    echo "Installing chalk for script utilities..."
    npm install chalk --save-dev
fi

# Add other checks/installations as needed

echo "Dependency check complete."
