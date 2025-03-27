# Tools and Extensions

The Responses API provides built-in tools and supports custom function calling to extend the model's capabilities.

## Built-in Tools

### Web Search

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "What's new in AI?",
  tools: [{ type: "web_search" }]
});
```

The web search tool uses OpenAI's Index, optimized for chat applications.

### File Search

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "Find information about X in our docs",
  tools: [{ type: "file_search" }]
});
```

## Function Calling

Define custom functions that the model can call:

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "What's the weather in San Francisco?",
  tools: [{
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather in a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City name"
          }
        },
        required: ["location"]
      }
    }
  }]
});
```

### Handling Function Calls

```javascript
if (response.output[0].type === "function_call") {
  const result = await myWeatherAPI(
    response.output[0].function.arguments.location
  );
  
  // Continue conversation with function result
  const followUp = await openai.responses.create({
    model: "gpt-4o",
    input: result,
    previous_response_id: response.id
  });
}
```

## Parallel Tool Execution

Enable parallel tool calls for better performance:

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "Compare weather in NYC and SF",
  parallel_tool_calls: true,
  tools: [{
    type: "function",
    function: {
      name: "get_weather",
      // ... function definition
    }
  }]
});
```

## Tool Response Format

### Web Search Results
```json
{
  "type": "web_search_call",
  "status": "completed",
  "results": [
    {
      "url": "https://example.com",
      "title": "Example Article",
      "content": "Article content..."
    }
  ]
}
```

### File Search Results
```json
{
  "type": "file_search_call",
  "status": "completed",
  "results": [
    {
      "file_id": "file_abc123",
      "content": "Matched content...",
      "metadata": {
        "source": "document.pdf",
        "page": 1
      }
    }
  ]
}
```

### Function Call Results
```json
{
  "type": "function_call",
  "status": "completed",
  "function": {
    "name": "get_weather",
    "arguments": {
      "location": "San Francisco"
    }
  },
  "output": {
    "temperature": 72,
    "condition": "sunny"
  }
}
```
