# Focus Area Module

## Overview

This directory contains documentation about the Focus Area module, which generates personalized AI communication focus areas for users based on their profile, personality traits, and interaction history.

## Architecture

The Focus Area module follows a Domain-Driven Design (DDD) architecture, with clear separation of concerns:

1. **Domain Model** (`FocusArea`) - Core domain entity with validation and lifecycle methods
2. **Domain Services** - Core business logic
   - `focusAreaGenerationService` - Handles AI generation using the OpenAI Responses API
   - `focusAreaThreadService` - Manages conversation threads for stateful interactions
3. **Application Services** - API-level functionality
   - `focusAreaService` - Coordinates domain services and repositories
4. **Repositories** - Data access
   - `focusAreaRepository` - Handles database operations

## Implementation Details

- Uses the Prompt Factory pattern for dynamic prompt generation
- Exclusively uses OpenAI Responses API (never Chat Completions API)
- Implements caching to reduce API calls
- Follows Single Responsibility Principle throughout the codebase
- Properly formats JSON responses from the API
- Implements thread-based conversations for context preservation

## Key Files

- `/src/core/focusArea/models/FocusArea.js` - Domain model
- `/src/core/focusArea/services/focusAreaGenerationService.js` - Core generation logic
- `/src/core/focusArea/services/focusAreaThreadService.js` - Thread management
- `/src/core/prompt/promptFactory.js` - Prompt factory implementation
- `/src/core/prompt/builders/FocusAreaPromptBuilder.js` - Focus area prompt builder
- `/src/services/focusAreaService.js` - API-level service
- `/src/utils/api/responsesApiClient.js` - OpenAI Responses API client

## Testing

- Test scripts are available in `/tests/focus-areas/` directory
- `test-focus-areas.js` validates the entire focus area generation pipeline:
  - Domain model validation
  - Thread service functionality
  - Generation service with OpenAI Responses API
  - End-to-end focus area generation flow

## Response Format

The focus area generation returns JSON data with the following structure:

```json
{
  "focusAreas": [
    {
      "name": "Focus Area Name",
      "description": "Detailed description of the focus area",
      "rationale": "Why this area was selected based on user data",
      "improvementStrategies": [
        "Strategy 1",
        "Strategy 2"
      ],
      "recommendedChallengeTypes": [
        "Challenge Type 1",
        "Challenge Type 2"
      ],
      "priorityLevel": "high|medium|low"
    }
  ],
  "overallRecommendation": "Summary of recommendations and approach"
}
```

## API Usage

The module exclusively uses the OpenAI Responses API with:
- System instructions to ensure JSON formatting
- Format parameter set to 'json' for structured output
- Thread-based conversation management
- Appropriate error handling for API failures

## Documentation

- `refactoring-summary.md` - Detailed summary of the refactoring process and implementation 