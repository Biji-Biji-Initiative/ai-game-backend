# Prompt Builder Refactoring Plan

## Current Issues

1. **Prompt Builders Have Overlapping Responsibilities**:
   - Multiple similar formatting functions across different builders
   - Inconsistent error handling approaches
   - Duplicate code for building prompt sections

2. **Common Functionality Not Properly Extracted**:
   - Formatting logic spread across files
   - API standards not consistently applied
   - Error handling patterns repeated

3. **Naming Consistency Issues**:
   - Mix of naming styles
   - Unclear function names

## Refactoring Strategy

### 1. Unified Interface

Create a clean facade in `promptBuilder.js` that delegates to domain-specific prompt builders:

```javascript
// promptBuilder.js
const { logger } = require('../logger');
const { InvalidPromptTypeError } = require('../errors/promptGenerationErrors');

// Import domain-specific prompt builders
const ChallengePromptBuilder = require('./builders/ChallengePromptBuilder');
const FocusAreaPromptBuilder = require('./builders/FocusAreaPromptBuilder');
const EvaluationPromptBuilder = require('./builders/EvaluationPromptBuilder');
const PersonalityPromptBuilder = require('./builders/PersonalityPromptBuilder');
const ProgressPromptBuilder = require('./builders/ProgressPromptBuilder');

// Prompt types enum for better type safety
const PromptType = {
  CHALLENGE: 'challenge',
  FOCUS_AREA: 'focusArea',
  EVALUATION: 'evaluation',
  PERSONALITY: 'personality',
  PROGRESS: 'progress'
};

/**
 * Build a prompt based on type and parameters
 * @param {string} type - Type of prompt to build (use PromptType enum)
 * @param {Object} params - Parameters for the prompt
 * @returns {string} Generated prompt
 * @throws {InvalidPromptTypeError} If the prompt type is not supported
 */
function buildPrompt(type, params) {
  logger.debug('Building prompt', { type, params: Object.keys(params) });
  
  try {
    switch (type) {
      case PromptType.CHALLENGE:
        return ChallengePromptBuilder.build(params);
      case PromptType.FOCUS_AREA:
        return FocusAreaPromptBuilder.build(params);
      case PromptType.EVALUATION:
        return EvaluationPromptBuilder.build(params);
      case PromptType.PERSONALITY:
        return PersonalityPromptBuilder.build(params);
      case PromptType.PROGRESS:
        return ProgressPromptBuilder.build(params);
      default:
        throw new InvalidPromptTypeError(type, Object.values(PromptType));
    }
  } catch (error) {
    // Only catch and re-log the error, then rethrow it
    if (!(error instanceof InvalidPromptTypeError)) {
      logger.error('Error building prompt', { 
        type, 
        error: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

module.exports = {
  buildPrompt,
  PromptType
};
```

### 2. Enhanced Prompt Builders

Refactor each prompt builder for consistency and better separation of concerns:

- Keep using the existing builders directory structure
- Ensure consistent error handling using the existing error classes
- Extract common formatting logic to shared modules

### 3. Updated Common Modules

#### formatters.js

Enhance the existing formatters.js to include all formatting functions:

```javascript
// formatters.js - All prompt formatting logic
const { logger } = require('../../logger');

module.exports = {
  formatUserProfile,
  formatChallengeParameters,
  formatEvaluationCriteria,
  formatProgressData,
  formatFocusAreaHistory,
  formatGameState
};
```

#### apiStandards.js

Enhance the existing apiStandards.js to ensure consistent OpenAI Responses API usage:

```javascript
// apiStandards.js - Responses API standards
const { logger } = require('../../logger');

module.exports = {
  appendApiStandards,
  getResponsesApiInstruction,
  getStructuredOutputInstructions,
  appendErrorHandlingInstructions
};
```

### 4. Implementation Guidelines

1. **Leverage Existing Error Classes**:
   - Use `MissingParameterError`, `ApiIntegrationError`, and other existing error classes
   - Maintain strict error throwing (no fallbacks)

2. **Single Responsibility**:
   - Each builder should focus only on its specific domain
   - Extract common functionality to shared modules

3. **Consistent Patterns**:
   - All builders should follow the same structure
   - All builders should handle errors consistently
   - All builders should validate input parameters

4. **Documentation**:
   - Update JSDoc for all functions
   - Add usage examples for new facade
   - Document error handling expectations
