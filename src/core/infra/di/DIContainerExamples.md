# DI Container Usage Examples

This document provides examples of how to use the enhanced Dependency Injection Container.

## Basic Registration and Resolution

```javascript
const { DIContainer } = require('./DIContainer');
const container = new DIContainer();

// Register a service
container.register('loggerService', () => {
  return new LoggerService();
}, true); // true = singleton

// Resolve the service
const logger = container.get('loggerService');
```

## Method Chaining

```javascript
const { DIContainer } = require('./DIContainer');
const container = new DIContainer();

// Register multiple services with method chaining
container
  .register('config', () => new ConfigService(), true)
  .register('logger', c => new LoggerService(c.get('config')), true)
  .register('userService', c => new UserService(c.get('logger')), false);
```

## Using Direct Instance Registration

```javascript
const { DIContainer } = require('./DIContainer');
const container = new DIContainer();

// Register an existing instance directly
const config = { apiUrl: 'https://api.example.com' };
container.registerInstance('config', config);
```

## Using Module Registration

```javascript
// In a services.js file
function registerServices(container) {
  container.register('userService', c => new UserService(c.get('userRepository')), true);
  container.register('authService', c => new AuthService(c.get('userService')), true);
}

// In your main container setup
const { DIContainer } = require('./DIContainer');
const container = new DIContainer();

container.registerModule(registerServices);
```

## Using Class Registration with Auto-Resolution

```javascript
class UserService {
  constructor(deps) {
    this.userRepository = deps.userRepository;
    this.logger = deps.logger;
  }
  
  findUser(id) {
    this.logger.debug(`Looking up user ${id}`);
    return this.userRepository.findById(id);
  }
}

// Register the class with dependency names
container.registerClass('userService', UserService, {
  dependencies: ['userRepository', 'logger'],
  singleton: true
});
```

## Advanced: Creating a Child Container

```javascript
// Create a parent container with core services
const parentContainer = new DIContainer();
parentContainer.register('config', () => new ConfigService(), true);
parentContainer.register('logger', c => new LoggerService(c.get('config')), true);

// Create a child container for request-scoped components
function createRequestContainer(userId) {
  const requestContainer = parentContainer.createChild();
  requestContainer.registerInstance('userId', userId);
  requestContainer.register('userContext', c => new UserContext(c.get('userId')), false);
  return requestContainer;
}

// Usage in request handling
app.get('/api/user', (req, res) => {
  const requestContainer = createRequestContainer(req.user.id);
  const userService = requestContainer.get('userService');
  // ...
});
```

## Checking for Service Existence

```javascript
// Check if a service exists before trying to use it
if (container.has('featureFlags')) {
  const featureFlags = container.get('featureFlags');
  if (featureFlags.isEnabled('new-feature')) {
    // Use the new feature
  }
}
```

## Removing a Service

```javascript
// Remove a service when it's no longer needed
container.remove('temporaryService');

// Check the result
const removed = container.remove('anotherService');
console.log(`Service was ${removed ? '' : 'not '}removed`);
``` 