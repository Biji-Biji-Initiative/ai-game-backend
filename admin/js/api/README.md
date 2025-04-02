# API Client Documentation

## Current Status

The admin application currently has three HTTP client implementations:

1. **APIClient** (`admin/js/api/api-client.ts`) - The primary recommended client
2. **ApiClient** (`admin/js/core/ApiClient.ts`) - Legacy client that now wraps APIClient 
3. **HttpClient** (`admin/js/core/HttpClient.ts`) - Deprecated low-level client

## Standardization Plan

We have begun consolidating these clients to reduce duplication and maintenance burden. The current implementation is in a transitional state with these changes:

- **ApiClient** has been refactored to internally use **APIClient** instead of **HttpClient**
- **HttpClient** has been marked as deprecated with JSDoc comments
- **AppBootstrapper** now creates and registers both client implementations

## Using API Clients

### Recommended: Use APIClient

```typescript
// Import APIClient 
import { APIClient } from '../api/api-client';

// Get an APIClient instance
const apiClient = new APIClient(errorHandler, config);

// Make a request
const data = await apiClient.makeRequest('GET', '/endpoint', null, options);
```

### Legacy: Use ApiClient via Dependency Injection  

```typescript
// Get ApiClient from dependency container
const dependencyContainer = DependencyContainer.getInstance();
const apiClient = dependencyContainer.get('apiClient');

// Use it with its HTTP-method specific methods
const response = await apiClient.get('/endpoint');
```

## Future Work

Future development should:

1. Gradually migrate all usages of **ApiClient** to use **APIClient** directly
2. Eventually remove **ApiClient** entirely after all usages are migrated
3. Remove **HttpClient** once **ApiClient** is removed

## Why This Approach

This transitional approach was chosen because:

- It prevents breaking changes while maintaining the existing code
- It allows for gradual migration to the recommended client
- It provides a clear path for future developers
- It standardizes on a single implementation (APIClient) that powers everything 