# DDD-05: Introduce Factory for Challenge Creation

## Summary

This refactoring introduces a dedicated `ChallengeFactory` within the Challenge domain to encapsulate the complex logic involved in determining parameters, validating them, and creating valid Challenge entity instances. Previously, this logic was scattered throughout the `ChallengeCoordinator` class, violating the Single Responsibility Principle and making the coordinator harder to maintain.

## Changes Made

1. Created a new `ChallengeFactory` class in `src/core/challenge/factories/ChallengeFactory.js`
2. Extracted parameter determination and validation logic from `ChallengeCoordinator.generateAndPersistChallenge` to the factory
3. Updated the `ChallengeCoordinator` to use the factory for Challenge creation
4. Updated the DI container to register and inject the factory

## Why This Change Was Needed

The original implementation had several issues:

1. **Complex Creation Logic in Coordinator**: The `ChallengeCoordinator` was responsible for both orchestration and complex challenge creation logic
2. **Mixed Responsibilities**: Parameter determination, validation, and entity creation were all mixed together
3. **Lack of Domain-Driven Design Patterns**: Factory pattern is a standard DDD pattern for handling complex entity creation
4. **Poor Maintainability**: Changes to challenge creation logic required modifying the coordinator

## Domain-Driven Design Improvements

### Before

The `ChallengeCoordinator` was responsible for:
- Orchestrating the challenge generation flow
- Determining challenge parameters
- Validating parameters
- Creating the Challenge instance
- Managing conversation state
- Persisting the challenge

### After

- **ChallengeFactory**: Responsible for parameter determination, validation, and Challenge entity creation
- **ChallengeCoordinator**: Orchestrates the flow between different domain services
- **ChallengeConfigService**: Provides configuration data
- **ChallengeGenerationService**: Generates challenge content
- **ChallengeService**: Handles persistence operations

This aligns with DDD principles by:
1. Using a Factory pattern for complex entity creation
2. Maintaining clear boundaries between domain layers
3. Ensuring each class has a single responsibility
4. Following the Dependency Inversion Principle

## Benefits

1. **Improved Separation of Concerns**: Factory focuses solely on challenge creation
2. **Better Testability**: The factory can be unit tested independently
3. **Enhanced Reusability**: The factory can be used by other services if needed
4. **Cleaner Coordinator**: The coordinator is now cleaner and more focused on orchestration
5. **Extensibility**: New challenge types or validation rules can be added to the factory without modifying the coordinator

## Files Modified

- `src/core/challenge/factories/ChallengeFactory.js` - New file
- `src/application/challengeCoordinator.js` - Updated to use factory
- `src/config/container.js` - Updated registration

## Example of Improved Code

Before:
```javascript
// In ChallengeCoordinator
// Parameter determination, validation, and challenge creation all mixed together
if (difficultyManager && (!challengeType || !focusArea)) {
  // Get optimal next challenge recommendation
  const recommendation = difficultyManager.getNextChallengeRecommendation(user, userChallengeHistory);
  
  challengeParams = {
    challengeTypeCode: challengeType || recommendation.challengeType,
    focusArea: focusArea || recommendation.focusArea,
    formatTypeCode: formatType || recommendation.formatType,
    difficulty: difficulty || recommendation.difficulty
  };
  
  // Calculate difficulty settings...
}

// Validate parameters...

// Generate challenge...
```

After:
```javascript
// In ChallengeCoordinator
// Clean, single-line call to factory
const challengeEntity = await this.challengeFactory.createChallenge({
  user,
  recentChallenges,
  challengeTypeCode: challengeType,
  formatTypeCode: formatType,
  focusArea,
  difficulty,
  difficultyManager,
  config
});

// Generate content for challenge...
``` 