#!/bin/bash

# Master script to clean up the test suite
# This script runs all the cleaning operations in the correct order

echo "================================================"
echo "Test Suite Cleanup - Starting cleanup process"
echo "================================================"

# Create backup directory
BACKUP_DIR="tests-backup"
if [ ! -d "$BACKUP_DIR" ]; then
  mkdir "$BACKUP_DIR"
  echo "Created backup directory: $BACKUP_DIR"
fi

# Take initial backup using node instead of cp
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_NAME="tests-initial-${TIMESTAMP}"
echo "Taking initial backup of tests folder..."

# Create a small Node.js script to handle the backup with spaces in paths
cat > temp-backup-script.js <<EOF
import fs from 'fs';
import path from 'path';

const srcDir = './tests';
const destDir = './${BACKUP_DIR}/${BACKUP_NAME}/tests';

// Create backup directory
fs.mkdirSync('./${BACKUP_DIR}/${BACKUP_NAME}', { recursive: true });

// Helper function to copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirSync(srcDir, destDir);
console.log('Backup completed successfully');
EOF

# Execute the backup script
node temp-backup-script.js
rm temp-backup-script.js

echo "Backup saved to: $BACKUP_DIR/$BACKUP_NAME"

# Step 1: Find duplicate test files
echo -e "\n================================================"
echo "Step 1: Analyzing test files for duplicates"
echo "================================================"
node scripts/find-test-duplicates.js

# Confirm continuing
read -p "Continue with test cleanup? (y/n): " continue
if [ "$continue" != "y" ]; then
  echo "Cleanup aborted."
  exit 0
fi

# Step 2: Clean up test folder
echo -e "\n================================================"
echo "Step 2: Cleaning up test folder structure"
echo "================================================"
node scripts/cleanup-test-folder.js

# Step 3: Consolidate test coverage
echo -e "\n================================================"
echo "Step 3: Consolidating test coverage"
echo "================================================"
node scripts/consolidate-test-coverage.js

# Step 4: Run existing fix-test-suite.sh script
echo -e "\n================================================"
echo "Step 4: Running fix-test-suite.sh to fix imports and other issues"
echo "================================================"
bash scripts/fix-test-suite.sh

# Step 5: Verify tests
echo -e "\n================================================"
echo "Step 5: Verifying test structure"
echo "================================================"
node scripts/find-test-duplicates.js

# Create a final report
echo -e "\n================================================"
echo "Creating final test cleanup report"
echo "================================================"

# Count test files before and after using Node.js
cat > temp-count-script.js <<EOF
import fs from 'fs';
import path from 'path';
import glob from 'glob';

// Count files in initial backup
const backupFiles = glob.sync('./${BACKUP_DIR}/${BACKUP_NAME}/tests/**/*.test.js');
console.log("INITIAL_COUNT:" + backupFiles.length);

// Count files in current tests directory
const currentFiles = glob.sync('./tests/**/*.test.js');
console.log("FINAL_COUNT:" + currentFiles.length);
EOF

# Execute the count script
COUNT_OUTPUT=$(node temp-count-script.js)
rm temp-count-script.js

# Extract counts from output
INITIAL_COUNT=$(echo "$COUNT_OUTPUT" | grep "INITIAL_COUNT:" | cut -d ":" -f 2)
FINAL_COUNT=$(echo "$COUNT_OUTPUT" | grep "FINAL_COUNT:" | cut -d ":" -f 2)
REMOVED=$((INITIAL_COUNT - FINAL_COUNT))

echo "Test files before cleanup: $INITIAL_COUNT"
echo "Test files after cleanup: $FINAL_COUNT"
echo "Removed duplicate/redundant files: $REMOVED"

# Report directories
echo -e "\nTest directory structure after cleanup:"
node -e "
const fs = require('fs');
const path = require('path');

function listDirs(dir, maxDepth = 2, currentDepth = 0) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    if (item.isDirectory()) {
      console.log(path.join(dir, item.name));
      if (currentDepth < maxDepth - 1) {
        listDirs(path.join(dir, item.name), maxDepth, currentDepth + 1);
      }
    }
  }
}

listDirs('./tests', 2);
"

echo -e "\n================================================"
echo "Test Suite Cleanup - Complete"
echo "================================================"
echo "Next steps:"
echo "1. Run 'npm test' to verify all tests still pass"
echo "2. Review any failing tests and fix if needed"
echo "3. Commit changes with message 'Complete test suite cleanup'"

exit 0 