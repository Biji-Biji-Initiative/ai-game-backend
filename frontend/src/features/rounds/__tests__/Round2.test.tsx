import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';
import Round2 from '../Round2';
import { useGameStore, FocusArea, Trait } from '@/store/useGameStore';
import { createMockGameStore } from '@/tests/storeMocks';
import * as services from '@/services/api/services';

// Mock the API services
jest.mock('@/services/api/services', () => ({
  useGetAIResponse: jest.fn(),
  useSubmitResponse: jest.fn()
}));

// Mock the Zustand store
jest.mock('@/store/useGameStore', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useGameStore: jest.fn() as any,
  GamePhase: {
    ROUND3: 'round3'
  }
}));

// Mock the Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Round2 Component', () => {
  // Mock AI response data
  const mockAIResponse = {
    success: true,
    data: {
      content: 'This is the AI\'s approach to solving this challenge. It uses large language models and data analysis to find patterns in the data.'
    }
  };
  
  // Create mock challenge that matches the currentChallenge structure in store
  const mockChallengeContent = 'Create a solution that leverages human creativity in a way AI cannot replicate.';
  const mockChallenge = {
    id: 'challenge-1',
    title: 'Creative Challenge',
    description: mockChallengeContent,
    content: mockChallengeContent
  };
  
  // Mock traits and focus area
  const mockTraits: Trait[] = [
    { id: 'trait1', name: 'Empathy', value: 8, description: 'Ability to understand and share feelings of others' },
    { id: 'trait2', name: 'Creativity', value: 7, description: 'Ability to generate novel ideas and solutions' }
  ];
  
  const mockFocus: FocusArea = {
    id: 'focus1',
    name: 'Creative Problem Solving',
    description: 'Using creativity to solve complex problems.',
    matchLevel: 85
  };
  
  // Mock actions
  const mockSaveRound2Response = jest.fn();
  const mockSetGamePhase = jest.fn();
  
  // Mock API mutations
  const mockGetAIResponseQuery = {
    data: mockAIResponse,
    isLoading: false,
    isError: false,
    refetch: jest.fn().mockResolvedValue({ data: mockAIResponse }),
  };
  
  const mockSubmitResponseMutation = {
    mutateAsync: jest.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  };
  
  beforeEach(() => {
    // Reset router mock
    mockPush.mockReset();
    jest.resetAllMocks();
    mockSaveRound2Response.mockClear();
    
    const mockStore = createMockGameStore({
      personality: {
        traits: mockTraits,
        attitudes: []
      },
      focus: mockFocus,
      currentChallenge: mockChallenge,
      saveRound2Response: mockSaveRound2Response,
      setGamePhase: mockSetGamePhase,
      // Add mock responses for Round 1
      responses: {
        round1: { userResponse: 'User response for round 1', aiResponse: 'AI response for round 1', challenge: 'Challenge for round 1' },
      }
    });
    
    // Mock our store access - this will return the mock store instead of the real one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).mockImplementation((selector: any) => selector(mockStore));
    
    // Mock the API services
    (services.useGetAIResponse as jest.Mock).mockReturnValue(mockGetAIResponseQuery);
    (services.useSubmitResponse as jest.Mock).mockReturnValue(mockSubmitResponseMutation);
  });
  
  it('renders the component and displays AI response', async () => {
    renderWithProviders(<Round2 />);
    
    // Verify the component renders with the correct title
    expect(screen.getByText('Round 2: AI\'s Response')).toBeInTheDocument();
    
    // Verify it displays the round 1 challenge and response
    expect(screen.getByText('Challenge for round 1')).toBeInTheDocument();
    expect(screen.getByText('User response for round 1')).toBeInTheDocument();
    
    // Verify the AI response is displayed
    await waitFor(() => {
      expect(screen.getByText('This is the AI\'s approach to solving this challenge. It uses large language models and data analysis to find patterns in the data.')).toBeInTheDocument();
    });
  });
  
  it('shows loading state while fetching AI response', async () => {
    // Override the mock to simulate loading
    (services.useGetAIResponse as jest.Mock).mockReturnValue({
      ...mockGetAIResponseQuery,
      isLoading: true,
      data: null,
    });
    
    renderWithProviders(<Round2 />);
    
    // Verify loading state is shown
    expect(screen.getByText('Loading AI\'s response to your challenge...')).toBeInTheDocument();
  });
  
  it('shows error state if AI response fails', async () => {
    // Override the mock to simulate error
    const mockRefetch = jest.fn().mockResolvedValue({ data: mockAIResponse });
    (services.useGetAIResponse as jest.Mock).mockReturnValue({
      isError: true,
      data: null,
      refetch: mockRefetch,
    });
    
    renderWithProviders(<Round2 />);
    
    // Wait for the error state to be rendered
    await waitFor(() => {
      expect(screen.getByText('Error loading AI response')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    
    // Test retry functionality
    await userEvent.click(screen.getByText('Try Again'));
    expect(mockRefetch).toHaveBeenCalled();
  });
  
  it('allows entering an analysis and submitting response', async () => {
    renderWithProviders(<Round2 />);
    
    // Enter user analysis
    const textarea = screen.getByPlaceholderText('Compare your approach with the AI\'s. Where do you see your human edge?');
    await userEvent.type(textarea, 'My analysis of the AI approach is that it lacks intuition and creativity.');
    
    // Submit the response
    const continueButton = screen.getByText('Continue to Round 3');
    await userEvent.click(continueButton);
    
    // Verify response is submitted
    expect(mockSubmitResponseMutation.mutateAsync).toHaveBeenCalledWith({
      challengeId: 'challenge-1',
      response: 'My analysis of the AI approach is that it lacks intuition and creativity.',
      round: 2
    });
    
    // Verify response is saved to store
    expect(mockSaveRound2Response).toHaveBeenCalledWith('My analysis of the AI approach is that it lacks intuition and creativity.');
    
    // Verify navigation to round 3
    expect(mockPush).toHaveBeenCalledWith('/round3');
  });
  
  it('disables continue button when analysis is empty', async () => {
    renderWithProviders(<Round2 />);
    
    // Check continue button is disabled initially
    const continueButton = screen.getByText('Continue to Round 3');
    expect(continueButton).toBeDisabled();
    
    // Enter whitespace only
    const textarea = screen.getByPlaceholderText('Compare your approach with the AI\'s. Where do you see your human edge?');
    await userEvent.type(textarea, '   ');
    
    // Button should still be disabled
    expect(continueButton).toBeDisabled();
  });
  
  it('redirects to round 1 if user hasn\'t completed it', async () => {
    // Override the mock to simulate missing round 1 response
    const mockStoreWithoutRound1 = createMockGameStore({
      personality: {
        traits: mockTraits,
        attitudes: []
      },
      focus: mockFocus,
      currentChallenge: mockChallenge,
      responses: {}, // Empty responses
      saveRound2Response: mockSaveRound2Response,
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).mockImplementation((selector: any) => selector(mockStoreWithoutRound1));
    
    renderWithProviders(<Round2 />);
    
    // Should redirect to round 1
    expect(mockPush).toHaveBeenCalledWith('/round1');
  });
});
