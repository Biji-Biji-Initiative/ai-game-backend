# Dependency Injection

This document outlines our dependency injection (DI) approach, which is central to the application's architecture.

## Overview

Our application uses a container-based dependency injection pattern to manage component dependencies and promote loose coupling. The DI container is responsible for:

1. Creating instances of services, repositories, and other components
2. Resolving dependencies between components
3. Managing component lifecycles (singleton vs. transient)

## New Features and Improvements

Our DIContainer implementation has been enhanced with several new features:

1. **Method Chaining** - All registration methods now return the container instance for easier chaining
2. **Class Registration** - A new `registerClass()` method enables automatic dependency resolution
3. **Module Registration** - A new `registerModule()` method allows for cleaner modular registration
4. **Service Management** - Added `has()` and `remove()` methods for better service management
5. **Improved Documentation** - Each container service now includes comments explaining singleton decisions

For detailed guidelines on when to use these features and best practices, see:
- [DI Container Guidelines](./DIContainerGuidelines.md)
- [DI Container Examples](./DIContainerExamples.md)

## Container Structure

The DI container is initialized in `src/config/container.js` and configured through several module-specific registration files in `src/config/container/`:

- `infrastructure.js` - Core infrastructure components (logging, database, etc.)
- `repositories.js` - Data access repositories
- `services.js` - Domain services
- `coordinators.js` - Application-level coordinators
- `controllers.js` - API controllers
- `routes.js` - Route definitions
- `ai.js` - AI-related components

## Best Practices

### Component Registration

Components should be registered with clear dependency declarations:

```javascript
container.register('personalityCoordinator', c => {
    return new PersonalityCoordinator({
        userService: c.get('userService'),
        personalityService: c.get('personalityService'),
        logger: c.get('personalityLogger')
    });
}, false); // Transient lifecycle
```

With method chaining, multiple registrations can be more concise:

```javascript
container
  .register('service1', c => new Service1(), true)
  .register('service2', c => new Service2(), false)
  .register('service3', c => new Service3(), true);
```

### Component Retrieval

When retrieving components from the container:

1. **Use direct container access**: `container.get('componentName')`
2. **Fail fast**: Let missing dependencies throw errors instead of using fallbacks or mocks
3. **Test with mocks**: Use mocking techniques for tests rather than fallback implementations

### Application Initialization Pattern

The application follows a "fail fast" principle during initialization:

```javascript
// Import container directly - no fallbacks or complex recovery logic
import { container } from './config/container.js';
const config = container.get('config');

// Modular initialization with clear error boundaries
function initializeSwagger() {
  // Swagger initialization logic...
}

try {
  initializeSwagger();
} catch (error) {
  logger.error(`Failed to initialize Swagger UI: ${error.message}`);
  // Simple error handler instead of complex recovery
}

// Clean async initialization pattern
async function mountRoutesAndFinalize() {
  // Route mounting logic...
}

mountRoutesAndFinalize().catch(error => {
  logger.error(`Critical error during initialization: ${error.message}`);
  // Simple error handler
});
```

This approach:
- Simplifies the codebase by removing complex fallback/recovery patterns
- Makes errors more visible and easier to diagnose
- Creates clear boundaries of responsibility
- Avoids partially initialized application states

### Example: Event Handler Registration

The application event handlers registration demonstrates clean DI usage:

```javascript
// In app.js
import { registerEventHandlers } from './application/EventHandlers.js';
registerEventHandlers(container);

// In EventHandlers.js
export function registerEventHandlers(container) {
    if (!container) {
        throw new Error('Container is required for event handler registration');
    }
    
    const logger = container.get('logger');
    logger.info('Initializing application event handlers');
    
    const applicationEventHandlers = container.get('applicationEventHandlers');
    applicationEventHandlers.registerEventHandlers();
    
    logger.info('Application event handlers registered successfully');
}
```

This approach:
- Clearly expresses dependencies
- Fails early if dependencies are missing
- Avoids complex fallback logic
- Simplifies testing with clear boundaries

## Lifecycle Management

Components can be registered with different lifecycles:

- **Singleton** (true): One instance for the entire application
- **Transient** (false): A new instance created on each request

```javascript
// Singleton example (shared across requests)
container.register('logger', c => new Logger(c.get('config')), true);

// Transient example (new instance per request)
container.register('userService', c => new UserController({...}), false);
```

Choose the appropriate lifecycle based on:
- Whether the component maintains state
- Thread safety considerations
- Performance requirements

For detailed guidelines on when to use singletons vs transient instances, see [DI Container Guidelines](./DIContainerGuidelines.md).

## Testing with the Container

For tests, you can create mock containers:

```javascript
const containerMock = {
    get: sinon.stub()
};
containerMock.get.withArgs('logger').returns(loggerStub);
containerMock.get.withArgs('userService').returns(userServiceMock);
```

This allows testing components that depend on the container without creating the entire application context. 

Alternatively, you can create a real container with mock dependencies:

```javascript
const testContainer = new DIContainer();
testContainer
  .registerInstance('logger', mockLogger)
  .registerInstance('userRepository', mockUserRepository)
  .register('userService', c => new UserService({
    logger: c.get('logger'),
    userRepository: c.get('userRepository')
  }));

const service = testContainer.get('userService');
```

For more examples, see [DI Container Examples](./DIContainerExamples.md). 