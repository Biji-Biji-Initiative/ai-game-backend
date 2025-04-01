#!/bin/bash

# Script to convert all JS files to TS in the admin directory

# Create or update tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es2020",
    "module": "es2020",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "allowJs": true,
    "checkJs": false,
    "jsx": "preserve",
    "outDir": "dist",
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": [
    "js/**/*",
    "*.js"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
EOF

# Function to recursively convert JS files to TS
convert_directory() {
  local dir=$1
  
  # Find all .js files in the directory and its subdirectories
  find "$dir" -type f -name "*.js" | while read -r file; do
    # Output the file being converted
    echo "Converting $file to TypeScript..."
    
    # Get the destination typescript file path (change .js to .ts)
    ts_file="${file%.js}.ts"
    
    # Copy the file with the new extension
    cp "$file" "$ts_file"
    
    # Add basic TypeScript conversion to handle common issues
    sed -i '' 's/function \([a-zA-Z0-9_]*\)(\([^)]*\))/function \1(\2): any/g' "$ts_file"
    
    echo "Created $ts_file"
  done
}

# Start conversion with the js directory
convert_directory "js"

# Install TypeScript if not already installed
if ! npm list typescript > /dev/null 2>&1; then
  echo "Installing TypeScript..."
  npm install --save-dev typescript @types/node
fi

echo "Conversion complete. TypeScript files have been created alongside the JavaScript files."
echo "You can now run 'npx tsc --noEmit' to check for TypeScript errors." 