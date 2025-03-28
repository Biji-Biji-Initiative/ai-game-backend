# User-Personality Domain Integration Tests

This directory contains real API integration tests for the User and Personality domains. These tests make actual API calls to the application and use real Supabase connections to test the full integration between domains.

## Test Files

- `user-personality-interaction.test.js`: Tests cross-domain interactions between User and Personality domains

## Running Tests

To run these tests, you need:

1. A running API server
2. A Supabase project with proper tables set up
3. Environment variables configured in `.env`

### Environment Variables

Ensure these environment variables are set:

```
API_URL=http://localhost:3000/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Run the Tests

```bash
# Run just the user-personality integration tests
npm run test:real-api:user-personality

# Run all real API tests
npm run test:real-api
```

## Test Approach

These tests follow a true end-to-end approach:

1. Create real users in Supabase Auth and database
2. Make actual API calls through the HTTP endpoints
3. Verify cross-domain interactions work correctly
4. Clean up all test data after tests complete

Unlike unit tests which use mocks, these tests validate the entire system integration including:

- HTTP API layer
- Authentication with real JWT tokens
- Database operations
- Cross-domain event communication
- Data consistency between domains

## Adding New Tests

When adding new tests, follow these patterns:

1. Use the `setupTestUser()` and `cleanupTestUser()` helpers
2. Make actual HTTP requests with axios
3. Test domain boundaries by verifying data consistency
4. Allow sufficient time for asynchronous events with setTimeout
5. Clean up all test data in the after() hook 