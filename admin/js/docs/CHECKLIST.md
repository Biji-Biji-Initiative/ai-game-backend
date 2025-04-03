# Architecture Implementation Checklist

This document provides a checklist for developers to ensure their code properly implements the new architecture patterns.

## Component Implementation Checklist

### ✅ Dependency Injection

- [ ] Component has an options interface that extends ComponentOptions
- [ ] All dependencies are received through constructor options
- [ ] No direct instantiation of other components inside the component
- [ ] No usage of singletons or static getInstance() methods
- [ ] Constructor properly initializes all properties from options
- [ ] Default values are provided for optional dependencies
- [ ] Options interface is properly typed with no `any` types

Example:
```typescript
interface MyComponentOptions {
  domService: DomService;
  eventBus: EventBus;
  logger: Logger;
  configManager?: ConfigManager; // Optional dependency
}

class MyComponent {
  private domService: DomService;
  private eventBus: EventBus;
  private logger: Logger;
  private configManager?: ConfigManager;
  
  constructor(options: MyComponentOptions) {
    this.domService = options.domService;
    this.eventBus = options.eventBus;
    this.logger = options.logger;
    this.configManager = options.configManager;
  }
  
  // Rest of component implementation...
}
```

### ✅ Browser API Abstraction

- [ ] No direct access to `document`, `window`, or `localStorage`
- [ ] Using DomService for DOM manipulation
- [ ] Using StorageService for localStorage/sessionStorage
- [ ] Using NetworkService for fetch/XMLHttpRequest
- [ ] Using proper error handling

Examples:

❌ Incorrect:
```typescript
// Direct DOM access
const element = document.getElementById('my-element');
element.classList.add('active');

// Direct localStorage access
localStorage.setItem('key', JSON.stringify(value));
```

✅ Correct:
```typescript
// Using DomService
const element = this.domService.getElementById('my-element');
this.domService.addClass(element, 'active');

// Using StorageService
this.storageService.set('key', value);
```

### ✅ Logging

- [ ] Using Logger instead of console.log
- [ ] Logger is initialized with component name
- [ ] Appropriate log levels are used (debug, info, warn, error)
- [ ] Error objects are passed to logger.error as second argument

Examples:

❌ Incorrect:
```typescript
console.log('Component initialized');
console.error('Something went wrong: ' + error.message);
```

✅ Correct:
```typescript
this.logger.info('Component initialized');
this.logger.error('Something went wrong', error);
```

### ✅ Event Communication

- [ ] Using EventBus for inter-component communication
- [ ] Event names follow naming convention: `namespace:event-name`
- [ ] Event handlers are properly bound to component instance
- [ ] Event subscriptions are cleaned up when component is destroyed

Examples:

❌ Incorrect:
```typescript
// Direct method call to another component
otherComponent.doSomething(data);

// Using DOM events for component communication
document.dispatchEvent(new CustomEvent('my-event', { detail: data }));
```

✅ Correct:
```typescript
// Publishing events
this.eventBus.publish('myComponent:dataChanged', { value: newValue });

// Subscribing to events
this.subscription = this.eventBus.subscribe('otherComponent:stateChanged', (data) => {
  this.handleStateChange(data);
});

// Cleanup
destroy() {
  if (this.subscription) {
    this.subscription.unsubscribe();
  }
}
```

### ✅ Configuration

- [ ] Using ConfigManager for configuration values
- [ ] No hardcoded configuration values
- [ ] Proper defaults are provided
- [ ] Configuration paths use dot notation

Examples:

❌ Incorrect:
```typescript
// Hardcoded values
const apiUrl = 'https://api.example.com';
const timeout = 30000;
```

✅ Correct:
```typescript
// Using ConfigManager
const apiUrl = this.configManager.get('api.baseUrl');
const timeout = this.configManager.get('api.timeout', 30000); // with default
```

## Service Implementation Checklist

### ✅ Service Structure

- [ ] Service has a clear single responsibility
- [ ] Service is registered in the dependency container
- [ ] Service exposes a clear API with typed methods
- [ ] Service handles its own errors appropriately
- [ ] Service has proper logging

### ✅ Service Registration

- [ ] Service is registered in AppBootstrapper.ts
- [ ] Service factory function provides all required dependencies
- [ ] Service is registered with the correct name
- [ ] Registration location follows organizational structure

Example:
```typescript
// In AppBootstrapper.ts
this.container.register('myService', (c) => {
  return new MyService({
    logger: Logger.getLogger('MyService'),
    configManager: c.get('configManager'),
    storageService: c.get('storageService'),
  });
});
```

## Code Organization Checklist

### ✅ File Structure

- [ ] Files are organized by feature or function type
- [ ] Related files are grouped together
- [ ] Naming is consistent
- [ ] Exports are clear

### ✅ Import Structure

- [ ] Import statements are organized and grouped
- [ ] No circular dependencies
- [ ] Import paths are relative to current file location

Example:
```typescript
// Core imports
import { Logger } from '../core/Logger';
import { ConfigManager } from '../core/ConfigManager';

// Service imports
import { DomService } from '../services/DomService';
import { StorageService } from '../services/StorageService';

// Type imports
import { ComponentOptions } from '../types/component-options';
```

## TypeScript Best Practices

### ✅ Type Definitions

- [ ] All properties have explicit types
- [ ] No use of `any` type
- [ ] Interfaces are used for object shapes
- [ ] Union types are used for multiple possibilities
- [ ] Generic types are used when appropriate

### ✅ Nullability

- [ ] Optional properties marked with `?`
- [ ] Null checks performed before using optional values
- [ ] Default values provided for optional parameters

Example:
```typescript
interface UserData {
  id: string;
  name: string;
  email?: string; // Optional
}

function processUser(userData: UserData, options?: { validate: boolean }): void {
  // Null check with default
  const shouldValidate = options?.validate ?? false;
  
  // Null check for optional property
  if (userData.email) {
    // Use email
  }
}
```

## Testing Checklist

### ✅ Unit Tests

- [ ] Component has unit tests
- [ ] Tests use mock dependencies
- [ ] All public methods are tested
- [ ] Edge cases and error handling are tested
- [ ] Tests are isolated and don't rely on external state

### ✅ Integration Tests

- [ ] Integration tests verify component interactions
- [ ] API integrations are tested with mock responses
- [ ] Event-based interactions are tested

## Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code follows the architecture patterns in this checklist
- [ ] All tests pass
- [ ] No TypeScript errors or warnings
- [ ] Code is properly documented
- [ ] No console.log statements
- [ ] No direct DOM manipulation
- [ ] No direct localStorage access
- [ ] Dependency injection is used consistently
- [ ] Event-based communication is used for component interactions

## Examples

### Component Template

```typescript
import { Logger } from '../core/Logger';
import { EventBus } from '../core/EventBus';
import { DomService } from '../services/DomService';
import { StorageService } from '../services/StorageService';
import { ComponentOptions } from '../types/component-options';

interface MyFeatureComponentOptions extends ComponentOptions {
  domService: DomService;
  eventBus: EventBus;
  storageService: StorageService;
  initialValue?: number;
}

/**
 * MyFeatureComponent - Responsible for X functionality
 */
export class MyFeatureComponent {
  private domService: DomService;
  private eventBus: EventBus;
  private logger: Logger;
  private storageService: StorageService;
  private value: number;
  private subscription: { unsubscribe: () => void } | null = null;
  
  constructor(options: MyFeatureComponentOptions) {
    this.domService = options.domService;
    this.eventBus = options.eventBus;
    this.logger = options.logger;
    this.storageService = options.storageService;
    this.value = options.initialValue ?? 0;
    
    this.logger.debug('MyFeatureComponent initialized');
    this.initialize();
  }
  
  private initialize(): void {
    // Setup event listeners
    this.subscription = this.eventBus.subscribe('otherComponent:valueChanged', (data) => {
      this.handleExternalValueChange(data.value);
    });
    
    // Load saved state if available
    const savedValue = this.storageService.get('myFeature:value');
    if (savedValue !== null) {
      this.value = savedValue;
      this.logger.debug(`Loaded saved value: ${savedValue}`);
    }
    
    // Setup UI
    this.setupUI();
  }
  
  private setupUI(): void {
    const container = this.domService.getElementById('my-feature-container');
    if (!container) {
      this.logger.error('Container element not found');
      return;
    }
    
    // Create UI elements
    // ...
  }
  
  private handleExternalValueChange(newValue: number): void {
    this.value = newValue;
    this.updateUI();
    this.logger.debug(`Value updated to ${newValue} from external source`);
  }
  
  private updateUI(): void {
    // Update UI with current value
    // ...
    
    // Notify other components
    this.eventBus.publish('myFeature:valueUpdated', { value: this.value });
  }
  
  public setValue(newValue: number): void {
    if (newValue === this.value) {
      return;
    }
    
    this.value = newValue;
    this.storageService.set('myFeature:value', newValue);
    this.updateUI();
    this.logger.debug(`Value set to ${newValue}`);
  }
  
  public getValue(): number {
    return this.value;
  }
  
  public destroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    
    this.logger.debug('MyFeatureComponent destroyed');
  }
}
```

### Service Template

```typescript
import { Logger } from '../core/Logger';
import { ConfigManager } from '../core/ConfigManager';
import { NetworkService } from '../services/NetworkService';
import { ComponentOptions } from '../types/component-options';

interface MyServiceOptions extends ComponentOptions {
  networkService: NetworkService;
  configManager: ConfigManager;
}

/**
 * MyService - Responsible for X functionality
 */
export class MyService {
  private networkService: NetworkService;
  private configManager: ConfigManager;
  private logger: Logger;
  private baseUrl: string;
  
  constructor(options: MyServiceOptions) {
    this.networkService = options.networkService;
    this.configManager = options.configManager;
    this.logger = options.logger;
    
    this.baseUrl = this.configManager.get('api.baseUrl');
    this.logger.debug('MyService initialized');
  }
  
  /**
   * Fetches data from the API
   */
  public async fetchData(id: string): Promise<any> {
    try {
      const endpoint = `${this.baseUrl}/data/${id}`;
      this.logger.debug(`Fetching data from ${endpoint}`);
      
      const response = await this.networkService.get(endpoint);
      this.logger.info(`Successfully fetched data for ID: ${id}`);
      
      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch data for ID: ${id}`, error);
      throw error;
    }
  }
  
  /**
   * Processes data and returns transformed result
   */
  public processData(data: any): any {
    try {
      // Process data
      const result = {
        // transformed data
      };
      
      this.logger.debug('Data processed successfully');
      return result;
    } catch (error) {
      this.logger.error('Error processing data', error);
      throw error;
    }
  }
}
```

This checklist should help ensure that all code follows the new architecture patterns consistently. 