/**
 * Round2 component tests - Fixed version for Vitest v3
 */
import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';
import Round2 from '@/features/rounds/Round2';
import { GamePhase } from '@/store/useGameStore';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Import our mock creators
import { 
  getMockAIResponse, 
  getMockSubmitResponse, 
  mockGetAIResponseRefetch,
  mockSubmitResponseMutate,
  resetApiMocks 
} from '@/tests/mocks/api-services.mock';

import {
  mockChallenge,
  setupMockGameStore,
  resetGameStoreMocks,
  mockSaveRound2Response
} from '@/tests/mocks/game-store.mock';

// Define mocks at the top level
// Mock the router
const mockPush = vi.fn();

// We NEED to mock next/navigation BEFORE importing useRouter!
vi.mock('next/navigation', () => {
  return {
    useRouter: () => ({
      push: mockPush
    })
  };
});

vi.mock('@/store/useGameStore', () => {
  return {
    GamePhase: {
      ASSESSMENT: 'assessment',
      CHALLENGE: 'challenge',
      ROUND1: 'round1',
      ROUND2: 'round2',
      ROUND3: 'round3',
      RESULTS: 'results'
    },
    useGameStore: vi.fn()
  };
});

vi.mock('@/services/api/services', () => {
  return {
    useGetAIResponse: vi.fn(),
    useSubmitResponse: vi.fn(),
    // Include any other exports needed to avoid import errors
    useGenerateChallenge: vi.fn(() => ({ mutateAsync: vi.fn(), isLoading: false })),
    useGenerateProfile: vi.fn(() => ({ mutateAsync: vi.fn(), isLoading: false })),
  };
});

// Import the mocked hooks
import { useGameStore } from '@/store/useGameStore';
import { useGetAIResponse, useSubmitResponse } from '@/services/api/services';

// This needs to be after vi.mock('next/navigation')
// to ensure the mock is used, not the real implementation
import { useRouter } from 'next/navigation';

describe('Round2', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetApiMocks();
    resetGameStoreMocks();
    
    // Reset mock push function
    mockPush.mockReset();
    
    // Setup default API mocks
    useGetAIResponse.mockImplementation(() => getMockAIResponse());
    useSubmitResponse.mockImplementation(() => getMockSubmitResponse());
  });
  
  it('renders the component with AI response', async () => {
    // Setup game store
    const { mockUseGameStore } = setupMockGameStore({
      currentChallenge: mockChallenge,
      responses: {
        round1: { userResponse: 'Round 1 Done' },
      }
    });
    
    // Setup store mock for this test
    useGameStore.mockImplementation(mockUseGameStore);
    
    // Render the component
    renderWithProviders(<Round2 />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('Round 2: AI\'s Response')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Check for AI response
    expect(screen.getByText('Mock AI Response')).toBeInTheDocument();
    expect(screen.getByText('Round 1 Done')).toBeInTheDocument();
    expect(screen.getByText(mockChallenge.description)).toBeInTheDocument();
  });
  
  it('allows submitting a response and continues to round 3', async () => {
    // Setup game store
    const { mockUseGameStore } = setupMockGameStore({
      currentChallenge: mockChallenge,
      responses: {
        round1: { userResponse: 'Round 1 Done' },
      }
    });
    
    // Setup store mock
    useGameStore.mockImplementation(mockUseGameStore);
    
    // Render
    renderWithProviders(<Round2 />);
    const user = userEvent.setup();
    
    await waitFor(() => {
      expect(screen.getByText('Round 2: AI\'s Response')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Enter a response
    const responseTextarea = screen.getByPlaceholderText(/compare your approach/i);
    await user.type(responseTextarea, 'My round 2 analysis');
    
    // Submit the response
    const continueButton = screen.getByRole('button', { name: /continue to round 3/i });
    await user.click(continueButton);
    
    // Check if the response was saved to the game store
    expect(mockSaveRound2Response).toHaveBeenCalledWith('My round 2 analysis');
    
    // Check if router navigated to round 3
    expect(mockSubmitResponseMutate).toHaveBeenCalledWith({
        challengeId: mockChallenge.id,
        response: 'My round 2 analysis',
        round: 2
    });
    expect(mockPush).toHaveBeenCalledWith('/round3');
  });
  
  it('disables continue button when response is empty', async () => {
    // Setup game store
    const { mockUseGameStore } = setupMockGameStore({
      currentChallenge: mockChallenge,
      responses: {
        round1: { userResponse: 'Round 1 Done' },
      }
    });
    
    // Setup store mock
    useGameStore.mockImplementation(mockUseGameStore);
    
    renderWithProviders(<Round2 />);
    
    await waitFor(() => {
      expect(screen.getByText('Round 2: AI\'s Response')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Continue button should be disabled
    const continueButton = screen.getByRole('button', { name: /continue to round 3/i });
    expect(continueButton).toBeDisabled();
  });
  
  it('redirects to round 1 if round 1 response is missing', async () => {
    // Setup game store with missing round1 response
    const { mockUseGameStore } = setupMockGameStore({
      currentChallenge: mockChallenge,
      responses: {
        round1: { userResponse: '' }
      }
    });
    
    // Setup store mock
    useGameStore.mockImplementation(mockUseGameStore);
    
    // Render component which should trigger redirect
    renderWithProviders(<Round2 />);
    
    // Wait for the useEffect to run
    await waitFor(() => {
      // Should redirect to round 1
      expect(mockPush).toHaveBeenCalledWith('/round1');
    });
  });

  it('shows loading state for AI response', async () => {
    // Setup game store
    const { mockUseGameStore } = setupMockGameStore({
      currentChallenge: mockChallenge,
      responses: { round1: { userResponse: 'Round 1 Done' } }
    });
    
    // Setup store mock
    useGameStore.mockImplementation(mockUseGameStore);
    
    // Setup API mocks - override with loading state
    useGetAIResponse.mockImplementation(() => getMockAIResponse({ 
      data: null, 
      isLoading: true 
    }));

    renderWithProviders(<Round2 />);

    expect(screen.getByText(/loading AI's response/i)).toBeInTheDocument();
  });

  it('shows error state for AI response and allows retry', async () => {
    // Setup game store
    const { mockUseGameStore } = setupMockGameStore({
      currentChallenge: mockChallenge,
      responses: { round1: { userResponse: 'Round 1 Done' } }
    });
    
    // Setup store mock
    useGameStore.mockImplementation(mockUseGameStore);
    
    // Setup API mocks - override with error state
    useGetAIResponse.mockImplementation(() => getMockAIResponse({ 
      data: null, 
      isLoading: false, 
      isError: true, 
      error: new Error('Failed to fetch') 
    }));

    renderWithProviders(<Round2 />);
    const user = userEvent.setup();

    expect(screen.getByText(/error loading AI response/i)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /try again/i });
    await user.click(retryButton);

    expect(mockGetAIResponseRefetch).toHaveBeenCalled();
  });
}); 