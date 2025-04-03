# Testing Documentation

## Setup

The test environment is configured using Jest and Testing Library. We've implemented a comprehensive setup that handles various aspects of testing React components, including TypeScript integration and UI component mocking.

## Key Configuration Files

1. **jest.config.js**: Configures Jest with the necessary transformers, module mappers, and settings for TypeScript and React testing.

2. **jest.setup.js**: Sets up the test environment with necessary mocks for browser APIs like matchMedia and ResizeObserver, as well as importing Testing Library matchers.

3. **tsconfig.jest.json**: TypeScript configuration specific to testing, ensuring proper type checking in test files.

4. **babel.config.js**: Babel configuration for transpiling modern JavaScript and JSX syntax.

5. **src/tests/jest-dom.d.ts**: TypeScript type definitions for Jest matchers and mock functions.

6. **src/tests/testing-library-matchers.d.ts**: TypeScript type definitions for Testing Library matchers.

7. **src/tests/jest-setup.ts**: TypeScript setup file that extends Jest matchers.

## UI Component Mocking

To simplify testing and avoid issues with complex UI component dependencies, we've implemented mock versions of UI components in:
- `src/tests/__mocks__/componentMocks.js`

These mocks provide simple implementations of UI components like buttons, cards, and form elements, making it easier to test components that use them without having to deal with their full implementation details.

## Running Tests

```bash
# Run all tests
npm test

# Run specific tests
npm test src/components/ui/__tests__/typewriter-text.test.tsx

# Run tests with coverage
npm run test:coverage
```

## Current Testing Status

| Component/Feature | Status | Issues |
|-----------------|--------|--------|
| UI Components (Button, Card, etc.) | ✅ Working | None |
| TypewriterText | ✅ Working | None |
| Round1 | ❌ Failing | Component text mismatch |
| Round2 | ❌ Failing | Router mock issues, component text mismatch |
| Round3 | ❌ Failing | Missing API response mock |
| FocusSelection | ❌ Failing | Missing API data |
| TraitAssessment | ❌ Failing | Text differences in component vs test |
| ResultsProfile | ⚠️ Partially Working | TypeScript type issues fixed, but test needs updating |

## Writing Tests

Follow these guidelines when writing tests:

1. Import the necessary testing utilities:
```typescript
import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';
// Important - import the jest-setup to ensure matchers are properly typed
import '@/tests/jest-setup';
```

2. Use the `renderWithProviders` helper to render components within the necessary provider context.

3. Use `waitFor` for asynchronous operations and `userEvent` for simulating user interactions.

4. Test both the rendered UI and component behavior.

## Testing Store Integration

For components that use the Zustand store, use the mock implementation pattern:

```typescript
// Mock the game store
jest.mock('@/store/useGameStore', () => ({
  useGameStore: jest.fn(),
  GamePhase: {
    ROUND2: 'round2'
  }
}));

// Set up the mock store in beforeEach
beforeEach(() => {
  // Create a mock store instance with correctly structured data
  const mockStore = createMockGameStore({
    personality: {
      traits: mockTraits,
      attitudes: []
    },
    focus: mockFocus,
    // Include other required state
  });
  
  // Set up the mock implementation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useGameStore as any).mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStore);
    }
    return mockStore;
  });
});
```

## Fixing Common Test Issues

Here are solutions to common test issues:

### 1. Component Text Matching Issues

If a test is failing to find text in a component:

```typescript
// PROBLEM: This might fail because the text is split across multiple elements
expect(screen.getByText('Exact text that might be split')).toBeInTheDocument();

// SOLUTION: Use a more flexible matcher
expect(screen.getByText((content) => content.includes('partial text'))).toBeInTheDocument();

// ALTERNATIVE: Use regular expression
expect(screen.getByText(/part of text/i)).toBeInTheDocument();
```

### 2. Component Loading State

If you need to check for loading state text that might not be present immediately:

```typescript
// PROBLEM: Text might not be there yet
expect(screen.getByText('Loading...')).toBeInTheDocument();

// SOLUTION: Use queryByText to check if element exists
const loadingElement = screen.queryByText('Loading...');
expect(loadingElement).toBeInTheDocument(); // or null check
```

### 3. Router Mock Issues

When tests fail because router actions aren't detected:

```typescript
// Make sure to mock the router correctly
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    // Other methods...
  })),
}));

// Reset the mock before each test
beforeEach(() => {
  mockPush.mockReset();
});

// Later in the test
expect(mockPush).toHaveBeenCalledWith('/expected-path');
```

### 4. Game Store Structure

Make sure to use the correct structure for the game store, using `personality.traits` instead of `traits` directly:

```typescript
const mockStore = createMockGameStore({
  personality: {
    traits: mockTraits,
    attitudes: []
  },
  focus: mockFocus,
  // Other state...
});
```

### 5. Async API Calls

When mocking API services:

```typescript
// Set up API mock
const mockApiResponse = {
  mutateAsync: jest.fn().mockResolvedValue({
    success: true,
    data: { /* mock data */ }
  }),
  isLoading: false
};

(services.yourApiMethod as jest.Mock).mockReturnValue(mockApiResponse);

// In the test, use waitFor to wait for async operations
await waitFor(() => {
  expect(mockApiResponse.mutateAsync).toHaveBeenCalled();
});
```

### 6. Flexible Text Matching

For flexible text matching when content might be spread across multiple elements:

```typescript
// Use a custom matcher function
expect(screen.getByText((content, element) => {
  return element.textContent?.includes('partial text') ?? false;
})).toBeInTheDocument();
```

## Known Issues and Workarounds

1. **EvaluationBreakdown.tsx**: This file uses the reserved JavaScript keyword 'eval' as a parameter name. We've had to adjust our babel configuration and test regex to handle this special case.

2. **Testing UI Components**: Some UI components are quite complex with many dependencies. We recommend focusing tests on component behavior rather than implementation details.

3. **Act Warnings**: We've configured the test environment to suppress common Act warnings that occur during testing of asynchronous React components.

4. **TypeScript Types**: While we've added extended type definitions for Jest and Testing Library, you might still see TypeScript errors in your IDE that won't affect the actual test execution.

## Next Steps for Test Improvement

1. Update each test file to use the correct game store structure with `personality.traits` instead of just `traits`.

2. Use more flexible text matching in tests to handle cases where text is split across multiple elements.

3. Ensure all mock API services return data in the expected format.

4. Add proper timeouts to long-running async tests to prevent timeouts.

5. Consider using a more robust setup for testing complex UI component interactions, such as the React Testing Library's `within` function for scoped queries. 