# Repository Migration Checklist

This document tracks the progress of migrating repositories to the standardized entity-based domain event collection pattern.

## Core Domain Repositories

| Repository | Entity Extends Base Class | Save Method Updated | Delete Method Updated | Batch Methods Updated | Direct Publishing Removed | Tests Updated | Status |
|------------|---------------------------|--------------------|-----------------------|-----------------------|--------------------------|--------------|--------|
| UserRepository | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **COMPLETED** |
| FocusAreaRepository | ✅ | ✅ | ✅ | ✅ | ✅ | ⬜️ | **IN PROGRESS** |
| ChallengeRepository | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | Not Started |
| EvaluationRepository | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | Not Started |
| ProgressRepository | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | Not Started |
| PersonalityRepository | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | Not Started |
| UserJourneyRepository | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | Not Started |
| AdaptiveRepository | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | Not Started |

## Subdomain Repositories

| Repository | Entity Extends Base Class | Save Method Updated | Delete Method Updated | Batch Methods Updated | Direct Publishing Removed | Tests Updated | Status |
|------------|---------------------------|--------------------|-----------------------|-----------------------|--------------------------|--------------|--------|
| ChallengeTypeRepository | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | Not Started |
| DifficultyLevelRepository | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | Not Started |
| FormatTypeRepository | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | Not Started |
| FocusAreaConfigRepository | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | Not Started |
| EvaluationCategoryRepository | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | ⬜️ | Not Started |

## Implementation Notes

### UserRepository
- Entity extends the base Entity class
- All methods updated to use entity-based event collection
- Tests updated to verify event collection and publishing

### FocusAreaRepository
- Entity extends the base Entity class
- All methods updated to use entity-based event collection
- Direct event publishing code removed
- Tests need to be updated to verify the changes

## Timeline

| Week | Planned Repositories | Actual Progress | Notes |
|------|---------------------|-----------------|-------|
| Week 1 | UserRepository, FocusAreaRepository | UserRepository ✅, FocusAreaRepository ✅ | On track |
| Week 2 | ChallengeRepository, EvaluationRepository | | |
| Week 3 | ProgressRepository, PersonalityRepository, UserJourneyRepository | | |
| Week 4 | All subdomain repositories | | |

## Verification Steps

For each repository, verify:

1. Entity class extends the base Entity class
2. All domain events are collected using entity.addDomainEvent()
3. Repository methods collect events before database operations
4. Repository methods use withTransaction with publishEvents: true
5. All direct eventBus.publish() calls are removed
6. Tests verify the event collection and publishing behavior 