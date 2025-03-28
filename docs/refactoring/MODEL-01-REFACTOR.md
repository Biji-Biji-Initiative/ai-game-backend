# MODEL-01-REFACTOR: Evaluation.mapFocusAreasToCategories Refactoring

## Summary

This refactoring removes the synchronous `mapFocusAreasToCategories` method from the `Evaluation` model and updates code to use the asynchronous version in `EvaluationDomainService` instead. This change enforces proper separation of concerns by ensuring the domain model doesn't directly access repositories.

## Changes Made

1. Removed the synchronous `mapFocusAreasToCategories` method from the `Evaluation` model
2. Added proper support for externally mapped categories via a new `relevantCategories` property and `setRelevantCategories` method
3. Updated the `EvaluationService` to use the injected `EvaluationDomainService.mapFocusAreasToCategories` before creating or updating `Evaluation` instances
4. Updated the internal model methods in `Evaluation` that previously called the synchronous method to use the externally provided categories
5. Updated tests to reflect the new dependency flow

## Why This Change Was Needed

The original implementation had several issues:
- The `Evaluation` model directly depended on `evaluationCategoryRepository`, violating proper domain model boundaries
- The synchronous method returned hardcoded values, which were incomplete or potentially inaccurate
- The proper async implementation was already available in `EvaluationDomainService`

## How To Use The Updated Pattern

When creating an `Evaluation` instance that needs focus area mapping:

```javascript
// 1. Map focus areas to categories using domain service
const relevantCategories = await evaluationDomainService.mapFocusAreasToCategories(user.focusAreas);

// 2. Create evaluation with mapped categories
const evaluation = new Evaluation({
  userId: user.id,
  challengeId: challenge.id,
  score: calculatedScore,
  categoryScores: scores,
  relevantCategories, // Pass the mapped categories
  userContext: {
    focusAreas: user.focusAreas,
    // other user context...
  }
});
```

When updating an existing `Evaluation` with new focus areas:

```javascript
// 1. Map focus areas to categories using domain service
const relevantCategories = await evaluationDomainService.mapFocusAreasToCategories(newFocusAreas);

// 2. Update the evaluation
evaluation.setRelevantCategories(relevantCategories);
```

## Files Modified

- `src/core/evaluation/models/Evaluation.js` - Removed sync method, added support for external categories
- `src/core/evaluation/services/evaluationService.js` - Updated to use domain service before model creation
- `tests/domain/evaluation/evaluation.model.test.js` - Updated tests to use the new pattern

## Additional Notes

Tests in other files may need to be updated to follow this pattern. Look for any code that directly calls `evaluation.mapFocusAreasToCategories()` and refactor it to fetch categories from the domain service first. 