import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';
import TraitAssessment from '../TraitAssessment';
import { useGameStore } from '@/store/useGameStore';
import { createMockGameStore } from '@/tests/storeMocks';
import * as services from '@/services/api/services';

// Mock the API services
jest.mock('@/services/api/services', () => ({
  useGetTraits: jest.fn(),
  useSaveTraitAssessment: jest.fn(),
}));

// Mock the game store
jest.mock('@/store/useGameStore', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useGameStore: jest.fn() as any,
}));

describe('TraitAssessment', () => {
  // Setup mock data
  const mockTraits = [
    { id: '1', name: 'Creativity', description: 'Ability to think outside the box', value: 5 },
    { id: '2', name: 'Empathy', description: 'Understanding and sharing feelings', value: 5 },
  ];
  
  const mockSaveTraits = jest.fn();
  const mockTraitsQuery = {
    data: {
      success: true,
      status: 200,
      data: mockTraits,
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };
  
  const mockTraitsMutation = {
    mutateAsync: jest.fn().mockResolvedValue({ success: true }),
    isLoading: false,
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the game store
    const mockStore = createMockGameStore({
      personality: {
        traits: [],
        attitudes: []
      },
      saveTraits: mockSaveTraits,
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).mockImplementation((selector: any) => selector(mockStore));
    
    // Mock the API services
    (services.useGetTraits as jest.Mock).mockReturnValue(mockTraitsQuery);
    (services.useSaveTraitAssessment as jest.Mock).mockReturnValue(mockTraitsMutation);
  });
  
  it('renders the component with traits', async () => {
    renderWithProviders(<TraitAssessment />);
    
    await waitFor(() => {
      expect(screen.getByText('Assess Your Human Traits')).toBeInTheDocument();
      expect(screen.getByText('Creativity')).toBeInTheDocument();
      expect(screen.getByText('Empathy')).toBeInTheDocument();
    });
  });
  
  it('updates trait values when sliders are changed', async () => {
    renderWithProviders(<TraitAssessment />);
    const user = userEvent.setup();
    
    // Wait for the traits to be loaded
    await waitFor(() => {
      expect(screen.getByText('Creativity')).toBeInTheDocument();
    });
    
    // Find all sliders
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBe(mockTraits.length);
    
    // Change the first slider value
    await user.click(sliders[0]);
    
    // Submit the form
    const continueButton = screen.getByRole('button', { name: /continue/i });
    await user.click(continueButton);
    
    // Check if the saveTraits function was called
    expect(mockTraitsMutation.mutateAsync).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockSaveTraits).toHaveBeenCalled();
    });
  });
  
  it('displays loading state while fetching traits', async () => {
    // Mock loading state
    (services.useGetTraits as jest.Mock).mockReturnValue({
      ...mockTraitsQuery,
      isLoading: true,
    });
    
    renderWithProviders(<TraitAssessment />);
    
    expect(screen.getByText(/loading trait assessment/i)).toBeInTheDocument();
  });
  
  it('displays error message when traits fetch fails', async () => {
    // Mock error state
    (services.useGetTraits as jest.Mock).mockReturnValue({
      ...mockTraitsQuery,
      data: undefined,
      error: new Error('Failed to fetch traits'),
    });
    
    renderWithProviders(<TraitAssessment />);
    
    await waitFor(() => {
      expect(screen.getByText(/error loading traits/i)).toBeInTheDocument();
    });
  });
});
