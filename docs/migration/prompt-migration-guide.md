# Prompt Builder Migration Guide

## Overview

This guide explains how to migrate from the legacy prompt building architecture to the new class-based architecture. The new architecture provides several benefits:

- **Clear Responsibility Boundaries**: Each builder class has a single responsibility
- **Reduced Redundancy**: Common functionality extracted to shared modules
- **Improved Maintainability**: Consistent patterns across all prompt types
- **Better Extensibility**: Adding new prompt types is now straightforward
- **Standardized API Usage**: Ensures consistent use of OpenAI Responses API across all builders
- **Strict Error Handling**: All builders throw appropriate errors with no fallback mechanisms

## Directory Structure

```
prompts/
├── builders/                # Specialized prompt builder classes
│   ├── ChallengePromptBuilder.js    # Challenge prompt generation
│   ├── EvaluationPromptBuilder.js   # Evaluation prompt generation
│   ├── FocusAreaPromptBuilder.js    # Focus area prompt generation
│   ├── PersonalityPromptBuilder.js  # Personality insight prompt generation
│   └── ProgressPromptBuilder.js     # Progress analysis prompt generation
├── common/                  # Shared prompt utilities
│   ├── apiStandards.js      # API standardization utilities
│   └── formatters.js        # Common formatting functions
├── promptFactory.js         # Factory pattern for prompt generation
└── structuredPromptBuilder.js # Structured prompts for OpenAI API
```

## OpenAI API Migration: Chat Completions to Responses API

The migration from Chat Completions API to Responses API requires several changes to your code.

### Key Differences

| Chat Completions API | Responses API |
|---------------------|---------------|
| `openai.chat.completions.create()` | `openai.responses.create()` |
| `messages: [array]` | `instructions` + `input: { messages: [array] }` |
| `response_format` parameter | `format` parameter |
| Message content is string | Message content is either string or structured |
| `response.choices[0].message.content` | `response.output_text` |

### API Request Structure

**Chat Completions API (Old):**
```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello world' }
  ],
  response_format: { type: 'json_object' }
});

const content = response.choices[0].message.content;
```

**Responses API (New):**
```javascript
const response = await openai.responses.create({
  model: 'gpt-4o',
  instructions: 'You are a helpful assistant.',
  input: {
    messages: [
      { role: 'user', content: 'Hello world' }
    ]
  },
  format: 'json'
});

const content = response.output_text;
```

### JSON Response Handling

**Chat Completions API (Old):**
```javascript
const requestParams = {
  model: "gpt-4o",
  messages: messages,
  response_format: { type: "json_object" }
};
const response = await openai.chat.completions.create(requestParams);
const jsonContent = response.choices[0].message.content;
```

**Responses API (New):**
```javascript
const requestParams = {
  model: "gpt-4o",
  instructions: systemMessage,
  input: { messages: userMessages },
  format: "json"
};
const response = await openai.responses.create(requestParams);
const jsonContent = response.output_text;
```

### Thread Management

**Chat Completions API (Old):**
No built-in thread management - must be manually implemented.

**Responses API (New):**
```javascript
// First call
const initialResponse = await openai.responses.create({
  model: "gpt-4o",
  instructions: "You are a helpful assistant.",
  input: "Hello"
});

// Follow-up call using the previous response ID
const followUpResponse = await openai.responses.create({
  model: "gpt-4o",
  instructions: "You are a helpful assistant.",
  input: "Tell me more",
  previous_response_id: initialResponse.id
});
```

### System Message Handling

**Chat Completions API (Old):**
System message is included in the messages array.

**Responses API (New):**
System message goes in the `instructions` parameter.

## Migration Steps

### 1. Replace Direct Imports with PromptFactory

**Before:**
```javascript
const dynamicPromptBuilder = require('./dynamicPromptBuilder');
const templatePromptBuilder = require('./templatePromptBuilder');

// Using dynamic builder
const prompt = dynamicPromptBuilder.buildChallengePrompt(user, challengeParams, gameState);

// Using template builder
const prompt = templatePromptBuilder.buildChallengePrompt(user, challengeParams, gameState);
```

**After:**
```javascript
const { PromptFactory, PROMPT_TYPES } = require('./promptFactory');

// Using the unified factory pattern
const prompt = PromptFactory.buildPrompt(PROMPT_TYPES.CHALLENGE, {
  user,
  challengeParams,
  gameState
});
```

### 2. Update API Client Code

**Before:**
```javascript
const sendMessage = async (messages, options = {}) => {
  const requestParams = {
    model: options.model || "gpt-4",
    messages: messages,
    temperature: options.temperature || 0.7
  };
  
  if (options.responseFormat === 'json') {
    requestParams.response_format = { type: 'json_object' };
  }
  
  return await openai.chat.completions.create(requestParams);
};
```

**After:**
```javascript
const sendMessage = async (messages, options = {}) => {
  // Extract system message
  let systemMessage = null;
  const conversationMessages = [];
  
  messages.forEach(msg => {
    if (msg.role === 'system') {
      systemMessage = msg.content;
    } else {
      conversationMessages.push(msg);
    }
  });
  
  const requestParams = {
    model: options.model || "gpt-4o",
    temperature: options.temperature || 0.7
  };
  
  // Add instructions (system message)
  if (systemMessage) {
    requestParams.instructions = systemMessage;
  }
  
  // Add input messages
  if (conversationMessages.length > 0) {
    if (conversationMessages.length === 1 && conversationMessages[0].role === 'user') {
      requestParams.input = conversationMessages[0].content;
    } else {
      requestParams.input = { messages: conversationMessages };
    }
  }
  
  // Add JSON format if needed
  if (options.responseFormat === 'json') {
    requestParams.format = 'json';
  }
  
  // Add thread management
  if (options.previousResponseId) {
    requestParams.previous_response_id = options.previousResponseId;
  }
  
  return await openai.responses.create(requestParams);
};
```

### 3. Parameter Structure

The new architecture uses a consistent parameter structure for all prompt types:

| Prompt Type | Required Parameters | Optional Parameters |
|-------------|---------------------|---------------------|
| CHALLENGE | `user`, `challengeParams` | `gameState` |
| EVALUATION | `challenge`, `userResponse` | `user` |
| PERSONALITY_INSIGHT | `user` | `responses` |
| PROGRESS_ANALYSIS | `user`, `challengeHistory` | `performanceMetrics` |
| FOCUS_AREA | `user` | `challengeHistory`, `progressData` |

### 4. Error Handling

All builders now throw specific errors when required parameters are missing. Make sure to handle these errors appropriately:

```javascript
try {
  const prompt = PromptFactory.buildPrompt(PROMPT_TYPES.CHALLENGE, params);
  // Use the prompt
} catch (error) {
  logger.error('Error generating prompt', { error: error.message });
  // Handle the error appropriately
}
```

## Handling Responses API Responses

### JSON Parsing

```javascript
// Extract JSON content from Responses API response
let jsonContent;
if (response.output_text) {
  // Responses API format
  jsonContent = response.output_text;
} else if (response.choices && response.choices.length > 0) {
  // Legacy format (Chat Completions API)
  jsonContent = response.choices[0].message.content || "";
} else {
  jsonContent = "";
}

// Parse JSON response
let parsedJson;
try {
  parsedJson = JSON.parse(jsonContent);
} catch (parseError) {
  logger.error('Failed to parse JSON response', {
    error: parseError.message,
    content: jsonContent
  });
  
  throw new Error(`Failed to parse JSON response: ${parseError.message}`);
}
```

## Timeline

- **Immediate**: Start using the new PromptFactory for all new code
- **Short-term**: Refactor existing code to use the new architecture
- **Long-term**: Remove the legacy interfaces once all code has been migrated

## Key Benefits of the New Architecture

### 1. Strict Error Handling

In line with the project's core technical rules, all builders throw appropriate errors with no fallback mechanisms:

```javascript
// Example of error handling in a builder class
if (!user) {
  throw new Error('User profile is required for challenge prompt generation');
}
```

### 2. Exclusive Use of OpenAI Responses API

All prompt builders enforce the exclusive use of the OpenAI Responses API through standardized instructions:

```javascript
// System message for json formatting
const systemMessage = 'Always return your response as a JSON object with the following structure...';

// Append API standards to ensure consistent API usage instructions
prompt = appendApiStandards(prompt);
```

### 3. Clear Responsibility Boundaries

Each builder class has a single, well-defined responsibility, making the codebase more maintainable and easier to understand for new developers.

## Completed Migrations

The following modules have been fully migrated to the new architecture and Responses API:

- **Focus Areas**: Complete migration with Domain-Driven Design and Responses API
- **Challenges**: Partial migration with prompt factory pattern

## Questions?

If you have any questions about the migration process, please contact the development team.
