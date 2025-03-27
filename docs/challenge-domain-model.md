# Challenge Domain Model

This document outlines the core Challenge domain model in our Domain-Driven Design (DDD) architecture, explaining its structure, behavior, and integration with other components.

## Overview

The Challenge domain represents a learning challenge or exercise presented to a user in the system. Challenges can take various forms, from open-ended questions to technical exercises, and are central to the learning experience in our application.

## Domain Model

The Challenge model follows the DDD principle of being a rich domain model with behavior, not just a data container.

### Core Properties

- **id**: Unique identifier for the challenge
- **title**: Title of the challenge
- **content**: The content of the challenge, including context, scenario, and instructions
- **questions**: Array of questions that are part of the challenge
- **evaluationCriteria**: Criteria used to evaluate responses to the challenge
- **recommendedResources**: Resources recommended to help with the challenge

### Classification Properties

- **challengeType**: Type of challenge (e.g., 'analysis', 'technical', 'creativity')
- **formatType**: Format of the challenge (e.g., 'open-ended', 'multiple-choice', 'coding')
- **difficulty**: Difficulty level (e.g., 'beginner', 'intermediate', 'advanced')
- **focusArea**: Focus area of the challenge (e.g., 'AI Ethics', 'Technical Skills')

### Metadata

- **typeMetadata**: Additional metadata specific to the challenge type
- **formatMetadata**: Additional metadata specific to the format type
- **metadata**: General metadata about the challenge

## Behavior

The Challenge model includes rich behavior that enforces domain rules:

### State Management

- **isValid()**: Checks if the challenge is in a valid state
- **getChallengeTypeName()**: Gets the display name of the challenge type
- **getFormatTypeName()**: Gets the display name of the format type
- **requiresSpecificResponseFormat()**: Checks if the challenge requires a specific response format
- **getExpectedCompletionTime()**: Calculates the expected time to complete the challenge

### Mutators

- **addQuestion(question)**: Adds a question to the challenge
- **addEvaluationCriteria(key, criteria)**: Adds evaluation criteria to the challenge
- **addRecommendedResource(resource)**: Adds a recommended resource to the challenge
- **update(updates)**: Updates the challenge with new data

### Data Conversion

- **toObject()**: Converts the model to a plain object for storage
- **fromDatabase(data)**: Creates a model instance from database data

## Generation Process

The Challenge generation process follows these steps:

1. **Request**: A service requests a new challenge based on user data and parameters
2. **Prompt Building**: The PromptBuilder facade creates a specialized prompt for challenge generation
3. **AI Processing**: The prompt is sent to OpenAI for creating the challenge content
4. **Domain Construction**: The response is parsed and a Challenge domain model is created
5. **Validation**: The domain model validates the challenge data and ensures it's in a valid state
6. **Return**: The Challenge object is returned to the requesting service

## Integration with Other Domains

The Challenge domain interacts with several other domains:

- **User Domain**: Challenges are generated for and owned by users
- **Evaluation Domain**: User responses to challenges are evaluated using the challenge's criteria
- **Focus Area Domain**: Challenges are categorized by focus area
- **Progress Domain**: User progress is tracked based on completed challenges

## Code Example

```javascript
// Creating a new challenge
const challenge = new Challenge({
  title: "AI Ethics Case Study",
  content: {
    context: "Background about AI ethics...",
    scenario: "A company is deploying facial recognition...",
    instructions: "Analyze the ethical implications..."
  },
  challengeType: "analysis",
  formatType: "open-ended",
  difficulty: "intermediate",
  focusArea: "AI Ethics",
  userId: "user123"
});

// Adding a question
challenge.addQuestion({
  text: "What ethical principles are at stake in this scenario?",
  type: "open-ended"
});

// Adding evaluation criteria
challenge.addEvaluationCriteria("ethical_reasoning", {
  description: "Ability to identify and analyze ethical principles",
  weight: 0.4
});
```

## Benefits of the DDD Approach

- **Rich Behavior**: The Challenge model encapsulates business rules and behaviors
- **Domain Integrity**: The model enforces its own validation and consistency rules
- **Expressiveness**: The code clearly expresses the domain concepts and relationships
- **Testability**: The domain logic can be easily tested in isolation

## Schema Validation

The challenge generation process uses Zod schema validation to ensure that all parameters passed to the challenge generator are valid and complete. This adds an extra layer of type safety and validation before the AI is even called. 