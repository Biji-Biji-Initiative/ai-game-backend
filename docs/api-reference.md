# API Reference

## Endpoints

### Create a Response
`POST https://api.openai.com/v1/responses`

Creates a model response. Supports text, image inputs, and tool integration.

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| input | string/array | Yes | Text or image inputs |
| model | string | Yes | Model ID (e.g., gpt-4o) |
| tools | array | No | Array of tools to use |
| previous_response_id | string | No | ID of previous response |
| temperature | number | No | Sampling temperature (0-2) |
| stream | boolean | No | Enable streaming responses |

#### Example Request

```json
{
  "model": "gpt-4o",
  "input": "Tell me about AI",
  "tools": [
    {
      "type": "web_search"
    }
  ],
  "temperature": 0.7
}
```

### Retrieve a Response
`GET https://api.openai.com/v1/responses/{response_id}`

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| response_id | string | Yes | ID of response to retrieve |

### Delete a Response
`DELETE https://api.openai.com/v1/responses/{response_id}`

## Objects

### Response Object

```json
{
  "id": "resp_abc123",
  "object": "response",
  "created_at": 1741476542,
  "status": "completed",
  "model": "gpt-4o",
  "output": [
    {
      "type": "message",
      "content": [
        {
          "type": "output_text",
          "text": "Response content"
        }
      ]
    }
  ]
}
```

### Tool Objects

#### Web Search
```json
{
  "type": "web_search"
}
```

#### File Search
```json
{
  "type": "file_search"
}
```

#### Function Call
```json
{
  "type": "function",
  "function": {
    "name": "function_name",
    "parameters": {
      "param1": "value1"
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Server Error |
