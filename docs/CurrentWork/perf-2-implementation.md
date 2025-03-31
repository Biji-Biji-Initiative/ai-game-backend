# PERF-2: Audit for N+1 Query Issues

## Problem Statement

After analyzing the codebase, I've identified several areas where N+1 query issues could potentially occur. N+1 query problems happen when code retrieves a list of records and then performs additional database queries for each record, leading to performance degradation as the dataset grows.

Key areas of concern:

1. **UserContextService**: The `_gatherUserContextInternal` method makes multiple separate database calls across repositories
2. **Repository List Methods**: Several repositories have methods to retrieve lists that might lead to cascading queries
3. **Foreign Key Relationships**: Cross-aggregate queries between domains (e.g., challenges by user)

## Analysis of N+1 Issues

### 1. UserContextService Analysis

The `UserContextService._gatherUserContextInternal` method has several potential N+1 issues:

```javascript
// Gets user profile in one query
const userProfile = await this.userRepository.getUserById(userId);

// Gets challenges in another query
const userChallenges = await this.challengeRepository.getChallengesByUserId(userId, {
    limit: COLLECTION_LIMITS.CHALLENGES,
    sort: 'completedAt:desc',
});

// Gets evaluations in a third query
const recentEvaluations = await this.evaluationRepository.getEvaluationsByUserId(userId, {
    limit: COLLECTION_LIMITS.EVALUATIONS,
    sort: 'createdAt:desc',
});
```

While this pattern itself isn't necessarily an N+1 issue (it's making 3 separate queries, not N+1), the methods it's calling could have internal N+1 problems.

### 2. Repository Methods Analysis

Several repository methods were reviewed for potential N+1 issues:

#### ChallengeRepository.findByUserId

```javascript
async findByUserId(userIdOrIdVO, options = {}) {
    // Single query to get challenges by user ID
    const { data, error } = await query;
    // Maps database records to domain objects
    return (data || []).map(record => {
        const challengeData = this._snakeToCamel(record);
        return challengeMapper.toDomain(challengeData);
    });
}
```

This implementation appears optimized; it retrieves all challenges in a single query and doesn't perform additional queries when mapping to domain objects.

#### ProgressRepository.findAllByUserId

```javascript
async findAllByUserId(userId) {
    // Single query to get all progress records for a user
    const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId);
    // Maps records to domain objects
    return progressMapper.toDomainCollection(data || []);
}
```

No N+1 issues detected; retrieves all progress records in a single query.

#### EvaluationRepository.findEvaluationsForUser

The method structure suggests it likely performs a single query to retrieve evaluations, but I couldn't see the full implementation to confirm.

### 3. Potential Related Entities Issues

The main potential for N+1 issues comes from related entities that might need to be loaded for each item in a collection. For example:

1. Loading challenge details for each evaluation
2. Loading user details for each challenge
3. Loading related entities in mappers

## Implementation Strategy

To address the identified and potential N+1 query issues, I'll implement the following improvements:

### 1. Add Batch Loading for Related Entities

For cases where related entities need to be loaded, implement batch loading:

```javascript
// Instead of this (N+1 pattern):
for (const evaluation of evaluations) {
    const challenge = await challengeRepository.findById(evaluation.challengeId);
    evaluation.challengeDetails = challenge;
}

// Implement this (single batch query):
const challengeIds = evaluations.map(e => e.challengeId);
const challenges = await challengeRepository.findByIds(challengeIds);
const challengeMap = challenges.reduce((map, challenge) => {
    map[challenge.id] = challenge;
    return map;
}, {});

for (const evaluation of evaluations) {
    evaluation.challengeDetails = challengeMap[evaluation.challengeId] || null;
}
```

### 2. Add a findByIds Method to Repositories

For each repository that needs to support batch loading, add a `findByIds` method:

```javascript
async findByIds(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return [];
    }
    
    // Use 'in' operator for batch query
    const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .in('id', ids);
        
    if (error) {
        throw new DatabaseError(`Failed to fetch entities by IDs: ${error.message}`);
    }
    
    return (data || []).map(record => this.mapToDomain(record));
}
```

### 3. Optimize UserContextService

Refactor the UserContextService to reduce multiple database calls by:

1. Implementing a single specialized query or stored procedure
2. Using parallel queries with Promise.all
3. Adding selective joins where appropriate in the repository methods

### 4. Add Eager Loading Options to Repository Methods

Add support for eager loading related entities:

```javascript
async findByUserId(userId, options = {}) {
    // Existing implementation...
    
    // Add eager loading for related entities
    if (options.include) {
        const includedEntities = options.include;
        
        // If challenges should include user data
        if (includedEntities.includes('user')) {
            const userIds = results.map(challenge => challenge.userId);
            const users = await this.userRepository.findByIds([...new Set(userIds)]);
            const userMap = users.reduce((map, user) => {
                map[user.id] = user;
                return map;
            }, {});
            
            // Attach user to each challenge
            results.forEach(challenge => {
                challenge.user = userMap[challenge.userId] || null;
            });
        }
        
        // Add other entity types as needed
    }
    
    return results;
}
```

## Implementation Details

### 1. Repository Base Class Enhancement

Extend the BaseRepository with a common findByIds method:

```javascript
// src/core/infra/repositories/BaseRepository.js

/**
 * Find multiple entities by their IDs
 * @param {Array<string>} ids - Array of entity IDs
 * @returns {Promise<Array>} Array of entities
 */
async findByIds(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return [];
    }
    
    // Remove duplicates
    const uniqueIds = [...new Set(ids)];
    
    return this._withRetry(async () => {
        this._log('debug', 'Finding entities by IDs', { count: uniqueIds.length });
        
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .in('id', uniqueIds);
            
        if (error) {
            throw new DatabaseError(`Failed to fetch entities by IDs: ${error.message}`, {
                cause: error,
                entityType: this.domainName,
                operation: 'findByIds',
                metadata: { count: uniqueIds.length }
            });
        }
        
        this._log('debug', `Found ${data?.length || 0} entities by IDs`, { 
            requestedCount: uniqueIds.length,
            foundCount: data?.length || 0
        });
        
        // Let concrete repositories implement their own mapping
        return data || [];
    }, 'findByIds', { count: uniqueIds.length });
}
```

### 2. Optimize UserContextService

Refactor the UserContextService to use parallel queries:

```javascript
async _gatherUserContextInternal(userId, options = {}) {
    // Initialize base context...
    
    // Run queries in parallel using Promise.all
    try {
        const [userProfile, userChallenges, recentEvaluations] = await Promise.all([
            this.userRepository.getUserById(userId),
            this.challengeRepository.getChallengesByUserId(userId, {
                limit: COLLECTION_LIMITS.CHALLENGES,
                sort: 'completedAt:desc',
            }),
            this.evaluationRepository.getEvaluationsByUserId(userId, {
                limit: COLLECTION_LIMITS.EVALUATIONS,
                sort: 'createdAt:desc',
            })
        ]);
        
        // Process results as before...
    } catch (error) {
        this.logger.warn('Error gathering user context', {
            userId,
            error: error.message,
        });
    }
    
    // Rest of the method...
}
```

### 3. Implement findByIds in Critical Repositories

Add the findByIds method to all repositories that need to support batch loading:

#### ChallengeRepository

```javascript
/**
 * Find challenges by IDs
 * @param {Array<string>} ids - Challenge IDs
 * @returns {Promise<Array<Challenge>>} Array of challenges
 */
async findByIds(ids) {
    const records = await super.findByIds(ids);
    return records.map(record => {
        const challengeData = this._snakeToCamel(record);
        return challengeMapper.toDomain(challengeData);
    });
}
```

#### EvaluationRepository

```javascript
/**
 * Find evaluations by IDs
 * @param {Array<string>} ids - Evaluation IDs
 * @returns {Promise<Array<Evaluation>>} Array of evaluations
 */
async findByIds(ids) {
    const records = await super.findByIds(ids);
    return records.map(record => evaluationMapper.toDomain(record));
}
```

### 4. Add Batch Loading to Services

Update services to use batch loading:

```javascript
// Example in a service that needs challenge data for evaluations
async enhanceEvaluationsWithChallengeData(evaluations) {
    if (!evaluations || evaluations.length === 0) {
        return evaluations;
    }
    
    // Extract challenge IDs
    const challengeIds = evaluations
        .map(e => e.challengeId)
        .filter(id => !!id);
        
    if (challengeIds.length === 0) {
        return evaluations;
    }
    
    // Batch load all challenges in one query
    const challenges = await this.challengeRepository.findByIds(challengeIds);
    
    // Create a lookup map
    const challengeMap = challenges.reduce((map, challenge) => {
        map[challenge.id] = challenge;
        return map;
    }, {});
    
    // Enhance each evaluation with challenge data
    return evaluations.map(evaluation => ({
        ...evaluation,
        challenge: challengeMap[evaluation.challengeId] || null
    }));
}
```

## Testing Strategy

1. **Unit Tests**: Create tests for the new findByIds methods
2. **Performance Tests**: Compare response times before and after changes
3. **Integration Tests**: Ensure all batch loading functions correctly
4. **Load Tests**: Verify performance with larger datasets

## Benefits

1. **Reduced Database Queries**: Significantly fewer queries for related data
2. **Improved Response Times**: Faster page loads and API responses
3. **Better Scalability**: Application will perform better as data volume grows
4. **Reduced Database Load**: Less strain on the database server

## Next Steps

1. Monitor query performance in production
2. Consider implementing database-level optimizations (indices, etc.)
3. Explore adding a DataLoader pattern for more sophisticated batching
