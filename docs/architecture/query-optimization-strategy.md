# Query Optimization Strategy

## Overview

This document outlines our approach to optimizing database queries, avoiding common performance pitfalls (particularly N+1 issues), and ensuring efficient data access across our Domain-Driven Design architecture.

## What is the N+1 Query Problem?

The N+1 query problem is a common performance anti-pattern where an application executes N additional queries to fetch related data for N records that were retrieved in an initial query. This typically happens when:

1. You fetch a list of records (1 query)
2. Then for each record, you execute a separate query to get its related data (N queries)

For example:
```javascript
// 1 query to get all users
const users = await userRepository.findAll();

// Then N queries, one for each user to get their challenges
for (const user of users) {
  const challenges = await challengeRepository.findByUserId(user.id);
  // Do something with challenges...
}
```

## Our Strategy for Preventing N+1 Issues

### 1. DataLoader Pattern

We've implemented the DataLoader pattern to batch similar queries:

- **Batching**: DataLoader collects individual data requests during a single tick of the event loop and then batches them into a single optimized query.
- **Caching**: Results are cached to prevent redundant queries.

```javascript
// Instead of multiple individual queries:
const challenge1 = await challengeRepository.findById(id1);
const challenge2 = await challengeRepository.findById(id2);
// ...

// DataLoader batches these into a single query:
const challenges = await Promise.all([
  challengeRepository.findById(id1),  // Uses DataLoader
  challengeRepository.findById(id2),  // Uses DataLoader
  // ...
]);
```

### 2. Query Performance Monitoring

We've implemented automatic detection of potential N+1 patterns:

- **Pattern Detection**: Tracks repeated query patterns during a collection period.
- **Performance Tracking**: Measures query durations and logs slow queries.
- **Early Warning**: Identifies potential issues before they impact production.

### 3. Cross-Aggregate Query Strategy

For queries that cross aggregate boundaries:

- **Read Models**: Using dedicated read models for complex views combining data from multiple aggregates.
- **Joins Over Multiple Queries**: Using database-level joins instead of application-level looping.
- **Event-Driven Denormalization**: Maintaining denormalized views through event processing.

## Implementation Examples

### DataLoader Usage

Our repositories initialize DataLoaders in their constructor:

```javascript
// Inside repository class
_initDataLoaders() {
  // Batch loading function
  const batchLoadChallengesById = async (ids) => {
    // Fetch all challenges in a single query
    const { data } = await this.db
      .from(this.tableName)
      .select('*')
      .in('id', ids);
      
    // Map results by ID
    const challengesMap = mapResultsById(data);
    
    // Return in same order as requested IDs
    return ids.map(id => challengesMap[id] || null);
  };
  
  // Create DataLoader
  this.challengeByIdLoader = dataLoaderRegistry.getLoader(
    'challenge-by-id', 
    batchLoadChallengesById, 
    { maxBatchSize: 100 }
  );
}
```

Then repository methods use the DataLoader:

```javascript
async findById(id) {
  return this.challengeByIdLoader.load(id);
}

async findByMultipleIds(ids) {
  return Promise.all(
    ids.map(id => this.challengeByIdLoader.load(id))
  );
}
```

### Read Models for Complex Views

Read models combine data from multiple repositories efficiently:

```javascript
// In UserDashboardReadModel
async getUserDashboard(userId) {
  // Fetch data in parallel with a single call per repository
  const [user, challenges, progress, personality] = await Promise.all([
    this.userRepository.findById(userId),
    this.challengeRepository.findRecentByUserId(userId),
    this.progressRepository.findByUserId(userId),
    this.personalityRepository.findByUserId(userId)
  ]);
  
  // Compose the combined view
  return {
    user: {/*...*/},
    challenges: {/*...*/},
    progress: {/*...*/},
    personality: {/*...*/}
  };
}
```

### Event-Driven Denormalization

For frequently accessed views:

```javascript
// In UserStatsViewService
async _handleChallengeCompleted(event) {
  const { userId, score, focusArea } = event.payload;
  
  // Update pre-computed stats in a single operation
  await this.updateUserStats(userId, {
    lastChallengeCompleted: new Date(),
    totalChallengesCompleted: { increment: 1 },
    averageScore: { updateAverage: score }
  });
}
```

## Query Performance Monitoring

Our monitoring system:

1. **Real-time tracking**: Records query patterns and durations
2. **Pattern analysis**: Groups similar queries to detect N+1 patterns
3. **Performance insights**: Reports slow queries and potential optimizations

To enable enhanced monitoring:

```javascript
// Enable detailed trace logs
process.env.QUERY_MONITORING_DETAIL_LEVEL = 'high';

// Adjust sensitivity
process.env.QUERY_N1_THRESHOLD = '3';  // Report patterns repeating 3+ times
process.env.SLOW_QUERY_THRESHOLD = '200';  // Report queries over 200ms
```

To disable monitoring in specific environments:

```javascript
process.env.DISABLE_QUERY_MONITORING = 'true';
```

## Best Practices

1. **Always use DataLoader for fetching by ID**
   - Ensures automatic batching for multiple ID lookups

2. **Fetch all needed data in a single operation**
   - Avoid lazy loading of related data in loops

3. **Prefer repositories with bulk operations**
   - `findByMultipleIds()` over multiple `findById()` calls

4. **Consider denormalization for frequent access patterns**
   - Especially for performance-critical views

5. **Use pagination and limit results**
   - Don't return more data than needed

6. **Analyze queries during development**
   - Use the monitoring tools to identify issues early

7. **Review slow queries regularly**
   - Logs will identify areas needing optimization

## Recommendations for Specific Scenarios

### List Views with Related Data

For displaying lists that require data from multiple aggregates:

```javascript
// AVOID:
const challenges = await challengeRepository.findAll();
for (const challenge of challenges) {
  challenge.user = await userRepository.findById(challenge.userId);
}

// PREFER:
const challenges = await challengeRepository.findAll();
const userIds = [...new Set(challenges.map(c => c.userId))];
const users = await userRepository.findByMultipleIds(userIds);
const userMap = users.reduce((map, user) => {
  map[user.id] = user;
  return map;
}, {});
challenges.forEach(challenge => {
  challenge.user = userMap[challenge.userId];
});
```

### Aggregation Queries

For operations that compute statistics:

```javascript
// AVOID:
const users = await userRepository.findAll();
for (const user of users) {
  const challenges = await challengeRepository.findByUserId(user.id);
  user.challengeCount = challenges.length;
}

// PREFER:
// Option 1: Use a specialized repository method
const usersWithCounts = await userRepository.findAllWithChallengeCounts();

// Option 2: Use a denormalized view
const usersWithStats = await userStatsViewRepository.getAllUserStats();
```

## Troubleshooting Common Issues

### Symptoms of N+1 Problems

1. **Slow page loads with many small queries**
   - Check logs for repeated query patterns

2. **Performance degradation with scale**
   - Performance worsens as data volume increases

3. **High database connection usage**
   - Too many concurrent connections

### Solutions to Common Issues

1. **Missing DataLoader usage**
   - Ensure repositories use DataLoader pattern

2. **Inefficient cross-aggregate access**
   - Review the cross-aggregate query strategy document

3. **Overloaded transaction boundaries**
   - Ensure reads are separated from transaction critical paths

## Conclusion

By combining DataLoader batching, query monitoring, and strategic denormalization, we can prevent N+1 query issues and ensure our DDD architecture maintains performance at scale. Regular monitoring of query patterns will help identify areas for improvement as the application evolves.

Remember that query optimization is an ongoing process. As data volumes grow and access patterns change, continue reviewing performance and adjusting strategies accordingly. 