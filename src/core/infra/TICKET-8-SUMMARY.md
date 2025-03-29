# Ticket #8: Standardize Logger Usage via Dependency Injection

## Summary

This ticket focuses on standardizing logger usage throughout the codebase by ensuring all components receive their logger instance via constructor arguments (dependency injection) rather than directly importing logger instances. This improves testability, dependency management, and follows the dependency inversion principle.

## Changes Made

1. **Already compliant components:**
   - `AuthController` - Was already properly using an injected logger
   - Most coordinators were already configured correctly in container.js

2. **Components Updated:**
   - `PersonalityCoordinator` - Removed direct import of appLogger
   - `EvaluationCategoryRepository` - Refactored constructor to accept dependencies object with required logger

3. **Components Identified for Update:**
   - `PromptRepository` - Modified to require logger via DI (note: async/await linter errors require separate fixes)
   - Other repositories that import logger directly

## Implementation Notes

### 1. Pattern for Class Updates

All classes requiring a logger should:

```javascript
constructor(dependencies = {}) {
  // Require logger explicitly
  if (!dependencies.logger) {
    throw new Error('Logger is required for ThisComponent');
  }
  
  // Store logger for use
  this.logger = dependencies.logger;
  
  // Other initialization
}
```

### 2. DI Container Registration

All components should be registered with their logger injected through the container:

```javascript
container.register(
  'componentName',
  c => {
    const Component = require('../../path/to/Component');
    return new Component({
      // Other dependencies
      logger: c.get('domainLogger') // Use appropriate domain-specific logger
    });
  },
  true // Singleton setting appropriate for component
);
```

### 3. Components Requiring Updates

- `ApplicationEventHandlers` - Already using injected logger, but needed fix for multiple 'async' keywords issue
- `src/core/prompt/repositories/PromptRepository.js` - Updated to use injected logger but needs async/await fixes as separate work
- `src/core/evaluation/repositories/evaluationCategoryRepository.js` - Updated to use injected logger

## Remaining Work

The following components still need attention, but require more extensive testing:

1. All repositories under `src/core/**/repositories/` should be reviewed to ensure they:
   - Accept an explicit logger dependency through constructor
   - Use the injected logger consistently
   - Don't directly import appLogger or another logger

2. Fix async/await issues (perhaps as part of the async/await ticket) in:
   - `PromptRepository`
   - `EvaluationCategoryRepository` 

3. Update the DI container to ensure proper injection for all components

## Testing

Components updated should be tested to ensure:
- They function correctly with the injected logger
- Provide helpful error messages if logger is not provided
- Log appropriately during operations

## Benefits

1. Improved testability through better mocking capabilities
2. Consistent approach to logging throughout the application
3. Removal of direct dependencies on implementation details
4. Better adherence to SOLID principles (particularly dependency inversion) 