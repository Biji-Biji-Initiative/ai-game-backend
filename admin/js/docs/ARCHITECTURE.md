# TypeScript Core Architecture

This document provides an overview of the application's TypeScript architecture, core components, and how to use them effectively.

## Core Components

The application is built on a modular architecture with the following key components:

### 1. Component Base (`component-base.ts`)

The foundation of our component system, providing interfaces for standard component lifecycle, events, and standardization.

- `Component`: Base interface for all components
- `ComponentOptions`: Standard options pattern

```typescript
// Example of implementing a component
import { Component } from '../types/component-base';

export class MyComponent implements Component {
  public initialize(): void {
    // Initialize component
  }
}
```

### 2. Event Bus (`EventBus.ts`)

A centralized event management system that allows for loose coupling between components.

```typescript
// Subscribe to an event
EventBus.getInstance().on('data:updated', (data) => {
  console.log('Data was updated', data);
});

// Publish an event
EventBus.getInstance().emit('data:updated', { id: 123, value: 'new data' });
```

### 3. Dependency Container (`DependencyContainer.ts`)

Service locator and dependency injection container to manage service instances.

```typescript
// Register a service
DependencyContainer.getInstance().register('userService', () => new UserService());

// Get a service
const userService = DependencyContainer.getInstance().get('userService');
```

### 4. Config Manager (`ConfigManager.ts`)

Centralized configuration management with dynamic updates and type safety.

```typescript
// Set a config value
ConfigManager.getInstance().set('apiTimeout', 5000);

// Get a typed config value
const timeout = ConfigManager.getInstance().get<number>('apiTimeout', 3000); // Default 3000
```

### 5. Logger (`Logger.ts`)

Flexible logging system with log levels, component-specific logging, and formatting.

```typescript
// Get a logger instance
const logger = Logger.getLogger('MyComponent');

// Log messages
logger.debug('Detailed debug info');
logger.info('General information');
logger.warn('Warning message');
logger.error('Error occurred', errorObject);
```

### 6. HTTP Client (`HttpClient.ts`)

Type-safe HTTP client for making API requests with error handling, retries, and interceptors.

```typescript
// Make a request
const response = await HttpClient.getInstance().get('/api/users', { id: 123 });

// With more options
const response = await HttpClient.getInstance().request('/api/users', {
  method: 'GET',
  headers: { 'Accept': 'application/json' },
  params: { id: 123 },
  timeout: 5000
});
```

### 7. API Client (`ApiClient.ts`)

Application-specific API client that provides a higher-level interface for API communication.

```typescript
// Register an API endpoint
ApiClient.getInstance().registerEndpoint('getUser', {
  path: '/users/:id',
  method: 'GET',
  requiresAuth: true
});

// Call the endpoint
const response = await ApiClient.getInstance().callEndpoint('getUser', { id: '123' });
```

### 8. Storage Utilities (`storage.ts`)

Unified interface for different storage types (local, session, memory) with namespacing and type safety.

```typescript
import { StorageType, createNamespace } from '../utils/storage';

// Create storage with a namespace
const userStorage = createNamespace('user', { type: StorageType.LOCAL });

// Store and retrieve data
userStorage.setItem('preferences', { theme: 'dark' });
const preferences = userStorage.getItem<{ theme: string }>('preferences');
```

### 9. App Bootstrapper (`AppBootstrapper.ts`)

Initializes the application in the correct order, handles dependencies, and manages the startup process.

```typescript
import { AppBootstrapper } from './core/AppBootstrapper';
import { LogLevel } from './core/Logger';

// Bootstrap the application
await AppBootstrapper.getInstance().bootstrap({
  logLevel: LogLevel.DEBUG,
  configPath: '/config/app-config.json',
  apiUrl: '/api/v1'
});
```

## Application Flow

The application startup flow follows these steps:

1. Application entry point (`index.ts`) is loaded
2. The `AppBootstrapper` is initialized
3. Core components are initialized in proper order:
   - Logger
   - ConfigManager
   - EventBus
   - DependencyContainer
   - HttpClient
   - ApiClient
4. Application-specific components are registered and initialized
5. UI components are rendered
6. The application is ready for user interaction

## Architecture Patterns

The architecture uses several key patterns:

1. **Singleton Pattern**: Core services are accessible via singleton instances
2. **Dependency Injection**: Components receive their dependencies via constructor or setters
3. **Observer Pattern**: Event-based communication via the EventBus
4. **Factory Pattern**: Services create instances of complex objects
5. **Options Pattern**: Components are configured with typed options objects
6. **Repository Pattern**: Data access is abstracted through repository interfaces

## Type System

The application uses a strongly-typed approach with TypeScript:

1. **Utility Types**: Located in `utility-types.ts` for extended type operations
2. **Component Interfaces**: In `component-base.ts` for consistent component structure
3. **Module Types**: In `modules.ts` for application module configuration

## Best Practices

When extending the application:

1. **Component Creation**:
   - Implement the `Component` interface
   - Accept options via constructor
   - Register with the DependencyContainer

2. **Event Handling**:
   - Use the EventBus for cross-component communication
   - Define clear event names and typed payloads
   - Clean up event listeners when components are destroyed

3. **Error Handling**:
   - Use structured error classes
   - Log errors appropriately
   - Provide user-friendly error messages

4. **API Communication**:
   - Register endpoints via ApiClient
   - Use typed responses
   - Handle auth errors and retries

## Extending the Architecture

### Creating a New Component

```typescript
import { Component } from '../types/component-base';
import { Logger } from '../core/Logger';

export interface UserManagerOptions {
  defaultRole?: string;
}

export class UserManager implements Component {
  private logger = Logger.getLogger('UserManager');
  private options: UserManagerOptions;
  
  constructor(options: UserManagerOptions = {}) {
    this.options = {
      defaultRole: 'user',
      ...options
    };
  }
  
  public initialize(): void {
    this.logger.info('UserManager initialized');
  }
  
  public createUser(name: string): { id: number; name: string; role: string } {
    this.logger.debug(`Creating user: ${name}`);
    return { 
      id: Math.floor(Math.random() * 1000), 
      name, 
      role: this.options.defaultRole || 'user' 
    };
  }
}
```

### Registering and Using a Component

```typescript
// Register the component
DependencyContainer.getInstance().register('userManager', () => {
  const userManager = new UserManager({ defaultRole: 'admin' });
  userManager.initialize();
  return userManager;
});

// Use the component
const userManager = DependencyContainer.getInstance().get<UserManager>('userManager');
const newUser = userManager.createUser('John Doe');
```

### Adding a Custom API Endpoint

```typescript
// Register the endpoint
ApiClient.getInstance().registerEndpoint('updateUserProfile', {
  path: '/users/:userId/profile',
  method: 'PUT',
  requiresAuth: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Use the endpoint
const response = await ApiClient.getInstance().callEndpoint(
  'updateUserProfile',
  { userId: '123' },  // Path parameters
  { name: 'New Name', email: 'new@example.com' }  // Request body
);

// Handle the response
if (response.status === 200) {
  console.log('Profile updated:', response.data);
} else {
  console.error('Failed to update profile:', response.statusText);
}
```

## Migration Guide

For existing code, follow these steps to integrate with the new architecture:

1. **Identify Core Components**: Determine which parts of your code need to be components
2. **Implement Component Interface**: Add the Component interface to your classes
3. **Use Dependency Container**: Register and retrieve services via the container
4. **Adopt Event Bus**: Replace direct component calls with event-based communication
5. **Add Proper Logging**: Use the Logger for consistent logging
6. **Leverage HTTP/API Client**: Replace direct fetch/XHR calls with the HTTP/API client

## Conclusion

This architecture provides a solid foundation for building maintainable, scalable TypeScript applications. By following these patterns and practices, developers can ensure code remains organized, testable, and easy to extend. 