# Cross-Aggregate Query Strategy

## Overview

In Domain-Driven Design (DDD), maintaining aggregate boundaries is a fundamental principle. However, real-world applications often require querying data across these boundaries. This document defines our strategy for handling cross-aggregate queries while respecting DDD principles.

## Core Principles

1. **Aggregate Independence**: Aggregates should primarily manage their own data and not directly manipulate other aggregates.
2. **Read vs. Write Separation**: Cross-aggregate reads are more acceptable than cross-aggregate writes.
3. **Explicit Documentation**: Cross-aggregate queries should be explicitly documented and justified.
4. **Consistency Level**: Choose the appropriate consistency level based on business requirements.
5. **Location Transparency**: Be clear about where cross-aggregate logic lives.

## Classification of Cross-Aggregate Queries

We categorize cross-aggregate queries into three types:

### 1. Read-Only Reference Queries

**Definition**: Queries that reference entities from another aggregate but only for reading purposes.

**Example**: Finding challenges for a specific user by user ID.

**When to Use**:
- For dashboard views
- For reporting
- When aggregates have natural relationships

**Implementation Guidelines**:
- Document the cross-aggregate nature of the query
- Use Value Objects for references
- Isolate in repository methods
- Never modify the referenced aggregate

### 2. Relationship-Based Queries

**Definition**: Queries where aggregates have inherent relationships (e.g., parent-child).

**Example**: Finding progress records linked to a specific challenge.

**When to Use**:
- When aggregates have a natural hierarchical relationship
- When one aggregate cannot exist without the other

**Implementation Guidelines**:
- Document the relationship clearly
- Consider if restructuring aggregates would be more appropriate
- Use identifiers or value objects to maintain loose coupling

### 3. Complex Cross-Domain Queries

**Definition**: Queries requiring data from multiple aggregates across domains.

**Example**: Generating comprehensive user reports with challenge history, progress, and personality insights.

**When to Use**:
- For advanced reporting
- For dashboard views requiring data from multiple domains
- For complex search scenarios

**Implementation Guidelines**:
- Create dedicated Query Services or Read Models
- Never implement in repositories
- Use Application Services (Coordinators) to orchestrate

## Recommended Patterns

### 1. Repository Methods with Clear Documentation

For simple cross-aggregate queries, use repository methods with explicit documentation:

```javascript
/**
 * Find challenges by user ID
 * 
 * NOTE: This is a cross-aggregate query that pragmatically links Challenges to Users.
 * Only used for read operations and does not modify data across aggregate boundaries.
 * Justified for user dashboards and challenge history views where user context is required.
 * 
 * @param {string|UserId} userIdOrVO - User ID or UserId value object
 * @param {Object} options - Query options
 * @returns {Promise<Array<Challenge>>} Array of challenges
 */
async findByUserId(userIdOrVO, options = {}) {
    // Implementation...
}
```

### 2. Application Services as Composition Layer

For queries needing data from multiple aggregates, use Application Services:

```javascript
/**
 * Get user insights with challenge history
 * @param {string|Email} emailOrVO - User email or Email value object 
 * @returns {Promise<Object>} Combined user data with challenges
 */
async getUserInsightsWithChallenges(emailOrVO) {
    return this.executeOperation(async () => {
        const emailVO = ensureVO(emailOrVO, Email, createEmail);
        const user = await this.userService.getUserByEmail(emailVO);
        const challenges = await this.challengeService.getChallengesForUser(emailVO);
        const personality = await this.personalityService.getPersonalityForUser(user.id);
        
        return {
            user: user,
            recentChallenges: challenges,
            insights: personality?.insights || {}
        };
    });
}
```

### 3. Dedicated Read Models

For complex cross-aggregate views:

```javascript
class UserDashboardReadModel {
    constructor({ userRepository, challengeRepository, progressRepository }) {
        this.userRepository = userRepository;
        this.challengeRepository = challengeRepository;
        this.progressRepository = progressRepository;
    }
    
    async getUserDashboard(userId) {
        // Fetch data from multiple repositories and compose the view
        const [user, challenges, progress] = await Promise.all([
            this.userRepository.findById(userId),
            this.challengeRepository.findByUserId(userId, { limit: 5 }),
            this.progressRepository.findByUserId(userId)
        ]);
        
        return {
            userProfile: user,
            recentChallenges: challenges,
            progressSummary: this._summarizeProgress(progress)
        };
    }
    
    _summarizeProgress(progress) {
        // Transform progress data for the dashboard view
    }
}
```

### 4. Event-Driven Denormalization

For frequently accessed cross-aggregate data:

1. When an event occurs in one aggregate, update a denormalized view
2. Query the denormalized view instead of crossing aggregates at read time

```javascript
// When a challenge is evaluated:
this.eventBus.subscribe('CHALLENGE_EVALUATED', async (data) => {
    await this.userStatsViewRepository.updateUserStats(data.userId, {
        lastChallengeCompleted: new Date(),
        totalChallengesCompleted: incrementBy(1),
        averageScore: updateAverage(data.score)
    });
});

// When reading user dashboard:
async getUserDashboard(userId) {
    const userStats = await this.userStatsViewRepository.findByUserId(userId);
    // No need to query challenges aggregate at read time
}
```

## Decision Framework

When deciding how to implement a cross-aggregate query, follow this decision tree:

1. **Can the query be avoided entirely?**
   - Consider redesigning aggregate boundaries
   - Consider caching or event-driven denormalization

2. **Is this a simple read-only reference query?**
   - Use Repository methods with clear documentation

3. **Is this a relationship-based query?**
   - Consider whether the relationship is fundamental to the domain
   - Use Repository methods or Application Services based on complexity

4. **Is this a complex cross-domain query?**
   - Use Application Services for composition
   - Consider dedicated Read Models for performance-critical views

5. **Is this a frequently accessed view?**
   - Consider event-driven denormalization
   - Consider a dedicated read-optimized database

## Implementation Guidelines

### For Repository Cross-Aggregate Queries

1. **Always Use Value Objects**: Pass IDs via value objects rather than primitives
   ```javascript
   findByUserId(userIdOrVO, options = {});
   ```

2. **Document Cross-Aggregate Nature**: Add explicit comments about the cross-aggregate nature
   ```javascript
   /**
    * NOTE: This is a cross-aggregate query that links Challenges to Users.
    * Only used for read operations and does not modify data.
    */
   ```

3. **Restrict to Read Operations**: Never modify another aggregate
   ```javascript
   // GOOD
   const challenges = await challengeRepository.findByUserId(userIdVO);
   
   // BAD
   await challengeRepository.updateChallengeForUser(userIdVO, updateData);
   ```

4. **Prefer ID References**: Use identifiers to reference other aggregates, not deep entity properties
   ```javascript
   // GOOD
   await repository.findByUserId(userId);
   
   // BAD
   await repository.findByUserPreference(user.preferences.setting);
   ```

### For Application Service Composition

1. **Keep Repositories Focused**: Repositories should remain focused on their own aggregate
   ```javascript
   // In Application Service
   const user = await userRepository.findById(userId);
   const challenges = await challengeRepository.findByUserId(userId);
   ```

2. **Compose in Memory**: Join data in memory within the Application Service
   ```javascript
   return {
       user: userDetails,
       challenges: challengeList,
       progress: progressData
   };
   ```

3. **Transform Data as Needed**: Apply transformations for the specific use case
   ```javascript
   const result = {
       username: user.fullName,
       completedChallenges: challenges.filter(c => c.status === 'completed'),
       progressLevel: calculateLevel(progress.score)
   };
   ```

### For Read Models

1. **Keep Read Models Separate**: Don't mix with repositories or domain services
   ```javascript
   // Separate class
   class UserDashboardReadModel {}
   ```

2. **Optimize for the View**: Structure data for the specific view
   ```javascript
   return {
       userSummary: { ... },   // Shaped for the dashboard
       challengeSummary: { ... }  // Shaped for the dashboard
   };
   ```

3. **Consider Caching**: Cache read model results when appropriate
   ```javascript
   async getUserDashboard(userId) {
       return cache.getOrSet(`dashboard:${userId}`, async () => {
           // Fetch and compose data
       });
   }
   ```

## Consistency Considerations

### Eventual Consistency

For most cross-aggregate queries, eventual consistency is sufficient. This means:

1. Data might be slightly out of date when queried across aggregates
2. Update operations should be confined to a single aggregate

### Strong Consistency

When strong consistency is required:

1. Consider using sagas or domain events to enforce consistency
2. Be explicit about the requirement in documentation
3. Accept performance implications

## Examples from Our Codebase

### Good Example: Challenge Repository

```javascript
/**
 * Find challenges by user ID
 * 
 * NOTE: This is a cross-aggregate query that pragmatically links Challenges to Users.
 * Only used for read operations and does not modify data across aggregate boundaries.
 * Justified for user dashboards and challenge history views where user context is required.
 * 
 * @param {string|UserId} userIdOrVO - User ID or UserId value object
 * @param {Object} options - Query options
 * @returns {Promise<Array<Challenge>>} Array of challenges
 */
async findByUserId(userIdOrVO, options = {}) {
    // Implementation...
}
```

### Good Example: ChallengeCoordinator (Application Service)

```javascript
/**
 * Get challenge history for a user
 * @param {string|Email} emailOrEmailVO - User's email or Email value object
 * @returns {Promise<Array>} - List of challenges
 */
getChallengeHistoryForUser(emailOrEmailVO) {
    return this.executeOperation(async () => {
        // Convert to value object
        const emailVO = ensureVO(emailOrEmailVO, Email, createEmail);
        
        // Validate input
        if (!emailVO) {
            throw new ChallengeNotFoundError(`Invalid user email: ${emailOrEmailVO}`);
        }
        
        // Cross-aggregate query through service
        const challenges = await this.challengeService.getChallengesForUser(emailVO);
        return challenges;
    });
}
```

## Conclusion

By following these guidelines, we can maintain the integrity of our domain model while pragmatically handling the real-world need for cross-aggregate queries. The key is to be explicit, document your choices, and use the appropriate pattern for the specific use case.

Remember:
1. Keep aggregates focused on their primary responsibilities
2. Be explicit about cross-aggregate relationships
3. Use Application Services or Read Models for complex compositions
4. Consider denormalization for performance-critical views
5. Document your decisions and their rationale 