/**
 * Consolidated Jest Setup File
 * 
 * This file combines all Jest setup functionality into a single file:
 * - Imports Testing Library matchers
 * - Sets up mocks for browser APIs
 * - Configures environment for testing
 */

// Import testing library matchers
import '@testing-library/jest-dom';
// Make sure TypeScript recognizes our consolidated testing types
import '../types/testing.d.ts';

// Force timezone to be UTC to ensure consistent test results
process.env.TZ = 'UTC';

// Setup fake timers globally
jest.useFakeTimers();

// Add typecasting function for mocks to prevent hanging tests
window.typedMockFn = function<T extends (...args: unknown[]) => unknown>(
  fn: T
): jest.MockedFunction<T> {
  return fn as unknown as jest.MockedFunction<T>;
};

// Mock console.error to suppress warnings about React state updates
const originalConsoleError = console.error;
console.error = function(...args) {
  // Filter out specific warnings during tests
  if (args[0] && typeof args[0] === 'string') {
    // Ignore act() warnings
    if (args[0].includes('Warning: An update to') && args[0].includes('inside a test was not wrapped in act')) {
      return;
    }
    // Ignore react-query warnings
    if (args[0].includes('Warning: useLayoutEffect does nothing on the server')) {
      return;
    }
  }
  originalConsoleError(...args);
};

// Mock window.matchMedia
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  };
};

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver
});

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => ({ get: jest.fn() })),
}));

// Custom mock for useGameStore to make testing easier
jest.mock('../store/useGameStore', () => {
  const originalModule = jest.requireActual('../store/useGameStore');
  
  return {
    ...originalModule,
    useGameStore: jest.fn(),
    GamePhase: originalModule.GamePhase || {
      WELCOME: 'welcome',
      CONTEXT: 'context',
      TRAITS: 'traits',
      ATTITUDES: 'attitudes',
      FOCUS: 'focus',
      ROUND1: 'round1',
      ROUND2: 'round2',
      ROUND3: 'round3',
      RESULTS: 'results'
    }
  };
});

// Setup mock for challenge API
jest.mock('../services/api/services', () => {
  // Define a simple interface for mock challenge data payload *inside* the mock scope
  interface MockChallengeData {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    focusArea: string;
    // Add other expected fields from UIChallenge/API response if needed
  }

  return {
    useGenerateChallenge: jest.fn().mockReturnValue({ // This function returns the hook's state/methods
      // Use the expected shape for the input vars
      mutateAsync: jest.fn<(_vars: { focusArea: string; difficulty: string }) => Promise<MockChallengeData>>()
        .mockResolvedValue({ // Resolve with the data object directly
          id: 'setup-challenge-1', title: 'Setup Challenge', description: 'From jest-setup', difficulty: 'easy', focusArea: 'setup-focus' // Provide the data object
        }),
      isLoading: false,
    }),
    useSubmitResponse: jest.fn().mockReturnValue({ // This function returns the hook's state/methods
      // Use the expected shape for the input vars
      mutateAsync: jest.fn<(_vars: { challengeId: string; response: string; round: number }) => Promise<{ success: boolean }>>()
        .mockResolvedValue({ success: true }), // This resolves with { success: true } which matches the Promise type
      isLoading: false,
    }),
    useGetAIResponse: jest.fn(() => ({
      data: {
        success: true,
        data: {
          content: 'This is a test AI response'
        }
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    })),
    useGenerateProfile: jest.fn(() => ({
      mutateAsync: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'profile-1',
          strengths: ['Creativity', 'Empathy'],
          insights: 'Test insights',
          recommendations: ['Rec 1', 'Rec 2']
        }
      }),
      isLoading: false,
    })),
    useRecommendFocusAreas: jest.fn(() => ({
      mutateAsync: jest.fn().mockResolvedValue({
        success: true,
        data: [
          { id: '1', name: 'Creative Thinking', description: 'Test description', matchLevel: 85 },
          { id: '2', name: 'Emotional Intelligence', description: 'Test description', matchLevel: 75 }
        ]
      }),
      isLoading: false,
    })),
    useSaveFocusAreaSelection: jest.fn(() => ({
      mutateAsync: jest.fn().mockResolvedValue({ success: true }),
      isLoading: false,
    })),
    useGetTraits: jest.fn(() => ({
      data: {
        success: true,
        data: [
          { id: '1', name: 'Creativity', description: 'Test description', value: 5 },
          { id: '2', name: 'Empathy', description: 'Test description', value: 5 }
        ]
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })),
    useSaveTraitAssessment: jest.fn(() => ({
      mutateAsync: jest.fn().mockResolvedValue({ success: true }),
      isLoading: false,
    })),
  };
});

// Extend the global window object to include our type definition
declare global {
  interface Window {
    typedMockFn: <T extends (...args: unknown[]) => unknown>(fn: T) => jest.MockedFunction<T>;
  }
}

// Configure Testing Library
import { configure } from '@testing-library/react';
configure({
  testIdAttribute: 'data-testid',
});

// Export to make TypeScript treat as a module
export {}; 