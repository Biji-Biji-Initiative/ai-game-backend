# Scripts Directory

This directory contains utility scripts for developing, testing, and maintaining the AI Fight Club application. The scripts are organized into the following directories following industry best practices.

## Directory Structure

- `setup/`: Scripts for environment setup, database migrations, and seeding
  - `setup-env.js`: Sets up and validates environment files and connections
  - `run-migrations.js`: Applies database migrations
  - `seed-data.js`: Seeds the database with initial data

- `utils/`: Utility scripts for analysis and code quality
  - `verify-code-quality.js`: Checks for code quality issues
  - `analyze-test-placement.js`: Analyzes test structure for better organization
  - `schema-validator.js`: Validates database schema against expected structure
  - `verify-ddd-implementation.js`: Verifies Domain-Driven Design implementation
  - `update-openai-api.js`: Updates OpenAI API calls if needed
  - `cleanup-temp-scripts.js`: Cleans up temporary scripts

- `dev/`: Development and debugging scripts (for manual use)
  - `create-test-user.js`: Creates a test user for development
  - `get-token.js`: Gets auth token for testing
  - `view-evaluations.js`: Utility to view evaluation data
  - `debug-supabase.js`: Debugging utilities for Supabase
  - `verify-data.js`: Manual check of database state
  - Various test scripts: Manual testing scripts for different components

- `archive/`: Old scripts that have been replaced (kept for reference)

- `run-tests.js`: Central test runner supporting all test categories

## Common Tasks via npm Scripts

### Environment Setup
```bash
# Set up environment files and validate connections
npm run setup:env
```

### Database Management
```bash
# Apply migrations
npm run db:migrate

# Using Supabase CLI
npm run db:push   # Push local migrations to Supabase
npm run db:reset  # Reset the database

# Seed data
npm run db:seed               # Seed all data
npm run db:seed:challenges    # Seed only challenges
npm run db:seed:users         # Seed only users
npm run db:seed:reset         # Reset and seed all data
```

### Testing
```bash
# Run all tests
npm test

# Run specific test categories
npm run test:domain       # Domain tests
npm run test:integration  # Integration tests
npm run test:unit         # Unit tests
npm run test:external     # External services tests
npm run test:e2e          # End-to-end tests
npm run test:application  # Application tests

# Testing options
npm run test:watch           # Run tests in watch mode
npm run test:skip-openai     # Skip OpenAI-dependent tests
npm run test:skip-supabase   # Skip Supabase-dependent tests
npm run test:focus -- focus=challenge  # Focus on specific tests
```

### Running Specific Tests
To run a specific test file or pattern, use the `test:focus` script with the `--` separator:

```bash
# Run tests in a specific file
npm run test:focus -- tests/domain/challenge/challenge-service.test.js

# Run tests matching a pattern
npm run test:focus -- focus=challenge

# Run integration tests with a focus
npm run test:integration -- --focus=user-service

# Skip external services in domain tests
npm run test:domain -- --skip-openai --skip-supabase
```

### Code Quality
```bash
# Linting
npm run lint      # Check for linting issues
npm run lint:fix  # Automatically fix linting issues

# Formatting
npm run format       # Format all code
npm run format:check # Check formatting

# Code quality analysis
npm run quality            # Analyze code quality
npm run quality:jsdoc      # Check for missing JSDoc
npm run quality:fixable    # Show only fixable issues
```

### Development Utilities
```bash
# Create test user
npm run dev:user

# Get auth token
npm run dev:token

# View evaluations
npm run dev:evaluations
```

## Best Practices

1. **Use package.json scripts** as the primary interface for common tasks
2. **Leverage standard tooling** (ESLint, Prettier, test runners) instead of custom scripts
3. **Avoid risky automation** that uses regex for complex refactoring
4. **Use Node.js** over shell scripts for better cross-platform compatibility
5. **Keep scripts focused** on a single responsibility
6. **Standardize test execution** through the central test runner

## Adding New Scripts

When adding new scripts:

1. Place them in the appropriate directory based on their function
2. Make them executable (`chmod +x scripts/category/script.js`)
3. Start the file with `#!/usr/bin/env node` and 'use strict';
4. Add appropriate JSDoc comments
5. Add to package.json if it's a commonly used script
6. Update this README if it's a significant addition 