# Architectural Migration Guide

## Overview

This document outlines the architectural changes that have been implemented to address the major issues in the codebase. The goal of these changes is to create a more maintainable, testable, and scalable codebase by fixing inconsistencies, reducing redundancy, and applying proper dependency injection.

## Key Changes

### 1. Centralized Bootstrap Process

The application now uses a single entry point for initialization:

- `AppBootstrapper.ts` is now the single source of truth for component initialization
- All components are registered in the dependency container
- `index.ts` has been simplified to only call the bootstrap process

### 2. Standardized Core Components

We've standardized on a single implementation for each core functionality:

- **API Client**: `APIClient` in `api/api-client.ts` is now the standard client
- **Logger**: `Logger` in `core/Logger.ts` is the standard logger
- **Config Manager**: `ConfigManager` in `core/ConfigManager.ts`
- **UI Manager**: `UIManager` in `components/UIManagerNew.ts`

### 3. Abstraction Services

We've created abstractions for browser-specific functionality:

- `StorageService` provides an abstraction over localStorage/sessionStorage
- `DomService` provides an abstraction for DOM manipulations

### 4. Standardized Type Definitions

All component options now have standard interfaces in `types/app-types.ts`.

## How to Migrate Your Code

### 1. Use Dependency Injection

Instead of creating instances directly, get them from the dependency container:

```typescript
// OLD WAY
const apiClient = new APIClient(errorHandler, config);

// NEW WAY
const container = DependencyContainer.getInstance();
const apiClient = container.get<APIClient>('mainApiClient');
```

### 2. Use Storage Service Instead of localStorage

```typescript
// OLD WAY
localStorage.setItem('key', JSON.stringify(value));
const data = JSON.parse(localStorage.getItem('key') || 'null');

// NEW WAY
const storageService = container.get<StorageService>('storageService');
storageService.set('key', value);
const data = storageService.get('key');
```

### 3. Use DomService Instead of Direct DOM Access

```typescript
// OLD WAY
const element = document.getElementById('someId');
element.classList.add('active');

// NEW WAY
const domService = container.get<DomService>('domService');
const element = domService.getElementById('someId');
domService.addClass(element, 'active');
```

### 4. Use Proper TypeScript Interfaces

```typescript
// OLD WAY
constructor(options = {}) {
  this.container = options.container || document.getElementById('container');
}

// NEW WAY
import { ComponentOptions } from '../types/app-types';

interface MyComponentOptions extends ComponentOptions {
  container?: HTMLElement;
  debug?: boolean;
}

constructor(options: MyComponentOptions = {}) {
  this.container = options.container || domService.getElementById('container');
}
```

## Upcoming Changes

In the future, we plan to:

1. Replace the remaining direct DOM manipulations with DomService
2. Continue refining the type system
3. Implement proper testing
4. Remove old deprecated components

## Best Practices

1. **Use dependency injection** for all components
2. **Create proper interfaces** for all options and properties
3. **Avoid browser-specific code** in core logic
4. **Register components** in the dependency container
5. **Use abstractions** for browser environment access

## Questions?

If you have any questions about the migration or need help updating your code, please contact the architecture team. 