# Migration Guide

This document outlines the steps required to migrate from the old architecture to the new TypeScript architecture.

## Deleted Files

The following files have been deleted as part of the migration:

- `admin/js/core/ApiClient.ts` - Replaced by `APIClient` from `api/api-client.ts`
- `admin/js/config/config.ts` - Replaced by `ConfigManager` from `core/ConfigManager.ts`
- `admin/js/utils/event-emitter.ts` - Replaced by `EventBus` from `core/EventBus.ts`
- `admin/js/utils/logger.ts` - Replaced by `Logger` from `core/Logger.ts`
- `admin/js/utils/dependency-container.ts` - Replaced by `DependencyContainer` from `core/DependencyContainer.ts`

## Migration Steps

### 1. Update Imports

Replace imports from deleted files with their replacements:

```typescript
// Old imports
import { ApiClient } from '../core/ApiClient';
import { Config } from '../config/config';
import { EventEmitter } from '../utils/event-emitter';
import { logger } from '../utils/logger';

// New imports
import { APIClient } from '../api/api-client';
import { ConfigManager } from '../core/ConfigManager';
import { EventBus } from '../core/EventBus';
import { Logger } from '../core/Logger';
```

### 2. API Client Migration

#### Before:
```typescript
import { ApiClient } from '../core/ApiClient';

// Get singleton instance
const apiClient = ApiClient.getInstance();

// Make a request
apiClient.get('/some-endpoint')
  .then(response => {
    console.log(response);
  })
  .catch(error => {
    console.error(error);
  });
```

#### After:
```typescript
import { APIClient } from '../api/api-client';

// Get from dependency container
const apiClient = dependencyContainer.get('mainApiClient');

// Or in a component constructor, receive it via options
constructor(options: ComponentOptions) {
  this.apiClient = options.apiClient;
}

// Make a request
this.apiClient.get('/some-endpoint')
  .then(response => {
    console.log(response);
  })
  .catch(error => {
    console.error(error);
  });
```

### 3. Config Migration

#### Before:
```typescript
import { Config } from '../config/config';

// Get singleton instance
const config = Config.getInstance();

// Get a config value
const apiUrl = config.get('apiUrl');
```

#### After:
```typescript
import { ConfigManager } from '../core/ConfigManager';

// Get from dependency container
const configManager = dependencyContainer.get('configManager');

// Or in a component constructor, receive it via options
constructor(options: ComponentOptions) {
  this.configManager = options.configManager;
}

// Get a config value
const apiUrl = this.configManager.get('api.baseUrl');
```

### 4. Event Emitter Migration

#### Before:
```typescript
import { EventEmitter } from '../utils/event-emitter';

// Create an event emitter instance
const eventEmitter = new EventEmitter();

// Emit an event
eventEmitter.emit('event-name', { data: 'value' });

// Listen for an event
eventEmitter.on('event-name', (data) => {
  console.log(data);
});
```

#### After:
```typescript
import { EventBus } from '../core/EventBus';

// Get singleton instance
const eventBus = EventBus.getInstance();
// Or from dependency container
const eventBus = dependencyContainer.get('eventBus');
// Or in a component constructor, receive it via options
constructor(options: ComponentOptions) {
  this.eventBus = options.eventBus;
}

// Publish an event
this.eventBus.publish('event-name', { data: 'value' });

// Subscribe to an event
this.eventBus.subscribe('event-name', (data) => {
  console.log(data);
});
```

### 5. Logger Migration

#### Before:
```typescript
import { logger } from '../utils/logger';

// Log messages
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', new Error('Error details'));
```

#### After:
```typescript
import { Logger } from '../core/Logger';

// Get component logger
const logger = Logger.getLogger('ComponentName');
// Or from dependency container
const logger = dependencyContainer.get('logger').getLogger('ComponentName');
// Or in a component constructor, receive it via options
constructor(options: ComponentOptions) {
  this.logger = Logger.getLogger('ComponentName');
}

// Log messages
this.logger.debug('Debug message');
this.logger.info('Info message');
this.logger.warn('Warning message');
this.logger.error('Error message', new Error('Error details'));
```

### 6. Browser API Abstraction

Replace direct browser API usage with abstraction services:

#### Direct localStorage
```typescript
// Before
localStorage.setItem('key', JSON.stringify(value));
const data = JSON.parse(localStorage.getItem('key') || '{}');

// After
const storageService = dependencyContainer.get('storageService');
storageService.set('key', value);
const data = storageService.get('key', {});
```

#### Direct DOM manipulation
```typescript
// Before
document.getElementById('element-id').textContent = 'New text';
const element = document.createElement('div');
document.body.appendChild(element);

// After
const domService = dependencyContainer.get('domService');
domService.getElementById('element-id').textContent = 'New text';
const element = domService.createElement('div');
domService.appendChild(document.body, element);
```

#### Direct fetch API
```typescript
// Before
fetch('/api/endpoint')
  .then(response => response.json())
  .then(data => console.log(data));

// After
const networkService = dependencyContainer.get('networkService');
networkService.get('/api/endpoint')
  .then(data => console.log(data));
```

### 7. Dependency Injection

Replace singleton patterns and direct instantiation with dependency injection:

#### Before:
```typescript
import { SomeService } from '../services/some-service';
import { AnotherService } from '../services/another-service';

class MyComponent {
  private someService: SomeService;
  private anotherService: AnotherService;

  constructor() {
    this.someService = SomeService.getInstance();
    this.anotherService = new AnotherService();
  }
}
```

#### After:
```typescript
import { SomeService } from '../services/some-service';
import { AnotherService } from '../services/another-service';

interface MyComponentOptions {
  someService: SomeService;
  anotherService: AnotherService;
}

class MyComponent {
  private someService: SomeService;
  private anotherService: AnotherService;

  constructor(options: MyComponentOptions) {
    this.someService = options.someService;
    this.anotherService = options.anotherService;
  }
}

// Registration in AppBootstrapper
dependencyContainer.register('myComponent', c => {
  return new MyComponent({
    someService: c.get('someService'),
    anotherService: c.get('anotherService')
  });
});
```

## Testing with the New Architecture

The new architecture makes testing easier by allowing dependencies to be mocked:

```typescript
import { MyComponent } from '../components/my-component';
import { SomeService } from '../services/some-service';
import { AnotherService } from '../services/another-service';

describe('MyComponent', () => {
  let component: MyComponent;
  let mockSomeService: jest.Mocked<SomeService>;
  let mockAnotherService: jest.Mocked<AnotherService>;

  beforeEach(() => {
    mockSomeService = {
      method1: jest.fn(),
      method2: jest.fn()
    } as unknown as jest.Mocked<SomeService>;

    mockAnotherService = {
      doSomething: jest.fn()
    } as unknown as jest.Mocked<AnotherService>;

    component = new MyComponent({
      someService: mockSomeService,
      anotherService: mockAnotherService
    });
  });

  it('should call methods on dependencies', () => {
    component.doSomething();
    expect(mockSomeService.method1).toHaveBeenCalled();
    expect(mockAnotherService.doSomething).toHaveBeenCalled();
  });
});
```

## Common Migration Patterns

### Converting a Class to Use DI

1. Define an options interface for constructor parameters
2. Update constructor to accept options
3. Assign dependencies from options
4. Remove any static getInstance() methods
5. Register the class in AppBootstrapper with its dependencies

### Converting Components with Direct Browser API Usage

1. Identify all direct browser API usage
2. Determine which abstraction service to use
3. Add the service to the component's options interface
4. Replace direct API calls with service method calls

## Migration Checklist

- [ ] Update imports to use new core components
- [ ] Update class constructors to use dependency injection
- [ ] Replace direct browser API usage with service abstractions
- [ ] Register components in AppBootstrapper
- [ ] Update tests to mock dependencies
- [ ] Remove any singleton getInstance() patterns
- [ ] Update property initialization to use constructor options 