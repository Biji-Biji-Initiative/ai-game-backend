# OpenAI Responses API Integration

This document provides a brief overview of how our application integrates with the OpenAI Responses API. Rather than duplicating OpenAI's official documentation, this guide focuses on our specific implementation and usage patterns.

## What is the Responses API?

The Responses API is OpenAI's most advanced interface for generating AI responses. It provides a stateful conversation API with built-in support for tools, multimodal inputs, and advanced response formatting.

> **Note:** For comprehensive documentation on the Responses API, refer to [OpenAI's official documentation](https://platform.openai.com/docs/api-reference/responses).

## Our Implementation

Our application uses the Responses API exclusively for all AI interactions. We've implemented this through:

1. **OpenAIClient** (`src/infra/openai/OpenAIClient.js`) - A wrapper around the OpenAI API client with specific methods for our use cases
2. **OpenAIStateManager** (`src/infra/openai/OpenAIStateManager.js`) - Manages the state of conversations using thread-based interactions
3. **Prompt System** (`src/core/prompt/*`) - Builds structured prompts for different domains using a builder pattern

## Key Concepts

### Threads

The Responses API uses threads to maintain conversation state. A thread is a persistent conversation context with a unique identifier.

```javascript
// Creating a new thread
const thread = await openaiClient.createThread({
  metadata: {
    userId: user.id,
    challengeId: challenge.id
  }
});

// Thread ID is used for all future interactions
const threadId = thread.id;
```

### Messages

Messages are added to threads to build the conversation history.

```javascript
// Adding a user message to the thread
await openaiClient.createMessage({
  threadId: threadId,
  role: 'user',
  content: userResponse
});
```

### Responses

Responses are generated based on the entire conversation history in a thread.

```javascript
// Creating a response based on the thread
const response = await openaiClient.createResponse({
  threadId: threadId,
  instructions: 'You are an AI ethics expert helping evaluate the user\'s response.',
  response_format: { type: 'json_object' }
});

// Access the response content
const output = response.output;
```

## Key Usage Patterns

### Challenge Generation

When generating challenges, we use the Responses API with:

```javascript
// Example of challenge generation
const thread = await openaiClient.createThread({
  metadata: { purpose: 'challenge_generation', userId: user.id }
});

await openaiClient.createMessage({
  threadId: thread.id,
  role: 'user',
  content: `Generate a challenge for a user with focus area: ${focusArea} at skill level: ${skillLevel}`
});

const response = await openaiClient.createResponse({
  threadId: thread.id,
  instructions: "You are an expert challenge creator. Generate a challenge focused on AI Ethics...",
  response_format: { type: "json_object" },
  max_tokens: 2000
});

const challenge = response.output;
```

### Response Evaluation

For evaluating user responses to challenges:

```javascript
// Example of response evaluation
const threadId = challenge.threadId || await openaiClient.createThread().then(t => t.id);

// Add the evaluation context
await openaiClient.createMessage({
  threadId: threadId,
  role: 'user',
  content: JSON.stringify({
    challenge: {
      title: challenge.title,
      description: challenge.description,
      questions: challenge.questions
    },
    userResponses: userResponses,
    evaluationCriteria: challenge.evaluationCriteria
  })
});

const evaluation = await openaiClient.createResponse({
  threadId: threadId,
  instructions: "You are an expert evaluator. Evaluate these responses based on the given criteria.",
  response_format: { type: "json_object" }
});

const result = evaluation.output;
```

### State Management

Our `OpenAIStateManager` provides a higher-level interface for managing threads:

```javascript
// Example usage of OpenAIStateManager
const stateManager = new OpenAIStateManager(openaiClient, threadRepository);

// Get or create a thread for a specific context
const threadId = await stateManager.getOrCreateThread(userId, challengeId);

// Add a message and generate a response
await stateManager.addUserMessage(threadId, userMessage);
const response = await stateManager.generateResponse(
  threadId, 
  null, // No additional user message
  {
    instructions: 'You are a helpful assistant...',
    responseFormat: { type: 'json_object' }
  }
);
```

## Configuration

The OpenAI integration is configured through environment variables:

```
OPENAI_API_KEY=your_api_key
OPENAI_ORGANIZATION=your_org_id (optional)
OPENAI_MODEL=gpt-4 (default model)
```

## Error Handling

Our implementation includes robust error handling for common API issues:

1. **Rate limiting**: Implements exponential backoff retry
2. **Token limit exceeded**: Truncates inputs when appropriate
3. **Invalid requests**: Provides detailed error messaging
4. **Service unavailability**: Graceful degradation of service

See `src/infra/openai/OpenAIErrorHandler.js` for details.

## Best Practices

Our implementation follows these best practices:

1. **Thread Management**: Properly creating and managing threads to maintain context
2. **JSON Formatting**: Using `response_format: { type: "json_object" }` for structured responses
3. **Clear Instructions**: Providing detailed system instructions
4. **Metadata**: Using metadata to associate threads with users and challenges
5. **Error Handling**: Comprehensive error handling for all API calls
6. **Thread Cleanup**: Regularly cleaning up unused threads

## Testing

For testing, we use:

1. **Mock Clients**: A mock OpenAI client for unit tests
2. **Thread Simulators**: Simulates thread-based conversations for testing
3. **Integration Tests**: End-to-end tests with test threads for critical paths
4. **Test Fixtures**: Pre-recorded responses for deterministic testing

## Code References

Key files to review:

- `src/infra/openai/OpenAIClient.js`: The main client wrapper
- `src/infra/openai/OpenAIStateManager.js`: Thread state management
- `src/core/prompt/builders/`: Prompt builders for specific domains
- `src/repositories/threadRepository.js`: Thread persistence

## Next Steps

If you're working with the OpenAI integration:

1. Review the [implementation code](/src/infra/openai/)
2. Check the [prompt system documentation](/docs/architecture/prompt-system.md)
3. See [testing documentation](/TESTING.md) for testing practices
4. Explore the [state management documentation](/docs/architecture/state-management.md) 