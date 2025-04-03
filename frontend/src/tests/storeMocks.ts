/**
 * Mock helpers for Zustand stores
 * 
 * These utilities help create properly typed mock implementations of our stores
 */

import { Trait, FocusArea, Profile, RoundResponse, AiAttitude } from '@/store/useGameStore';

// Define GamePhase enum directly to avoid import issues
export enum GamePhase {
  WELCOME = 'welcome',
  CONTEXT = 'context',
  TRAITS = 'traits',
  ATTITUDES = 'attitudes',
  FOCUS = 'focus',
  ROUND1 = 'round1',
  ROUND2 = 'round2',
  ROUND3 = 'round3',
  RESULTS = 'results'
}

// Define a mock state type for the game store
export interface MockGameState {
  sessionId?: string | null;
  gamePhase?: GamePhase;
  userInfo?: {
    name?: string;
    email?: string;
    professionalTitle?: string;
    location?: string;
  };
  personality?: {
    traits: Trait[];
    attitudes: AiAttitude[];
  };
  // Allow direct traits property for backward compatibility
  traits?: Trait[];
  focus?: FocusArea | null;
  currentChallenge?: {
    id: string;
    title: string;
    description: string;
    content?: string;
    [key: string]: string | number | boolean | undefined;
  } | null;
  responses?: {
    round1?: RoundResponse;
    round2?: RoundResponse;
    round3?: RoundResponse;
  };
  profile?: Profile | null;
  aiInsights?: Array<{
    round: number;
    insight: string;
    timestamp: string;
  }>;
  isLoading?: boolean;
  error?: string | null;
  
  // Mock actions
  startNewSession?: jest.Mock;
  resetGame?: jest.Mock;
  setGamePhase?: jest.Mock;
  saveUserInfo?: jest.Mock;
  saveTraits?: jest.Mock;
  saveAttitudes?: jest.Mock;
  saveFocus?: jest.Mock;
  setCurrentChallenge?: jest.Mock;
  clearCurrentChallenge?: jest.Mock;
  saveRound1Response?: jest.Mock;
  saveRound2Response?: jest.Mock;
  saveRound3Response?: jest.Mock;
  saveAIResponses?: jest.Mock;
  saveChallenge?: jest.Mock;
  saveProfile?: jest.Mock;
  saveProfileId?: jest.Mock;
  addAiInsight?: jest.Mock;
  addAiAttitude?: jest.Mock;
  setIsLoading?: jest.Mock;
  setError?: jest.Mock;
  getIsPhaseCompleted?: jest.Mock;
}

// Create a mock implementation of the useGameStore hook
export const createMockGameStore = (initialState: MockGameState = {}) => {
  // Create default mock functions
  const defaultMocks = {
    startNewSession: jest.fn(),
    resetGame: jest.fn(),
    setGamePhase: jest.fn(),
    saveUserInfo: jest.fn(),
    saveTraits: jest.fn(),
    saveAttitudes: jest.fn(),
    saveFocus: jest.fn(),
    setCurrentChallenge: jest.fn(),
    clearCurrentChallenge: jest.fn(),
    saveRound1Response: jest.fn(),
    saveRound2Response: jest.fn(),
    saveRound3Response: jest.fn(),
    saveAIResponses: jest.fn(),
    saveChallenge: jest.fn(),
    saveProfile: jest.fn(),
    saveProfileId: jest.fn(),
    addAiInsight: jest.fn(),
    addAiAttitude: jest.fn(),
    setIsLoading: jest.fn(),
    setError: jest.fn(),
    getIsPhaseCompleted: jest.fn().mockReturnValue(true),
  };
  
  // Handle traits property for backward compatibility
  if (initialState.traits && !initialState.personality) {
    initialState.personality = {
      traits: initialState.traits,
      attitudes: []
    };
  }
  
  // Merge default values with provided initial state
  const mockState = {
    sessionId: null,
    gamePhase: GamePhase.WELCOME,
    userInfo: {},
    personality: {
      traits: [],
      attitudes: []
    },
    focus: null,
    currentChallenge: null,
    responses: {},
    profile: null,
    aiInsights: [],
    isLoading: false,
    error: null,
    ...initialState,
    ...defaultMocks,
    // Override default mocks with any provided mock functions
    ...(Object.entries(initialState)
      .filter(([, value]) => typeof value === 'function')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}))
  };
  
  // Return a function that returns the mock state
  return mockState;
};
