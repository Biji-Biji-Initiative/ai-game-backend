# Development Scripts

This directory contains scripts for manual testing and development purposes. These scripts are not used in production and are primarily for debugging, manual testing, and development workflows.

## Authentication Scripts

- `create-test-user.js` - Creates a test user in Supabase auth and database
- `get-token.js` - Gets an authentication token for testing APIs

## OpenAI API Testing

- `test-responses-api.js` - Tests the OpenAI Responses API integration
- `test-openai-eval.js` - Tests the OpenAI evaluation flow
- `test-openai-raw-logs.js` - Tests the OpenAI API with detailed logging
- `test-responses-api-raw.js` - Tests the raw Responses API

## Database Testing

- `debug-supabase.js` - Tools for debugging Supabase issues
- `check-supabase-data.js` - Checks data in Supabase tables
- `verify-data.js` - Verifies data integrity

## Challenge & Evaluation Testing

- `test-challenge-model.js` - Tests the challenge model
- `test-challenge-generation.js` - Tests challenge generation
- `test-challenge-generation-fixed.js` - Tests fixed challenge generation
- `test-evaluation-flow.js` - Tests the full evaluation flow
- `test-evaluation-setup.js` - Tests evaluation setup
- `test-evaluation-model.js` - Tests the evaluation model
- `test-evaluation-simple.js` - Simple evaluation tests
- `test-evaluation-generation.js` - Tests evaluation generation
- `view-evaluations.js` - Tool to view evaluations

## Prompt Builder Testing

- `test-prompt-builder.js` - Tests the prompt builder
- `test-all-prompt-builders.js` - Tests all prompt builders

## Usage

Most scripts support command-line arguments for customization. For example:

```bash
# Create a test user with custom email and password
node scripts/dev/create-test-user.js --email test@example.com --password SecurePass123! --name "Test User" --focus "AI Ethics"

# Get a token for a specific user
node scripts/dev/get-token.js --email test@example.com --password SecurePass123!

# View evaluations with limit
node scripts/dev/view-evaluations.js --limit 10
```

## Common Tasks

These scripts can be run directly or through npm scripts:

```bash
# Create a test user
npm run dev:user

# Get an auth token
npm run dev:token

# View evaluations
npm run dev:evaluations

# Test OpenAI integration
npm run dev:test-openai
```

## Tips

- Most scripts will look for a `.env` file in the project root
- For OpenAI tests, ensure your OpenAI API key is set in `.env`
- For Supabase tests, ensure your Supabase URL and keys are set in `.env`

## Adding New Scripts

When adding new development scripts:

1. **Proper organization**: Place your script in this directory
2. **Follow conventions**:
   - Start with `#!/usr/bin/env node` and use 'use strict';
   - Add comprehensive JSDoc comments explaining the purpose
   - Use chalk for colored console output
   - Handle errors properly
3. **Update this README**: Add your script to the appropriate section
4. **Consider npm script**: For frequently used scripts, add an entry in package.json

## Best Practices

1. **Isolated functionality**: Scripts should be focused on testing a specific aspect of the system
2. **No side effects**: Avoid scripts that make destructive changes without confirmation
3. **Clear feedback**: Use colored console output to make results easy to understand
4. **Error handling**: Proper error handling and recovery to avoid obscure failures
5. **Documentation**: Add comments explaining what the script does and how to use it
6. **Proper tests**: Consider converting test scripts to proper test files in the tests/ directory 