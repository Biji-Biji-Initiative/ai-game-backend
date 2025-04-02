#!/bin/bash
# Cleanup script for removing old implementations after refactoring

set -e  # Exit on error

echo "Preparing to clean up old implementations..."

# Create backup directory
BACKUP_DIR="./backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

echo "Backing up old files to $BACKUP_DIR"

# Function to back up a file before deletion
backup_and_remove() {
  file=$1
  if [ -f "$file" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp "$file" "$BACKUP_DIR/$file"
    echo "Backed up and removing: $file"
    rm "$file"
  else
    echo "File not found, skipping: $file"
  fi
}

# Back up and remove old implementations

# Old API Client implementations
backup_and_remove "admin/js/api/api-client-old.ts"
backup_and_remove "admin/js/api/http-client.ts"

# Old UI related files
backup_and_remove "admin/js/components/UIManager.ts"  # Keep UIManagerNew
backup_and_remove "admin/js/utils/dom-helper.ts"      # Replaced by DomService

# Old storage implementations
backup_and_remove "admin/js/utils/local-storage.ts"   # Replaced by StorageService

# Old logger implementations
backup_and_remove "admin/js/utils/logger-old.ts"      # Replaced by core/Logger.ts

# Clean up any old flow-related code
backup_and_remove "admin/js/flow/flow-controller-old.ts"

echo "Cleanup completed!"
echo "Backed up files are available in $BACKUP_DIR"
echo ""
echo "Now run: npm run lint"
echo "To check for any remaining issues before testing the application." 