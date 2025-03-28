# Challenge Domain

This document provides a comprehensive overview of the Challenge domain in our Domain-Driven Design (DDD) architecture, explaining its structure, behavior, and integration with other components.

## Overview

The Challenge domain represents a learning challenge or exercise presented to a user in the system. Challenges can take various forms, from open-ended questions to technical exercises, and are central to the learning experience in our application.

The Challenge module generates personalized AI challenges for users based on their profile, focus areas, and learning goals, following a Domain-Driven Design (DDD) architecture with clear separation of concerns.

## Architecture

The Challenge module follows a Domain-Driven Design (DDD) architecture:

1. **Domain Model** (`Challenge`) - Core domain entity with validation and lifecycle methods
2. **Domain Services** - Core business logic
   - `challengeGenerationService` - Handles AI generation using the OpenAI Responses API
   - `challengeThreadService` - Manages conversation threads for stateful interactions
   - `challengeEvaluationService` - Evaluates user responses using the OpenAI Responses API
3. **Application Services** - API-level functionality
   - `challengeService` - Coordinates domain services and repositories
4. **Repositories** - Data access
   - `challengeRepository` - Handles database operations
   - `challengeTypeRepository` - Manages challenge type operations

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

## Flexible Type System

The Challenge module uses a flexible type system that supports both predefined and dynamically generated challenge types:

1. **Challenge Types Table**
   - Stores predefined and AI-generated challenge types
   - Supports hierarchical type structures with parent-child relationships
   - Each type has a unique code, name, and description

2. **Format Types Table**
   - Defines the format of challenges (multiple-choice, open-ended, etc.)
   - Provides a basis for UI rendering and response evaluation

3. **Dynamic Type Creation**
   - AI can generate novel challenge types beyond predefined categories
   - Custom types are stored with metadata for future reference
   - Enables truly personalized learning experiences

### Parent-Child Relationships

Challenge types can have parent-child relationships:

```javascript
// Parent type
await challengeTypeRepository.upsertChallengeType({
  code: 'critical-thinking',
  name: 'Critical Thinking',
  description: 'Challenges that test critical thinking abilities'
});

// Child type
await challengeTypeRepository.upsertChallengeType({
  code: 'logical-fallacy-detection',
  name: 'Logical Fallacy Detection',
  description: 'Identify logical fallacies in arguments',
  parentTypeCode: 'critical-thinking'
});
```

### Custom Challenge Types

The system supports AI-generated custom challenge types that go beyond predefined categories:

```json
"typeMetadata": {
  "name": "AI Ethical Paradox",
  "description": "Challenges that present complex ethical dilemmas with no clear right answer",
  "parent": "critical-thinking",
  "learningGoals": ["Ethical reasoning", "Balanced decision-making"],
  "evaluationNote": "Evaluate based on consideration of multiple perspectives"
}
```

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

## Response Formats

### Challenge Generation Response Format

The challenge generation returns JSON data with the following structure:

```json
{
  "title": "Challenge Title",
  "challengeTypeCode": "critical-thinking or custom",
  "challengeTypeName": "Critical Thinking or Novel Type Name",
  "formatTypeCode": "open-ended",
  "content": {
    "context": "Detailed context for the challenge",
    "scenario": "Specific scenario or problem statement",
    "instructions": "Instructions for the user"
  },
  "questions": [
    {
      "id": "q1",
      "text": "Question text",
      "type": "multiple-choice | open-ended | reflection",
      "options": ["Option 1", "Option 2", "Option 3"] // For multiple-choice only
    }
  ],
  "typeMetadata": {
    "name": "Custom Type Name",
    "description": "Description of this novel challenge type",
    "learningGoals": ["Goal 1", "Goal 2"]
  },
  "evaluationCriteria": {
    "criteria1": {
      "description": "Description of criteria",
      "weight": 0.3
    }
  }
}
```

### Evaluation Response Format

The evaluation service returns JSON data with the following structure:

```json
{
  "overallScore": 85,
  "categoryScores": {
    "understanding": 90,
    "reasoning": 80,
    "communication": 85
  },
  "feedback": "Overall feedback text explaining the evaluation",
  "strengths": [
    "Strength 1",
    "Strength 2"
  ],
  "improvementSuggestions": [
    "Suggestion 1",
    "Suggestion 2"
  ],
  "challengeTypeName": "Critical Thinking",
  "formatTypeName": "Open Ended"
}
```

## Database Structure

The challenge domain uses several tables in the Supabase database:

- `challenge_types`: Stores challenge type definitions with parent-child relationships.
- `challenge_format_types`: Stores format type definitions.
- `trait_challenge_mappings`: Maps personality traits to challenge types.
- `focus_area_challenge_mappings`: Maps focus areas to challenge types.
- `challenges`: Stores individual challenge instances.

## Key Workflows

### Challenge Generation

1. User profile is analyzed to determine appropriate challenge types.
2. A challenge type is selected based on focus area or personality traits.
3. The challenge is generated using OpenAI's Responses API with appropriate prompts.
4. The challenge is stored in the database as a new Challenge instance.

### Challenge Submission

1. User submits responses to a challenge.
2. Responses are validated and stored.
3. The challenge status is updated to 'submitted'.

### Challenge Evaluation

1. Submitted responses are evaluated using OpenAI's Responses API.
2. Evaluation results are stored with the challenge.
3. The challenge status is updated to 'completed'.

## Implementation Details

- Uses the Prompt Factory pattern for dynamic prompt generation
- Exclusively uses OpenAI Responses API (never Chat Completions API)
- Implements caching to reduce API calls
- Follows Single Responsibility Principle throughout the codebase
- Properly formats JSON responses from the API
- Implements thread-based conversations for context preservation

## Key Files

- `/src/core/challenge/models/Challenge.js` - Domain model
- `/src/core/challenge/services/challengeGenerationService.js` - Core generation logic
- `/src/core/challenge/services/challengeThreadService.js` - Thread management
- `/src/core/challenge/services/challengeEvaluationService.js` - Response evaluation
- `/src/core/prompt/promptFactory.js` - Prompt factory implementation
- `/src/core/prompt/builders/ChallengePromptBuilder.js` - Challenge prompt builder
- `/src/repositories/challengeRepository.js` - Data access layer
- `/src/utils/db/challengeDbMapper.js` - Database mapping utilities
- `/migrations/challenge_table.sql` - Database schema definition

## Usage Examples

### Creating a Challenge

```javascript
const Challenge = require('../models/Challenge');

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

### Generating a Challenge

```javascript
const challengeCoordinator = require('../application/challengeCoordinator');

// Generate a challenge
const generatedChallenge = await challengeCoordinator.generateChallenge({
  userEmail: 'user@example.com',
  challengeTypeCode: 'ethical-dilemma',
  formatTypeCode: 'scenario',
  focusArea: 'AI Ethics',
  difficulty: 'advanced'
});
```

### Submitting Responses

```javascript
const challengeCoordinator = require('../application/challengeCoordinator');

// Submit responses
await challengeCoordinator.submitResponses('challenge-id-123', [
  {
    questionId: 'q1',
    response: 'All of the above'
  }
]);
```

## Schema Validation

The challenge generation process uses Zod schema validation to ensure that all parameters passed to the challenge generator are valid and complete. This adds an extra layer of type safety and validation before the AI is even called.

## Benefits of the DDD Approach

- **Rich Behavior**: The Challenge model encapsulates business rules and behaviors
- **Domain Integrity**: The model enforces its own validation and consistency rules
- **Expressiveness**: The code clearly expresses the domain concepts and relationships
- **Testability**: The domain logic can be easily tested in isolation

## Testing

The Challenge Domain includes comprehensive tests:

- `test-challenge-model.js`: Tests the Challenge domain model validation.
- `test-dynamic-challenge-types.js`: Tests parent-child relationships in challenge types.
- `test-challenge-caching.js`: Tests the caching mechanisms for challenges.
- `test-challenge-generation.js`: Tests the challenge generation process.

## Related Documentation

For more detailed documentation on specific aspects of the Challenge Domain, see:
- [Challenge API](../../api/challenge-api.md)
- [Focus Area API](../../api/focus-area-api.md)
- [Evaluation API](../../api/evaluation-api.md) 