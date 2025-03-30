#!/bin/bash
# Fix Dependency Injection Issues in All Test Files
# This script automates the refactoring of test files to use proper DI patterns

echo "🚀 Starting Dependency Injection refactoring for all test files..."

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Files with known proxyquire usage (highest priority)
PROXYQUIRE_FILES=(
  "tests/domain/evaluation/repositories/evaluationRepository.test.js"
  "tests/domain/challenge/evaluationRepository.test.js"
  "tests/domain/evaluation/evaluation.model.test.js"
  "tests/domain/prompt/builders/evaluation.builder.test.js"
  "tests/domain/focusArea/focus-area-service-system-messages.test.js"
  "tests/domain/focusArea/services/focus-area-service-system-messages.test.js"
  "tests/domain/evaluation/services/evaluation-service-system-messages.test.js"
)

# Files with direct stubbing issues (second priority)
DIRECT_STUBBING_FILES=(
  "tests/domain/user/personalityUserIntegration.test.js"
  "tests/domain/user/UserService.test.js"
  "tests/domain/user/services/UserService.test.js"
  "tests/domain/prompt/builders/system-message.test.js"
  "tests/domain/challenge/challenge.collaborators.test.js"
  "tests/unit/infra/MockInsightGenerator.adapter.test.js"
)

# Files with empty constructor issues (third priority)
EMPTY_CONSTRUCTOR_FILES=(
  "tests/domain/focusArea/user.controller.test.js"
  "tests/unit/user/user.controller.test.js"
  "tests/unit/ai/ports/AIStateManager.test.js"
  "tests/unit/ai/ports/AIClient.test.js"
)

echo -e "\n===== Processing Files with Proxyquire Usage =====\n"
for file in "${PROXYQUIRE_FILES[@]}"; do
  if [ -f "$ROOT_DIR/$file" ]; then
    echo -e "\n🔧 Processing $file"
    node "$SCRIPT_DIR/fix-di-patterns.js" "$file"
  else
    echo "⚠️ File not found: $file"
  fi
done

echo -e "\n===== Processing Files with Direct Stubbing Issues =====\n"
for file in "${DIRECT_STUBBING_FILES[@]}"; do
  if [ -f "$ROOT_DIR/$file" ]; then
    echo -e "\n🔧 Processing $file"
    node "$SCRIPT_DIR/fix-di-patterns.js" "$file"
  else
    echo "⚠️ File not found: $file"
  fi
done

echo -e "\n===== Processing Files with Empty Constructor Issues =====\n"
for file in "${EMPTY_CONSTRUCTOR_FILES[@]}"; do
  if [ -f "$ROOT_DIR/$file" ]; then
    echo -e "\n🔧 Processing $file"
    node "$SCRIPT_DIR/fix-di-patterns.js" "$file"
  else
    echo "⚠️ File not found: $file"
  fi
done

echo -e "\n✅ Dependency Injection refactoring complete!"
echo "Next steps:"
echo "1. Review the refactored files to ensure they maintain functionality"
echo "2. Run the tests to make sure they pass after refactoring"
echo "3. Update the TestingTickets file to mark Ticket #T8 as complete" 