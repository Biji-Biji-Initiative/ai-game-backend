#!/bin/bash

# Script to verify proper usage of formatForResponsesApi in prompt builders
# This helps complete ARCH-03-VERIFY ticket

echo "Verifying Responses API usage in prompt builders..."
echo "=================================================="
echo ""

# Define directories to search
PROMPT_BUILDERS_DIR="src/core/prompt/builders"
SERVICES_DIR="src/core"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if a directory exists
if [ ! -d "$PROMPT_BUILDERS_DIR" ]; then
  echo -e "${RED}Error: Prompt builders directory not found at $PROMPT_BUILDERS_DIR${NC}"
  exit 1
fi

echo "Analyzing prompt builders..."
echo ""

# Function to check a file for proper Responses API usage
check_file() {
  local file=$1
  local filename=$(basename "$file")
  local has_import=$(grep -c "formatForResponsesApi" "$file")
  local has_usage=$(grep -c "formatForResponsesApi(" "$file")
  local has_return=$(grep -c "return formatForResponsesApi" "$file")
  
  if [ $has_import -gt 0 ] && [ $has_return -gt 0 ]; then
    echo -e "${GREEN}✓ $filename${NC} - Properly uses formatForResponsesApi"
    return 0
  elif [ $has_import -gt 0 ] && [ $has_usage -gt 0 ]; then
    echo -e "${YELLOW}⚠ $filename${NC} - Has formatForResponsesApi import and some usage but may not return properly"
    return 1
  else
    echo -e "${RED}✗ $filename${NC} - Does NOT properly use formatForResponsesApi"
    return 2
  fi
}

# Check all builder files
BUILDER_FILES=$(find "$PROMPT_BUILDERS_DIR" -name "*.js")
TOTAL_FILES=0
COMPLIANT_FILES=0
PARTIAL_FILES=0
NON_COMPLIANT_FILES=0

for file in $BUILDER_FILES; do
  TOTAL_FILES=$((TOTAL_FILES+1))
  check_file "$file"
  result=$?
  
  if [ $result -eq 0 ]; then
    COMPLIANT_FILES=$((COMPLIANT_FILES+1))
  elif [ $result -eq 1 ]; then
    PARTIAL_FILES=$((PARTIAL_FILES+1))
  else
    NON_COMPLIANT_FILES=$((NON_COMPLIANT_FILES+1))
  fi
done

echo ""
echo "Checking service files for proper OpenAIStateManager pattern..."
echo ""

# Look for services that call OpenAI API
SERVICE_FILES=$(grep -l "openAIClient\|openAIStateManager" $(find "$SERVICES_DIR" -name "*.js" | grep "Service.js"))

# Function to check OpenAIStateManager pattern in services
check_service_pattern() {
  local file=$1
  local filename=$(basename "$file")
  local has_find_create=$(grep -c "findOrCreateConversationState" "$file")
  local has_get_last=$(grep -c "getLastResponseId" "$file")
  local has_update_last=$(grep -c "updateLastResponseId" "$file")
  
  if [ $has_find_create -gt 0 ] && [ $has_get_last -gt 0 ] && [ $has_update_last -gt 0 ]; then
    echo -e "${GREEN}✓ $filename${NC} - Uses complete OpenAIStateManager pattern"
  elif [ $has_get_last -gt 0 ] && [ $has_update_last -gt 0 ]; then
    echo -e "${YELLOW}⚠ $filename${NC} - Uses getLastResponseId and updateLastResponseId but may not create states"
  elif [ $has_get_last -gt 0 ] || [ $has_update_last -gt 0 ]; then
    echo -e "${YELLOW}⚠ $filename${NC} - Uses partial OpenAIStateManager pattern"
  else
    echo -e "${RED}✗ $filename${NC} - Does NOT use proper OpenAIStateManager pattern"
  fi
}

for file in $SERVICE_FILES; do
  check_service_pattern "$file"
done

# Print summary
echo ""
echo "Summary of Prompt Builders Compliance:"
echo "-------------------------------------"
echo -e "${GREEN}Fully compliant:${NC} $COMPLIANT_FILES / $TOTAL_FILES"
echo -e "${YELLOW}Partially compliant:${NC} $PARTIAL_FILES / $TOTAL_FILES"
echo -e "${RED}Non-compliant:${NC} $NON_COMPLIANT_FILES / $TOTAL_FILES"

if [ $COMPLIANT_FILES -eq $TOTAL_FILES ]; then
  echo -e "\n${GREEN}✓ All prompt builders are properly using formatForResponsesApi!${NC}"
  echo "Ticket ARCH-03-VERIFY can be considered complete."
else
  echo -e "\n${YELLOW}⚠ Some prompt builders still need to be updated to use formatForResponsesApi.${NC}"
  echo "Ticket ARCH-03-VERIFY is not yet complete."
fi

echo ""
echo "Done!" 