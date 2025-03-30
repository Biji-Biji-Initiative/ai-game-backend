# DI Container Usage Guidelines

This document provides specific guidelines for using our Dependency Injection (DI) container effectively.

## Singleton vs Transient Services

The decision to register a component as a singleton or a transient instance should be made carefully. Here are guidelines to help make this decision:

### Use Singletons For:

1. **Stateless Services** - Services that don't hold request-specific state and are thread-safe
2. **Expensive Resource Providers** - Services that create connections to databases, external APIs, etc.
3. **Shared Configuration** - Configuration objects that need to be consistent across the application
4. **Caching Services** - Services that maintain caches across multiple requests
5. **Logging Services** - Generally, logging services should be singletons
6. **Event Systems** - Event buses and event managers should typically be singletons

### Examples of Singleton Components:

```javascript
// Database connections (expensive to create)
container.register(
  'supabaseClient', 
  c => new SupabaseClient(config), 
  true // Singleton: YES
);

// Logging services (thread-safe, no user state)
container.register(
  'logger', 
  c => new Logger(c.get('config')), 
  true // Singleton: YES
);

// Config services (read-only data)
container.register(
  'configService', 
  c => new ConfigService(), 
  true // Singleton: YES
);
```

### Use Transient Instances For:

1. **User-Specific Services** - Services that operate on user-specific data
2. **Request-Scoped Operations** - Services that maintain state for a specific request
3. **Non-Thread-Safe Components** - Components that modify internal state in ways that could cause concurrency issues
4. **Services with Short-lived Resources** - Services that acquire and release resources within a single request

### Examples of Transient Components:

```javascript
// User services that deal with request-specific user data
container.register(
  'userService', 
  c => new UserService({
    userRepository: c.get('userRepository'),
    logger: c.get('logger')
  }), 
  false // Transient: per-request instance
);

// Request handlers that maintain state during the request
container.register(
  'challengeController', 
  c => new ChallengeController({
    challengeService: c.get('challengeService'),
    userService: c.get('userService')
  }), 
  false // Transient: new instance per request
);
```

## Registration Methods

Use the most appropriate registration method for your component:

### Standard Registration

For most components, use the standard `register` method:

```javascript
container.register('serviceName', c => {
  return new ServiceClass({
    dependency1: c.get('dependency1'),
    dependency2: c.get('dependency2')
  });
}, isSingleton);
```

### Instance Registration

For pre-configured instances or third-party objects:

```javascript
const loggerInstance = new Logger(config);
container.registerInstance('logger', loggerInstance);
```

### Class Registration

For simple services where all dependencies come from the container:

```javascript
container.registerClass('serviceName', ServiceClass, {
  dependencies: ['dependency1', 'dependency2'],
  singleton: true
});
```

### Module Registration

For organizing related registrations:

```javascript
container.registerModule(container => {
  container.register('service1', c => new Service1());
  container.register('service2', c => new Service2());
});
```

## Documentation Best Practices

When registering components, especially singletons, include a comment explaining why:

```javascript
container.register(
  'databaseClient', 
  c => new DatabaseClient(config), 
  true // Singleton: YES - maintains connection pool
);

container.register(
  'userService', 
  c => new UserService({userRepository: c.get('userRepository')}), 
  false // Transient: handles user-specific operations
);
```

## Error Handling

The DI container will throw errors when:
1. A service is requested but not registered
2. A factory function throws an error during resolution
3. Cyclic dependencies are detected

Design your components to fail fast if dependencies are missing or invalid:

```javascript
class UserService {
  constructor(dependencies) {
    const { userRepository, logger } = dependencies;
    
    if (!userRepository) throw new Error('userRepository is required');
    if (!logger) throw new Error('logger is required');
    
    this.userRepository = userRepository;
    this.logger = logger;
  }
}
```

## Testing with DI

In unit tests, you can create simplified mock versions of the container:

```javascript
const mockContainer = {
  get: jest.fn(name => {
    switch(name) {
      case 'logger': return mockLogger;
      case 'userRepository': return mockUserRepository;
      default: throw new Error(`Unexpected dependency: ${name}`);
    }
  })
};

const service = new UserService({
  userRepository: mockContainer.get('userRepository'),
  logger: mockContainer.get('logger')
});
``` 