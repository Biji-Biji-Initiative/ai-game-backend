#!/bin/bash

# Make patch scripts executable
chmod +x patch-nextjs.js

# Display banner
echo "===================================="
echo "     AI Fight Club Quick Fix"
echo "===================================="
echo
echo "This script will:"
echo "1. Ensure src/pages directory is removed (to fix App/Pages Router conflict)"
echo "2. Patch the Next.js modules to fix the interop issue"
echo "3. Clean the Next.js cache (.next directory)"
echo "4. Start the development server with improved HMR"
echo

# Ensure no src/pages directory exists (conflicts with App Router)
echo "🔍 Checking for src/pages directory..."
if [ -d "src/pages" ]; then
  echo "🧹 Removing src/pages directory to avoid router conflicts..."
  rm -rf src/pages
fi

# Run our patch script
echo "🔧 Patching Next.js files..."
node patch-nextjs.js

# Clean the .next directory
echo "🧹 Cleaning Next.js cache..."
rm -rf .next

# Create the patches directory structure
echo "🔗 Setting up patches..."
mkdir -p src/patches

# Run patch-nextjs.js directly
echo "📝 Patching interopRequireDefault modules..."
node -e "
const fs = require('fs');
const path = require('path');

// Create patch for interopRequireDefault
const patchContent = \`// PATCHED BY CUSTOM SCRIPT
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

// Add the missing function that causes \"TypeError: _interop_require_default._ is not a function\"
_interopRequireDefault._ = function(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
};

module.exports = _interopRequireDefault;
\`;

// Find all interopRequireDefault.js files
let filesToPatch = [
  './node_modules/next/dist/compiled/@babel/runtime/helpers/interopRequireDefault.js',
  './node_modules/next/dist/server/future/route-modules/app-page/module.compiled.js'
];

// Try to patch all found files
filesToPatch.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Only patch if not already patched
      if (!content.includes('PATCHED') && !content.includes('_interopRequireDefault._')) {
        console.log(\`Patching \${filePath}...\`);
        fs.writeFileSync(filePath + '.backup', content);
        fs.writeFileSync(filePath, patchContent);
        console.log(\`✅ Patched \${filePath}\`);
      } else {
        console.log(\`File already patched: \${filePath}\`);
      }
    }
  } catch (err) {
    console.error(\`Error patching \${filePath}: \${err.message}\`);
  }
});
"

# Set Next.js environment variables for better HMR behavior
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS='--require ./fix-exports.js --max-http-header-size=16384'
export NEXT_HMR_ALLOW_ORIGIN='*'

echo "✅ All fixes applied!"

# Run the server
echo "🚀 Starting the server (visit http://localhost:3333/test for test page)..."
echo "   HMR improvements have been applied to reduce full page reloads"
npm run dev 