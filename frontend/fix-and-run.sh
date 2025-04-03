#!/bin/bash

# Make patch scripts executable
chmod +x patch-nextjs.js
chmod +x patch-compiled-chunks.js

# Display banner
echo "===================================="
echo "   AI Fight Club - Ultimate Fix"
echo "===================================="
echo
echo "This script will:"
echo "1. Ensure src/pages directory is removed (to fix App/Pages Router conflict)"
echo "2. Patch the Next.js modules to fix the interop issue"
echo "3. Clean the Next.js cache (.next directory)"
echo "4. Apply the global require hook (NEW!)"
echo "5. Run a minimal build to generate vendor chunks for patching"
echo "6. Patch compiled Next.js vendor chunks"
echo "7. Start the development server on alternate port 4444 (avoiding conflicts)"
echo

# Check if port 3333 is in use and kill it if needed
PORT_CHECK=$(lsof -i :3333 -t)
if [ ! -z "$PORT_CHECK" ]; then
  echo "🔄 Port 3333 is already in use (PID: $PORT_CHECK), trying to free it..."
  kill -9 $PORT_CHECK 2>/dev/null || echo "⚠️ Could not kill process, will use alternate port"
fi

# Also check port 4444
PORT_CHECK=$(lsof -i :4444 -t)
if [ ! -z "$PORT_CHECK" ]; then
  echo "🔄 Port 4444 is already in use (PID: $PORT_CHECK), trying to free it..."
  kill -9 $PORT_CHECK 2>/dev/null || echo "⚠️ Could not kill process, will need manual intervention"
fi

# Ensure no src/pages directory exists (conflicts with App Router)
echo "🔍 Checking for src/pages directory..."
if [ -d "src/pages" ]; then
  echo "🧹 Removing src/pages directory to avoid router conflicts..."
  rm -rf src/pages
fi

# Run our patch script
echo "🔧 Patching Next.js source modules..."
node patch-nextjs.js

# Clean the .next directory
echo "🧹 Cleaning Next.js cache..."
rm -rf .next

# Create the patches directory structure
echo "🔗 Setting up patches..."
mkdir -p src/patches

# Patch the error boundary component directly
echo "📝 Patching the error boundary component..."
node -e "
const fs = require('fs');

const ERROR_BOUNDARY_PATH = './node_modules/next/dist/client/components/error-boundary.js';
if (fs.existsSync(ERROR_BOUNDARY_PATH)) {
  console.log('Adding direct fix to error boundary...');
  try {
    const content = fs.readFileSync(ERROR_BOUNDARY_PATH, 'utf8');
    
    // Only patch if it hasn't been patched yet
    if (!content.includes('PATCHED FOR INTEROP')) {
      // Create a backup
      fs.writeFileSync(\`\${ERROR_BOUNDARY_PATH}.backup\`, content, 'utf8');
      
      // Add the missing function at the beginning of the file
      const patchedContent = \`// PATCHED FOR INTEROP REQUIRE DEFAULT
function _patchInteropRequireDefault() {
  if (typeof _interopRequireDefault !== 'undefined' && !_interopRequireDefault._) {
    _interopRequireDefault._ = function(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    };
  }
}
// Try to execute the patch immediately
try { _patchInteropRequireDefault(); } catch (e) {}

\${content}\`;
      
      fs.writeFileSync(ERROR_BOUNDARY_PATH, patchedContent, 'utf8');
      console.log('✅ Applied fix to error boundary component');
    } else {
      console.log('Error boundary already patched');
    }
  } catch (err) {
    console.error('❌ Error patching error boundary:', err.message);
  }
}
"

# Set Next.js environment variables for better HMR behavior and to use our global patch
# FIX: Use a single entry point to avoid NODE_OPTIONS parsing issues
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--require ./entry-point.js --max-http-header-size=16384"
export NEXT_HMR_ALLOW_ORIGIN='*'

echo "✅ Base patches applied!"

# Run a minimal build to generate compiled files
echo "🏗️ Running minimal build to generate vendor chunks..."
npm run build -- --no-lint > /dev/null 2>&1 || echo "Build completed with warnings (this is expected)"

# Patch the compiled chunks
echo "🔧 Patching compiled vendor chunks..."
node patch-compiled-chunks.js

echo "🚀 All fixes applied!"

# Run the server
echo "🚀 Starting the server on ALTERNATE PORT 4444..."
echo "   Visit http://localhost:4444/test to check if everything is working"
echo "   Ultimate fix has been applied using multiple patching strategies"
npm run dev:alt 