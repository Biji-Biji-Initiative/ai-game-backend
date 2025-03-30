# DI Container Examples

This document provides practical examples of using the DI container for various common scenarios.

## Basic Container Usage

### Setting Up the Container

```javascript
import { DIContainer } from "@/core/infra/di/DIContainer.js";

// Create a new container
const container = new DIContainer();

// Register services
container
  .register('config', () => ({ apiUrl: 'https://api.example.com' }), true)
  .register('logger', c => new Logger(c.get('config')), true)
  .register('userService', c => new UserService({
    logger: c.get('logger'),
    config: c.get('config')
  }), false);

// Get a service
const userService = container.get('userService');
```

## Method Chaining

Method chaining allows cleaner, more concise registration code:

```javascript
// Before (without chaining)
container.register('service1', createService1, true);
container.register('service2', createService2, false);
container.register('service3', createService3, true);

// After (with chaining)
container
  .register('service1', createService1, true)
  .register('service2', createService2, false)
  .register('service3', createService3, true);
```

## Module Registration

Organize related services into modules for better organization:

```javascript
// Infrastructure module
function registerInfrastructure(container) {
  container
    .register('logger', c => new Logger(), true)
    .register('database', c => new Database(c.get('config')), true);
}

// Repositories module
function registerRepositories(container) {
  container
    .register('userRepository', c => new UserRepository(c.get('database')), true)
    .register('productRepository', c => new ProductRepository(c.get('database')), true);
}

// Register all modules
container
  .registerModule(registerInfrastructure)
  .registerModule(registerRepositories);
```

## Class Registration

Register a class directly with automatic dependency injection:

```javascript
// Define a service class
class EmailService {
  constructor(dependencies) {
    this.logger = dependencies.logger;
    this.config = dependencies.config;
    this.emailProvider = dependencies.emailProvider;
  }
  
  async sendEmail(to, subject, body) {
    this.logger.info(`Sending email to ${to}`);
    // Implementation
  }
}

// Register the class with dependencies
container.registerClass('emailService', EmailService, {
  dependencies: ['logger', 'config', 'emailProvider'],
  singleton: true
});

// Use the service
const emailService = container.get('emailService');
```

## Instance Registration

Register pre-configured instances directly:

```javascript
// Create an instance outside the container
const config = {
  apiKey: process.env.API_KEY,
  apiUrl: process.env.API_URL,
  environment: process.env.NODE_ENV
};

// Register the instance
container.registerInstance('config', config);

// Register a service that uses the config
container.register('apiClient', c => {
  return new ApiClient(c.get('config').apiKey, c.get('config').apiUrl);
}, true);
```

## Checking and Removing Services

Use the `has` and `remove` methods to check for and remove services:

```javascript
// Check if a service exists
if (container.has('legacyService')) {
  // Service exists
  console.log('Legacy service is registered');
}

// Remove a service
if (container.remove('oldService')) {
  console.log('Old service was removed');
}
```

## Child Containers

Create child containers for request-scoped dependencies:

```javascript
// Main application container with shared services
const appContainer = new DIContainer();
appContainer.register('config', () => configObject, true);
appContainer.register('logger', c => new Logger(), true);

// Create a request-scoped container for each request
function handleRequest(req, res) {
  // Create a child container
  const requestContainer = appContainer.createChild();
  
  // Register request-specific services
  requestContainer.register('requestContext', () => ({
    userId: req.userId,
    sessionId: req.sessionId,
    timestamp: Date.now()
  }), false);
  
  // Use the request container
  const service = requestContainer.get('userService');
  service.processRequest(req, res);
}
```

## Error Handling

Properly handle errors when using the container:

```javascript
try {
  const service = container.get('missingService');
} catch (error) {
  console.error('Failed to resolve service:', error.message);
  // Handle the error appropriately
}
```

## Testing with the Container

Create mock containers for testing:

```javascript
import { DIContainer } from '@/core/infra/di/DIContainer.js';
import sinon from 'sinon';

describe('UserService', () => {
  it('should retrieve user by ID', async () => {
    // Create mock dependencies
    const mockUserRepository = {
      findById: sinon.stub().resolves({ id: '123', name: 'Test User' })
    };
    
    const mockLogger = {
      info: sinon.spy(),
      error: sinon.spy()
    };
    
    // Create a test container
    const container = new DIContainer();
    container
      .registerInstance('userRepository', mockUserRepository)
      .registerInstance('logger', mockLogger);
    
    // Register the service under test
    container.register('userService', c => new UserService({
      userRepository: c.get('userRepository'),
      logger: c.get('logger')
    }), false);
    
    // Get the service and run the test
    const userService = container.get('userService');
    const user = await userService.getUserById('123');
    
    // Assertions
    sinon.assert.calledWith(mockUserRepository.findById, '123');
    expect(user).to.deep.equal({ id: '123', name: 'Test User' });
  });
}); 