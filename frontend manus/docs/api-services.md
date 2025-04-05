# API Services Documentation

This document describes the API services layer for the AI Fight Club frontend application.

## Overview

The application uses a service-oriented architecture to interact with backend APIs. As part of our pure frontend approach, we've implemented a comprehensive mock API layer that simulates backend interactions without requiring an actual backend connection.

## Architecture

Our API service architecture consists of the following components:

1. **API Client Interface** (`ApiClient`)
   - Defines the contract for making HTTP requests
   - Provides methods for GET, POST, PUT, DELETE operations

2. **Mock API Client** (`MockApiClient`)
   - Implements the `ApiClient` interface
   - Returns mock data instead of making real HTTP requests
   - Simulates network delays for realistic behavior

3. **Service Interfaces**
   - Define the contract for each domain-specific service
   - Examples: `UserService`, `ChallengeService`, etc.

4. **Mock Service Implementations**
   - Implement service interfaces with mock data
   - Register mock responses with the `MockApiClient`

5. **Service Provider**
   - Provides access to all services through a unified interface
   - Creates and manages service instances

6. **React Context**
   - Provides API services to React components
   - Uses React's Context API for dependency injection

## Directory Structure

```
src/services/api/
├── interfaces/
│   ├── api-client.ts        # API client interfaces
│   ├── models.ts            # Data models
│   └── services.ts          # Service interfaces
├── mocks/
│   ├── user-service.mock.ts     # Mock implementation of UserService
│   └── challenge-service.mock.ts # Mock implementation of ChallengeService
├── api-client-factory.ts    # Factory for creating API clients
├── mock-api-client.ts       # Mock implementation of API client
├── service-provider.ts      # Provider for accessing services
└── index.ts                 # Main exports
```

## Usage

To use the API services in a component:

```tsx
import { useApi } from '../contexts/api-context';

function MyComponent() {
  const { userService } = useApi();
  
  // Use the service
  const fetchUser = async () => {
    const response = await userService.getCurrentUser();
    if (response.data) {
      // Handle success
    } else if (response.error) {
      // Handle error
    }
  };
  
  return (
    // Component JSX
  );
}
```

## Adding New Services

To add a new service:

1. Define the service interface in `interfaces/services.ts`
2. Create a mock implementation in the `mocks/` directory
3. Update the `ApiServiceProvider` to provide the new service
4. Update the `ApiContext` to include the new service

This approach ensures we can easily switch between mock and real implementations in the future without changing the component code.

## Mock Implementation

All services currently use mock implementations that return predefined data instead of making real API calls. This allows for development and testing without a backend.

Each mock service registers mock responses with the `MockApiClient`, which simulates network requests and returns the appropriate mock data.

## Example: Challenge Service

Here's an example of how the Challenge service is implemented:

```typescript
// Interface definition
interface ChallengeService {
  getChallenges(filters?: { difficulty?: string; tags?: string[]; search?: string }): Promise<ApiResponse<Challenge[]>>;
  getChallengeById(id: string): Promise<ApiResponse<Challenge>>;
  createChallenge(challenge: Omit<Challenge, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Challenge>>;
  updateChallenge(id: string, challenge: Partial<Challenge>): Promise<ApiResponse<Challenge>>;
  deleteChallenge(id: string): Promise<ApiResponse<void>>;
}

// Mock implementation
export class MockChallengeService implements ChallengeService {
  private apiClient: MockApiClient;
  private mockChallenges: Challenge[];

  constructor(apiClient: MockApiClient) {
    this.apiClient = apiClient;
    this.mockChallenges = [
      // Mock challenge data
    ];
    this.setupMocks();
  }

  private setupMocks(): void {
    // Register mock responses for each endpoint
    this.apiClient.registerMock('GET:/api/challenges', {
      data: this.mockChallenges,
      status: 200,
    });
    // ... other endpoints
  }

  async getChallenges(filters?: { difficulty?: string; tags?: string[]; search?: string }): Promise<ApiResponse<Challenge[]>> {
    // Filter challenges based on the provided filters
    let filteredChallenges = [...this.mockChallenges];

    if (filters?.difficulty) {
      filteredChallenges = filteredChallenges.filter(
        c => c.difficulty === filters.difficulty
      );
    }

    if (filters?.tags?.length) {
      filteredChallenges = filteredChallenges.filter(
        c => c.tags.some(tag => filters.tags.includes(tag))
      );
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      filteredChallenges = filteredChallenges.filter(
        c => 
          c.title.toLowerCase().includes(search) ||
          c.description.toLowerCase().includes(search)
      );
    }

    return {
      data: filteredChallenges,
      status: 200,
    };
  }

  // ... other methods
}
```

## Best Practices

1. **Type Safety**: Always use TypeScript interfaces for service methods and responses
2. **Error Handling**: Implement proper error handling with the `ApiResponse` type
3. **Mock Data**: Create realistic mock data that matches expected API responses
4. **Network Simulation**: Use network delay simulation for realistic behavior
5. **Documentation**: Document all service interfaces and their implementations

## API Client

The `apiClient.ts` file provides a generalized interface for making API calls. It abstracts the underlying fetch mechanism and handles common concerns like:

- Response handling and error standardization
- Proper content type headers
- Optional mocking via the mock endpoints

## Services

Each service file provides React Query hooks for specific API operations. These hooks handle:

- Data fetching and caching
- Optimistic updates
- Loading and error states
- Automatic retries

### Available Services

#### Session Service

Handles user session management:

- `useCreateSession`: Create a new game session
- `useGetSession`: Retrieve session information by ID

#### Traits Service

Manages user personality trait assessment:

- `useGetTraitQuestions`: Fetch trait assessment questions
- `useSubmitTraitAssessment`: Submit user trait ratings
- `useGetTraitAssessment`: Retrieve a user's trait assessment results

#### Focus Service

Handles focus area generation and selection:

- `useGenerateFocusAreas`: Generate focus areas based on user traits
- `useGetAllFocusAreas`: Get all possible focus areas

#### Challenge Service

Manages game round challenges:

- `useGenerateChallenge`: Generate a challenge for a specific round
- `useSubmitResponse`: Submit a user's response to a challenge
- `useGetAIResponse`: Get AI's response to a user submission

#### Profile Service

Handles human edge profile generation and retrieval:

- `useGenerateProfile`: Generate a human edge profile based on game interactions
- `useGetSharedProfile`: Retrieve a shared profile by ID

#### Fight Card Service

Manages fight card generation and display:

- `useGenerateFightCard`: Generate a comparison card between human and AI
- `useGetFightCard`: Retrieve a specific fight card by ID

## Usage Example

```tsx
import { useApi } from '../contexts/api-context';

function MyComponent() {
  const { userService } = useApi();
  
  // Use the service
  const fetchUser = async () => {
    const response = await userService.getCurrentUser();
    if (response.data) {
      // Handle success
    } else if (response.error) {
      // Handle error
    }
  };
  
  return (
    // Component JSX
  );
}
```

## Testing

Services are tested using Jest and React Testing Library. Test files are located alongside the service files in a `__tests__` directory, with the `.test.tsx` extension.

Each test verifies:
- Correct API endpoint is called with expected parameters
- Loading states are properly managed
- Success and error scenarios are handled correctly
