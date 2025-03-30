# Dependency Injection Container Guidelines

## Singleton Usage Guidelines

This document provides guidance on when to use singleton instances in the DI container.

### When to Use Singletons (set last parameter to `true`)

1. **Infrastructure components** that manage shared resources:
   - Database connections
   - Logger instances
   - Cache services
   - Event buses
   - External API clients (e.g., OpenAI client)

2. **Stateful services** that need to maintain state across requests:
   - Authentication services that cache tokens
   - Services managing real-time data
   - Services with expensive initialization

3. **Configuration providers** that read and parse configuration once:
   - Application configuration
   - Feature flags
   - Environment-specific settings

### When NOT to Use Singletons (set last parameter to `false`)

1. **Stateless services** with no shared state:
   - Pure utility services
   - Services that perform calculations or transformations
   - Services without side effects

2. **Request-scoped services** that should be isolated per request:
   - Services that maintain request-specific state
   - Services that should not share state between different requests

3. **Services with user-specific context**:
   - Services that act on behalf of specific users
   - Services that maintain user-specific data during processing

## Implementation in Container

When registering a service:

```javascript
// Register as singleton (recommended for shared resources)
container.register('databaseClient', c => new DatabaseClient(config), true);

// Register as transient instance (new instance each time)
container.register('userDataFormatter', c => new UserDataFormatter(), false);
```

## Benefits of Proper Singleton Management

1. **Resource efficiency** - Avoid creating multiple instances of resource-intensive services
2. **Consistent state** - Ensure state is properly shared when needed
3. **Request isolation** - Prevent state leakage between requests for user-specific services
4. **Memory optimization** - Reduce memory usage by not duplicating stateless services

## Notes on State Management

Services that maintain state should clearly document their thread-safety and state management approach. Consider using:

- Immutable state when possible
- Thread-safe data structures for shared state
- Request-scoped state isolation where appropriate

For request-scoped state in otherwise stateless services, consider using a factory pattern instead of singletons. 