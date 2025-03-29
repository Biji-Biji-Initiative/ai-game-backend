# Domain-Driven Design Implementation

## Overview

This document explains our approach to implementing Domain-Driven Design (DDD) principles in the codebase. It specifically focuses on the separation of domain models from persistence concerns, which is a core DDD principle.

## Data Mapper Pattern

We use the Data Mapper pattern to separate our domain entities from persistence logic. This creates a clear boundary between the domain and infrastructure layers.

### Benefits

1. **Domain Purity**: Domain entities focus on business rules and behavior without being polluted by database-specific code.
2. **Flexibility**: Changing database schema doesn't require changing domain entities.
3. **Testability**: Domain logic can be tested independently from persistence.
4. **Single Responsibility**: Each component has a single purpose (domain logic vs. persistence logic).

## Implementation

### Domain Entities

Domain entities represent core business concepts and encapsulate behavior. They:

- Focus on business rules and domain logic
- Are persistence-ignorant (don't know or care how they're stored)
- Handle validation of domain invariants
- Include domain-specific operations/methods
- Track domain events for eventual consistency

Example (simplified):
```javascript
class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.roles = data.roles || ['user'];
    this._domainEvents = [];
  }

  addRole(role) {
    if (!this.roles.includes(role)) {
      this.roles.push(role);
      this.addDomainEvent('USER_ROLE_ADDED', { role });
    }
  }
  
  addDomainEvent(type, data) {
    this._domainEvents.push({ type, data });
  }
  
  getDomainEvents() {
    return this._domainEvents;
  }
  
  clearDomainEvents() {
    this._domainEvents = [];
  }
}
```

### Data Mappers

Data mappers handle the conversion between domain objects and database representations. They:

- Convert from database format to domain entities (`toDomain`)
- Convert from domain entities to database format (`toPersistence`)
- Handle the conversion between snake_case (database) and camelCase (domain)
- Deal with any data transformations needed for persistence

Example:
```javascript
class UserMapper {
  toDomain(data) {
    // Convert from database format to domain entity
    return new User({
      id: data.id,
      email: data.email,
      roles: data.roles,
      // ... other properties
    });
  }
  
  toPersistence(user) {
    // Convert from domain entity to database format
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      // ... convert to snake_case if needed
    };
  }
}
```

### Repositories

Repositories provide the interface between domain code and persistence. They:

- Use mappers to convert between domain and database formats
- Encapsulate database access logic
- Return domain entities to higher layers
- Handle transactions and error mapping
- Publish domain events after successful operations

Example:
```javascript
class UserRepository {
  constructor(dbClient, userMapper) {
    this.db = dbClient;
    this.mapper = userMapper;
  }
  
  async findById(id) {
    const data = await this.db.users.findUnique({ where: { id } });
    return this.mapper.toDomain(data);
  }
  
  async save(user) {
    const dbData = this.mapper.toPersistence(user);
    const savedData = await this.db.users.upsert({
      where: { id: dbData.id },
      update: dbData,
      create: dbData
    });
    
    // Publish domain events
    const events = user.getDomainEvents();
    user.clearDomainEvents();
    
    for (const event of events) {
      await this.eventBus.publish(event.type, event.data);
    }
    
    return this.mapper.toDomain(savedData);
  }
}
```

## Best Practices

1. **Keep Domain Entities Pure**: Domain entities should never contain persistence code.
2. **Use Mappers for Database Conversion**: Always use mappers to convert between domain and persistence formats.
3. **Domain Events for Consistency**: Use domain events to maintain eventual consistency between aggregates.
4. **Aggregate Roots**: Only Aggregate Roots should be directly accessible from repositories.
5. **Validation in Entities**: Business rule validation should happen in domain entities.
6. **Infrastructure in Repositories**: Database-specific logic belongs in repositories or mappers.

## Migration Guide

To migrate existing code to this pattern:

1. Create a mapper class for each domain entity.
2. Move `toDatabase` and `fromDatabase` methods from entities to mappers.
3. Update repositories to use mappers instead of calling methods on entities.
4. Remove persistence-specific code from entities.
5. Add domain event tracking to entities for important state changes.

## Examples

See the following examples:
- `src/core/challenge/mappers/ChallengeMapper.js`
- `src/core/user/mappers/UserMapper.js` 