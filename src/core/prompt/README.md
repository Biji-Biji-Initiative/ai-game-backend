# Prompt Domain

## Overview
The Prompt Domain is responsible for constructing text prompts sent to AI models (specifically the OpenAI Responses API). It provides a structured and consistent way to build prompts for various use cases across the application.

## Architecture
This domain follows Domain-Driven Design (DDD) principles and uses the following design patterns:

- **Facade Pattern**: `promptBuilder.js` provides a clean, unified interface to different prompt construction strategies
- **Builder Pattern**: Each file in `builders/` represents a specific strategy for constructing a particular type of prompt
- **Repository Pattern**: `PromptRepository.js` abstracts the persistence of templates and usage history
- **Schema Validation**: Uses Zod to define and validate the complex parameter objects expected by each builder

## Directory Structure
```
prompt/
├── builders/                # Specialized prompt builders for different use cases
│   ├── AdaptiveChallengeSelectionPromptBuilder.js
│   ├── ChallengePromptBuilder.js 
│   ├── DifficultyCalibratonPromptBuilder.js
│   ├── EngagementOptimizationPromptBuilder.js
│   ├── EvaluationPromptBuilder.js
│   ├── FocusAreaPromptBuilder.js
│   ├── PersonalityPromptBuilder.js
│   ├── PersonalizedLearningPathPromptBuilder.js
│   └── ProgressPromptBuilder.js
├── common/                  # Shared utilities used across the domain
│   ├── apiStandards.js      # Standards for API calls
│   └── errors.js            # Domain-specific error classes
├── repositories/            # Data access objects
│   └── PromptRepository.js  # Repository for prompt templates and history
├── schemas/                 # Zod validation schemas
│   ├── adaptiveChallengeSelectionSchema.js
│   ├── challengeSchema.js
│   ├── difficultyCalibratonSchema.js
│   ├── engagementOptimizationSchema.js
│   ├── evaluationSchema.js
│   ├── focusAreaSchema.js 
│   ├── personalitySchema.js
│   ├── personalizedLearningPathSchema.js
│   └── progressSchema.js
├── FUTURE_IMPROVEMENTS.md   # Planned improvements
├── promptBuilder.js         # Main facade for prompt building
├── promptTypes.js           # Defines standard prompt types and associations
└── README.md                # This file
```

**Note:** The following utilities have been moved to the infrastructure layer:
- `common/messageFormatter.js` → `src/infra/openai/messageFormatter.js`
- `formatters/jsonFormatter.js` → `src/infra/openai/responseHandler.js`

## Usage
Example of how to use the prompt builder:

```javascript
const { buildPrompt } = require('./promptBuilder');
const { PROMPT_TYPES } = require('./promptTypes');

// Build an evaluation prompt
async function evaluateUserResponse(challenge, userResponse, user) {
  // The buildPrompt function now returns both the prompt and systemMessage
  const { prompt, systemMessage } = await buildPrompt(PROMPT_TYPES.EVALUATION, {
    challenge,
    userResponse,
    user,
    personalityProfile: user.personalityProfile,
    evaluationHistory: user.evaluationHistory
  });
  
  // Use the system message when calling OpenAI
  const response = await openAIClient.createCompletion({
    prompt,
    systemMessage, // Dynamic system message based on user context
    model: 'gpt-4o'
  });
  
  return response;
}

### Dynamic System Messages

All prompt builders now support dynamic system messages that are personalized based on the user's context:

```javascript
// When calling promptBuilder.buildPrompt, you'll receive both the prompt and systemMessage
const { prompt, systemMessage } = await promptBuilder.buildPrompt(PROMPT_TYPES.CHALLENGE, {
  user,
  challengeParams,
  personalityProfile, // Pass personality profile for better personalization
  gameState,
  options: {}
});

// Then pass both to your OpenAI client
const response = await openAIClient.sendJsonMessage([
  {
    role: 'system',
    content: systemMessage
  },
  {
    role: 'user',
    content: prompt
  }
], apiOptions);
```

The system message is dynamically generated based on:
- User's skill level
- Communication style preferences
- Personality traits
- Learning style
- Progress metrics and history
- Challenge parameters

This provides a deeper level of personalization where both the content (prompt) and the AI's persona (system message) adapt to the user.

## Recently Completed Work
1. Fixed personality profile updated event handler in `adaptiveEvents.js`
2. Implemented all missing prompt builders:
   - AdaptiveChallengeSelectionPromptBuilder
   - DifficultyCalibratonPromptBuilder
   - PersonalizedLearningPathPromptBuilder
   - EngagementOptimizationPromptBuilder
3. Created schemas for all builders with Zod validation
4. Removed redundant `promptFactory.js` (consolidated into Facade pattern)
5. Populated formatters directory with `jsonFormatter.js`

## Next Steps
1. Implement performance optimizations:
   - Add caching for frequently used prompts
   - Implement batching for multiple prompt generation

2. Enhance testing:
   - Add unit tests for each builder
   - Implement integration tests
   - Add performance tests

3. Improve documentation:
   - Enhance JSDoc for all public methods
   - Document design patterns and architectural decisions

See `FUTURE_IMPROVEMENTS.md` for a more detailed roadmap. 