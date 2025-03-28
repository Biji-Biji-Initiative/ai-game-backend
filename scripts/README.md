# Core Scripts

This directory contains essential scripts for testing, environment setup, and database operations.

## Test Execution Scripts

- **run-tests.js**: Interactive script to run specific test categories with helpful descriptions
- **run-tests-with-db-check.sh**: Script that checks Supabase and OpenAI connectivity before running integration tests
- **run-all-integration-tests.js**: Runs all integration tests

## Environment Setup

- **setup-test-env.js**: Helps set up the test environment by creating and validating configuration files
- **create-test-user.js**: Creates a test user in Supabase for testing purposes
- **get-token.js**: Retrieves an authentication token for a test user
- **update-env.js**: Updates environment variables interactively (consider removing as it may be redundant with setup-test-env.js)

## Database Scripts (Consider replacing with Supabase CLI)

- **applyMigration.js**: Applies database migrations
- **run-migrations.js**: Runs database migrations
- **create-supabase-tables.js**: Creates tables in Supabase

## Usage

Most scripts can be run directly with Node.js:

```bash
node scripts/run-tests.js
```

Or through npm scripts defined in package.json:

```bash
npm run test:run
```

The bash script can be run with:

```bash
bash scripts/run-tests-with-db-check.sh
``` 