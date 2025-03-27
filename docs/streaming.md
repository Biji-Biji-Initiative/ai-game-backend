# Streaming Guide

The Responses API supports streaming through server-sent events (SSE). This allows you to receive partial responses as they're generated.

## Enabling Streaming

Set `stream: true` in your request:

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "Tell me a story",
  stream: true
});
```

## Event Types

### Response Lifecycle Events

1. `response.created`
   - Emitted when response is initialized
   
2. `response.in_progress`
   - Indicates response generation has started
   
3. `response.completed`
   - Final event when response is complete
   
4. `response.failed`
   - Emitted if an error occurs

### Content Events

1. `response.output_text.delta`
```json
{
  "type": "response.output_text.delta",
  "delta": "Next part of text",
  "item_id": "msg_123",
  "output_index": 0,
  "content_index": 0
}
```

2. `response.output_text.done`
```json
{
  "type": "response.output_text.done",
  "text": "Complete text",
  "item_id": "msg_123",
  "output_index": 0,
  "content_index": 0
}
```

### Tool Events

1. `response.web_search_call.in_progress`
2. `response.web_search_call.searching`
3. `response.web_search_call.completed`

Similar events exist for file search and function calls.

## Example Implementation

```javascript
const stream = await openai.responses.create({
  model: "gpt-4o",
  input: "Tell me a story",
  stream: true
});

for await (const event of stream) {
  switch (event.type) {
    case "response.created":
      console.log("Response created:", event.response.id);
      break;
    case "response.output_text.delta":
      process.stdout.write(event.delta);
      break;
    case "response.completed":
      console.log("\nResponse completed!");
      break;
    case "response.failed":
      console.error("Error:", event.response.error);
      break;
  }
}
```

## Error Handling

```javascript
try {
  const stream = await openai.responses.create({
    model: "gpt-4o",
    input: "Tell me a story",
    stream: true
  });

  for await (const event of stream) {
    if (event.type === "error") {
      throw new Error(`${event.code}: ${event.message}`);
    }
    // Process events...
  }
} catch (error) {
  console.error("Stream error:", error);
}
```
