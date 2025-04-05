/**
 * Round2 component tests
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

// Define mock functions FIRST
const mockPush = vi.fn();
const mockGetAIResponseRefetch = vi.fn();
const mockSubmitResponseMutate = vi.fn().mockResolvedValue({ success: true });
const mockSaveRound2Response = vi.fn();
const mockSetGamePhase = vi.fn();

// Reference for loading state test
let mockGetAIResponseState = {
  data: { success: true, data: { content: 'Mock AI Response' } },
  isLoading: false,
  isError: false,
  error: null,
  refetch: mockGetAIResponseRefetch
};

// Mock API services BEFORE importing the component and its dependencies
vi.mock('@/services/api/services', () => {
  return {
    useGetAIResponse: () => mockGetAIResponseState,
    useSubmitResponse: () => ({
      mutateAsync: mockSubmitResponseMutate,
      isLoading: false,
      isError: false,
      error: null
    }),
    // Include other functions to avoid "not implemented" errors
    useGenerateChallenge: () => ({
      mutateAsync: vi.fn().mockResolvedValue({ 
        id: 'test-challenge-1', 
        title: 'Test Challenge', 
        description: 'Test description'
      }),
      isLoading: false
    }),
    useGenerateProfile: () => ({
      mutateAsync: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'profile-1' }
      }),
      isLoading: false
    }),
    useRecommendFocusAreas: () => ({
      mutateAsync: vi.fn(),
      isLoading: false
    }),
    useSaveFocusAreaSelection: () => ({
      mutateAsync: vi.fn(),
      isLoading: false
    })
  };
});

// Mock router explicitly
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  usePathname: () => '/',
  useSearchParams: () => ({
    get: vi.fn()
  })
}));

// Now import the actual dependencies
import { GamePhase } from '@/store/useGameStore';
import { useGameStore } from '@/store/useGameStore';
import Round2 from '@/features/rounds/Round2';

// Define test challenge data
const mockChallenge = createMockChallenge({
  description: 'Write a creative problem statement for improving remote collaboration.'
});

describe('Round2', () => {
  beforeEach(() => {
    resetAllMocks();
    mockPush.mockReset();
    mockSubmitResponseMutate.mockReset().mockResolvedValue({ success: true });
    mockGetAIResponseRefetch.mockReset();
    mockSaveRound2Response.mockReset();
    mockSetGamePhase.mockReset();
    
    // Reset the AI response mock state
    mockGetAIResponseState = {
      data: { success: true, data: { content: 'Mock AI Response' } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockGetAIResponseRefetch
    };
    
    // Set up the game store mock with default state
    const mockStore = setupGameStoreMock({
      gamePhase: GamePhase.ROUND2,
      saveRound2Response: mockSaveRound2Response,
      setGamePhase: mockSetGamePhase
    });
    
    // Assign the mock to the imported hook
    vi.mocked(useGameStore).mockImplementation(mockStore);
  });

  it('renders the component with AI response', async () => {
    // Setup store with challenge and Round 1 response
    const mockStore = setupGameStoreMock({
      currentChallenge: mockChallenge,
      responses: { 
        round1: { userResponse: 'Round 1 Done' } 
      }
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);

    // Render component
    renderWithProviders(<Round2 />);
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Round 2: AI\'s Response')).toBeInTheDocument();
    });
    
    // Check content
    expect(screen.getByText('Mock AI Response')).toBeInTheDocument();
    expect(screen.getByText('Round 1 Done')).toBeInTheDocument();
    expect(screen.getByText(mockChallenge.description)).toBeInTheDocument();
  });
  
  it('allows submitting a response and continues to round 3', async () => {
    // Setup store with challenge and Round 1 response
    const mockStore = setupGameStoreMock({
      currentChallenge: mockChallenge,
      responses: { 
        round1: { userResponse: 'Round 1 Done' } 
      }
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);

    // Render component
    renderWithProviders(<Round2 />);
    const user = userEvent.setup();
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('Round 2: AI\'s Response')).toBeInTheDocument();
    });
    
    // Enter a response
    const responseTextarea = screen.getByPlaceholderText(/compare your approach/i);
    await user.type(responseTextarea, 'My round 2 analysis');
    
    // Submit the response
    const continueButton = screen.getByRole('button', { name: /continue to round 3/i });
    await user.click(continueButton);
    
    // Check if response was saved
    expect(mockSaveRound2Response).toHaveBeenCalledWith('My round 2 analysis');
    
    // Check if mutation was called and router navigated to round 3
    expect(mockSubmitResponseMutate).toHaveBeenCalledWith({
      challengeId: mockChallenge.id,
      response: 'My round 2 analysis',
      round: 2
    });
    expect(mockPush).toHaveBeenCalledWith('/round3');
  });
  
  it('disables continue button when response is empty', async () => {
    // Setup store with challenge and Round 1 response
    const mockStore = setupGameStoreMock({
      currentChallenge: mockChallenge,
      responses: { 
        round1: { userResponse: 'Round 1 Done' } 
      }
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);

    // Render component
    renderWithProviders(<Round2 />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('Round 2: AI\'s Response')).toBeInTheDocument();
    });
    
    // Check if button is disabled
    const continueButton = screen.getByRole('button', { name: /continue to round 3/i });
    expect(continueButton).toBeDisabled();
  });
  
  it('redirects to round 1 if round 1 response is missing', async () => {
    // Setup store with missing Round 1 response
    const mockStore = setupGameStoreMock({
      currentChallenge: mockChallenge,
      responses: { 
        round1: { userResponse: '' } 
      }
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);
    
    // Render component which should trigger redirect
    renderWithProviders(<Round2 />);
    
    // Wait for the redirect to happen
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/round1');
    });
  });

  it('shows loading state for AI response', async () => {
    // Set the mock to loading state
    mockGetAIResponseState = {
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: mockGetAIResponseRefetch
    };
    
    // Setup store
    const mockStore = setupGameStoreMock({
      currentChallenge: mockChallenge,
      responses: { 
        round1: { userResponse: 'Round 1 Done' } 
      }
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);
    
    // Render component
    renderWithProviders(<Round2 />);
    
    // Check for loading state
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });
});
