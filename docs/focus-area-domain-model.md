# Focus Area Domain Model

This document outlines the core Focus Area domain model in our Domain-Driven Design (DDD) architecture, explaining its structure, behavior, and integration with other components.

## Overview

The Focus Area domain represents a specific communication skill or topic that users can practice to improve their interaction with AI systems. Focus areas are personalized to the user's profile, history, and learning goals, providing a structured way to organize their learning journey.

## Domain Model

The Focus Area model follows the DDD principle of being a rich domain model with behavior, not just a data container.

### Core Properties

- **id**: Unique identifier for the focus area
- **userId**: User ID this focus area belongs to
- **name**: Name of the focus area
- **description**: Detailed description of the focus area
- **active**: Whether this focus area is currently active
- **priority**: Priority level (1-5, where 1 is highest)

### Metadata

- **metadata**: Additional metadata including:
  - **rationale**: Why this focus area is important for the user
  - **improvementStrategies**: Specific strategies to improve in this area
  - **recommendedChallengeTypes**: Challenge types that would help with this focus area

## Behavior

The Focus Area model includes rich behavior that enforces domain rules:

### State Management

- **isActive()**: Checks if the focus area is active
- **validate()**: Validates the focus area data

### Mutators

- **activate()**: Activates the focus area
- **deactivate()**: Deactivates the focus area
- **update(updates)**: Updates the focus area with new data

### Data Conversion

- **toObject()**: Converts the model to a plain object for storage
- **fromDatabase(record)**: Creates a model instance from database data

## Generation Process

The Focus Area generation process follows these steps:

1. **Request**: A service requests personalized focus areas based on user data and history
2. **Prompt Building**: The PromptBuilder facade creates a specialized prompt for focus area generation
3. **AI Processing**: The prompt is sent to OpenAI for creating focus area recommendations
4. **Domain Construction**: The response is parsed and Focus Area domain models are created
5. **Validation**: Each domain model validates its data and ensures it's in a valid state
6. **Return**: The Focus Area objects are returned to the requesting service

## Integration with Other Domains

The Focus Area domain interacts with several other domains:

- **User Domain**: Focus areas are generated for and owned by users
- **Challenge Domain**: Challenges are categorized by focus area
- **Progress Domain**: User progress is tracked for each focus area
- **Personality Domain**: Focus area recommendations are influenced by personality traits

## Code Example

```javascript
// Creating a new focus area
const focusArea = new FocusArea({
  userId: "user123",
  name: "Precision Questioning",
  description: "Formulating clear, specific questions to get the most useful information from AI systems",
  priority: 1,
  metadata: {
    rationale: "User showed difficulty in getting precise answers in previous interactions",
    improvementStrategies: [
      "Start with specific context before asking questions",
      "Break down complex questions into simpler components"
    ],
    recommendedChallengeTypes: [
      "scenario",
      "reverse-engineering"
    ]
  }
});

// Deactivating a focus area
focusArea.deactivate();

// Updating a focus area
focusArea.update({
  name: "Advanced Precision Questioning",
  priority: 2
});
```

## Benefits of the DDD Approach

- **Rich Behavior**: The Focus Area model encapsulates business rules and behaviors
- **Domain Integrity**: The model enforces its own validation and consistency rules
- **Expressiveness**: The code clearly expresses the domain concepts and relationships
- **Testability**: The domain logic can be easily tested in isolation

## Schema Validation

The focus area generation process uses Zod schema validation to ensure that all parameters passed to the generator are valid and complete. This adds an extra layer of type safety and validation before the AI is even called.

## Personalization

One of the key aspects of the Focus Area domain is personalization. The system analyzes:

- **Personality Traits**: How the user's personality influences their learning preferences
- **Learning History**: Previous challenges and their performance
- **Professional Context**: How the user's profession affects communication needs
- **Stated Goals**: The user's explicit learning goals and preferences

Based on this analysis, it generates focus areas that are tailored to the individual user's needs and context. 