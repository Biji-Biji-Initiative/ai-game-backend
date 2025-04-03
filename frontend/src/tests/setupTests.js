/**
 * Setup file to configure test environment for component tests
 */

// Force timezone to be UTC to ensure consistent test results
process.env.TZ = 'UTC';

// Mock implementations for components that need additional configuration

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
jest.mock('../services/api/services', () => ({
  useGenerateChallenge: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'challenge-1',
        content: 'This is a test challenge'
      }
    }),
    isLoading: false,
  })),
  useSubmitResponse: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  })),
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
})); 