# Core Concepts

## Stateful Conversations

The Responses API maintains conversation state automatically, eliminating the need for manual message history management.

```javascript
// Initial response
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "Tell me about Mars"
});

// Continue conversation
const followUp = await openai.responses.create({
  model: "gpt-4o",
  input: "What about its moons?",
  previous_response_id: response.id
});

// Retrieve past response
const pastResponse = await openai.responses.retrieve(response.id);
```

## Built-in Tools

### Available Tools
- Web Search
- File Search
- Function Calling
- Computer Use (upcoming)

### Tool Integration
```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "What's happening in tech?",
  tools: [
    { type: "web_search" },
    { type: "file_search" }
  ]
});
```

## Multimodal Support

### Supported Modalities
- Text
- Images
- Audio (upcoming)

### Example
```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: "Describe this image" },
        { type: "input_image", image_url: "https://example.com/image.jpg" }
      ]
    }
  ]
});
```

## Conversation Forking

Create branches from any point in a conversation:

```javascript
// Initial conversation
const response1 = await openai.responses.create({
  model: "gpt-4o",
  input: "Tell me about AI"
});

// Branch 1
const branch1 = await openai.responses.create({
  model: "gpt-4o",
  input: "Focus on machine learning",
  previous_response_id: response1.id
});

// Branch 2 (different direction from same point)
const branch2 = await openai.responses.create({
  model: "gpt-4o",
  input: "Focus on neural networks",
  previous_response_id: response1.id
});
```

## Response Structure

```javascript
{
  "id": "resp_abc123",
  "object": "response",
  "created_at": 1741476542,
  "status": "completed",
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

## Response Status

- `completed`: Successfully generated
- `failed`: Error occurred
- `in_progress`: Currently generating
- `incomplete`: Generation stopped prematurely

## Best Practices

1. **State Management**
   - Use `previous_response_id` for conversation continuity
   - Store response IDs for important conversation points

2. **Tool Usage**
   - Enable `parallel_tool_calls` for better performance
   - Combine multiple tools when needed

3. **Error Handling**
   - Check response status
   - Handle incomplete responses
   - Implement proper error recovery

4. **Performance**
   - Use streaming for long responses
   - Implement proper timeout handling
   - Cache frequently accessed responses
