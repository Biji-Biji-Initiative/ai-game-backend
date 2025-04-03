import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';
import Round1 from '../Round1';
import { useGameStore, FocusArea, Trait } from '@/store/useGameStore';
import { createMockGameStore } from '@/tests/storeMocks';
import * as services from '@/services/api/services';
import { useRouter } from 'next/navigation';

// Import setup to ensure Jest matchers are properly typed
import '@/tests/jest-setup';

// Mock the API services
jest.mock('@/services/api/services', () => ({
  useGenerateChallenge: jest.fn(),
  useSubmitResponse: jest.fn(),
}));

// Mock the game store
jest.mock('@/store/useGameStore', () => ({
  // Using any cast for consistency with other test files
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useGameStore: jest.fn() as any,
  GamePhase: {
    ROUND2: 'round2'
  }
}));

// Mock the Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}));

describe('Round1', () => {
  // Setup mock data
  const mockTraits: Trait[] = [
    { id: '1', name: 'Creativity', description: 'Ability to think outside the box', value: 8 },
    { id: '2', name: 'Empathy', description: 'Understanding and sharing feelings', value: 7 },
  ];
  
  const mockFocus: FocusArea = { 
    id: 'focus-1', 
    name: 'Creative Thinking', 
    description: 'Generating original ideas and solutions', 
    matchLevel: 85 
  };
  
  const mockChallenge = 'Create a solution that leverages human creativity in a way AI cannot replicate.';
  
  // Mock challenge object that matches the currentChallenge shape from the store
  const mockChallengeObject = {
    id: 'challenge-1',
    title: 'Creative Challenge',
    description: mockChallenge,
    content: mockChallenge
  };

  const mockSaveRound1Response = jest.fn();
  const mockSetGamePhase = jest.fn();
  const mockSaveChallenge = jest.fn();
  
  const mockGenerateChallengeMutation = {
    mutateAsync: jest.fn().mockResolvedValue({
      success: true,
      status: 200,
      data: {
        id: 'challenge-1',
        content: mockChallenge,
      },
    }),
    isLoading: false,
  };
  
  const mockSubmitResponseMutation = {
    mutateAsync: jest.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  };
  
  beforeEach(() => {
    // Reset router mock
    mockPush.mockReset();
    jest.clearAllMocks();
    
    jest.resetAllMocks();
    mockSaveRound1Response.mockClear();
    
    // Create mock store with correctly structured personality data
    const mockStore = createMockGameStore({
      personality: { 
        traits: mockTraits, 
        attitudes: [] 
      },
      focus: mockFocus,
      currentChallenge: mockChallengeObject,
      saveRound1Response: mockSaveRound1Response,
      setGamePhase: mockSetGamePhase,
      saveChallenge: mockSaveChallenge,
      userInfo: {
        professionalTitle: 'Software Developer',
        location: 'San Francisco'
      }
    });
    
    // Mock our store access with proper typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockStore);
      }
      return mockStore;
    });
    
    // Mock the API services
    (services.useGenerateChallenge as jest.Mock).mockReturnValue(mockGenerateChallengeMutation);
    (services.useSubmitResponse as jest.Mock).mockReturnValue(mockSubmitResponseMutation);
  });
  
  it('renders the component and generates a challenge', async () => {
    renderWithProviders(<Round1 />);
    
    // Should be in loading state initially
    expect(screen.getByText(/generating your challenge/i)).toBeInTheDocument();
    
    // Wait for challenge to load
    await waitFor(() => {
      expect(screen.getByText('Round 1: Define The Challenge')).toBeInTheDocument();
      expect(screen.getByText(mockChallenge)).toBeInTheDocument();
    });
    
    // Verify that the generate challenge API was called with the correct data
    expect(mockGenerateChallengeMutation.mutateAsync).toHaveBeenCalledWith({
      focusAreaId: mockFocus.id,
      personalityContext: {
        traits: mockTraits,
        attitudes: []
      },
      professionalContext: {
        title: 'Software Developer',
        location: 'San Francisco'
      },
      round: 1
    });
  });
  
  it('allows submitting a response and continues to round 2', async () => {
    renderWithProviders(<Round1 />);
    const user = userEvent.setup();
    
    // Wait for challenge to load
    await waitFor(() => {
      expect(screen.getByText(mockChallenge)).toBeInTheDocument();
    });
    
    // Enter a response
    const responseTextarea = screen.getByPlaceholderText(/type your response here/i);
    await user.type(responseTextarea, 'My creative response to the challenge');
    
    // Submit the response
    const continueButton = screen.getByRole('button', { name: /continue to round 2/i });
    await user.click(continueButton);
    
    // Check if the submit response API was called
    expect(mockSubmitResponseMutation.mutateAsync).toHaveBeenCalledWith({
      challengeId: 'challenge-1',
      response: 'My creative response to the challenge',
      round: 1
    });
    
    // Check if the response was saved to the game store
    await waitFor(() => {
      expect(mockSaveRound1Response).toHaveBeenCalledWith('My creative response to the challenge');
    });
    
    // Check if router navigated to round 2
    expect(mockPush).toHaveBeenCalledWith('/round2');
  });
  
  it('disables continue button when response is empty', async () => {
    renderWithProviders(<Round1 />);
    
    // Wait for challenge to load
    await waitFor(() => {
      expect(screen.getByText(mockChallenge)).toBeInTheDocument();
    });
    
    // Continue button should be disabled
    const continueButton = screen.getByRole('button', { name: /continue to round 2/i });
    expect(continueButton).toBeDisabled();
  });
  
  it('redirects to focus page if focus is not selected', async () => {
    // Mock missing focus
    const mockStoreNoFocus = createMockGameStore({
      personality: {
        traits: mockTraits,
        attitudes: []
      },
      focus: null,
      saveRound1Response: mockSaveRound1Response,
    });
    
    // Mock our store access - this will return the mock store instead of the real one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector(mockStoreNoFocus);
      }
      return mockStoreNoFocus;
    });
    
    renderWithProviders(<Round1 />);
    
    // Should redirect to focus page
    expect(mockPush).toHaveBeenCalledWith('/focus');
  });
});
