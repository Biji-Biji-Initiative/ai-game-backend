# API Services Guide

This document provides detailed guidance on working with the API layer in the AI Fight Club frontend application.

## Overview

The API layer in this application follows a service-oriented architecture pattern, using React Query for data fetching and caching. Each API service encapsulates a specific domain of functionality, such as user management, session handling, or game-specific operations.

## Directory Structure

```
src/services/api/
├── apiClient.ts         # Central client for handling all API requests
├── apiResponse.ts       # Standard response structure and utility functions
├── errorHandling.ts     # Centralized error handling utilities
├── mock/                # Mock API implementation
│   ├── data/            # Mock data
│   ├── endpoints/       # Mock endpoint implementations
│   └── utils.ts         # Mock utility functions
└── services/            # API service hooks
    ├── userService.ts
    ├── sessionService.ts
    ├── fightCardService.ts
    ├── focusService.ts
    ├── profileService.ts  
    ├── traitsService.ts
    └── challengeService.ts
```

## Key Components

### apiClient.ts

The `apiClient` is a central service that handles all API calls in the application:

```typescript
// Core method for all API calls
async call<T = Record<string, unknown>, D = Record<string, unknown>>(
  endpoint: (data?: D) => ApiResponse<T>, 
  realPath: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  data?: D
): Promise<ApiResponse<T>>
```

- Handles mock implementation during development
- Uses standardized error handling
- Returns consistent response format

### apiResponse.ts

Defines the standard response structure:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  status: number;
  data?: T;
  error?: ApiError;
}
```

### Service Hooks

Each service file exports React Query hooks that use the `apiClient`:

#### Query Hooks (for fetching data)

```typescript
// Example: Fetch focus areas
export const useGetFocusAreas = () => {
  return useQuery({
    queryKey: ['focusAreas'],
    queryFn: () => apiClient.call(
      mockEndpoints.getFocusAreas,
      '/focus-areas',
      'GET'
    ),
  });
};
```

#### Mutation Hooks (for modifying data)

```typescript
// Example: Update user profile
export const useUpdateUserProfile = () => {
  return useMutation({
    mutationFn: (data: UpdateUserRequest) => 
      apiClient.call(
        mockEndpoints.updateUserProfile,
        '/users/profile',
        'PUT',
        data
      ),
    onSuccess: (data) => {
      console.log('Profile updated successfully:', data);
    },
  });
};
```

## Using API Services in Components

### Queries

```tsx
import { useGetFocusAreas } from '@/services/api/services/focusService';

const FocusSelection = () => {
  const { data, isLoading, isError, error } = useGetFocusAreas();
  
  if (isLoading) return <div>Loading focus areas...</div>;
  if (isError) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data?.data?.map(focus => (
        <FocusCard key={focus.id} focus={focus} />
      ))}
    </div>
  );
};
```

### Mutations

```tsx
import { useUpdateUserProfile } from '@/services/api/services/userService';

const ProfileForm = () => {
  const updateMutation = useUpdateUserProfile();
  
  const handleSubmit = (values) => {
    updateMutation.mutate(values);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      {updateMutation.isLoading && <span>Saving...</span>}
      {updateMutation.isError && <span>Error: {updateMutation.error.message}</span>}
      {updateMutation.isSuccess && <span>Profile updated!</span>}
    </form>
  );
};
```

## Mock Implementation

For development and testing, the API layer uses mock endpoints defined in the `mock/endpoints` directory. Each endpoint simulates server behavior:

```typescript
export const getTraits = (): ApiResponse<Trait[]> => {
  // Simulate network delay
  delay(300, 800);
  
  // Simulate potential errors
  if (Math.random() < 0.05) {
    return createErrorResponse('Failed to fetch traits');
  }
  
  // Return successful response with mock data
  return {
    success: true,
    status: 200,
    data: mockTraits
  };
};
```

## Testing API Services

Each service has a dedicated test file following this pattern:

1. Mock the `apiClient.call` function
2. Test success scenarios with mock data
3. Test error handling for failed requests
4. Verify that component integration works correctly

Example test:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useGetFocusAreas } from '../focusService';
import apiClient from '../../apiClient';
import { createMockApiResponse } from '@/tests/testUtils';

jest.mock('../../apiClient', () => ({
  call: jest.fn(),
}));

it('should fetch focus areas successfully', async () => {
  const mockData = [/* mock focus areas */];
  const mockResponse = createMockApiResponse(mockData);
  
  apiClient.call.mockResolvedValue(mockResponse);
  
  const { result } = renderHook(() => useGetFocusAreas());
  
  await waitFor(() => {
    expect(result.current.status).toBe('success');
  });
  
  expect(apiClient.call).toHaveBeenCalledWith(
    expect.any(Function),
    '/focus-areas',
    'GET'
  );
  
  expect(result.current.data).toEqual(mockResponse);
});
```

## Migrating to Real API Endpoints

When transitioning from mock endpoints to real API calls:

1. Keep the existing service hooks unchanged
2. Update the `apiClient.ts` to use real HTTP requests instead of mock endpoints
3. Consider implementing a feature flag to toggle between mock and real endpoints

This provides a seamless transition with minimal changes to components.

## Best Practices

1. **Consistent Error Handling**: Always use the centralized error handling utilities.
2. **Type Safety**: Define TypeScript interfaces for all requests and responses.
3. **Testing**: Write tests for all API service hooks.
4. **Caching Strategy**: Configure proper caching in React Query for optimal performance.
5. **Separation of Concerns**: Keep API logic in service files, not components.

By following these patterns, the application maintains a clean separation between UI components and data fetching logic, making it more maintainable and easier to test.
