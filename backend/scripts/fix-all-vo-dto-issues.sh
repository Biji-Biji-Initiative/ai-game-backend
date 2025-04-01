#!/bin/bash
# Fix Value Object and DTO Mapper Issues in Tests
# This script runs both fix-vo-usage.js and fix-dto-mappers.js for all domains

echo "🚀 Starting Value Object and DTO Mapper fixes for all domains..."

# Define domains to process
DOMAINS=("user" "challenge" "focusArea" "evaluation" "personality")

# Step 1: Fix Value Object usage in repository and service tests
echo -e "\n===== Fixing Value Object Usage =====\n"
for domain in "${DOMAINS[@]}"; do
  echo -e "\n🔍 Processing $domain domain for Value Objects..."
  node scripts/fix-vo-usage.js "$domain"
done

# Step 2: Fix DTO Mapper usage in E2E/API tests
echo -e "\n===== Fixing DTO Mapper Usage =====\n"
for domain in "${DOMAINS[@]}"; do
  echo -e "\n🔍 Processing $domain domain for DTO Mappers..."
  node scripts/fix-dto-mappers.js "$domain"
done

echo -e "\n✅ All domains processed successfully!"
echo "Next steps:"
echo "1. Review the changes to ensure they maintain correct test functionality"
echo "2. Run the tests to make sure they still pass"
echo "3. Consider adjusting patterns in the scripts if you find any missed cases"
echo "4. Update the TestingTickets file to mark Ticket #T9 as complete" 