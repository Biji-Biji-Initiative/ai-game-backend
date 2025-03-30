# Data Mapper Pattern

This document provides a detailed explanation of the Data Mapper pattern implementation in our application.

## Overview

The Data Mapper pattern is a data access layer that transfers data between objects and a database while keeping them independent of each other. It's a crucial part of our Domain-Driven Design (DDD) implementation, helping to maintain a clean separation between our domain model and data persistence mechanisms.

## Purpose

The primary purpose of the Data Mapper pattern is to:

1. **Decouple Domain from Persistence**: Keep domain objects free from database-specific code
2. **Manage Data Translation**: Handle the transformation between domain objects and database formats
3. **Centralize Data Access Logic**: Provide a single place for serialization/deserialization logic
4. **Support Different Storage Types**: Allow for changing database technologies without affecting domain logic

## Implementation in Our Codebase

### Mapper Structure

Each mapper follows a similar structure:

```javascript
// ChallengeMapper.js
export class ChallengeMapper {
  // Convert from database record to domain entity
  toDomain(data) {
    if (!data) return null;
    
    return new Challenge(data.id, {
      title: data.title,
      description: data.description,
      createdAt: new Date(data.created_at),
      // Map other properties...
    });
  }
  
  // Convert from domain entity to database format
  toPersistence(challenge) {
    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      created_at: challenge.createdAt.toISOString(),
      // Map other properties...
    };
  }
}
```

### Key Mappers

We've implemented the following mappers:

1. **ChallengeMapper**: Converts between Challenge domain entities and database records
2. **UserMapper**: Converts between User domain entities and database records
3. **ProgressMapper**: Converts between Progress domain entities and database records
4. **UserJourneyMapper**: Converts between UserJourney domain entities and database records
5. **FocusAreaConfigMapper**: Converts between FocusArea configurations and database records
6. **EvaluationMapper**: Converts between Evaluation domain entities and database records
7. **PersonalityMapper**: Converts between Personality domain entities and database records

### Integration with Repositories

Repositories use mappers to convert between domain and persistence formats:

```javascript
// Example repository using a mapper
export class ChallengeRepository {
  constructor({ supabaseClient, challengeMapper, logger }) {
    this.db = supabaseClient;
    this.mapper = challengeMapper;
    this.logger = logger;
    this.tableName = 'challenges';
  }
  
  async findById(id) {
    // Validate input
    if (!id) throw new RepositoryError('Challenge ID is required');
    
    // Query database
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
      
    // Handle errors
    if (error) throw new RepositoryError(`Failed to find challenge: ${error.message}`);
    
    // Map to domain entity and return
    return this.mapper.toDomain(data);
  }
  
  async save(challenge) {
    // Validate input
    if (!challenge) throw new RepositoryError('Challenge is required');
    
    // Convert to database format
    const data = this.mapper.toPersistence(challenge);
    
    // Save to database
    const { data: savedData, error } = await this.db
      .from(this.tableName)
      .insert(data)
      .select()
      .single();
      
    // Handle errors
    if (error) throw new RepositoryError(`Failed to save challenge: ${error.message}`);
    
    // Map result back to domain entity
    return this.mapper.toDomain(savedData);
  }
  
  // Other methods...
}
```

## Complex Mapping Scenarios

### Related Entities

When mapping entities with relationships, the mapper can handle different approaches:

1. **Eager Loading**: Load and map related entities immediately

```javascript
// Eager loading in UserMapper
toDomain(data) {
  if (!data) return null;
  
  // Map user preferences if available
  let preferences = null;
  if (data.preferences) {
    preferences = new UserPreferences({
      theme: data.preferences.theme,
      notificationsEnabled: data.preferences.notifications_enabled
    });
  }
  
  return new User(data.id, {
    email: data.email,
    name: data.name,
    preferences: preferences,
    // Other properties...
  });
}
```

2. **Lazy Loading**: Return a method to load related entities on demand

```javascript
// Lazy loading in ChallengeMapper
toDomain(data, { loadResponses = false } = {}) {
  if (!data) return null;
  
  const challenge = new Challenge(data.id, {
    title: data.title,
    description: data.description,
    // Other properties...
  });
  
  // Add method to load responses later if needed
  if (!loadResponses) {
    challenge.loadResponses = async (repo) => {
      const responses = await repo.findResponsesByChallengeId(challenge.id);
      challenge.setResponses(responses);
      return responses;
    };
  }
  
  return challenge;
}
```

### Collection Mapping

For collections of entities, mappers provide methods to handle arrays:

```javascript
// Mapping collections in ChallengeMapper
toDomainCollection(dataArray) {
  if (!dataArray || !Array.isArray(dataArray)) return [];
  
  return dataArray.map(data => this.toDomain(data));
}

toPersistenceCollection(challenges) {
  if (!challenges || !Array.isArray(challenges)) return [];
  
  return challenges.map(challenge => this.toPersistence(challenge));
}
```

## Benefits of Our Implementation

1. **Domain Model Purity**: Our domain models focus solely on business logic
2. **Separation of Concerns**: Clear separation between domain and persistence layers
3. **Testability**: Domain models and mappers can be tested in isolation
4. **Maintainability**: Database schema changes only affect mappers, not domain models
5. **Flexibility**: Support for multiple data sources or storage formats

## Best Practices

1. **Keep Mappers Simple**: Mappers should focus only on data translation
2. **Use Factory Methods**: For complex mapping scenarios, use factory methods
3. **Implement Collection Methods**: Always provide methods for mapping collections
4. **Handle Nulls**: Always handle null or undefined values gracefully
5. **Validate Input/Output**: Ensure data is valid before and after mapping
6. **Consider Performance**: Be mindful of eager vs. lazy loading for related entities

## Conclusion

The Data Mapper pattern is a critical component of our DDD architecture, allowing our domain models to remain clean and focused on business logic while providing a flexible approach to persistence. By maintaining a strict separation between domain and data access concerns, we can evolve each layer independently and keep our codebase maintainable and testable. 