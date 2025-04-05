/**
 * Minimal Round2 test file that should work with Vitest v3
 */

// First import vitest functions
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Define mock functions BEFORE mocking modules 
const mockPush = vi.fn();
const mockGetAIResponseRefetch = vi.fn();
const mockSubmitResponseMutate = vi.fn().mockResolvedValue({ success: true });
const mockSaveRound2Response = vi.fn();
const mockSetGamePhase = vi.fn();

// Define mock data
const mockGamePhases = {
  ASSESSMENT: 'assessment',
  CHALLENGE: 'challenge',
  ROUND1: 'round1',
  ROUND2: 'round2',
  ROUND3: 'round3',
  RESULTS: 'results'
};

// Set up mocks
vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({ push: mockPush }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams()
  };
});

vi.mock('@/services/api/services', () => {
  return {
    useGetAIResponse: vi.fn(() => ({
      data: { success: true, data: { content: 'Mock AI Response' } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockGetAIResponseRefetch
    })),
    useSubmitResponse: vi.fn(() => ({
      mutateAsync: mockSubmitResponseMutate,
      isLoading: false,
      isError: false,
      error: null
    })),
    useGenerateChallenge: vi.fn(() => ({
      mutateAsync: vi.fn(),
      isLoading: false
    }))
  };
});

vi.mock('@/store/useGameStore', () => {
  const useGameStoreMock = vi.fn();
  return {
    useGameStore: useGameStoreMock,
    GamePhase: mockGamePhases
  };
});

// NOW import the modules that will use these mocks
import { renderWithProviders } from '@/tests/test-utils';
import { screen, waitFor } from '@testing-library/react';
import { useGameStore } from '@/store/useGameStore';
import Round2 from '@/features/rounds/Round2';

describe('Round2 - Minimal Test', () => {
  const mockChallenge = {
    id: 'challenge-1',
    content: 'Test Challenge',
    description: 'Test Challenge Description',
    status: 'pending',
    userEmail: 'test@example.com',
    createdAt: new Date().toISOString(),
    difficulty: 'intermediate',
    focusArea: 'adaptability',
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    useGameStore.mockImplementation((selector) => {
      if (selector) {
        return selector({
          gamePhase: mockGamePhases.ROUND2,
          currentChallenge: mockChallenge,
          responses: {
            round1: { userResponse: 'Round 1 Response' }
          },
          saveRound2Response: mockSaveRound2Response,
          setGamePhase: mockSetGamePhase
        });
      }
      return {
        gamePhase: mockGamePhases.ROUND2,
        currentChallenge: mockChallenge,
        responses: {
          round1: { userResponse: 'Round 1 Response' }
        },
        saveRound2Response: mockSaveRound2Response,
        setGamePhase: mockSetGamePhase
      };
    });
  });
  
  it('renders with AI response', async () => {
    renderWithProviders(<Round2 />);
    
    await waitFor(() => {
      expect(screen.getByText('Round 2: AI\'s Response')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Mock AI Response')).toBeInTheDocument();
    expect(screen.getByText('Round 1 Response')).toBeInTheDocument();
    expect(screen.getByText('Test Challenge Description')).toBeInTheDocument();
  });
}); 