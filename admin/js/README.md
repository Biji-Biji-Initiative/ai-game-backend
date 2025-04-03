# Admin UI Refactoring Project

This project is undergoing a major architectural refactoring to adopt modern TypeScript patterns and improve code maintainability.

## Core Architectural Principles

1. **Single Responsibility**: Each class has a clear, single responsibility
2. **Dependency Injection**: Dependencies are passed in, not created internally
3. **Abstraction Layers**: Browser APIs are accessed through service abstractions
4. **TypeScript Purity**: Strong typing throughout, no `any` types
5. **Centralized Bootstrapping**: Single initialization point in AppBootstrapper
6. **Single Source of Truth**: One definitive implementation of each core feature

## Key Services and Components

### Core Components

- **AppBootstrapper**: Central initialization point (`core/AppBootstrapper.ts`)
- **ConfigManager**: Configuration management (`core/ConfigManager.ts`)
- **Logger**: Logging service (`core/Logger.ts`)
- **EventBus**: Application-wide event publishing/subscribing (`core/EventBus.ts`)
- **DependencyContainer**: DI container (`core/DependencyContainer.ts`)
- **APIClient**: API requests and responses (`api/api-client.ts`)

### Abstraction Services

- **DomService**: DOM manipulation abstraction (`services/DomService.ts`)
- **StorageService**: Storage abstraction (`services/StorageService.ts`)
- **NetworkService**: Network requests abstraction (`services/NetworkService.ts`)
- **LoggingService**: Logging abstraction (`services/LoggingService.ts`)

### Managers

- **AuthManager**: Authentication and authorization
- **EndpointManager**: API endpoint definitions
- **VariableManager**: Environment variables
- **DomainStateManager**: Application state
- **HistoryManager**: Request history
- **StatusManager**: Backend status
- **BackendLogsManager**: Backend logs retrieval

### Controllers

- **ResponseController**: Handles API responses
- **UserInterfaceController**: Manages UI updates
- **FlowController**: Manages API request flows

### UI Components

- **UIManager**: UI elements and modals
- **ResponseViewer**: API response display
- **DomainStateViewer**: Application state display
- **VariableExtractor**: Variable management UI
- **LogsViewer**: Log display and filtering

## Dependency Injection Pattern

All components should follow this pattern:

```typescript
// Definition
export interface MyComponentOptions {
  // Required dependencies
  apiClient: APIClient;
  eventBus: EventBus;
  // Optional parameters with defaults in constructor
  someSetting?: boolean;
}

export class MyComponent {
  private apiClient: APIClient;
  private eventBus: EventBus;
  private someSetting: boolean;
  
  constructor(options: MyComponentOptions) {
    this.apiClient = options.apiClient;
    this.eventBus = options.eventBus;
    this.someSetting = options.someSetting ?? true;
  }
}

// Registration in AppBootstrapper
this.dependencyContainer.register(
  'myComponent',
  c => new MyComponent({
    apiClient: c.get('mainApiClient'),
    eventBus: c.get('eventBus'),
    someSetting: this.configManager.get('someFeature.enabled', false)
  })
);

// Usage in another component
constructor(options: YourComponentOptions) {
  this.myComponent = options.myComponent; // Passed from DI
}
```

## Deprecated Components

The following components are being maintained for backward compatibility but should not be used in new code:

- **ApiClient** (`core/ApiClient.ts`): Use `APIClient` from `api/api-client.ts` instead
- **Config** (`config/config.ts`): Use `ConfigManager` from `core/ConfigManager.ts` instead
- **HttpClient** (`core/HttpClient.ts`): Removed in favor of `APIClient` and `NetworkService`
- **utils/logger.ts**: Use `Logger` from `core/Logger.ts` instead
- **utils/event-emitter.ts**: Use `EventBus` from `core/EventBus.ts` instead

## Development Guidelines

1. **Never access browser APIs directly** - Use the appropriate service abstractions:
   - DOM manipulation → `DomService`
   - Storage (localStorage/sessionStorage) → `StorageService`
   - Network requests → `NetworkService` or `APIClient`
   - Console logging → `Logger`

2. **Always use dependency injection** - Components should receive dependencies through their constructor options, not by instantiating them directly or using getInstance() methods.

3. **Enforce TypeScript purity** - Avoid `any` types, use interfaces and generics for strong typing, and ensure functions have proper return types.

4. **Single responsibility** - Keep classes focused on a single responsibility. Break large classes into smaller, more focused ones.

5. **Update the AppBootstrapper** - When adding new components, ensure they're properly registered in the `AppBootstrapper` class.

## Migration Path

When refactoring existing code:

1. Start by identifying direct browser API usage and replace it with service abstractions
2. Convert singleton pattern getInstance() calls to dependency injection
3. Improve type definitions and replace `any` with specific types
4. Register the component in AppBootstrapper and update any dependent components

## Testing

All components should be designed for testability:

1. Dependencies should be injectable and mockable
2. Components should not rely on global state
3. Side effects should be isolated and testable

Unit tests should be placed in the `tests/` directory and should follow the same structure as the source code. 