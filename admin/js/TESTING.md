# Testing Strategy

This document outlines the testing approach for the new architecture, providing guidelines for unit testing, integration testing, and end-to-end testing.

## Overview

The new architecture with dependency injection significantly improves testability by making it easy to mock dependencies and isolate units of code. This document provides guidelines for implementing tests at various levels.

## Unit Testing

### Components and Services

All components and services should be unit tested. The dependency injection pattern makes it easy to provide mock dependencies for isolated testing.

Example of testing a component with mocked dependencies:

```typescript
// Testing a component
import { MyComponent } from '../components/MyComponent';
import { DomService } from '../services/DomService';
import { Logger } from '../core/Logger';

describe('MyComponent', () => {
  let component: MyComponent;
  let mockDomService: jest.Mocked<DomService>;
  let mockLogger: jest.Mocked<Logger>;
  
  beforeEach(() => {
    // Create mocks
    mockDomService = {
      getElementById: jest.fn(),
      addClass: jest.fn(),
      addEventListener: jest.fn(),
    } as unknown as jest.Mocked<DomService>;
    
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    
    // Initialize component with mocks
    component = new MyComponent({
      domService: mockDomService,
      logger: mockLogger,
    });
  });
  
  it('should initialize correctly', () => {
    expect(mockLogger.info).toHaveBeenCalledWith('MyComponent initialized');
  });
  
  it('should handle user interactions', () => {
    // Setup
    const mockElement = document.createElement('div');
    mockDomService.getElementById.mockReturnValue(mockElement);
    
    // Execute
    component.handleButtonClick();
    
    // Verify
    expect(mockDomService.addClass).toHaveBeenCalledWith(mockElement, 'active');
    expect(mockLogger.debug).toHaveBeenCalledWith('Button clicked');
  });
});
```

### Core Services

Core services should have comprehensive unit tests to ensure they function correctly and reliably:

```typescript
// Testing ConfigManager
import { ConfigManager } from '../core/ConfigManager';
import { StorageService } from '../services/StorageService';
import { Logger } from '../core/Logger';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockLogger: jest.Mocked<Logger>;
  
  beforeEach(() => {
    mockStorageService = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;
    
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    
    configManager = new ConfigManager({
      storageService: mockStorageService,
      logger: mockLogger,
    });
  });
  
  it('should get config values', () => {
    // Setup
    configManager.setDefaults({ 'key': 'default-value' });
    
    // Execute & Verify
    expect(configManager.get('key')).toBe('default-value');
  });
  
  it('should merge config values', () => {
    // Setup
    configManager.setDefaults({ 'key1': 'value1', 'key2': 'value2' });
    
    // Execute
    configManager.merge({ 'key2': 'new-value' });
    
    // Verify
    expect(configManager.get('key1')).toBe('value1');
    expect(configManager.get('key2')).toBe('new-value');
  });
});
```

### Browser API Abstraction Services

For services that abstract browser APIs, use JSDOM to simulate the browser environment:

```typescript
// Testing StorageService
import { StorageService } from '../services/StorageService';
import { Logger } from '../core/Logger';

describe('StorageService', () => {
  let storageService: StorageService;
  let mockLogger: jest.Mocked<Logger>;
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    
    storageService = new StorageService({
      logger: mockLogger,
    });
  });
  
  it('should set and get values', () => {
    // Execute
    storageService.set('key', { value: 'test' });
    const result = storageService.get('key');
    
    // Verify
    expect(result).toEqual({ value: 'test' });
  });
  
  it('should return default value when key not found', () => {
    // Execute
    const result = storageService.get('non-existent', 'default');
    
    // Verify
    expect(result).toBe('default');
  });
});
```

## Integration Testing

Integration tests verify that multiple components work together correctly.

### Testing Component Interactions

Test that components interact with each other correctly through the dependency container:

```typescript
// Integration test for components that interact
import { DependencyContainer } from '../core/DependencyContainer';
import { ComponentA } from '../components/ComponentA';
import { ComponentB } from '../components/ComponentB';
import { EventBus } from '../core/EventBus';

describe('Component Interaction', () => {
  let container: DependencyContainer;
  let componentA: ComponentA;
  let componentB: ComponentB;
  let eventBus: EventBus;
  
  beforeEach(() => {
    // Set up real dependency container with minimal set of services
    container = new DependencyContainer();
    
    // Register real EventBus for testing component interactions
    eventBus = new EventBus();
    container.register('eventBus', () => eventBus);
    
    // Register components with test implementations
    container.register('componentA', (c) => {
      return new ComponentA({
        eventBus: c.get('eventBus'),
      });
    });
    
    container.register('componentB', (c) => {
      return new ComponentB({
        eventBus: c.get('eventBus'),
      });
    });
    
    // Get component instances
    componentA = container.get('componentA');
    componentB = container.get('componentB');
  });
  
  it('should handle events between components', () => {
    // Setup spy on ComponentB's method
    jest.spyOn(componentB, 'handleDataReceived');
    
    // Execute - ComponentA sends event that ComponentB listens for
    componentA.sendData({ value: 'test-data' });
    
    // Verify ComponentB received and processed the event
    expect(componentB.handleDataReceived).toHaveBeenCalledWith({ value: 'test-data' });
  });
});
```

### Testing API Integration

Test that the API client interacts correctly with the backend:

```typescript
// API client integration tests
import { APIClient } from '../api/api-client';
import { ApiErrorHandler } from '../api/api-error-handler';
import { mockFetch } from '../test-utils/mock-fetch';

describe('APIClient Integration', () => {
  let apiClient: APIClient;
  let errorHandler: ApiErrorHandler;
  
  beforeEach(() => {
    // Mock fetch globally
    global.fetch = mockFetch();
    
    // Setup error handler
    errorHandler = {
      handleError: jest.fn(),
    };
    
    // Create API client
    apiClient = new APIClient({
      baseUrl: 'https://api.example.com',
      errorHandler,
    });
  });
  
  it('should handle successful GET requests', async () => {
    // Setup mock response
    mockFetch.mockResponseOnce(
      JSON.stringify({ data: 'test' }),
      { status: 200 }
    );
    
    // Execute
    const result = await apiClient.get('/endpoint');
    
    // Verify
    expect(result).toEqual({ data: 'test' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/endpoint',
      expect.objectContaining({ method: 'GET' })
    );
  });
  
  it('should handle API errors', async () => {
    // Setup mock error response
    mockFetch.mockResponseOnce(
      JSON.stringify({ error: 'Not found' }),
      { status: 404 }
    );
    
    // Execute & Verify
    await expect(apiClient.get('/not-found')).rejects.toThrow();
    expect(errorHandler.handleError).toHaveBeenCalled();
  });
});
```

## End-to-End Testing

End-to-end tests verify that the entire application works correctly from the user's perspective.

### Cypress Tests

Use Cypress to automate browser testing and verify user flows:

```typescript
// cypress/integration/user-flows.spec.js
describe('User Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });
  
  it('should allow users to interact with the form', () => {
    // Navigate to form
    cy.get('[data-test="nav-form"]').click();
    
    // Fill form
    cy.get('[data-test="input-name"]').type('Test User');
    cy.get('[data-test="select-type"]').select('Option 2');
    cy.get('[data-test="submit-btn"]').click();
    
    // Verify result
    cy.get('[data-test="result-container"]')
      .should('be.visible')
      .and('contain', 'Success');
    
    // Verify correct data is displayed
    cy.get('[data-test="result-name"]').should('contain', 'Test User');
    cy.get('[data-test="result-type"]').should('contain', 'Option 2');
  });
});
```

## Test Coverage

Aim for the following test coverage levels:

- **Core services**: 90-100% coverage
- **Abstraction services**: 80-90% coverage 
- **Managers and controllers**: 70-80% coverage
- **UI components**: 60-70% coverage

Use Jest's coverage reports to track coverage metrics.

## Mocking Strategy

### Types of Mocks

1. **Stub Services**: Implement only the methods needed for a particular test
2. **Spy Wrappers**: Use real services but spy on method calls
3. **Test Doubles**: Implement alternative behavior for testing

### Creating Mocks

Create a shared mocks directory for common mocks:

```
/admin/js/test
  /mocks
    MockDomService.ts
    MockStorageService.ts
    MockNetworkService.ts
    MockLogger.ts
    ...
```

Example of a reusable mock:

```typescript
// MockLogger.ts
import { Logger, LogLevel } from '../../core/Logger';

export class MockLogger implements Logger {
  public logLevel: LogLevel = LogLevel.DEBUG;
  public componentLoggers: Map<string, any> = new Map();
  
  public logs: {
    debug: any[],
    info: any[],
    warn: any[],
    error: any[],
  } = {
    debug: [],
    info: [],
    warn: [],
    error: [],
  };
  
  public debug(...args: any[]): void {
    this.logs.debug.push(args);
  }
  
  public info(...args: any[]): void {
    this.logs.info.push(args);
  }
  
  public warn(...args: any[]): void {
    this.logs.warn.push(args);
  }
  
  public error(...args: any[]): void {
    this.logs.error.push(args);
  }
  
  public getComponentLogger(name: string): Logger {
    return this;
  }
  
  public clearLogs(): void {
    this.logs.debug = [];
    this.logs.info = [];
    this.logs.warn = [];
    this.logs.error = [];
  }
}
```

## Test Organization

Organize tests to mirror the structure of the source code:

```
/admin/js
  /core
    /DependencyContainer.ts
    /DependencyContainer.test.ts
  /services
    /StorageService.ts
    /StorageService.test.ts
  ...
```

## Continuous Integration

Set up CI to run tests automatically:

1. Unit tests on every commit
2. Integration tests on pull request
3. End-to-end tests before deployment

## Test Scripts

Add the following scripts to package.json:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open"
  }
}
```

## Best Practices

1. **Write Tests First**: Consider using Test-Driven Development (TDD)
2. **Keep Tests Small**: Test one thing at a time
3. **Use Clear Assertions**: Make it obvious what is being tested
4. **Use Real Services Sparingly**: Mock dependencies to isolate units
5. **Avoid Test Interdependence**: Tests should be able to run in any order
6. **Test Edge Cases**: Include error handling scenarios
7. **Maintain Tests**: Update tests when code changes

## Testing Utilities

Create helper utilities for common testing tasks:

```typescript
// test-utils/dom-helpers.ts
export function createMockElement(tagName: string, attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement(tagName);
  
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  return element;
}

export function triggerEvent(element: HTMLElement, eventType: string, eventDetail: any = {}): void {
  const event = new CustomEvent(eventType, { detail: eventDetail });
  element.dispatchEvent(event);
}
```

## Conclusion

The new architecture significantly improves testability through:

1. Dependency injection enabling easy mocking
2. Clear separation of concerns
3. Abstracted browser APIs
4. Event-based communication

Follow these guidelines to create robust, maintainable tests that ensure the reliability of the application. 