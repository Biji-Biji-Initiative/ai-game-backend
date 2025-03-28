# ARCH-05-REVISIT: Refine ChallengeCoordinator Dependencies

## Summary

This refactoring addresses architectural concerns with the `ChallengeCoordinator` class by introducing a new domain service, `ChallengeConfigService`, to encapsulate configuration-related operations. Previously, the coordinator directly injected and used multiple configuration repositories, which violated separation of concerns and created unnecessary coupling.

## Changes Made

1. Created a new `ChallengeService` implementation that encapsulates core challenge operations
2. Created a new `ChallengeConfigService` that encapsulates all configuration-related operations 
3. Updated `ChallengeCoordinator` to depend on these higher-level domain services rather than repositories
4. Updated the DI container to register the new services and inject them into the coordinator

## Why This Change Was Needed

The original implementation had several issues:

1. **Violation of Single Responsibility Principle**: The coordinator was responsible for too many things - orchestration, data access, and configuration management.
2. **Inappropriate Dependency Level**: The coordinator injected low-level repositories instead of depending on higher-level domain services.
3. **Tight Coupling**: Direct dependency on repositories made the coordinator harder to test and maintain.
4. **Poor Encapsulation**: Configuration-related operations were scattered across the coordinator, making them harder to reuse.

## Architectural Improvements

### Before
```
ChallengeCoordinator
├── userService
├── challengeService
├── challengeTypeRepository     ┐
├── formatTypeRepository        │ Configuration repositories
├── focusAreaConfigRepository   │ directly injected
├── difficultyLevelRepository   ┘
├── challengeGenerationService
├── challengeEvaluationService
└── ...
```

### After
```
ChallengeCoordinator
├── userService
├── challengeService             ┐ 
├── challengeConfigService ──────┼── Higher-level domain services
├── challengeGenerationService   │
├── challengeEvaluationService   ┘
└── ...

ChallengeConfigService
├── challengeTypeRepository     ┐
├── formatTypeRepository        │ Configuration repositories
├── focusAreaConfigRepository   │ encapsulated
├── difficultyLevelRepository   ┘
```

## Benefits

1. **Improved Separation of Concerns**: Each service has a clear, focused responsibility
2. **Better Testability**: The coordinator can be tested with mocked services instead of repositories
3. **Enhanced Reusability**: Config operations can be reused across multiple services
4. **Simplified Coordinator**: Coordinator now focuses on orchestration, delegating details to domain services
5. **More Maintainable Code**: Changes to configuration logic don't require modifying the coordinator

## Files Modified

- `src/core/challenge/services/ChallengeService.js` - Created implementation
- `src/core/challenge/services/ChallengeConfigService.js` - New service
- `src/application/challengeCoordinator.js` - Updated to use new services
- `src/config/container.js` - Updated DI registration

## Example of Improved Code

Before:
```javascript
// In ChallengeCoordinator
if (config) {
  if (config.game && config.game.challengeTypes && 
      !config.game.challengeTypes.some(type => type.id === challengeParams.challengeTypeCode)) {
    throw new ChallengeGenerationError(`Invalid challenge type: ${challengeParams.challengeTypeCode}`);
  }
  
  if (config.game && config.game.focusAreas &&
      !config.game.focusAreas.includes(challengeParams.focusArea)) {
    throw new ChallengeGenerationError(`Invalid focus area: ${challengeParams.focusArea}`);
  }
}
```

After:
```javascript
// In ChallengeCoordinator
if (config) {
  // Validate challenge type
  const validTypes = await this.challengeConfigService.getAllChallengeTypes();
  if (!validTypes.some(type => type.code === challengeParams.challengeTypeCode)) {
    throw new ChallengeGenerationError(`Invalid challenge type: ${challengeParams.challengeTypeCode}`);
  }
  
  // Validate focus area
  const validFocusAreas = await this.challengeConfigService.getAllFocusAreaConfigs();
  if (!validFocusAreas.some(area => area.code === challengeParams.focusArea)) {
    throw new ChallengeGenerationError(`Invalid focus area: ${challengeParams.focusArea}`);
  }
}
``` 