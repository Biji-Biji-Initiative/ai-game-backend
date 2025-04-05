/**
 * Consolidated Vitest Setup File
 * 
 * This file combines all Vitest setup functionality into a single file:
 * - Imports Testing Library matchers
 * - Sets up mocks for browser APIs
 * - Configures environment for testing
 */

// First import vi
import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// Explicitly mock problematic module
vi.mock('@/services/api/mocks/game-service.mock', () => {
  return {
    MockGameService: class MockGameService {
      // Empty implementation to avoid initialization problems
      constructor() {}
      getGames() { return Promise.resolve({}); }
      getGameById() { return Promise.resolve({}); }
      createGame() { return Promise.resolve({}); }
      joinGame() { return Promise.resolve({}); }
      leaveGame() { return Promise.resolve({}); }
      startGame() { return Promise.resolve({}); }
      submitMove() { return Promise.resolve({}); }
      endGame() { return Promise.resolve({}); }
    }
  };
});

// Import testing library matchers
import '@testing-library/jest-dom';
// Make sure TypeScript recognizes our consolidated testing types
import '../types/testing.d.ts';

// Force timezone to be UTC to ensure consistent test results
process.env.TZ = 'UTC';

// Setup fake timers globally
vi.useFakeTimers();

// Add typecasting function for mocks to prevent hanging tests
window.typedMockFn = function<T extends (...args: unknown[]) => unknown>(
  fn: T
): typeof vi.fn<T> {
  return fn as unknown as typeof vi.fn<T>;
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
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    media: '',
    onchange: null,
  };
};

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver
});

// Mock ResizeObserver
class MockResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver
});

// Mock window.scrollTo
window.scrollTo = vi.fn();

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),
  usePathname: () => '/',
  useSearchParams: () => ({
    get: vi.fn(),
    forEach: vi.fn(),
    append: vi.fn(),
    delete: vi.fn(),
    set: vi.fn(),
    sort: vi.fn(),
    [Symbol.iterator]: vi.fn(),
  }),
}));

// Mock Zustand store
vi.mock('@/store/useGameStore', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/store/useGameStore')>();
  return {
    ...original, // Keep original exports like GamePhase etc.
    useGameStore: vi.fn(), // Placeholder mock function
  };
});

// Setup mock for challenge API
vi.mock('../services/api/services', () => {
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
    useGenerateChallenge: () => ({ 
      mutateAsync: vi.fn<[{ focusArea: string; difficulty: string }], Promise<MockChallengeData>>()
        .mockResolvedValue({ 
          id: 'setup-challenge-1', 
          title: 'Setup Challenge', 
          description: 'From vitest-setup', 
          difficulty: 'easy', 
          focusArea: 'setup-focus' 
        }),
      isLoading: false,
    }),
    useSubmitResponse: () => ({ 
      mutateAsync: vi.fn<[{ challengeId: string; response: string; round: number }], Promise<{ success: boolean }>>()
        .mockResolvedValue({ success: true }),
      isLoading: false,
    }),
    useGetAIResponse: () => ({
      data: {
        success: true,
        data: {
          content: 'This is a test AI response'
        }
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useGenerateProfile: () => ({
      mutateAsync: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'profile-1',
          strengths: ['Creativity', 'Empathy'],
          insights: 'Test insights',
          recommendations: ['Rec 1', 'Rec 2']
        }
      }),
      isLoading: false,
    }),
    useRecommendFocusAreas: () => ({
      mutateAsync: vi.fn().mockResolvedValue({
        success: true,
        data: [
          { id: '1', name: 'Creative Thinking', description: 'Test description', matchLevel: 85 },
          { id: '2', name: 'Emotional Intelligence', description: 'Test description', matchLevel: 75 }
        ]
      }),
      isLoading: false,
    }),
    useSaveFocusAreaSelection: () => ({
      mutateAsync: vi.fn().mockResolvedValue({ success: true }),
      isLoading: false,
    }),
    useGetTraits: () => ({
      data: {
        success: true,
        data: [
          { id: '1', name: 'Creativity', description: 'Test description', value: 5 },
          { id: '2', name: 'Empathy', description: 'Test description', value: 5 }
        ]
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useSaveTraitAssessment: () => ({
      mutateAsync: vi.fn().mockResolvedValue({ success: true }),
      isLoading: false,
    }),
  };
});

// Reset mocks before each test
beforeEach(() => {
  vi.resetAllMocks();
});

// Extend the global window object to include our type definition
declare global {
  interface Window {
    typedMockFn: <T extends (...args: unknown[]) => unknown>(fn: T) => typeof vi.fn<T>;
  }
}

// Configure Testing Library
import { configure } from '@testing-library/react';
configure({
  testIdAttribute: 'data-testid',
});

// Export to make TypeScript treat as a module
export {}; 