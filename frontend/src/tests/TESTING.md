# Component Testing Guide

## Preventing Circular Dependencies in Tests

This guide explains how to write component tests in this project while avoiding circular dependencies between modules.

## Understanding the Problem

Our codebase has a circular dependency issue between:

- `@/store/useGameStore`: Our main Zustand store
- `@/services/api/mocks/game-service.mock.ts`: Our API mocking service

When we try to mock both in tests, we get errors like:
- `Cannot access X before initialization`
- Hanging tests
- Type errors with mocks
- Unexpected behavior in tests

## Solution: Component Test Helpers

We've created a set of test helpers in `frontend/src/tests/component-test-helpers.ts` that break circular dependencies and standardize how we mock essential services.

### Key Features

1. **Proper Mocking Order**: Sets up mocks in the correct order to break circular dependencies
2. **Standard Store Setup**: Provides consistent store state initialization
3. **Test Data Generation**: Utilities for creating common test objects
4. **Type Safety**: Fully typed to prevent errors

## How to Use

### 1. Import the Helpers

```typescript
import { 
  GamePhases, 
  setupGameStoreMock, 
  createMockChallenge, 
  resetAllMocks 
} from '@/tests/component-test-helpers';
```

### 2. Create Mock Functions Before Importing Component

```typescript
// Define mock functions BEFORE importing component
const mockPush = vi.fn();
const mockSaveResponse = vi.fn();

// Now import the component and types
import { GamePhase } from '@/store/useGameStore';
import { useGameStore } from '@/store/useGameStore';
import YourComponent from '@/path/to/YourComponent';
```

### 3. Setup Mocks in beforeEach

```typescript
beforeEach(() => {
  // Reset all mocks
  resetAllMocks();
  
  // Reset specific mocks if needed
  mockPush.mockReset();
  
  // Set up the game store with default state
  const mockStore = setupGameStoreMock({
    gamePhase: GamePhase.ROUND1,
    saveRound1Response: mockSaveResponse,
  });
  
  // Apply the mock to useGameStore
  vi.mocked(useGameStore).mockImplementation(mockStore);
});
```

### 4. Configure Store for Each Test

```typescript
it('renders component with challenge', async () => {
  // Set up store with specific state for this test
  const mockStore = setupGameStoreMock({
    currentChallenge: createMockChallenge(),
    responses: { 
      round1: { userResponse: 'Previous response' } 
    }
  });
  vi.mocked(useGameStore).mockImplementation(mockStore);

  // Render and test
  renderWithProviders(<YourComponent />);
  
  // Assertions...
});
```

## Example Test File

Here's a complete example of how to structure a component test:

```typescript
/**
 * Component tests using component-test-helpers
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';

// Import helpers
import { 
  GamePhases, 
  setupGameStoreMock, 
  createMockChallenge, 
  resetAllMocks 
} from '@/tests/component-test-helpers';

// Define mocks FIRST
const mockPush = vi.fn();
const mockSubmitResponse = vi.fn().mockResolvedValue({ success: true });

// NOW import component and types
import { GamePhase } from '@/store/useGameStore';
import { useGameStore } from '@/store/useGameStore';
import YourComponent from '@/path/to/YourComponent';

describe('YourComponent', () => {
  beforeEach(() => {
    resetAllMocks();
    
    // Default setup
    const mockStore = setupGameStoreMock({
      gamePhase: GamePhase.ROUND1,
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);
  });
  
  it('renders correctly', async () => {
    renderWithProviders(<YourComponent />);
    expect(screen.getByText('Your Component')).toBeInTheDocument();
  });
});
```

## Troubleshooting

If you encounter issues in your tests:

1. **Check Import Order**: Make sure mock functions are defined before imports
2. **Reset Mocks**: Always reset mocks in `beforeEach` using `resetAllMocks()`
3. **Keep Store Setup Minimal**: Only include what's needed for each test
4. **Verify Mock Implementation**: Ensure mocks return the expected data
5. **Check for Hanging Tests**: Use proper `await waitFor()` for async code

For advanced debugging, you can inspect the `vitest-test-setup.ts` file to see how global mocks are configured. 