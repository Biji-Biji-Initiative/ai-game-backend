# Getting Started with Responses API

## Overview

The Responses API is OpenAI's most advanced interface for generating model responses. It combines the simplicity of Chat Completions with powerful tool-use capabilities.

## Key Features

- Text and image input support
- Stateful conversations
- Built-in tools (web search, file search)
- Function calling capabilities
- Streaming support

## Authentication

```bash
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json"
```

## Basic Usage

### Simple Text Response

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "Tell me a story about a unicorn"
});
```

### With Web Search

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "What's the latest news about AI?",
  tools: [{ type: "web_search" }]
});
```

### Continuing a Conversation

```javascript
const followUp = await openai.responses.create({
  model: "gpt-4o",
  input: "Tell me more about that",
  previous_response_id: response.id
});
```

## Response Structure

```javascript
{
  "id": "resp_abc123",
  "object": "response",
  "created_at": 1741476542,
  "status": "completed",
  "output": [{
    "type": "message",
    "content": [{
      "type": "output_text",
      "text": "Your response here"
    }]
  }]
}
```

## Next Steps

- Explore [Core Concepts](./core-concepts.md)
- Check out [Examples](./examples.md)
- Read the full [API Reference](./api-reference.md)
