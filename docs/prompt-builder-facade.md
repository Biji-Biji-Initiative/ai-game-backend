# Prompt Builder Facade

## Overview

The Prompt Builder Facade is a unified interface for building all types of prompts across the application. It follows the Facade design pattern to simplify the interaction with various specialized prompt builders while providing a consistent API.

## Key Features

- **Centralized Registration**: All prompt builders are registered in a central registry, making it easy to discover and use them
- **Dynamic Loading**: Builders are loaded dynamically based on the prompt type requested
- **Error Handling**: Consistent error handling for all prompt building operations
- **Extensibility**: Easy to add new prompt builders to support additional types
- **Standardized Parameters**: Common parameters like model selection and output format are standardized
- **Tracking**: Each prompt is assigned a unique ID for tracking and debugging

## Architecture

The Prompt Builder Facade consists of the following components:

1. **Core Facade** (`promptBuilder.js`): The main entry point that manages builder registration and delegation
2. **Prompt Types** (`promptTypes.js`): Defines the standard prompt types and their recommended models
3. **Specialized Builders**: Individual builder classes for different prompt types:
   - `EvaluationPromptBuilder`: For building evaluation prompts
   - `ChallengePromptBuilder`: For building challenge prompts
   - `FocusAreaPromptBuilder`: For building focus area prompts
   - `PersonalityPromptBuilder`: For building personality insight prompts
   - `ProgressPromptBuilder`: For building progress analysis prompts

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

## Adding New Prompt Types

To add a new prompt type to the system:

1. Create a new specialized builder class in the `builders` directory
2. Implement the `build` static method in your class
3. Add the new type to the `PROMPT_TYPES` constant in `promptTypes.js`
4. Register the builder in the `registerBuilders` function in `promptBuilder.js`

## Testing

To test the prompt builder facade:

```bash
# Test the basic functionality
npm run test:prompt-builder

# Test all prompt builders
npm run test:all-prompt-builders
```

## Best Practices

1. Always use the facade for building prompts rather than calling specialized builders directly
2. Follow the parameter conventions for each prompt type
3. Handle errors from the prompt builder gracefully
4. Use the specialized builder factory for repeated use of the same prompt type
5. When adding new prompt types, ensure they follow the same patterns as existing types 