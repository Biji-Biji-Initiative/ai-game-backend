/**
 * Round3 component tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';

// Import helper functions and types
import { 
  GamePhases, 
  setupGameStoreMock, 
  createMockChallenge, 
  resetAllMocks 
} from '@/tests/component-test-helpers';

// Mock functions
const mockPush = vi.fn();
const mockSaveRound3Response = vi.fn();
const mockSetGamePhase = vi.fn();
const mockSaveProfileId = vi.fn();
const mockGenerateProfileMutate = vi.fn().mockResolvedValue({
  success: true,
  data: { id: 'profile-1', strengths: [], insights: '', recommendations: [] }
});

// Mock navigation explicitly
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/',
  useSearchParams: () => ({
    get: vi.fn()
  })
}));

// Mock API services
vi.mock('@/services/api/services', () => ({
  useGenerateProfile: () => ({
    mutateAsync: mockGenerateProfileMutate,
    isLoading: false
  }),
  // We still need these mocks even if not directly used in Round3
  useGenerateChallenge: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true, data: {} }),
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
        content: 'This is a test AI response'
      }
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

// Now import the component and actual types
import { GamePhase, Trait, FocusArea } from '@/store/useGameStore';
import { useGameStore } from '@/store/useGameStore';
import Round3 from '@/features/rounds/Round3';

describe('Round3', () => {
  // Mock challenge object that matches UIChallenge format
  const mockChallenge = createMockChallenge({
    description: 'Write a creative problem statement for improving remote collaboration.'
  });
  
  // Define mock traits for personality
  const mockTraits: Trait[] = [
    { id: '1', name: 'Openness', value: 0.8, description: 'Open to new experiences', lowLabel: 'Not open', highLabel: 'Very open' },
    { id: '2', name: 'Conscientiousness', value: 0.6, description: 'Organized and responsible', lowLabel: 'Not conscientious', highLabel: 'Very conscientious' },
  ];
  
  const mockFocus: FocusArea = {
    id: 'focus-123',
    name: 'Test Focus Area',
    description: 'Focus Area Description',
    matchLevel: 90
  };

  beforeEach(() => {
    // Reset all mocks
    resetAllMocks();
    
    // Reset specific mocks
    mockPush.mockReset();
    mockSaveRound3Response.mockReset();
    mockSaveProfileId.mockReset();
    mockGenerateProfileMutate.mockReset();
    mockGenerateProfileMutate.mockResolvedValue({
      success: true,
      data: { id: 'profile-1', strengths: [], insights: '', recommendations: [] }
    });
    
    // Set up the default mock implementation
    const mockStore = setupGameStoreMock({
      gamePhase: GamePhase.ROUND3,
      saveRound3Response: mockSaveRound3Response, 
      saveProfileId: mockSaveProfileId,
      setGamePhase: mockSetGamePhase
    });
    
    // Apply the mock implementation to useGameStore
    vi.mocked(useGameStore).mockImplementation(mockStore);
  });
  
  it('renders the component with reflection prompt', async () => {
    // Setup the specific state needed for this test
    const mockStore = setupGameStoreMock({
      currentChallenge: mockChallenge,
      responses: {
        round1: { userResponse: 'Round 1 Done' },
        round2: { userResponse: 'Round 2 Done' },
      }
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);

    renderWithProviders(<Round3 />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('Round 3: Final Reflection')).toBeInTheDocument();
    });
    
    // Check for reflection prompt
    expect(screen.getByText(/reflect on your unique human edge/i)).toBeInTheDocument();
  });
  
  it('allows submitting a reflection and continues to results', async () => {
    // Setup state needed
    const mockStore = setupGameStoreMock({
      currentChallenge: mockChallenge,
      focus: mockFocus,
      personality: { traits: mockTraits, attitudes: [] },
      responses: {
        round1: { userResponse: 'Round 1 Done' },
        round2: { userResponse: 'Round 2 Done' },
      }
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);

    renderWithProviders(<Round3 />);
    const user = userEvent.setup();
    
    await waitFor(() => {
      expect(screen.getByText('Round 3: Final Reflection')).toBeInTheDocument();
    });
    
    // Enter a response
    const responseTextarea = screen.getByPlaceholderText(/type your reflection here/i);
    await user.type(responseTextarea, 'My final reflection');
    
    // Submit the response
    const continueButton = screen.getByRole('button', { name: /view my profile/i });
    await user.click(continueButton);
    
    // Check if the response was saved to the game store
    expect(mockSaveRound3Response).toHaveBeenCalledWith('My final reflection');
    
    // Check if profile generation API was called with the correct focus
    expect(mockGenerateProfileMutate).toHaveBeenCalledWith({
      focus: mockFocus.id,
      traitValues: mockTraits.map(trait => ({ id: trait.id, value: trait.value })),
      responses: {
        round1: 'Round 1 Done',
        round2: 'Round 2 Done',
        round3: 'My final reflection'
      }
    });
    
    // Check if profile ID was saved and we navigated to results
    expect(mockSaveProfileId).toHaveBeenCalledWith('profile-1');
    expect(mockSetGamePhase).toHaveBeenCalledWith(GamePhase.RESULTS);
    expect(mockPush).toHaveBeenCalledWith('/results');
  });
  
  it('disables continue button when response is empty', async () => {
    // Setup state needed
    const mockStore = setupGameStoreMock({
      currentChallenge: mockChallenge,
      focus: mockFocus,
      responses: {
        round1: { userResponse: 'Round 1 Done' },
        round2: { userResponse: 'Round 2 Done' },
      }
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);

    renderWithProviders(<Round3 />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('Round 3: Final Reflection')).toBeInTheDocument();
    });
    
    // Check if button is disabled
    const continueButton = screen.getByRole('button', { name: /view my profile/i });
    expect(continueButton).toBeDisabled();
  });
  
  it('redirects to round 2 if round 2 response is missing', async () => {
    // Setup state with missing Round 2 response
    const mockStore = setupGameStoreMock({
      currentChallenge: mockChallenge,
      responses: {
        round1: { userResponse: 'Round 1 Done' },
        round2: { userResponse: '' },
      }
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);
    
    // Render component which should trigger redirect
    renderWithProviders(<Round3 />);
    
    // Wait for the redirect to happen
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/round2');
    });
  });

  it('handles errors in profile generation', async () => {
    // Setup API error
    mockGenerateProfileMutate.mockRejectedValueOnce(new Error('Profile generation failed'));
    
    // Setup state needed
    const mockStore = setupGameStoreMock({
      currentChallenge: mockChallenge,
      focus: mockFocus,
      personality: { traits: mockTraits, attitudes: [] },
      responses: {
        round1: { userResponse: 'Round 1 Done' },
        round2: { userResponse: 'Round 2 Done' },
      }
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);

    // Render component
    renderWithProviders(<Round3 />);
    const user = userEvent.setup();
    
    // Enter a response
    const responseTextarea = screen.getByPlaceholderText(/type your reflection here/i);
    await user.type(responseTextarea, 'My final reflection');
    
    // Submit the response
    const continueButton = screen.getByRole('button', { name: /view my profile/i });
    await user.click(continueButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/there was an error/i)).toBeInTheDocument();
    });
  });
});
