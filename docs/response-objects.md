# Response Objects Reference

## The Response Object

The core object returned by the Responses API.

```json
{
  "id": "resp_67ccd2bed1ec8190b14f964abc0542670bb6a6b452d3795b",
  "object": "response",
  "created_at": 1741476542,
  "status": "completed",
  "error": null,
  "incomplete_details": null,
  "instructions": null,
  "max_output_tokens": null,
  "model": "gpt-4o-2024-08-06",
  "output": [
    {
      "type": "message",
      "id": "msg_67ccd2bf17f0819081ff3bb2cf6508e60bb6a6b452d3795b",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Response content",
          "annotations": []
        }
      ]
    }
  ],
  "parallel_tool_calls": true,
  "previous_response_id": null,
  "reasoning": {
    "effort": null,
    "generate_summary": null
  },
  "store": true,
  "temperature": 1.0,
  "text": {
    "format": {
      "type": "text"
    }
  },
  "tool_choice": "auto",
  "tools": [],
  "top_p": 1.0,
  "truncation": "disabled",
  "usage": {
    "input_tokens": 36,
    "input_tokens_details": {
      "cached_tokens": 0
    },
    "output_tokens": 87,
    "output_tokens_details": {
      "reasoning_tokens": 0
    },
    "total_tokens": 123
  },
  "user": null,
  "metadata": {}
}
```

### Core Properties

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier for the response |
| object | string | Always "response" |
| created_at | number | Unix timestamp of creation |
| status | string | One of: "completed", "failed", "in_progress", "incomplete" |
| model | string | Model ID used (e.g., "gpt-4o") |
| output | array | Array of output items |

### Status Values

- `completed`: Response generation finished successfully
- `failed`: An error occurred during generation
- `in_progress`: Currently generating
- `incomplete`: Generation stopped prematurely
- `error`: Contains error details if status is "failed"

### Output Types

1. Message Output
```json
{
  "type": "message",
  "id": "msg_abc123",
  "status": "completed",
  "role": "assistant",
  "content": [
    {
      "type": "output_text",
      "text": "Response text",
      "annotations": []
    }
  ]
}
```

2. Function Call Output
```json
{
  "type": "function_call",
  "id": "fc_abc123",
  "status": "completed",
  "function": {
    "name": "get_weather",
    "arguments": {
      "location": "San Francisco"
    }
  }
}
```

3. Tool Call Output
```json
{
  "type": "web_search_call",
  "id": "ws_abc123",
  "status": "completed",
  "results": [
    {
      "url": "https://example.com",
      "title": "Search Result",
      "content": "Result content"
    }
  ]
}
```

## Input Objects

### Text Input
```json
{
  "role": "user",
  "content": [
    {
      "type": "input_text",
      "text": "Your question or prompt"
    }
  ]
}
```

### Image Input
```json
{
  "role": "user",
  "content": [
    {
      "type": "input_text",
      "text": "Describe this image"
    },
    {
      "type": "input_image",
      "image_url": "https://example.com/image.jpg"
    }
  ]
}
```

### File Input
```json
{
  "role": "user",
  "content": [
    {
      "type": "input_text",
      "text": "What's in this document?"
    },
    {
      "type": "input_file",
      "file_id": "file-abc123"
    }
  ]
}
```

## Usage Information

The `usage` object provides token counting information:

```json
{
  "usage": {
    "input_tokens": 36,
    "input_tokens_details": {
      "cached_tokens": 0
    },
    "output_tokens": 87,
    "output_tokens_details": {
      "reasoning_tokens": 0
    },
    "total_tokens": 123
  }
}
```

## Error Objects

When a response fails, the error object contains:

```json
{
  "error": {
    "code": "error_code",
    "message": "Detailed error message",
    "param": "parameter_name",
    "type": "error_type"
  }
}
```

## Incomplete Details

When a response is incomplete:

```json
{
  "incomplete_details": {
    "reason": "max_tokens"
  }
}
```

Possible reasons:
- `max_tokens`: Token limit reached
- `content_filter`: Content filtered
- `tool_calls`: Tool call failed
- `other`: Other reasons
