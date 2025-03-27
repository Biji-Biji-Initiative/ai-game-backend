# Prompt System Design Patterns

This document outlines the key design patterns used in our prompt system architecture, explaining how they work together to create a robust and maintainable system.

## 1. Facade Pattern (Prompt Builder)

The Facade pattern provides a simplified interface to a complex subsystem. In our prompt system, the `promptBuilder` serves as a facade that hides the complexity of different prompt types and their specific builders.

### Implementation

```javascript
// src/core/prompt/promptBuilder.js
const promptBuilder = require('../../prompt/promptBuilder');

// Client code uses the simple facade interface
const prompt = await promptBuilder.buildPrompt('evaluation', {
  challenge,
  userResponse,
  options: promptOptions
});
```

### Key Benefits

- **Simplified Interface**: Clients don't need to know which specific builder to use
- **Centralized Registration**: All prompt builders are registered in one place
- **Dynamic Loading**: Prompt builders are loaded based on the type requested
- **Consistent API**: All prompt types are accessed through the same interface

## 2. Factory Pattern

While we've now implemented the Facade pattern as our primary interface, we previously used the Factory pattern and it still exists underneath the Facade.

### Implementation

```javascript
// src/core/prompt/promptFactory.js
const { PromptFactory, PROMPT_TYPES } = require('../../prompt/promptFactory');

const prompt = PromptFactory.buildPrompt(PROMPT_TYPES.EVALUATION, {
  challenge,
  userResponse,
  options: promptOptions
});
```

### Migration Strategy

We're gradually migrating from the Factory pattern to the Facade pattern for these reasons:

1. The Facade provides a cleaner external API
2. It allows for more flexibility in how prompts are built
3. It supports additional features like schema validation and response formatting

## 3. Builder Pattern

For each prompt type, we've implemented a specialized builder class that knows how to construct that specific prompt type.

### Implementation

```javascript
// src/core/prompt/builders/EvaluationPromptBuilder.js
class EvaluationPromptBuilder {
  static build(params) {
    // Build the evaluation prompt step by step
    // ...
    return prompt;
  }
}
```

### Key Benefits

- **Separation of Concerns**: Each builder focuses on one prompt type
- **Encapsulation**: Complex prompt construction logic is encapsulated
- **Flexibility**: Builders can be enhanced independently

## 4. Schema Validation Pattern

We've added schema validation using Zod to ensure that parameters passed to prompt builders are valid and complete.

### Implementation

```javascript
// src/core/prompt/schemas/evaluationSchema.js
const evaluationPromptSchema = z.object({
  challenge: challengeSchema,
  userResponse: userResponseSchema,
  user: userSchema.optional(),
  evaluationHistory: evaluationHistorySchema.optional(),
  options: optionsSchema.optional()
});

function validateEvaluationPromptParams(params) {
  return evaluationPromptSchema.parse(params);
}
```

### Key Benefits

- **Early Error Detection**: Invalid parameters are caught before prompt generation
- **Clear Error Messages**: Schema validation provides detailed error messages
- **Documentation**: Schemas serve as documentation for required parameters
- **Type Safety**: When used with TypeScript, provides type safety for prompt parameters

## 5. Formatter Pattern

We've implemented formatters to handle the parsing and processing of AI responses.

### Implementation

```javascript
// src/core/prompt/formatters/jsonFormatter.js
function formatJson(response, options = {}) {
  // Parse and validate JSON response
  // ...
  return jsonObject;
}
```

### Key Benefits

- **Consistent Processing**: All JSON responses are processed consistently
- **Error Handling**: Provides robust error handling for malformed responses
- **Validation**: Can validate responses against expected schemas
- **Cleanup**: Handles common AI response issues like markdown formatting

## Integration with Domain-Driven Design (DDD)

Our prompt system is designed to work seamlessly with our Domain-Driven Design architecture:

1. **Domain Services** (like `evaluationService.js`) use the prompt system to generate prompts
2. **Domain Models** (like `Evaluation.js`) represent the structured data
3. **Repositories** handle persistence concerns
4. **Aggregates** enforce domain rules and consistency

The prompt system sits at the infrastructure level, providing services to the domain layer without imposing domain knowledge on the infrastructure.

## Future Enhancements

Based on our `FUTURE_IMPROVEMENTS.md` document, we plan to enhance this system with:

1. **Caching**: Add a caching layer for frequently used prompts
2. **Batching**: Support building multiple prompts in a batch operation
3. **Enhanced Monitoring**: Add metrics for prompt generation and success rates
4. **Additional Prompt Types**: Implement the missing prompt builders
5. **Response Schemas**: Add schemas for validating AI responses

## Best Practices

When working with our prompt system, follow these guidelines:

1. **Always use the Facade**: Use `promptBuilder.buildPrompt()` rather than accessing builders directly
2. **Provide complete parameters**: Ensure all required parameters are provided
3. **Handle errors**: Prompt generation can fail, so handle errors appropriately
4. **Use schemas**: When adding new prompt types, create corresponding schemas
5. **Document prompt formats**: Keep prompt formats documented for maintainability 