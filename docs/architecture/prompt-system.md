# Prompt System Architecture

This document provides a comprehensive overview of the prompt system architecture, explaining how various design patterns work together to create a robust and maintainable system for interacting with the OpenAI Responses API.

## Overview

The prompt system is responsible for building structured prompts for different AI operations throughout the application. It provides a consistent interface for all prompt building operations while encapsulating the complexity of each specific prompt type.

## Key Design Patterns

### 1. Facade Pattern (Prompt Builder)

The Facade pattern is the primary interface for our prompt system. The `promptBuilder` serves as a facade that hides the complexity of different prompt types and their specific builders.

#### Implementation

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

#### Key Benefits

- **Simplified Interface**: Clients don't need to know which specific builder to use
- **Centralized Registration**: All prompt builders are registered in one place
- **Dynamic Loading**: Prompt builders are loaded based on the type requested
- **Consistent API**: All prompt types are accessed through the same interface

### 2. Builder Pattern

For each prompt type, we've implemented a specialized builder class that knows how to construct that specific prompt type.

#### Implementation

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

#### Key Benefits

- **Separation of Concerns**: Each builder focuses on one prompt type
- **Encapsulation**: Complex prompt construction logic is encapsulated
- **Flexibility**: Builders can be enhanced independently

### 3. Schema Validation Pattern

We've added schema validation using Zod to ensure that parameters passed to prompt builders are valid and complete.

#### Implementation

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

#### Key Benefits

- **Early Error Detection**: Invalid parameters are caught before prompt generation
- **Clear Error Messages**: Schema validation provides detailed error messages
- **Documentation**: Schemas serve as documentation for required parameters
- **Type Safety**: When used with TypeScript, provides type safety for prompt parameters

### 4. Formatter Pattern

We've implemented formatters to handle the parsing and processing of AI responses.

#### Implementation

```javascript
// src/core/prompt/formatters/jsonFormatter.js
function formatJson(response, options = {}) {
  // Parse and validate JSON response
  // ...
  return jsonObject;
}
```

#### Key Benefits

- **Consistent Processing**: All JSON responses are processed consistently
- **Error Handling**: Provides robust error handling for malformed responses
- **Validation**: Can validate responses against expected schemas
- **Cleanup**: Handles common AI response issues like markdown formatting

## Architecture Components

The Prompt System architecture consists of the following components:

1. **Core Facade** (`promptBuilder.js`): The main entry point that manages builder registration and delegation
2. **Prompt Types** (`promptTypes.js`): Defines the standard prompt types and their recommended models
3. **Specialized Builders**: Individual builder classes for different prompt types:
   - `EvaluationPromptBuilder`: For building evaluation prompts
   - `ChallengePromptBuilder`: For building challenge prompts
   - `FocusAreaPromptBuilder`: For building focus area prompts
   - `PersonalityPromptBuilder`: For building personality insight prompts
   - `ProgressPromptBuilder`: For building progress analysis prompts
4. **Schemas** (`schemas/*.js`): Zod schemas for validating parameters
5. **Formatters** (`formatters/*.js`): Utilities for processing AI responses

## Prompt Types

The system supports the following prompt types:

### Core Types
- `evaluation`: For evaluating user responses to challenges
- `challenge`: For generating new challenges
- `focusArea`: For generating focus area recommendations
- `personality`: For generating personality insights
- `progress`: For analyzing user progress

### Additional Types
- `scoreCalibration`: For calibrating evaluation scores
- `feedbackEnhancement`: For enhancing feedback quality
- `challengeVariation`: For generating variations of challenges
- `hintGeneration`: For generating hints for challenges
- `solutionGeneration`: For generating solutions to challenges
- `focusAreaRecommendations`: For recommending focus areas
- `skillMapping`: For mapping skills to focus areas
- `learningStyle`: For analyzing learning styles
- `skillAssessment`: For assessing skill levels
- `growthTrajectory`: For analyzing growth trajectories

## Usage

### Basic Usage

```javascript
const promptBuilder = require('../src/core/prompt/promptBuilder');

// Build a prompt using the type and parameters
const evaluationPrompt = await promptBuilder.buildPrompt('evaluation', {
  challenge: challenge,
  userResponse: userResponse,
  user: user,
  evaluationHistory: history
});
```

### Creating Specialized Builders

```javascript
// Create a specialized builder for a specific type
const buildEvaluationPrompt = promptBuilder.createBuilder('evaluation');

// Use the specialized builder directly
const prompt = await buildEvaluationPrompt({
  challenge: challenge,
  userResponse: userResponse,
  user: user
});
```

### Registering Custom Builders

```javascript
// Register a custom builder
promptBuilder.registerBuilder('customType', CustomPromptBuilder.build);
```

## Integration with Domain-Driven Design (DDD)

Our prompt system is designed to work seamlessly with our Domain-Driven Design architecture:

1. **Domain Services** (like `evaluationService.js`) use the prompt system to generate prompts
2. **Domain Models** (like `Evaluation.js`) represent the structured data
3. **Repositories** handle persistence concerns
4. **Aggregates** enforce domain rules and consistency

The prompt system sits at the infrastructure level, providing services to the domain layer without imposing domain knowledge on the infrastructure.

## Adding New Prompt Types

To add a new prompt type to the system:

1. Create a new specialized builder class in the `builders` directory
2. Implement the `build` static method in your class
3. Create a schema for validating parameters
4. Add the new type to the `PROMPT_TYPES` constant in `promptTypes.js`
5. Register the builder in the `registerBuilders` function in `promptBuilder.js`

## Testing

To test the prompt builder facade:

```bash
# Test the basic functionality
npm run test:prompt-builder

# Test all prompt builders
npm run test:all-prompt-builders
```

## Best Practices

1. **Always use the Facade**: Use `promptBuilder.buildPrompt()` rather than accessing builders directly
2. **Provide complete parameters**: Ensure all required parameters are provided
3. **Handle errors**: Prompt generation can fail, so handle errors appropriately
4. **Use schemas**: When adding new prompt types, create corresponding schemas
5. **Document prompt formats**: Keep prompt formats documented for maintainability

## Future Enhancements

Based on our improvement roadmap, we plan to enhance this system with:

1. **Caching**: Add a caching layer for frequently used prompts
2. **Batching**: Support building multiple prompts in a batch operation
3. **Enhanced Monitoring**: Add metrics for prompt generation and success rates
4. **Additional Prompt Types**: Implement the missing prompt builders
5. **Response Schemas**: Add schemas for validating AI responses 