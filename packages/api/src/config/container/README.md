# Dependency Injection Container Strategy

This document defines the standards and patterns for dependency registration in our DI container.

## Registration Patterns

Components can be registered in two primary ways:

### Singleton vs. Transient Registration

- **Singleton**: A single instance is created and shared across the application
- **Transient**: A new instance is created each time the dependency is resolved

## Registration Decision Guide

The following guide outlines when to use each registration pattern:

### Register as Singleton when:

1. **Stateless Utilities**: The service contains no request-specific or user-specific state
2. **Resource Management**: The service manages expensive resources (DB connections, HTTP clients)
3. **Caching**: The service provides caching functionality
4. **Configuration**: The service provides access to configuration values
5. **Resource Pools**: The service manages a pool of connections or reusable resources

### Register as Transient when:

1. **User-Specific State**: The service maintains state for a specific user or request
2. **Request-Scoped Data**: The service handles data specific to a single HTTP request
3. **Mutable State**: The service has internal state that changes during operation
4. **Concurrency Concerns**: Sharing the service could lead to race conditions

## Current Registration Strategy by Component Type

| Component Type | Default Pattern | Rationale |
|----------------|----------------|-----------|
| Controllers | Transient | Handle request-specific context and user data |
| Services | Conditional | See below for decision criteria |
| Repositories | Singleton | Share database connections, maintain caching layers |
| Infrastructure | Singleton | Provide system-wide resources like logging |
| Factories | Transient | Create domain-specific entities for requests |
| Coordinators | Transient | Orchestrate workflows for specific user/request |

### Service Registration Decision Criteria

For services, the decision is made based on these factors:

1. **Does it maintain user-specific state?** → Transient
2. **Does it perform heavy initialization?** → Singleton
3. **Does it provide caching?** → Singleton
4. **Is it stateless and purely functional?** → Singleton

## Example Registrations with Rationale

### Singleton Examples

```javascript
// Primarily reads from config repositories which are cached
container.register('challengeConfigService', c => {
  return new ChallengeConfigService({
    challengeTypeRepository: c.get('challengeTypeRepository'),
    formatTypeRepository: c.get('formatTypeRepository'),
    focusAreaConfigRepository: c.get('focusAreaConfigRepository'),
    difficultyLevelRepository: c.get('difficultyLevelRepository'),
    logger: c.get('challengeLogger')
  });
}, true); // Singleton: configuration doesn't change frequently
```

### Transient Examples

```javascript
container.register('userService', c => {
  return new UserService({
    userRepository: c.get('userRepository'),
    logger: c.get('logger'),
    eventBus: c.get('eventBus'),
    cacheService: c.get('cacheService')
  });
}, false); // Transient: user-specific operations should be isolated
```

## Implementation Notes

1. Always explicitly specify the singleton parameter (`true` or `false`) when registering a component
2. Add a comment explaining the singleton/transient decision
3. When in doubt about a component's state behavior, prefer transient registration
4. Review and update registrations during architectural reviews

## Maintenance and Evolution

This strategy should be reviewed with each major release and updated based on:

1. Performance profiling
2. Memory usage monitoring
3. Bug patterns related to state management
4. Architecture evolution 