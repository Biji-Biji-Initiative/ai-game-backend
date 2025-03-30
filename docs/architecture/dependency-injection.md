# Dependency Injection

This document provides a comprehensive guide to the dependency injection (DI) approach used in our application.

## Overview

Our application uses a container-based dependency injection pattern to manage component dependencies and promote loose coupling. The DI container is responsible for:

1. Creating instances of services, repositories, and other components
2. Resolving dependencies between components
3. Managing component lifecycles (singleton vs. transient)

## Container Structure and Architecture

The DI container is initialized in `src/config/container/index.js` and configured through several module-specific registration files:

```
src/config/container/
├── index.js                 # Main entry point that initializes the container
├── infrastructure.js        # Infrastructure components (logging, database, etc.)
├── repositories.js          # Data access repositories
├── services.js              # Domain and application service components
├── controllers.js           # API controllers
├── routes.js                # Route definitions
├── ai.js                    # AI-related components
├── coordinators.js          # Application-level coordinators
└── constants.js             # Constants and enums
```

Each module file contains a function that registers a specific type of component. This modular organization makes the container more maintainable and easier to understand.

## Container Features

Our DIContainer implementation includes several useful features:

1. **Method Chaining** - All registration methods return the container instance for easier chaining
2. **Class Registration** - A new `registerClass()` method enables automatic dependency resolution
3. **Module Registration** - A new `registerModule()` method allows for cleaner modular registration
4. **Service Management** - Added `has()` and `remove()` methods for better service management
5. **Child Containers** - Create child containers with `createChild()` for request-scoped dependencies
6. **Validation** - Container validation to ensure all required services are available

## Registration Patterns

### Basic Registration

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

### Method Chaining

Method chaining allows cleaner, more concise registration code:

```javascript
container
  .register('service1', createService1, true)
  .register('service2', createService2, false)
  .register('service3', createService3, true);
```

## Lifecycle Management: Singleton vs Transient

Components can be registered with different lifecycles:

- **Singleton** (true): One instance for the entire application
- **Transient** (false): A new instance created on each request

### Use Singletons For:

1. **Stateless Services** - Services that don't hold request-specific state and are thread-safe
2. **Expensive Resource Providers** - Services that create connections to databases, external APIs, etc.
3. **Shared Configuration** - Configuration objects that need to be consistent across the application
4. **Caching Services** - Services that maintain caches across multiple requests
5. **Logging Services** - Generally, logging services should be singletons
6. **Event Systems** - Event buses and event managers should typically be singletons

### Example Singleton Components:

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

### Example Transient Components:

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

## Adding New Components

### Adding a New Repository

```javascript
container.register(
  'myNewRepository',
  c => {
    return new MyNewRepository(c.get('supabase'), c.get('logger'));
  },
  true // Set to true for singleton instances
);
```

### Adding a New Service

```javascript
container.register(
  'myNewService',
  c => {
    return new MyNewService({
      myNewRepository: c.get('myNewRepository'),
      logger: c.get('logger'),
      eventBus: c.get('eventBus'),
    });
  },
  true
);
```

### Adding a New Controller

```javascript
container.register(
  'myNewController',
  c => {
    return new MyNewController({
      myNewService: c.get('myNewService'),
      logger: c.get('logger'),
    });
  },
  true
);
```

### Adding a New Route

```javascript
container.register(
  'myNewRoutes',
  c => {
    const myNewRoutes = require('../../routes/myNewRoutes');
    return myNewRoutes(c.get('myNewController'));
  },
  true
);

// Inside the apiRoutes registration
router.use('/my-new-feature', c.get('myNewRoutes'));
```

## Constructor Injection Pattern

Our application uses constructor injection as the primary pattern for receiving dependencies. This pattern makes dependencies explicit and improves testability.

### Example Class with Constructor Injection:

```javascript
export class UserService {
  constructor({ userRepository, eventBus, logger }) {
    this.userRepository = userRepository;
    this.eventBus = eventBus;
    this.logger = logger;
  }
  
  async getUserById(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(`User with ID ${id} not found`);
    }
    return user;
  }
}
```

## Testing with Dependency Injection

### Basic Test Setup

```javascript
import { UserService } from '../../../src/core/user/services/UserService.js';
import sinon from 'sinon';

describe('UserService', () => {
  let userService;
  let mockUserRepository;
  let mockEventBus;
  let mockLogger;
  
  beforeEach(() => {
    // Create mock dependencies
    mockUserRepository = {
      findById: sinon.stub(),
      create: sinon.stub(),
      update: sinon.stub(),
      delete: sinon.stub()
    };
    
    mockEventBus = {
      publish: sinon.stub().resolves()
    };
    
    mockLogger = {
      info: sinon.stub(),
      error: sinon.stub()
    };
    
    // Instantiate service with mock dependencies
    userService = new UserService({
      userRepository: mockUserRepository,
      eventBus: mockEventBus,
      logger: mockLogger
    });
  });
  
  it('should get user by ID', async () => {
    // Arrange
    const userId = '123';
    const mockedUser = { id: userId, name: 'Test User' };
    mockUserRepository.findById.withArgs(userId).resolves(mockedUser);
    
    // Act
    const result = await userService.getUserById(userId);
    
    // Assert
    expect(result).to.deep.equal(mockedUser);
    expect(mockUserRepository.findById.calledWith(userId)).to.be.true;
  });
});
```

### Testing with the DI Container

You can also test using the container directly:

```javascript
import { DIContainer } from '@/core/infra/di/DIContainer.js';

describe('UserService', () => {
  it('should retrieve user by ID', async () => {
    // Create mock dependencies
    const mockUserRepository = {
      findById: sinon.stub().resolves({ id: '123', name: 'Test User' })
    };
    
    const mockLogger = {
      info: sinon.stub(),
      error: sinon.stub()
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
    expect(mockUserRepository.findById.calledWith('123')).to.be.true;
    expect(user).to.deep.equal({ id: '123', name: 'Test User' });
  });
});
```

### Using In-Memory Repositories

For integration tests, consider using in-memory repositories instead of mocks:

```javascript
class InMemoryUserRepository {
  constructor() {
    this.users = new Map();
  }
  
  async findById(id) {
    return this.users.get(id) || null;
  }
  
  async create(user) {
    const newUser = { ...user, id: user.id || uuidv4() };
    this.users.set(newUser.id, newUser);
    return newUser;
  }
}

// In tests
const userRepository = new InMemoryUserRepository();
userRepository.users.set('123', { id: '123', name: 'Test User' });

const userService = new UserService({
  userRepository
});
```

## Best Practices

1. **Use Constructor Injection**: Make dependencies explicit by passing them through constructors
2. **Document Singleton Decisions**: When registering components, include comments explaining the lifecycle choice
3. **Fail Fast**: Design components to fail early if dependencies are missing or invalid
4. **Prefer Object Parameter Notation**: Use object parameter notation (`{dependency1, dependency2}`) instead of positional parameters
5. **Keep Component Registrations Organized**: Register components in the appropriate module file
6. **Verify All Interactions in Tests**: Test both the returned results and the interactions with dependencies
7. **Use Mock Factory Functions**: For frequently used mocks, create factory functions

## Error Handling

The DI container will throw errors when:
1. A service is requested but not registered
2. A factory function throws an error during resolution
3. Cyclic dependencies are detected

Components should validate their dependencies:

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

## Application Initialization Pattern

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

## Child Containers for Request Scoping

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

## Troubleshooting

If you encounter the error "Service not registered", make sure:

1. The component is registered in the appropriate module file
2. The name used in `container.get()` matches the registration name
3. There are no circular dependencies between components

For more complex issues, review the entire dependency chain to ensure all dependencies are properly registered. 