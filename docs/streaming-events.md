# Streaming Events Reference

## Event Types Overview

### Lifecycle Events

1. `response.created`
2. `response.in_progress`
3. `response.completed`
4. `response.failed`
5. `response.incomplete`

### Content Events

1. `response.output_item.added`
2. `response.output_item.done`
3. `response.content_part.added`
4. `response.content_part.done`
5. `response.output_text.delta`
6. `response.output_text.annotation.added`
7. `response.output_text.done`
8. `response.refusal.delta`
9. `response.refusal.done`

### Tool Events

1. `response.function_call_arguments.delta`
2. `response.function_call_arguments.done`
3. `response.file_search_call.in_progress`
4. `response.file_search_call.searching`
5. `response.file_search_call.completed`
6. `response.web_search_call.in_progress`
7. `response.web_search_call.searching`
8. `response.web_search_call.completed`

## Detailed Event Specifications

### response.created

Emitted when a response is initialized.

```json
{
  "type": "response.created",
  "response": {
    "id": "resp_67ccfcdd16748190a91872c75d38539e09e4d4aac714747c",
    "object": "response",
    "created_at": 1741487325,
    "status": "in_progress",
    "model": "gpt-4o-2024-08-06",
    "output": [],
    "parallel_tool_calls": true,
    "previous_response_id": null,
    "store": true,
    "temperature": 1,
    "text": {
      "format": {
        "type": "text"
      }
    }
  }
}
```

### response.in_progress

Emitted during response generation.

```json
{
  "type": "response.in_progress",
  "response": {
    "id": "resp_67ccfcdd16748190a91872c75d38539e09e4d4aac714747c",
    "status": "in_progress",
    // ... other response properties
  }
}
```

### response.output_text.delta

Emitted for each text chunk.

```json
{
  "type": "response.output_text.delta",
  "item_id": "msg_123",
  "output_index": 0,
  "content_index": 0,
  "delta": "Next part of text"
}
```

### response.function_call_arguments.delta

Emitted during function call argument generation.

```json
{
  "type": "response.function_call_arguments.delta",
  "item_id": "item-abc",
  "output_index": 0,
  "delta": "{ \"arg\":"
}
```

## Error Events

### error

Emitted when an error occurs.

```json
{
  "type": "error",
  "code": "ERR_SOMETHING",
  "message": "Something went wrong",
  "param": null
}
```

## Event Handling Best Practices

### 1. Handling Text Generation

```javascript
for await (const event of stream) {
  switch (event.type) {
    case "response.output_text.delta":
      // Append text chunks as they arrive
      appendText(event.delta);
      break;
    case "response.output_text.done":
      // Final text is available
      finalizeText(event.text);
      break;
  }
}
```

### 2. Tool Call Handling

```javascript
for await (const event of stream) {
  switch (event.type) {
    case "response.web_search_call.in_progress":
      showSearchingIndicator();
      break;
    case "response.web_search_call.completed":
      hideSearchingIndicator();
      break;
  }
}
```

### 3. Error Handling

```javascript
for await (const event of stream) {
  if (event.type === "error") {
    handleError(event.code, event.message);
    break;
  }
}
```
