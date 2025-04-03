# Services Directory

This directory contains service implementations for interfacing with external resources like APIs.

## Structure

- `api/`: Contains API service implementations
  - `interfaces/`: TypeScript interfaces defining the contract for APIs
  - `mocks/`: Mock implementations of services for development
  - `api-client-factory.ts`: Factory for creating API clients
  - `mock-api-client.ts`: Mock implementation of the API client
  - `service-provider.ts`: Provider for accessing services
  - `index.ts`: Main exports

## Adding a New Service

To add a new service:

1. Define the service interface in `api/interfaces/services.ts`
2. Create a mock implementation in the `api/mocks/` directory
3. Update the `ApiServiceProvider` to provide the new service
4. Update the `ApiContext` to include the new service

## Usage with React

Services are provided through React Context. To use a service in a component:

```tsx
import { useApi } from '../contexts/api-context';

function MyComponent() {
  const { userService } = useApi();
  
  // Now you can use the service
  // e.g., userService.getCurrentUser()
}
```

## Mock Implementation

All services currently use mock implementations that return predefined data instead of making real API calls. This allows for development and testing without a backend.

Each mock service registers mock responses with the `MockApiClient`, which simulates network requests and returns the appropriate mock data.
