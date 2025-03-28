# OpenAI Responses API Integration Tests

This directory contains integration tests for OpenAI's Responses API implementation following our project's testing standards and architecture.

## Test Structure

These tests verify the integration between our domain services and the OpenAI Responses API:

1. **openai-responses.workflow.test.js** - Tests core OpenAI client and state management
2. **evaluation-service.workflow.test.js** - Tests the evaluation service with the Responses API 
3. **challenge-generation.workflow.test.js** - Tests challenge generation using the Responses API
4. **focusArea.responses-api.test.js** - Tests focus area personalization with the Responses API

## Testing Principles

All tests follow these key principles:

1. **Proper Dependency Injection** - All dependencies are properly injected, not imported directly
2. **In-Memory Repositories** - Tests use in-memory repositories instead of actual database
3. **Mock Services** - External services are mocked using Sinon
4. **Consistent Setup/Teardown** - Each test has proper before/after hooks
5. **Error Handling** - Tests include error cases and proper error handling

## Verified Functionality

These tests verify:

1. **JSON Message Handling** - Proper handling of JSON-formatted responses from OpenAI
2. **Stateful Conversations** - Using `previous_response_id` for context maintenance
3. **Conversation State Management** - Creating, finding, updating and deleting states
4. **Service Integration** - Proper integration between domain services and OpenAI

## Running Tests

```bash
# Run all Responses API tests
npm test -- --grep "Responses API"

# Run specific test workflows
npm test -- --grep "Challenge Generation with Responses API"
npm test -- --grep "Evaluation Service with Responses API"
```

## Environment Handling

Tests automatically adapt to different environments:

1. **Test Environment**: Uses mocks for all dependencies
2. **Development Environment**: Uses real OpenAI client but mocked repositories
3. **Missing Credentials**: Tests gracefully skip when credentials are missing

## Response Format Verification

The tests verify that responses from the OpenAI Responses API:

1. Have response IDs starting with `resp_` (not `chat_`)
2. Return properly structured JSON data for evaluation and challenge generation
3. Maintain context between successive API calls 