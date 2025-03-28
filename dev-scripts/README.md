# Development Scripts

This directory contains utility scripts for manual debugging, testing, and exploration. These scripts are **not** part of the automated test suite but are useful tools for development.

## Available Scripts

- **test-auth.js**: Test authentication flow with Supabase
- **test-evaluation-flow.js**: Test the complete evaluation workflow
- **test-evaluation-setup.js**: Setup evaluation test data
- **test-openai-eval.js**: Test OpenAI evaluation functionality
- **test-prompt-builder.js**: Test prompt building functionality
- **test-responses-api.js**: Test OpenAI Responses API integration
- **test-all-prompt-builders.js**: Test all prompt builders
- **view-evaluations.js**: View evaluation data in the database

## How to Use

Run any script with Node.js:

```bash
node dev-scripts/script-name.js
```

**Note**: Most scripts require environment variables to be set up properly. Make sure you have a `.env` file with the necessary API keys and configuration.
