# Challenge Module

## Overview

This directory contains documentation about the Challenge module, which generates personalized AI challenges for users based on their profile, focus areas, and learning goals.

## Architecture

The Challenge module follows a Domain-Driven Design (DDD) architecture, with clear separation of concerns:

1. **Domain Model** (`Challenge`) - Core domain entity with validation and lifecycle methods
2. **Domain Services** - Core business logic
   - `challengeGenerationService` - Handles AI generation using the OpenAI Responses API
   - `challengeThreadService` - Manages conversation threads for stateful interactions
   - `challengeEvaluationService` - Evaluates user responses using the OpenAI Responses API
3. **Application Services** - API-level functionality
   - `challengeService` - Coordinates domain services and repositories
4. **Repositories** - Data access
   - `challengeRepository` - Handles database operations

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

## Custom Challenge Types

The system supports AI-generated custom challenge types that go beyond predefined categories:

1. **Creating Custom Types**
   - When generating a challenge, set `allowDynamicTypes: true` in the prompt options
   - The AI can create entirely new challenge types tailored to the user's needs
   - Example custom types: "AI Ethical Paradox", "Multi-stakeholder Negotiation", "Future Technology Impact Analysis"

2. **Type Metadata Structure**
   ```json
   "typeMetadata": {
     "name": "AI Ethical Paradox",
     "description": "Challenges that present complex ethical dilemmas with no clear right answer",
     "parent": "critical-thinking",
     "learningGoals": ["Ethical reasoning", "Balanced decision-making"],
     "evaluationNote": "Evaluate based on consideration of multiple perspectives"
   }
   ```

3. **Parent-Child Relationships**
   - Custom types can inherit characteristics from parent types
   - This enables taxonomical organization of challenge types
   - Allows for specialized versions of existing challenge types

4. **Using Custom Types**
   - Custom types are stored in the database with their full metadata
   - They can be reused for future challenges for the same user
   - The system handles both predefined and custom types transparently

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

## Response Format

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

## API Usage

The module exclusively uses the OpenAI Responses API with:
- System instructions to ensure JSON formatting
- Format parameter set to 'json' for structured output
- Thread-based conversation management
- Appropriate error handling for API failures
- Different system prompts for generation and evaluation

## Evaluation Response Format

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

## Documentation

- `refactoring-summary.md` - Detailed summary of the refactoring process
- `supabase-integration.md` - Documentation for the Supabase integration

# Challenge Domain

## Overview

The Challenge Domain is a core component of the system, providing a flexible, database-driven approach to creating, managing, and evaluating cognitive challenges. This domain has been refactored from a hardcoded enum-based system to a dynamic, flexible model with support for parent-child relationships.

## Key Features

- **Dynamic Challenge Types**: Challenge types are stored in the database instead of being hardcoded in the code.
- **Parent-Child Relationships**: Challenge types can have parent-child relationships, allowing for more specialized subtypes.
- **Rich Metadata**: Both challenge types and format types support rich metadata to store additional information.
- **Domain Model**: A strong domain model with validation and lifecycle methods ensures data integrity.
- **Repository Layer**: A repository layer provides clean access to the database with proper error handling.

## Challenge Domain Model

The `Challenge` class is the core domain model, representing a single AI challenge for a user. It includes:

- **Properties**: All data related to the challenge, including type, format, content, and evaluation.
- **Validation**: Methods to ensure data integrity.
- **Lifecycle Methods**: Methods to manage the challenge lifecycle (update, submit, complete).
- **Utility Methods**: Convenience methods like `getChallengeTypeName()` and `getFormatTypeName()`.

## Challenge Types

Challenge types define the cognitive skill being tested. Some examples include:

- **Critical Thinking**: Challenges that test analytical and critical thinking abilities.
- **Ethical Dilemma**: Challenges centered around ethical reasoning and decision-making.
- **Creative Synthesis**: Challenges that test creative thinking and idea synthesis.
- **Human-AI Boundary**: Challenges exploring the boundary between human and AI capabilities.

Each challenge type can have subtypes that specialize in specific aspects of the parent type.

## Format Types

Format types define how the challenge is structured. Some examples include:

- **Multiple-Choice**: Questions with predefined answer options.
- **Open-Ended**: Questions requiring free-form responses.
- **Scenario**: A scenario followed by analysis questions.
- **Reflection**: Prompts that encourage deep thinking and reflection.

## Database Structure

The challenge domain uses several tables in the Supabase database:

- `challenge_types`: Stores challenge type definitions with parent-child relationships.
- `challenge_format_types`: Stores format type definitions.
- `trait_challenge_mappings`: Maps personality traits to challenge types.
- `focus_area_challenge_mappings`: Maps focus areas to challenge types.
- `challenges`: Stores individual challenge instances.

## Repository Layer

The repository layer provides clean access to the database with proper error handling:

- `challengeTypeRepository`: Manages challenge type operations.
- `challengeRepository`: Manages challenge instance operations.

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

## Usage Examples

### Creating a Challenge

```javascript
const Challenge = require('../models/Challenge');
const challengeCoordinator = require('../application/challengeCoordinator');

// Create a challenge
const challenge = new Challenge({
  userEmail: 'user@example.com',
  title: 'Critical Thinking Challenge',
  challengeTypeCode: 'critical-thinking',
  formatTypeCode: 'multiple-choice',
  focusArea: 'AI Ethics',
  difficulty: 'intermediate',
  content: {
    context: 'Consider the following scenario...',
    questions: [
      {
        id: 'q1',
        text: 'What ethical concerns are raised?',
        options: ['Privacy', 'Fairness', 'Transparency', 'All of the above']
      }
    ]
  }
});

// Save the challenge
await challengeCoordinator.saveChallenge(challenge);
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

## Advanced Features

### Dynamic Challenge Type Creation

The system supports creating entirely new challenge types dynamically:

```javascript
const challengeTypeRepository = require('../repositories/challengeTypeRepository');

// Create a new challenge type
await challengeTypeRepository.upsertChallengeType({
  code: 'quantum-computing-ethics',
  name: 'Quantum Computing Ethics',
  description: 'Explores ethical implications of quantum computing',
  parentTypeCode: 'ethical-dilemma',
  metadata: {
    examples: ['Cryptography impacts', 'Computing power distribution'],
    complexity: 'high'
  }
});
```

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

## Documentation

For more detailed documentation on specific aspects of the Challenge Domain, see:

- [Challenge Model Documentation](./model-documentation.md)
- [Parent-Child Relationships](./parent-child-relationships.md)
- [Supabase Integration](./supabase-integration.md)
- [Migration Guide](../migration/challenge-model-migration.md)

## Testing

The Challenge Domain includes comprehensive tests:

- `test-challenge-model.js`: Tests the Challenge domain model validation.
- `test-dynamic-challenge-types.js`: Tests parent-child relationships in challenge types.
- `test-challenge-caching.js`: Tests the caching mechanisms for challenges.
- `test-challenge-generation.js`: Tests the challenge generation process. 