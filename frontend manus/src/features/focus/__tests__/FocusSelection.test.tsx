import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';
import FocusSelection from '../FocusSelection';
import { useGameStore, FocusArea } from '@/store/useGameStore';
import { createMockGameStore } from '@/tests/storeMocks';
import * as services from '@/services/api/services';

// Mock the API services
jest.mock('@/services/api/services', () => ({
  useRecommendFocusAreas: jest.fn(),
  useSaveFocusAreaSelection: jest.fn(),
}));

// Mock the game store
jest.mock('@/store/useGameStore', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useGameStore: jest.fn() as any,
}));

describe('FocusSelection', () => {
  // Setup mock data
  const mockTraits = [
    { id: '1', name: 'Creativity', description: 'Ability to think outside the box', value: 8 },
    { id: '2', name: 'Empathy', description: 'Understanding and sharing feelings', value: 7 },
  ];
  
  const mockFocusAreas: FocusArea[] = [
    { id: '1', name: 'Creative Thinking', description: 'Generating original ideas and solutions', matchLevel: 85 },
    { id: '2', name: 'Emotional Intelligence', description: 'Understanding and managing emotions effectively', matchLevel: 75 },
  ];
  
  const mockSaveFocus = jest.fn();
  const mockFocusRecommendMutation = {
    mutateAsync: jest.fn().mockResolvedValue({ 
      success: true,
      status: 200,
      data: mockFocusAreas,
    }),
    isLoading: false,
  };
  
  const mockSaveFocusAreaMutation = {
    mutateAsync: jest.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the game store
    const mockStore = createMockGameStore({
      personality: {
        traits: mockTraits,
        attitudes: []
      },
      saveFocus: mockSaveFocus,
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).mockImplementation((selector: any) => selector(mockStore));
    
    // Mock the API services
    (services.useRecommendFocusAreas as jest.Mock).mockReturnValue(mockFocusRecommendMutation);
    (services.useSaveFocusAreaSelection as jest.Mock).mockReturnValue(mockSaveFocusAreaMutation);
  });
  
  it('renders the component and fetches focus areas', async () => {
    renderWithProviders(<FocusSelection />);
    
    // Should be in loading state initially
    expect(screen.getByText(/generating focus recommendations/i)).toBeInTheDocument();
    
    // Wait for focus areas to load
    await waitFor(() => {
      expect(screen.getByText('Select Your Focus Area')).toBeInTheDocument();
      expect(screen.getByText('Creative Thinking')).toBeInTheDocument();
      expect(screen.getByText('Emotional Intelligence')).toBeInTheDocument();
    });
    
    // Verify that the recommendation API was called with the traits
    expect(mockFocusRecommendMutation.mutateAsync).toHaveBeenCalledWith({
      traits: mockTraits,
    });
  });
  
  it('allows selecting a focus area and continuing', async () => {
    renderWithProviders(<FocusSelection />);
    const user = userEvent.setup();
    
    // Wait for focus areas to load
    await waitFor(() => {
      expect(screen.getByText('Creative Thinking')).toBeInTheDocument();
    });
    
    // Select the first focus area
    const focusCards = screen.getAllByRole('button', { name: /select this focus/i });
    await user.click(focusCards[0]);
    
    // Continue button should be enabled
    const continueButton = screen.getByRole('button', { name: /continue to round 1/i });
    expect(continueButton).not.toBeDisabled();
    
    // Click continue
    await user.click(continueButton);
    
    // Check if the saveFocus function was called with the correct focus area
    expect(mockSaveFocusAreaMutation.mutateAsync).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockSaveFocus).toHaveBeenCalledWith(mockFocusAreas[0]);
    });
  });
  
  it('handles error state when focus recommendations fail', async () => {
    // Mock error state
    (services.useRecommendFocusAreas as jest.Mock).mockReturnValue({
      ...mockFocusRecommendMutation,
      mutateAsync: jest.fn().mockRejectedValue(new Error('Failed to fetch recommendations')),
    });
    
    renderWithProviders(<FocusSelection />);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/error generating focus recommendations/i)).toBeInTheDocument();
    });
    
    // Retry button should be visible
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });
});
