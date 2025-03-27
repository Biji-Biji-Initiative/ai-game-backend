# OpenAI Responses API Documentation

## Overview

The OpenAI Responses API is used throughout the Challenge system to generate personalized challenges, evaluate responses, and provide feedback. This document explains how the API is integrated and how to use it effectively.

## Response API Types

The `responsesApiTypes.js` module defines constants and types for working with the OpenAI Responses API.

### Available Models

```javascript
const ResponsesApiModel = {
  /** Default model for Responses API */
  DEFAULT: 'gpt-4o',
  /** GPT-4o model */
  GPT_4O: 'gpt-4o',
  /** Vision-capable model */
  GPT_4_VISION: 'gpt-4-vision-preview',
  /** Latest GPT-4 Turbo model */
  GPT_4_TURBO: 'gpt-4-turbo-preview',
  /** Base GPT-4 model */
  GPT_4: 'gpt-4',
  /** Latest GPT-3.5 Turbo model */
  GPT_3_5_TURBO: 'gpt-3.5-turbo'
};
```

### Message Roles

When creating messages for the API, each message must have a role:

```javascript
const MessageRole = {
  /** System role for instructions */
  SYSTEM: 'system',
  /** User role for input */
  USER: 'user',
  /** Assistant role for output */
  ASSISTANT: 'assistant'
};
```

### Response Formats

The API can return responses in different formats:

```javascript
const ResponseFormat = {
  /** Default text format */
  TEXT: 'text',
  /** JSON Object format */
  JSON: 'json'
};
```

## Working with Thread-Based Conversations

### Creating a Thread

```javascript
const openai = require('openai');
const client = new openai.OpenAI(process.env.OPENAI_API_KEY);

async function createThread() {
  const thread = await client.beta.threads.create();
  return thread.id;
}
```

### Adding Messages to a Thread

```javascript
async function addMessageToThread(threadId, content, role = 'user') {
  await client.beta.threads.messages.create(threadId, {
    role: role,
    content: content
  });
}
```

### Running an Assistant on a Thread

```javascript
async function runAssistant(threadId, assistantId) {
  const run = await client.beta.threads.runs.create(threadId, {
    assistant_id: assistantId
  });
  return run.id;
}
```

### Retrieving Messages

```javascript
async function getMessages(threadId) {
  const messages = await client.beta.threads.messages.list(threadId);
  return messages.data;
}
```

## JSON Format Handling

When working with structured data, it's recommended to use the JSON response format.

### Setting Up JSON Format

```javascript
const params = {
  model: ResponsesApiModel.DEFAULT,
  messages: [
    {
      role: MessageRole.SYSTEM,
      content: "You are a helpful assistant that responds in JSON format."
    },
    {
      role: MessageRole.USER,
      content: "Generate a challenge for critical thinking."
    }
  ],
  response_format: { type: ResponseFormat.JSON }
};
```

### Parsing JSON Responses

Always wrap JSON parsing in try/catch to handle malformed responses:

```javascript
try {
  const jsonResponse = JSON.parse(response.choices[0].message.content);
  return jsonResponse;
} catch (error) {
  console.error("Failed to parse JSON response:", error);
  throw new Error("Invalid JSON response from API");
}
```

## Best Practices

1. **Use System Messages Effectively**
   - Begin conversations with a system message that clearly defines the role and constraints.
   - Keep system messages concise but comprehensive.

2. **Maintain Conversation History**
   - Store thread IDs to continue conversations.
   - Consider conversation length limits (4096 tokens for most models).

3. **Handle Errors Gracefully**
   - Always include error handling for API calls.
   - Implement retries with exponential backoff for transient errors.

4. **Optimize Token Usage**
   - Be mindful of token limits.
   - Summarize or truncate conversation history when necessary.

5. **Monitor Performance**
   - Track API usage and latency.
   - Log relevant metrics for optimization.

## Integration with Challenge System

The Responses API is used in several key areas of the Challenge system:

1. **Challenge Generation**
   - Generating personalized challenges based on user profile
   - Creating dynamic challenge types

2. **Response Evaluation**
   - Evaluating user responses to challenges
   - Providing detailed feedback

3. **Insight Generation**
   - Generating personality insights
   - Recommending focus areas

## Environment Configuration

Ensure these environment variables are properly set:

```
OPENAI_API_KEY=your_openai_api_key
```

Optional configuration:

```
OPENAI_DEFAULT_MODEL=gpt-4o
OPENAI_TIMEOUT=30000
``` 