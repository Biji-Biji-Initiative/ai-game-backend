# Ticket #10: Refactor Magic Numbers to Constants

## Summary

This ticket addresses the use of magic numbers (hardcoded numeric values) in the codebase by replacing them with named constants for better readability, maintainability, and flexibility. Magic numbers make code harder to understand and modify, as their purpose is not immediately clear and changing them requires searching through code.

## Changes Made

### 1. PersonalityCoordinator Changes

- Created/enhanced `personalityConfig.js` with attitude threshold constants:
  ```javascript
  const ATTITUDE_THRESHOLDS = {
    TECH_SAVVY_SUM: {
      HIGH: 150, // Sum of tech_savvy and early_adopter for "comprehensive" detail level
      LOW: 100,  // Sum of tech_savvy and early_adopter for "basic" detail level
    },
    ATTITUDE_HIGH: 70,  // Threshold to consider an attitude score as "high"
    DEFAULT_SCORE: 50,  // Default value when an attitude score is missing
  };
  ```

- Added UI preference constants for preference values:
  ```javascript
  const UI_PREFERENCES = {
    DETAIL_LEVEL: {
      COMPREHENSIVE: 'comprehensive',
      DETAILED: 'detailed',
      BASIC: 'basic',
    },
    // Communication style and response format constants also added
  };
  ```

- Updated `_mapAttitudesToPreferences` method to use these constants instead of hard-coded values:
  ```javascript
  // Before:
  const techSum = (aiAttitudes.tech_savvy || 50) + (aiAttitudes.early_adopter || 50);
  if (techSum > 150) {
    detailLevel = 'comprehensive';
  }
  
  // After:
  const techSum = (aiAttitudes.tech_savvy || ATTITUDE_THRESHOLDS.DEFAULT_SCORE) + 
                  (aiAttitudes.early_adopter || ATTITUDE_THRESHOLDS.DEFAULT_SCORE);
  if (techSum > ATTITUDE_THRESHOLDS.TECH_SAVVY_SUM.HIGH) {
    detailLevel = UI_PREFERENCES.DETAIL_LEVEL.COMPREHENSIVE;
  }
  ```

### 2. Difficulty Model Changes

- Created `difficultyConfig.js` with comprehensive constants for all magic numbers:
  ```javascript
  const LEVEL_THRESHOLDS = {
    EXPERT: 0.85,      // Threshold for expert level
    ADVANCED: 0.65,    // Threshold for advanced level
    INTERMEDIATE: 0.4, // Threshold for intermediate level
  };
  
  const ADJUSTMENT = {
    INCREASE: { /* ... */ },
    DECREASE: { /* ... */ },
    SCORE: { /* ... */ },
  };
  
  const TRAIT_MODIFIERS = { /* ... */ };
  const TIME_ALLOCATION = { /* ... */ };
  const VALID_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
  ```

- Updated the Difficulty model to use these constants:
  ```javascript
  // Before:
  if (average >= 0.85) {
    this.level = 'expert';
  } else if (average >= 0.65) {
    this.level = 'advanced';
  }
  
  // After:
  if (average >= LEVEL_THRESHOLDS.EXPERT) {
    this.level = 'expert';
  } else if (average >= LEVEL_THRESHOLDS.ADVANCED) {
    this.level = 'advanced';
  }
  ```

## Benefits of These Changes

1. **Improved Code Readability**: Constants with descriptive names clearly communicate their purpose, making code more self-documenting.

2. **Centralized Configuration**: All related constants are grouped in config files, making them easy to find and modify.

3. **DRY Principle**: Constants are defined once and reused throughout the code, eliminating duplication.

4. **Easier Maintenance**: Changing a value requires modifying just one constant definition instead of searching for all occurrences.

5. **Reduced Bugs**: Named constants make it less likely that a developer will use an incorrect value or misinterpret the purpose of a number.

## Files Modified

1. `src/application/PersonalityCoordinator.js`
2. `src/core/personality/config/personalityConfig.js`
3. `src/core/adaptive/models/Difficulty.js`
4. `src/core/adaptive/config/difficultyConfig.js`

## Testing Considerations

These changes maintain the exact same behavior as before, just with better code organization. However, testing should focus on:

1. Verifying that the constants have the same values as the original magic numbers
2. Ensuring that all occurrences of magic numbers were replaced
3. Checking that the behavior of the application remains unchanged

## Additional Notes

This pattern of extracting magic numbers to constants should be applied throughout the codebase as a best practice. Some other areas that might benefit from similar refactoring:

1. Timeouts and intervals
2. Default values for configurations
3. Thresholds in business logic
4. Pagination limits and other query parameters 