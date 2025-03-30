# Data Mapper Pattern

## Overview

The Data Mapper pattern is a structural pattern that separates domain models from the details of how they're persisted in the database. It creates a clear boundary between the domain layer (business logic) and infrastructure layer (persistence).

## Benefits

1. **Separation of Concerns**
   - Domain models focus solely on business rules and behaviors
   - Persistence details are isolated in dedicated mapper classes
   - Repositories coordinate between mappers and data sources

2. **Domain Model Integrity**
   - Domain models remain "persistence ignorant"
   - No need for snake_case/camelCase conversion in domain models
   - Domain objects don't need to know about database structure

3. **Flexibility**
   - Changes to database structure only affect mappers
   - Domain models can evolve independently
   - Multiple persistence formats can be supported via different mappers

4. **Testability**
   - Domain models can be tested without database dependencies
   - Mappers can be tested independently
   - Mock mappers can be easily substituted for testing

## Implementation in This Codebase

### Structure

1. **Domain Models**
   - Located in `src/core/<domain>/models/`
   - Focused on business logic and domain rules
   - No database-specific code like `toDatabase()` methods

2. **Mappers**
   - Located in `src/core/<domain>/mappers/`
   - Contain methods for converting between domain and database formats
   - Typically exported as singleton instances

3. **Repositories**
   - Located in `src/core/<domain>/repositories/`
   - Use mappers to convert between domain and database formats
   - Handle database operations and queries

### Mapper Methods

1. **toPersistence**
   - Converts a domain entity to database format
   - Handles camelCase to snake_case conversion
   - May validate output using database schema

2. **toDomain**
   - Converts database data to a domain entity
   - Creates and returns a new instance of the domain class
   - Handles snake_case to camelCase conversion

3. **toDomainCollection**
   - Converts a collection of database records to domain entities
   - Useful for bulk operations

### Example Implementation

```javascript
// Entity (src/core/user/models/User.js)
class User {
  constructor(data) {
    this.id = data.id;
    this.firstName = data.firstName || data.first_name;
    this.lastName = data.lastName || data.last_name;
    this.email = data.email;
    // No toDatabase() method here
  }
  
  // Domain logic methods...
}

// Mapper (src/core/user/mappers/UserMapper.js)
class UserMapper {
  toPersistence(user) {
    return {
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email
    };
  }
  
  toDomain(data) {
    if (!data) return null;
    return new User(data);
  }
  
  toDomainCollection(items) {
    return items.map(item => this.toDomain(item));
  }
}

// Repository (src/core/user/repositories/UserRepository.js)
class UserRepository {
  constructor(db, mapper) {
    this.db = db;
    this.mapper = mapper;
  }
  
  async findById(id) {
    const data = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    return this.mapper.toDomain(data);
  }
  
  async save(user) {
    const userData = this.mapper.toPersistence(user);
    const savedData = await this.db.insert('users', userData);
    return this.mapper.toDomain(savedData);
  }
}
```

## Guidelines

1. **Domain Models**
   - Should not have `toDatabase()` or `fromDatabase()` methods
   - Should accept both camelCase and snake_case in constructors for flexibility
   - Should focus on business behavior and validation

2. **Mappers**
   - Should be simple and focused on data conversion
   - Should validate output format when appropriate
   - Should be stateless (typically exported as singletons)

3. **Repositories**
   - Should always use mappers, never direct conversion logic
   - Should convert to domain entities as early as possible
   - Should operate on domain entities, not raw data objects

## Migrating Legacy Code

To convert existing code that uses direct persistence methods:

1. Create a mapper for the domain entity
2. Move conversion logic from `toDatabase()` to the mapper's `toPersistence()` method
3. Remove `toDatabase()` from the domain entity
4. Update repository to use the mapper
5. Test thoroughly to ensure behavior is unchanged

## References

- Martin Fowler, "Patterns of Enterprise Application Architecture"
- Eric Evans, "Domain-Driven Design" 