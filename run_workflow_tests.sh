#!/bin/bash
echo "Running consolidated workflow tests..."
npx mocha tests/integration/workflows/simple-workflow-test.js "$@"
