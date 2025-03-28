# AI Game End-to-End Tests

This document provides a guide on how to run the end-to-end tests for the AI Game platform. These tests verify that the different components of the system work together correctly.

## Prerequisites

Before running the tests, ensure you have:

1. Node.js installed (v14 or later)
2. A `.env` file with valid Supabase credentials:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-anon-key
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Available Tests

### 1. Conversation State Test

This test verifies the functionality of the conversation state repository, which is used to maintain stateful interactions with the Responses API.

```bash
node test-conversation-state.js
```

This test performs the following operations:
- Creates a new conversation state
- Retrieves it by ID
- Retrieves it by context
- Updates the state
- Deletes the state

### 2. Challenges Test

This test verifies the functionality of the challenges feature, which includes creating, updating, and evaluating challenges.

```bash
node test-challenges-e2e.js
```

This test performs the following operations:
- Creates a new challenge
- Retrieves it
- Submits a response to the challenge
- Completes the challenge with an evaluation
- Retrieves the completed challenge with all data
- Cleans up by deleting the test challenge

### 3. Comprehensive E2E Test

This test combines both the conversation state and challenges features to verify their integration.

```bash
node test-challenges-and-conversation-e2e.js
```

This comprehensive test performs the following operations:
- Creates a new challenge
- Creates a conversation state linked to the challenge
- Retrieves the conversation state by ID and context
- Updates the conversation state
- Submits a response to the challenge
- Updates the conversation state with the submission
- Completes the challenge with an evaluation
- Updates the conversation state with the completion
- Cleans up by deleting both the conversation state and challenge

## Troubleshooting

If you encounter errors while running the tests:

1. **Database Connection Issues**: Ensure your Supabase credentials in the `.env` file are correct and up-to-date.

2. **Foreign Key Constraints**: The tests use existing test users from the database. If you get foreign key constraint errors, verify that the test user exists in the database.

3. **Column Name Mismatches**: If you see errors about column names not found, check if the column names in your code match those in the database schema (e.g., camelCase vs. snake_case).

## Adding More Tests

To add more tests:

1. Follow the pattern of existing tests
2. Use UUID for generating unique IDs
3. Always include cleanup logic to avoid leaving test data in the database
4. Add error handling and graceful cleanup even when tests fail 