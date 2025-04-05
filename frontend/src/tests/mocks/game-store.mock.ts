/**
 * Game Store Mocks
 * 
 * This file contains mock implementations for the game store.
 * These mocks can be imported directly in test files.
 */

import { vi } from 'vitest';
import { GameState, GamePhase, Trait, FocusArea } from '@/store/useGameStore';

// Mock store functions
export const mockSaveRound1Response = vi.fn();
export const mockSaveRound2Response = vi.fn();
export const mockSaveRound3Response = vi.fn();
export const mockSetGamePhase = vi.fn();
export const mockSaveProfileId = vi.fn();
export const mockSetCurrentChallenge = vi.fn();
export const mockClearCurrentChallenge = vi.fn();

// Define standard mock objects
export const mockChallenge = {
  id: 'challenge-1',
  content: 'Write a creative problem statement for improving remote collaboration.',
  description: 'Write a creative problem statement for improving remote collaboration.',
  status: 'pending' as const,
  userEmail: 'test@example.com',
  createdAt: new Date().toISOString(),
  difficulty: 'intermediate' as const,
  focusArea: 'adaptability',
};

export const mockTraits: Trait[] = [
  { id: '1', name: 'Openness', value: 0.8, description: 'Open to new experiences', lowLabel: 'Not open', highLabel: 'Very open' },
  { id: '2', name: 'Conscientiousness', value: 0.6, description: 'Organized and responsible', lowLabel: 'Not conscientious', highLabel: 'Very conscientious' },
];

export const mockFocus: FocusArea = {
  id: 'focus-123',
  name: 'Test Focus Area',
  description: 'Focus Area Description',
  matchLevel: 90
};

// Create a default game state
export const createDefaultGameState = (phase: GamePhase = GamePhase.ROUND2): GameState => ({
  gamePhase: phase,
  personality: { traits: [], attitudes: [] },
  focus: null,
  currentChallenge: null,
  responses: {
    round1: { userResponse: '', challenge: undefined, aiResponse: undefined },
    round2: { userResponse: '', challenge: undefined, aiResponse: undefined },
    round3: { userResponse: '', challenge: undefined, aiResponse: undefined },
  },
  userInfo: { name: '', email: '', professionalTitle: '', location: '' },
  isLoading: false, 
  error: null, 
  sessionId: null, 
  isAuthenticated: false, 
  profile: null, 
  aiInsights: [], 
  history: [],
  // Actions
  startNewSession: vi.fn(), 
  resetGame: vi.fn(), 
  setGamePhase: mockSetGamePhase, 
  saveUserInfo: vi.fn(), 
  saveTraits: vi.fn(), 
  saveAttitudes: vi.fn(), 
  saveFocus: vi.fn(), 
  saveChallenge: vi.fn(), 
  saveRound1Response: mockSaveRound1Response, 
  saveRound2Response: mockSaveRound2Response, 
  saveRound3Response: mockSaveRound3Response, 
  saveProfileId: mockSaveProfileId, 
  setCurrentChallenge: mockSetCurrentChallenge, 
  clearCurrentChallenge: mockClearCurrentChallenge, 
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
});

// Create a setup function for the mock store
export const setupMockGameStore = (initialStateOverrides: Partial<GameState> = {}) => {
  const defaultState = createDefaultGameState();
  
  const state: GameState = {
    ...defaultState,
    ...initialStateOverrides,
    // Ensure nested objects are merged correctly
    responses: { ...defaultState.responses, ...(initialStateOverrides.responses || {}) },
    personality: { ...defaultState.personality, ...(initialStateOverrides.personality || {}) },
    userInfo: { ...defaultState.userInfo, ...(initialStateOverrides.userInfo || {}) }
  };
  
  const mockUseGameStore = vi.fn();
  
  // Implement the mock function to return the desired state
  mockUseGameStore.mockImplementation((selector?: (s: GameState) => any) => {
    if (selector) { return selector(state); }
    return state;
  });
  
  return { mockUseGameStore, state };
};

// Reset all game store mocks
export const resetGameStoreMocks = () => {
  mockSaveRound1Response.mockReset();
  mockSaveRound2Response.mockReset();
  mockSaveRound3Response.mockReset();
  mockSetGamePhase.mockReset();
  mockSaveProfileId.mockReset();
  mockSetCurrentChallenge.mockReset();
  mockClearCurrentChallenge.mockReset();
}; 