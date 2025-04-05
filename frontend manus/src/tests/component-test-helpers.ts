/**
 * Component Test Helpers
 * 
 * This file provides utilities for component testing that help break circular dependencies
 * and standardize how mocks are set up across test files.
 */

import { vi, Mock } from 'vitest';

// Constants
export const GamePhases = {
  WELCOME: 'welcome',
  CONTEXT: 'context',
  TRAITS: 'traits',
  ATTITUDES: 'attitudes',
  FOCUS: 'focus',
  ROUND1: 'round1',
  ROUND2: 'round2',
  ROUND3: 'round3',
  RESULTS: 'results'
};

/**
 * Sets up core mocks that can cause circular dependencies
 * CRITICAL: Call this function BEFORE any imports that might
 * create circular dependencies
 */
export function setupCoreMocks() {
  // Mock game-service.mock first to break circular dependencies
  vi.mock('@/services/api/mocks/game-service.mock', () => ({
    MockGameService: class MockGameService {
      constructor() {}
      getGames() { return Promise.resolve({ data: [], status: 200, ok: true }); }
      getGameById() { return Promise.resolve({ data: null, status: 404, ok: false }); }
      createGame() { return Promise.resolve({ data: {}, status: 201, ok: true }); }
      joinGame() { return Promise.resolve({ data: {}, status: 200, ok: true }); }
      leaveGame() { return Promise.resolve({ data: {}, status: 200, ok: true }); }
      startGame() { return Promise.resolve({ data: {}, status: 200, ok: true }); }
      submitMove() { return Promise.resolve({ data: {}, status: 200, ok: true }); }
      endGame() { return Promise.resolve({ data: {}, status: 200, ok: true }); }
    }
  }));

  // Mock navigation (commonly used in most components)
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
    }),
    usePathname: () => '/',
    useSearchParams: () => ({
      get: vi.fn(),
      forEach: vi.fn(),
    }),
  }));

  // Mock store by default (most components use it)
  vi.mock('@/store/useGameStore', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/store/useGameStore')>();
    return {
      ...original, // Keep original exports like GamePhase etc.
      useGameStore: vi.fn(), // Placeholder mock function
    };
  });

  // Mock API services
  vi.mock('@/services/api/services', () => ({
    useGenerateChallenge: () => ({ 
      mutateAsync: vi.fn().mockResolvedValue({ 
        id: 'test-challenge-1', 
        title: 'Test Challenge', 
        description: 'Test description', 
        difficulty: 'easy', 
        focusArea: 'test-focus' 
      }),
      isLoading: false,
    }),
    useSubmitResponse: () => ({ 
      mutateAsync: vi.fn().mockResolvedValue({ success: true }),
      isLoading: false,
    }),
    useGetAIResponse: () => ({
      data: {
        success: true,
        data: {
          content: 'Test AI response'
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
          strengths: ['Test strength'],
          insights: 'Test insights',
          recommendations: ['Test recommendation']
        }
      }),
      isLoading: false,
    }),
  }));
}

/**
 * Creates a default game state for testing
 */
export function createDefaultGameState() {
  return {
    gamePhase: GamePhases.WELCOME,
    personality: { 
      traits: [], 
      attitudes: [] 
    },
    focus: null,
    currentChallenge: null,
    responses: {
      round1: { userResponse: '' },
      round2: { userResponse: '' },
      round3: { userResponse: '' }
    },
    userInfo: { 
      name: '', 
      email: '', 
      professionalTitle: '', 
      location: '' 
    },
    isLoading: false,
    error: null,
    sessionId: null,
    isAuthenticated: false,
    profile: null,
    aiInsights: [],
    history: [],
    // Mock actions
    startNewSession: vi.fn(),
    resetGame: vi.fn(),
    setGamePhase: vi.fn(),
    saveUserInfo: vi.fn(),
    saveTraits: vi.fn(),
    saveAttitudes: vi.fn(),
    saveFocus: vi.fn(),
    saveChallenge: vi.fn(),
    saveRound1Response: vi.fn(),
    saveRound2Response: vi.fn(),
    saveRound3Response: vi.fn(),
    saveProfileId: vi.fn(),
    setCurrentChallenge: vi.fn(),
    clearCurrentChallenge: vi.fn(),
    saveAIResponses: vi.fn(),
    saveProfile: vi.fn(),
    addAiInsight: vi.fn(),
    addAiAttitude: vi.fn(),
    setIsLoading: vi.fn(),
    getIsPhaseCompleted: vi.fn(() => false),
    setError: vi.fn(),
    clearError: vi.fn(),
    updateUserInfo: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updatePersonality: vi.fn(),
  };
}

/**
 * Sets up a mock for the useGameStore hook with the provided state
 * @param initialState - State overrides for the game store
 * @returns The mocked useGameStore function
 */
export function setupGameStoreMock(initialState = {}) {
  const defaultState = createDefaultGameState();
  
  // Recursively merge nested objects
  const mergeNestedObjects = (target: any, source: any) => {
    Object.keys(source).forEach(key => {
      if (source[key] !== null && typeof source[key] === 'object' && 
          target[key] !== null && typeof target[key] === 'object') {
        mergeNestedObjects(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
    return target;
  };

  // Create a new object with the merged state
  const state = mergeNestedObjects({...defaultState}, initialState);

  // Get the mock function from vi.mocked
  const useGameStoreMock = vi.fn();
  
  // Set up the implementation to handle selectors
  useGameStoreMock.mockImplementation((selector: any) => {
    if (selector) {
      return selector(state);
    }
    return state;
  });

  return useGameStoreMock;
}

/**
 * Resets all mocks
 */
export function resetAllMocks() {
  vi.resetAllMocks();
}

/**
 * Creates a mock challenge object for testing
 */
export function createMockChallenge(overrides = {}) {
  return {
    id: 'challenge-1',
    content: 'Test challenge content',
    description: 'Test challenge description',
    title: 'Test Challenge',
    status: 'pending',
    userEmail: 'test@example.com',
    createdAt: new Date().toISOString(),
    difficulty: 'intermediate',
    focusArea: 'adaptability',
    ...overrides
  };
} 