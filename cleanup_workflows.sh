#!/bin/bash
echo "Removing redundant workflow tests from domain directory..."
rm -v tests/domain/challenge/challenge-evaluation-workflow.test.js
rm -v tests/domain/challenge/challenge-focus-area-workflow.test.js
rm -v tests/domain/challenge/challenge-generation-integration.test.js
rm -v tests/domain/challenge/evaluation-service-workflow.test.js
rm -v tests/domain/challenge/integration-cross-domain-workflow.test.js
rm -v tests/domain/challenge/openai-supabase-workflow.test.js
rm -v tests/domain/challenge/prompt-generation-workflow.test.js
rm -v tests/domain/evaluation/openai-responses.workflow.test.js
rm -v tests/domain/user/userStorage.workflow.test.js
