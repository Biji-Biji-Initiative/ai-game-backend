# Migration to OpenAI Responses API

## Overview

This document provides a comprehensive guide on our migration from OpenAI's Chat Completions API to the newer Responses API. It covers key changes, implementation details, and best practices for using the updated API clients.

## Key Changes

### 1. Message Format

**Old Format (Chat Completions):**
```js
const messages = [
  { role: 'system', content: 'You are a helpful assistant' },
  { role: 'user', content: 'Hello!' }
];
```

**New Format (Responses API):**
```js
const messages = {
  input: 'Hello!',
  instructions: 'You are a helpful assistant'
};
```

### 2. Stateful Conversations

The Responses API uses `previous_response_id` (instead of appending messages) for conversation context:

```js
// Get last response ID
const previousResponseId = await openAIStateManager.getLastResponseId(conversationState.id);

// Send message with previous response ID
const response = await openAIClient.sendMessage(messages, { previousResponseId });

// Update with new response ID for next call
await openAIStateManager.updateLastResponseId(conversationState.id, response.responseId);
```

### 3. Response Structure

**Old Format (Chat Completions):**
```js
{
  id: 'chatcmpl-123',
  object: 'chat.completion',
  choices: [
    {
      message: {
        role: 'assistant',
        content: 'Hello! How can I help you today?'
      }
    }
  ]
}
```

**New Format (Responses API):**
```js
{
  id: 'resp_abc123',
  object: 'response',
  created_at: 1678949300,
  status: 'completed',
  model: 'gpt-4o',
  output: [
    {
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'output_text',
          text: 'Hello! How can I help you today?'
        }
      ]
    }
  ]
}
```

### 4. Tool Calls

Tool calls now appear in the `output` array:

```js
{
  output: [
    // Text output (may be included with tool calls)
    {
      type: 'message',
      role: 'assistant',
      content: [...]
    },
    // Tool call
    {
      type: 'tool_call',
      tool_call: {
        id: 'call_abc123',
        type: 'function',
        function: {
          name: 'get_weather',
          arguments: '{"location":"San Francisco","unit":"celsius"}'
        }
      }
    }
  ]
}
```

Tool result submission uses the `tool_outputs` parameter:

```js
const result = {
  tool_outputs: [
    {
      tool_call_id: 'call_abc123',
      output: '{"temperature":18,"conditions":"partly cloudy"}'
    }
  ]
};

await openAIClient.submitToolResults(result, 'Any additional user input', { 
  previousResponseId: response.id 
});
```

## Using the Updated Client

### Basic Messages

```js
const { formatForResponsesApi } = require('../infra/openai/messageFormatter');

// Simple format with user prompt and system message
const messages = formatForResponsesApi(
  'Hello! Can you help me with a programming question?',
  'You are a helpful programming assistant.'
);

const response = await openAIClient.sendMessage(messages);
```

### Multimodal Content

```js
const { formatMultimodalContent } = require('../infra/openai/messageFormatter');

// Format with text and images
const messages = formatMultimodalContent(
  'What can you tell me about this image?',
  ['https://example.com/image.jpg'],
  'You are a visual analysis assistant.'
);

const response = await openAIClient.sendMessage(messages);
```

### JSON Responses

```js
const response = await openAIClient.sendJsonMessage(messages, {
  model: 'gpt-4o',
  temperature: 0.7
});

// Access parsed JSON data
console.log(response.data);
```

### Streaming

```js
const stream = await openAIClient.streamMessage(messages);
const controller = createStreamController(stream, {
  onText: (fullText, delta) => {
    console.log('New text:', delta);
  },
  onComplete: (result) => {
    console.log('Stream completed:', result);
  }
});

// Wait for completion
const finalResult = await controller.done;
```

### Tool Usage

```js
// Define tools
const tools = [
  defineFunctionTool(
    'get_weather',
    'Get the current weather for a location',
    {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city and state or country'
        },
        unit: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          description: 'The unit of temperature'
        }
      },
      required: ['location']
    }
  )
];

// Send message with tools
const response = await openAIClient.sendMessageWithTools(messages, tools);

// Extract tool calls
const { toolCalls } = extractToolCalls(response);

// Process tool calls and submit results
if (toolCalls && toolCalls.length > 0) {
  const toolResults = [];
  
  for (const toolCall of toolCalls) {
    // Execute the tool and get result
    const result = await executeToolFunction(toolCall.functionName, toolCall.parsedArguments);
    
    // Add to results
    toolResults.push({
      id: toolCall.id,
      output: result
    });
  }
  
  // Format and submit results
  const formattedResults = formatMultipleToolResults(toolResults);
  await openAIClient.submitToolResults(formattedResults, null, { 
    previousResponseId: response.id 
  });
}
```

## Best Practices

1. **Always Use Formatters**: Use the formatter functions (`formatForResponsesApi`, `formatMultimodalContent`, etc.) to ensure proper message format.

2. **Stateful Pattern**: Follow the OpenAIStateManager pattern consistently:
   - `findOrCreateConversationState` → Create/get state
   - `getLastResponseId` → Get previous ID
   - API call with `previousResponseId`
   - `updateLastResponseId` → Update for next call

3. **Error Handling**: Use the specific error types for better error management:
   - `OpenAIRateLimitError`
   - `OpenAIContextLengthError`
   - `OpenAIInvalidRequestError`
   - etc.

4. **Stream Processing**: Use the `StreamProcessor` or `createStreamController` for handling streaming responses.

5. **Tool Integration**: Use the `defineFunctionTool` and `formatToolResult` utilities to properly handle tools.

## Upcoming Enhancements

We're currently working on several enhancements to fully utilize all features of the Responses API:

### 1. Tool Call Lifecycle Integration

- **Tool Result Submission**: Improving the client to correctly submit tool results alongside optional user input in follow-up messages
- **Response Handler Enhancements**: Updating the response handler to clearly differentiate between text responses and tool call requests
- **Integration Testing**: Adding comprehensive tests for the multi-turn tool call workflow

### 2. Streaming Integration

- **StreamProcessor Integration**: Refactoring stream consumers to use the more structured `createStreamController` approach
- **Tool Call Streaming**: Enhancing the mock stream to properly simulate tool call events
- **Event Handling**: Adding specific handlers for all SSE event types from the Responses API

### 3. Feature Adoption

- **Built-in Tools**: Integrating support for OpenAI's built-in tools like web_search using the `defineBuiltInTool` function
- **File Input**: Supporting file references in input via the formatters for document analysis use cases
- **Advanced Parameters**: Adding support for include, truncation, metadata, and user parameters in client requests

### 4. Prompt Builder Updates

- Updating all prompt builders to consistently use `formatForResponsesApi` instead of returning raw prompts or custom objects
- Standardizing system message generation across all builders
- Adding support for advanced input types in relevant builders (like image analysis)

## Verification

Run the verification script to check your codebase for proper usage:

```bash
./scripts/verify-responses-api-usage.sh
```

See the `IMPLEMENTATION_STATUS.md` file for current implementation status and remaining tasks. 