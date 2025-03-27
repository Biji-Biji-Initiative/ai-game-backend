# Examples

## Basic Text Generation

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "Write a haiku about programming"
});

console.log(response.output[0].content[0].text);
```

## Stateful Conversations

```javascript
// Initial response
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "Tell me about quantum computing"
});

// Follow-up question using previous response
const followUp = await openai.responses.create({
  model: "gpt-4o",
  input: "What are its practical applications?",
  previous_response_id: response.id
});
```

## Using Web Search

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "What are the latest developments in renewable energy?",
  tools: [{ type: "web_search" }]
});
```

## Multimodal Input

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: "What's in this image?"
        },
        {
          type: "input_image",
          image_url: "https://example.com/image.jpg"
        }
      ]
    }
  ]
});
```

## Custom Function Integration

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "What's the weather like in New York?",
  tools: [{
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather",
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

// Handle function call
if (response.output[0].type === "function_call") {
  const weatherData = await getWeather(
    response.output[0].function.arguments.location
  );
  
  const finalResponse = await openai.responses.create({
    model: "gpt-4o",
    input: weatherData,
    previous_response_id: response.id
  });
}
```

## Streaming Response

```javascript
const stream = await openai.responses.create({
  model: "gpt-4o",
  input: "Write a story about space exploration",
  stream: true
});

for await (const event of stream) {
  switch (event.type) {
    case "response.output_text.delta":
      process.stdout.write(event.delta);
      break;
    case "response.completed":
      console.log("\nDone!");
      break;
  }
}
```

## File Search Integration

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "Find information about API rate limits in our documentation",
  tools: [{ type: "file_search" }]
});
```

## Structured Output

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  input: "Extract name and age from: John Doe is 30 years old",
  text: {
    format: {
      type: "json",
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" }
        }
      }
    }
  }
});
```
