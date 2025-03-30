# Repository Query Methods Review

## Overview

This document reviews repository query methods that use non-aggregate-root identifiers and evaluates them against Domain-Driven Design (DDD) principles. The primary focus is on methods in repositories like `ChallengeRepository` that query based on identifiers from other aggregates (e.g., `findByUserEmail`).

## Current Implementation

The current codebase contains several repositories with query methods based on non-aggregate-root identifiers:

### ChallengeRepository

1. **findByUserId(userId)** - Queries challenges based on a user ID
2. **findRecentByUserId(userId)** - Queries recent challenges based on a user ID
3. **findByUserEmail(email)** - Queries challenges based on a user email
4. **findRecentByUserEmail(email)** - Queries recent challenges based on a user email
5. **findByFocusAreaId(focusAreaId)** - Queries challenges based on a focus area ID

### UserRepository

1. **findByEmail(email)** - Queries users based on email (this is acceptable as it's an alternative identifier for the User aggregate)

## DDD Analysis

According to DDD principles:

1. **Aggregate Boundaries**: Repositories should primarily operate within the boundaries of their aggregate root.

2. **Lookup by Cross-Aggregate References**: While sometimes necessary, querying one aggregate by attributes of another aggregate can weaken the encapsulation of domain concepts and potentially lead to tighter coupling between aggregates.

3. **Pragmatic Approach**: DDD acknowledges that strict adherence to these principles might not always be practical in real-world applications, especially for read operations.

## Recommendations

Based on DDD principles and a pragmatic approach to software design, we recommend the following:

### 1. Acceptable Cross-Aggregate Queries

Some non-aggregate-root queries are acceptable if they meet these criteria:
- They are simple lookups without complex joins or logic
- They are primarily for read operations, not for modifications
- They are pragmatically necessary for the application's requirements

**Examples of acceptable cross-boundary queries**:
- `findByUserId` in ChallengeRepository - A common requirement for user dashboards
- `findRecentByUserId` in ChallengeRepository - Simple extension of the above

### 2. Queries to Reconsider

Some queries might introduce unnecessary coupling or violate DDD principles:

- **findByUserEmail in ChallengeRepository**: 
  - Potential issue: It bypasses the User aggregate boundary and could lead to inconsistencies if email formats/validation changes
  - Recommendation: Use a two-step process: first get userId by email, then find challenges by userId
  - Example: `userRepository.findByEmail(email) → challengeRepository.findByUserId(user.id)`

- **findRecentByUserEmail in ChallengeRepository**:
  - Same concerns as findByUserEmail
  - Recommendation: Refactor to use the two-step process mentioned above

### 3. Documentation Improvements

For pragmatic cross-aggregate queries that will be maintained:

- Add comments explaining the rationale for the cross-boundary query
- Document potential consistency risks or coupling concerns
- Indicate whether the method is for read-only operations

Example documentation:

```javascript
/**
 * Find challenges by user ID
 * 
 * NOTE: This is a cross-aggregate query that pragmatically links Challenges to Users.
 * Only used for read operations and does not modify data across aggregate boundaries.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Array<Challenge>>}
 */
```

### 4. Implementation Recommendations

For retained cross-aggregate queries:

1. **Ensure they're simple lookups**: Avoid complex joins or business logic in these methods

2. **Use Value Objects for parameters**: 
   - Use domain-specific Value Objects like `UserId` or `Email` for parameters
   - This provides validation at the type level
   - Current implementation already does this well

3. **Consider switching to a CQRS approach**:
   - Separate Command and Query models
   - Create dedicated query services for complex cross-aggregate reads
   - Use materialized views for better performance

4. **Consistency checks**:
   - Ensure modifications still go through proper aggregate boundaries
   - Verify any related entities exist before saving references (e.g., check user exists before saving a challenge with userId)

## Specific Implementation Changes

### For ChallengeRepository:

1. **Retain**: 
   - `findById` - Primary aggregate identifier
   - `findByUserId` - Common lookup, pragmatically necessary
   - `findRecentByUserId` - Extension of the above

2. **Modify**:
   - `findByUserEmail` - Add documentation explaining the cross-aggregate concerns
   - `findRecentByUserEmail` - Add documentation explaining the cross-aggregate concerns

3. **Consider introducing**:
   - A ReadModel/Query service for complex cross-aggregate reporting needs

### For All Repositories:

1. Audit all repositories for similar cross-aggregate query methods
2. Apply the same principles to evaluate which should be retained, modified, or replaced
3. Ensure that all data modification operations still respect aggregate boundaries

## Conclusion

While the DDD purist approach would avoid cross-aggregate queries entirely, a pragmatic approach recognizes that some cross-boundary lookups are necessary and acceptable, especially for read operations. The key is to clearly document these design decisions, understand the trade-offs, and ensure that the core invariants of each aggregate are still protected through proper encapsulation of write operations. 