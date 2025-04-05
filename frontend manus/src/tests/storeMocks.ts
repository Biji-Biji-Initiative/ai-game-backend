/**
 * Mock store utilities for testing
 */
import { vi } from 'vitest';
import { StoreApi, UseBoundStore } from 'zustand';
import { 
  GamePhase,
  GameState,
  RoundResponse,
} from '@/store/useGameStore';

// Define a type that represents our game store state for testing
export type MockGameState = Omit<Partial<GameState>, 'responses'> & {
  responses?: {
    round1?: RoundResponse;
    round2?: RoundResponse;
    round3?: RoundResponse;
  };
}

// Type for mock functions
export interface MockStoreFunctions {
  startNewSession: ReturnType<typeof vi.fn>;
  resetGame: ReturnType<typeof vi.fn>;
  setGamePhase: ReturnType<typeof vi.fn>;
  saveUserInfo: ReturnType<typeof vi.fn>;
  saveTraits: ReturnType<typeof vi.fn>;
  saveAttitudes: ReturnType<typeof vi.fn>;
  saveFocus: ReturnType<typeof vi.fn>;
  saveChallenge: ReturnType<typeof vi.fn>;
  saveRound1Response: ReturnType<typeof vi.fn>;
  saveRound2Response: ReturnType<typeof vi.fn>;
  saveRound3Response: ReturnType<typeof vi.fn>;
  saveTeamChallenge?: ReturnType<typeof vi.fn>;
  saveTeamResponse?: ReturnType<typeof vi.fn>;
  saveReport?: ReturnType<typeof vi.fn>;
  generateReport?: ReturnType<typeof vi.fn>;
  setPersonality?: ReturnType<typeof vi.fn>;
  setUserInfo?: ReturnType<typeof vi.fn>;
  setFocus: ReturnType<typeof vi.fn>;
  setError: ReturnType<typeof vi.fn>;
  clearError?: ReturnType<typeof vi.fn>;
  updateUserInfo: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  updatePersonality: ReturnType<typeof vi.fn>;
  saveProfileId: ReturnType<typeof vi.fn>;
  setCurrentChallenge: ReturnType<typeof vi.fn>;
  clearCurrentChallenge: ReturnType<typeof vi.fn>;
  saveAIResponses: ReturnType<typeof vi.fn>;
  saveProfile: ReturnType<typeof vi.fn>;
  addAiInsight: ReturnType<typeof vi.fn>;
  addAiAttitude: ReturnType<typeof vi.fn>;
  setIsLoading: ReturnType<typeof vi.fn>;
  getIsPhaseCompleted: ReturnType<typeof vi.fn>;
}

// Define the complete mock store type that matches the real store's shape
export type MockStore = MockGameState & MockStoreFunctions;

// Type for the mock store function that mimics Zustand's store
export type MockUseGameStore = UseBoundStore<StoreApi<MockStore>> & 
  (<U>(selector: (state: MockStore) => U) => U);

/**
 * Creates a mocked game store with specified initial state values
 * @param initialState - Initial state values for the store
 * @returns A mock implementation of the game store that can be used as a replacement for useGameStore
 */
export function createMockGameStore(initialState: MockGameState = {}): MockUseGameStore {
  // Create mock functions for all actions
  const mockActions: MockStoreFunctions = {
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
    saveTeamChallenge: vi.fn(),
    saveTeamResponse: vi.fn(),
    saveReport: vi.fn(),
    generateReport: vi.fn(),
    setPersonality: vi.fn(),
    setUserInfo: vi.fn(),
    setFocus: vi.fn(),
    setError: vi.fn(),
    clearError: vi.fn(),
    updateUserInfo: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updatePersonality: vi.fn(),
    saveProfileId: vi.fn(),
    setCurrentChallenge: vi.fn(),
    clearCurrentChallenge: vi.fn(),
    saveAIResponses: vi.fn(),
    saveProfile: vi.fn(),
    addAiInsight: vi.fn(),
    addAiAttitude: vi.fn(),
    setIsLoading: vi.fn(),
    getIsPhaseCompleted: vi.fn()
  };

  // Default state values
  const defaultState: MockGameState = {
    isLoading: false,
    gamePhase: GamePhase.WELCOME,
    sessionId: null,
    personality: {
      traits: [],
      attitudes: []
    },
    userInfo: {
      name: '',
      email: '',
      professionalTitle: '',
      location: ''
    },
    focus: null,
    currentChallenge: null,
    responses: {
      round1: { userResponse: '' },
      round2: { userResponse: '' },
      round3: { userResponse: '' }
    },
    error: null,
    isAuthenticated: false,
    profile: null,
    aiInsights: [],
    history: []
  };

  // Merge state and actions into the complete mock store
  const mockStore: MockStore = {
    ...defaultState,
    ...initialState,
    ...mockActions
  };

  // Create a selector function that mimics Zustand's behavior
  const selectorFn = <U>(selector?: (state: MockStore) => U): MockStore | U => {
    if (selector) {
      return selector(mockStore);
    }
    return mockStore;
  };

  // Add properties to make the function behave like a Zustand store
  Object.assign(selectorFn, {
    getState: () => mockStore,
    setState: vi.fn((updater: unknown) => {
      const newState = typeof updater === 'function' 
        ? (updater as (state: MockStore) => Partial<MockStore>)(mockStore) 
        : updater;
      Object.assign(mockStore, newState);
    }),
    subscribe: vi.fn(),
    destroy: vi.fn()
  });

  return selectorFn as unknown as MockUseGameStore;
}
