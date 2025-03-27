# Test Setup Guide for Non-Developers

This guide will help you set up and run the new testing structure, even if you're not familiar with coding. Just follow these steps one by one.

## Setting Up the Test Structure

### Step 1: Open a Terminal

1. Open a terminal window in your project directory
2. Make sure you're in the root directory of the project

### Step 2: Create the Directory Structure

Run this command to create all the necessary directories:

```
npm run test:setup
```

This will:
- Create all the required test directories
- Set up README files explaining each directory's purpose
- Create helper files for testing

### Step 3: Organize Existing Tests

Run this command to organize existing tests into the new structure:

```
npm run test:cleanup
```

This will:
- Find all test files in the project
- Move them to appropriate directories based on their content
- Keep a record of which files were moved

## Running Tests

### Basic Test Commands

To run all tests:
```
npm test
```

To run tests for specific domains:
```
npm run test:domains
npm run test:domain:challenge
npm run test:domain:focusArea
npm run test:domain:evaluation
npm run test:domain:prompt
```

To run integration tests:
```
npm run test:integration
```

To run real API tests (requires API keys):
```
npm run test:real-api
```

### Understanding Test Results

When tests run, you'll see output like this:

```
✓ should create and save a challenge
✓ should find challenges by user ID
✗ should update challenge properties correctly
```

- ✓ means the test passed
- ✗ means the test failed

If a test fails, you'll see details about what went wrong. The most common issues are:
1. Missing API keys (for real API tests)
2. Network connectivity issues
3. Changes to the code that break existing functionality

## Troubleshooting

### Missing API Keys

If you see errors about missing API keys, check your `.env` file and make sure it contains:

```
OPENAI_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
```

### Test Files Not Found

If tests can't find files, make sure you:
1. Ran the setup command (`npm run test:setup`)
2. Ran the cleanup command (`npm run test:cleanup`)
3. Are in the root directory of the project

### Tests Taking Too Long

Real API tests can take time because they connect to external services. If tests are taking too long:

1. Try running a smaller subset of tests (e.g., `npm run test:domain:challenge`)
2. Check your internet connection
3. Consider running only unit tests during development (`npm run test:unit`)

## Testing Philosophy

Our testing approach follows these principles:

1. **Test Real Behavior**: We test actual components working together, not just mocked versions.
2. **Limited Mocking**: We only mock external services when absolutely necessary.
3. **Test Business Rules**: Tests should validate business requirements, not implementation details.

This approach helps ensure our tests give us confidence that the system works as expected in real-world scenarios. 