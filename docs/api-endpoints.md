# API Endpoints Reference

## Create a Response
`POST https://api.openai.com/v1/responses`

Creates a model response with text or image inputs to generate text outputs.

### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| input | string or array | Yes | Text, image, or file inputs to the model |
| model | string | Yes | Model ID (e.g., gpt-4o) |
| include | array or null | No | Additional output data to include |
| instructions | string or null | No | System message for context |
| max_output_tokens | integer or null | No | Upper bound for generated tokens |
| metadata | map | No | Key-value pairs for additional information |
| parallel_tool_calls | boolean | No | Allow parallel tool execution (default: true) |
| previous_response_id | string or null | No | ID of previous response for conversations |
| store | boolean | No | Store response for later retrieval (default: true) |
| stream | boolean | No | Enable streaming response (default: false) |
| temperature | number | No | Sampling temperature (default: 1.0) |
| text | object | No | Text response configuration |
| tool_choice | string or object | No | Tool selection configuration |
| tools | array | No | Available tools for the model |
| top_p | number | No | Nucleus sampling parameter (default: 1.0) |
| truncation | string | No | Truncation strategy (default: "disabled") |
| user | string | No | End-user identifier |

### Example Request
```bash
curl https://api.openai.com/v1/responses \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -d '{
    "model": "gpt-4o",
    "input": "Tell me a story about a unicorn"
  }'
```

## Get a Response
`GET https://api.openai.com/v1/responses/{response_id}`

Retrieves a specific response by ID.

### Path Parameters
- response_id (string, required): The ID of the response to retrieve

### Query Parameters
- include (array, optional): Additional fields to include in response

### Example Request
```bash
curl https://api.openai.com/v1/responses/resp_123 \\
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## Delete a Response
`DELETE https://api.openai.com/v1/responses/{response_id}`

Deletes a specific response by ID.

### Path Parameters
- response_id (string, required): The ID of the response to delete

### Example Request
```bash
curl -X DELETE https://api.openai.com/v1/responses/resp_123 \\
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## List Input Items
`GET https://api.openai.com/v1/responses/{response_id}/input_items`

Returns input items for a specific response.

### Path Parameters
- response_id (string, required): Response ID to get inputs for

### Query Parameters
- after (string, optional): Item ID for pagination
- before (string, optional): Item ID for pagination
- limit (integer, optional): Results per page (default: 20)
- order (string, optional): Sort order (asc/desc)

### Example Request
```bash
curl https://api.openai.com/v1/responses/resp_123/input_items \\
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## Response Objects

### Response Object
```json
{
  "id": "resp_123",
  "object": "response",
  "created_at": 1741476542,
  "status": "completed",
  "model": "gpt-4o",
  "output": [...],
  "usage": {
    "input_tokens": 36,
    "output_tokens": 87,
    "total_tokens": 123
  }
}
```

### Input Item List Object
```json
{
  "object": "list",
  "data": [...],
  "first_id": "msg_123",
  "last_id": "msg_456",
  "has_more": false
}
```

## Error Handling

### Error Object
```json
{
  "error": {
    "code": "error_code",
    "message": "Error description",
    "param": "parameter_name",
    "type": "error_type"
  }
}
```

### Common Error Codes
- 401: Invalid authentication
- 403: Insufficient permissions
- 429: Rate limit exceeded
- 500: Server error

## Rate Limits

Monitor rate limits using response headers:
- x-ratelimit-limit-requests
- x-ratelimit-remaining-requests
- x-ratelimit-reset-requests
