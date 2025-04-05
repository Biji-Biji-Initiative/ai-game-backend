/**
 * Round1 component tests
 */
import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';
import Round1 from '@/features/rounds/Round1';
import { GamePhase, Trait, GameState, useGameStore, FocusArea } from '@/store/useGameStore';
import { createMockGameStore, MockStore } from '@/tests/storeMocks';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import setup to ensure matchers are properly typed
import '@/tests/vitest-setup';

// Declare mocks at the top level
const mockPush = vi.fn();
const mockSaveRound1Response = vi.fn();
const mockSetGamePhase = vi.fn();
const mockSaveChallenge = vi.fn();
const mockGenerateChallengeMutate = vi.fn();
const mockSubmitResponseMutate = vi.fn();

// Mock the next/navigation module
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the API services
vi.mock('@/services/api/services', () => ({
  useGenerateChallenge: () => ({
    mutateAsync: mockGenerateChallengeMutate,
    isLoading: false
  }),
  useSubmitResponse: () => ({
    mutateAsync: mockSubmitResponseMutate,
    isLoading: false
  }),
}));

// Mock the game store
vi.mock('@/store/useGameStore');

describe('Round1', () => {
  // Mock challenge object that matches UIChallenge format
  const mockChallenge = {
    id: 'challenge-1',
    content: 'Write a creative problem statement for improving remote collaboration.',
    description: 'Write a creative problem statement for improving remote collaboration.',
    status: 'pending' as const,
    userEmail: 'test@example.com',
    createdAt: new Date().toISOString(),
    difficulty: 'intermediate' as const,
    focusArea: 'adaptability',
  };
  
  // Define mock traits for personality
  const mockTraits: Trait[] = [
    { id: '1', name: 'Openness', value: 0.8, description: 'Open to new experiences', lowLabel: 'Not open', highLabel: 'Very open' },
    { id: '2', name: 'Conscientiousness', value: 0.6, description: 'Organized and responsible', lowLabel: 'Not conscientious', highLabel: 'Very conscientious' },
  ];
  
  let mockStore: MockStore;
  const mockFocus: FocusArea = {
    id: 'focus-123',
    name: 'Test Focus Area',
    description: 'Focus Area Description',
    matchLevel: 90
  };

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock successful API responses
    mockGenerateChallengeMutate.mockResolvedValue({
      success: true,
      data: mockChallenge
    });
    
    mockSubmitResponseMutate.mockResolvedValue({
      success: true
    });
    
    // Create a mock store with initial state
    mockStore = createMockGameStore({
      gamePhase: GamePhase.ROUND1,
      personality: {
        traits: mockTraits,
        attitudes: []
      },
      focus: mockFocus,
      currentChallenge: mockChallenge,
      isLoading: false,
      responses: {
        round1: { userResponse: '' }  
      },
      userInfo: {
        professionalTitle: 'Software Developer',
        location: 'San Francisco'
      }
    });
    
    // Add mock functions to the store
    mockStore.saveRound1Response = mockSaveRound1Response;
    mockStore.setGamePhase = mockSetGamePhase;
    mockStore.saveChallenge = mockSaveChallenge;
    
    // Mock the store implementation using the imported module
    const mockedUseGameStore = vi.mocked(useGameStore);
    mockedUseGameStore.mockImplementation(
      (selector?: (state: GameState) => any) => {
        if (selector) {
          return selector(mockStore as unknown as GameState);
        }
        return mockStore as unknown as GameState;
      }
    );
  });
  
  it('renders the component with challenge', async () => {
    renderWithProviders(<Round1 />);
    
    // Wait for the component to render the challenge content
    await waitFor(() => {
      expect(screen.getByText('Round 1: Define The Challenge')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    expect(screen.getByText(mockChallenge.content)).toBeInTheDocument();
  });
  
  it.skip('allows submitting a response and continues to round 2', async () => {
    renderWithProviders(<Round1 />);
    const user = userEvent.setup({ delay: null });
    
    await waitFor(() => {
      expect(screen.getByText(mockChallenge.content)).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Enter a response
    const responseTextarea = screen.getByPlaceholderText(/type your response here/i);
    await user.type(responseTextarea, 'My creative response to the challenge');
    
    // Submit the response
    const continueButton = screen.getByRole('button', { name: /continue to round 2/i });
    await user.click(continueButton);
    
    // Check if the response was saved to the game store
    expect(mockStore.saveRound1Response).toHaveBeenCalledWith('My creative response to the challenge');
    
    // Check if router navigated to round 2
    expect(mockPush).toHaveBeenCalledWith('/round2');
  });
  
  it('disables continue button when response is empty', async () => {
    renderWithProviders(<Round1 />);
    
    await waitFor(() => {
      expect(screen.getByText(mockChallenge.content)).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Continue button should be disabled
    const continueButton = screen.getByRole('button', { name: /continue to round 2/i });
    expect(continueButton).toBeDisabled();
  });
  
  it.skip('redirects to focus page if focus is not selected', async () => {
    // Mock missing focus - create a new store with null focus
    const noFocusStore = createMockGameStore({
      personality: {
        traits: mockTraits,
        attitudes: []
      },
      focus: null,
      currentChallenge: mockChallenge
    });
    
    // Mock the store implementation for this specific test
    const mockedUseGameStore = vi.mocked(useGameStore);
    mockedUseGameStore.mockImplementation((selector?: (state: GameState) => any) => {
      if (typeof selector === 'function') {
        return selector(noFocusStore as unknown as GameState);
      }
      return noFocusStore as unknown as GameState;
    });
    
    renderWithProviders(<Round1 />);
    
    // Should redirect to focus page
    expect(mockPush).toHaveBeenCalledWith('/focus');
  });
});
