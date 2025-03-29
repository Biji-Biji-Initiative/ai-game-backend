#!/bin/bash
# Delete domain-specific error handling utilities after verification

# Define the domains
DOMAINS=("adaptive" "auth" "challenge" "evaluation" "personality" "progress" "userJourney")

# Iterate through domains
for DOMAIN in "${DOMAINS[@]}"; do
  # Path to error handling utility
  UTIL_PATH="src/core/$DOMAIN/errors/errorHandlingUtil.js"
  
  # Check if file exists
  if [ -f "$UTIL_PATH" ]; then
    echo "Found utility at $UTIL_PATH"
    
    # Make backup before deletion (just in case)
    cp "$UTIL_PATH" "$UTIL_PATH.bak"
    echo "Created backup at $UTIL_PATH.bak"
    
    # Delete the file
    rm "$UTIL_PATH"
    echo "Deleted $UTIL_PATH"
  else
    echo "Warning: Could not find $UTIL_PATH"
  fi
done

echo "Done processing domain-specific error handling utilities."
