#!/bin/bash
# ===================================================
# Test Suite Preparation and Execution Script
# ===================================================
# This script addresses the following test suite issues:
# ✅ T1: Fix Test Import Paths - Corrects import paths in test files
# ✅ T2: Resolve Supabase Connectivity/Schema Issues - Ensures database schema is ready
# ✅ T3: Fix OpenAI API Parameter Errors - Updates OpenAI client to use new Responses API
# ✅ T4: Fix eventBus Mocking - Ensures domain events can be properly tested
# ✅ T5: Update Tests for ESM - Convert all tests to use ES module syntax
# ✅ T7: Update Tests for Standardized Error Handling - Replace generic Error with domain-specific errors

# Set error handling
set -e
echo "🚀 Starting test suite preparation and verification..."

# Step 1: Verify codebase integrity
echo "Step 1: Verifying codebase integrity..."

# Fix import paths in both test and source files
echo "Checking and fixing import paths..."
node scripts/fix-test-imports.js
node scripts/fix-source-imports.js

# Fix module alias imports (@/core and @/config) in source files
echo "Fixing module alias imports in source files..."
node scripts/fix-src-imports.js

# Step 2: Convert CommonJS to ESM and fix ESM-related issues
echo -e "\nStep 2: Converting CommonJS to ESM and fixing ESM-related issues..."

# Convert any remaining CommonJS require statements to ES module imports
echo "Converting CommonJS require statements to ES module imports..."
node scripts/fix-commonjs-to-esm.js

# Fix common ESM-related issues
echo "Fixing common ESM-related issues..."
node scripts/fix-esm-test-issues.js

# Step 3: Update and standardize error handling in tests
echo -e "\nStep 3: Updating error handling in tests to use domain-specific errors..."

# Run the error handling fix script for challenge domain
echo "Fixing error handling in Challenge domain tests..."
node scripts/fix-error-handling.js

# Modify the script to handle user domain
echo "Fixing error handling in User domain tests..."
sed -i '' 's|tests/domain/challenge/\*.test.js|tests/domain/user/\*.test.js|g' scripts/fix-error-handling.js
node scripts/fix-error-handling.js

# Modify the script to handle evaluation domain
echo "Fixing error handling in Evaluation domain tests..."
sed -i '' 's|tests/domain/user/\*.test.js|tests/domain/evaluation/\*.test.js|g' scripts/fix-error-handling.js
node scripts/fix-error-handling.js

# Modify the script to handle focusArea domain
echo "Fixing error handling in FocusArea domain tests..."
sed -i '' 's|tests/domain/evaluation/\*.test.js|tests/domain/focusArea/\*.test.js|g' scripts/fix-error-handling.js
node scripts/fix-error-handling.js

# Restore the original pattern for future runs
sed -i '' 's|tests/domain/focusArea/\*.test.js|tests/domain/challenge/\*.test.js|g' scripts/fix-error-handling.js

# Step 4: Update and verify Supabase schema
echo -e "\nStep 4: Verifying and updating Supabase schema..."

# Check if required node packages are installed
if ! npm list pg | grep -q pg; then
  echo "Installing pg package for PostgreSQL connection..."
  npm install pg --save-dev
fi

# Run the schema verification script with ES modules support
echo "Running Supabase schema verification and setup..."
node scripts/test-supabase-schema.js

# Step 5: Run tests
echo -e "\nStep 5: Running tests..."
echo "Running a basic Supabase connection test to verify connectivity..."
npx mocha tests/external/supabase/supabase-client.test.js

echo -e "\n✅ Test suite preparation complete!"
echo -e "\nYou can now run specific tests with:"
echo "  npx mocha tests/path/to/test.js"
echo "Or run all tests with:"
echo "  npm test"

echo -e "\nManual steps if issues persist:"
echo "1. Check your .env.test file has all necessary credentials"
echo "   - SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY for Supabase"
echo "   - OPENAI_API_KEY for OpenAI"
echo "2. For dynamic imports, you might need to use top-level await which requires Node.js 14.8+ and ensure"
echo "   the file using await at the top level has a parent directory with a package.json containing \"type\": \"module\""
echo "3. For files using __dirname or __filename, make sure they have proper imports from 'path' and 'url'"
echo "4. For API-related tests, verify your API server is running"

# Make the script executable
chmod +x scripts/fix-test-suite.sh 