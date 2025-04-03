// Import necessary testing utilities
import '@testing-library/jest-dom';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';
import ResultsProfile from '../ResultsProfile';
import { useGameStore, Profile } from '@/store/useGameStore';
import { createMockGameStore } from '@/tests/storeMocks';
import * as services from '@/services/api/services';
import { useRouter, usePathname } from 'next/navigation';
import { jest } from '@jest/globals';

// Import test setup to extend Jest matchers
import '@/tests/jest-setup';

// Increase Jest timeout globally
jest.setTimeout(15000);

// Mock the API services
jest.mock('@/services/api/services', () => ({
  useGetSharedProfile: jest.fn(),
  __esModule: true,
}));

// Mock the game store
jest.mock('@/store/useGameStore', () => ({
  useGameStore: jest.fn(),
  getState: jest.fn(),
  __esModule: true
}));

// Mock the Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Setup fake timers
jest.useFakeTimers();

// Mock clipboard API
const mockClipboardWriteText = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockClipboardWriteText,
  },
  writable: true,
});

describe('ResultsProfile', () => {
  // Setup mock data
  const mockProfile: Profile = {
    id: 'profile-123',
    traits: [
      { id: '1', name: 'Creativity', description: 'Ability to think outside the box', value: 8 },
      { id: '2', name: 'Empathy', description: 'Understanding and sharing feelings', value: 7 },
    ],
    focus: {
      id: 'focus-1',
      name: 'Creative Thinking',
      description: 'Generating original ideas and solutions',
      matchLevel: 85,
    },
    strengths: [
      'Innovative problem-solving',
      'Thinking beyond conventional approaches',
      'Generating unique ideas',
    ],
    insights: 'You excel at finding creative solutions that AI might miss due to its reliance on existing patterns.',
    recommendations: [
      'Focus on collaborative creative projects',
      'Develop your ability to combine diverse perspectives',
      'Seek opportunities that require breakthrough thinking',
    ],
    createdAt: '2023-01-01T00:00:00Z',
  };

  const mockSharedProfileQuery = {
    data: {
      success: true,
      status: 200,
      data: mockProfile,
    },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };

  // Mock resetGame function
  const mockResetGame = jest.fn();

  let mockPush: jest.Mock;
  let mockGameStoreInstance: ReturnType<typeof createMockGameStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset router mock
    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    });
    
    // Reset pathname mock
    (usePathname as jest.Mock).mockReturnValue('/results');
    
    // Mock the game store
    mockGameStoreInstance = createMockGameStore({
      profile: mockProfile,
      resetGame: mockResetGame,
    });
    
    // Use a proper cast to avoid type errors
    (useGameStore as unknown as jest.Mock).mockImplementation((selector) => {
      // If a selector function is provided, use it on our mock store
      if (typeof selector === 'function') {
        return selector(mockGameStoreInstance);
      }
      // Otherwise, return the full mock store
      return mockGameStoreInstance;
    });
    
    // Mock the getState static method
    // Cast to unknown first to avoid type error
    (useGameStore as unknown as { getState: jest.Mock }).getState = jest.fn().mockReturnValue(mockGameStoreInstance);
    
    // Mock the API services
    (services.useGetSharedProfile as jest.Mock).mockReturnValue(mockSharedProfileQuery);
    
    // Mock window.location for share URL generation
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://aifightclub.example.com',
      },
      writable: true,
    });
  });
  
  // Increase timeout for this test to 15 seconds
  test('renders the component with user profile data', async () => {
    await renderWithProviders(<ResultsProfile />);
    
    // Wait for profile data to load
    await waitFor(() => {
      expect(screen.getByText('Your Human Edge Profile')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Check if focus area is displayed
    expect(screen.getByText('Creative Thinking')).toBeInTheDocument();
    
    // Check if strengths are displayed
    expect(screen.getByText('Innovative problem-solving')).toBeInTheDocument();
    
    // Check if insights are displayed
    expect(screen.getByText(/You excel at finding creative solutions/)).toBeInTheDocument();
    
    // Check if recommendations are displayed
    expect(screen.getByText('Focus on collaborative creative projects')).toBeInTheDocument();
    
    // Check if share button is present (since we're viewing our own profile)
    expect(screen.getByText('Share Your Profile')).toBeInTheDocument();
    
    // Check if start new game button is present
    expect(screen.getByText('Start a New Game')).toBeInTheDocument();
  });
  
  // Setting Jest timeout to 15 seconds
  jest.setTimeout(15000);
  
  test('renders shared profile when profileId is provided', async () => {
    await renderWithProviders(<ResultsProfile profileId="profile-123" />);
    
    // Wait for profile data to load
    await waitFor(() => {
      expect(screen.getByText('Your Human Edge Profile')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Verify that the API was called with the correct profile ID
    expect(services.useGetSharedProfile).toHaveBeenCalledWith('profile-123');
    
    // Check that share button is NOT present for shared profiles
    expect(screen.queryByText('Share Your Profile')).not.toBeInTheDocument();
    
    // Check that the button text is different for shared profiles
    expect(screen.getByText('Create Your Own Profile')).toBeInTheDocument();
  });
  
  test('shows loading state while fetching profile data', async () => {
    // Mock loading state
    (services.useGetSharedProfile as jest.Mock).mockReturnValue({
      ...mockSharedProfileQuery,
      isLoading: true,
      data: undefined,
    });
    
    await renderWithProviders(<ResultsProfile profileId="profile-123" />);
    
    expect(screen.getByText(/Loading human edge profile/i)).toBeInTheDocument();
  }, 10000);
  
  test('handles copying share link', async () => {
    await renderWithProviders(<ResultsProfile />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    // Wait for profile to load
    await waitFor(() => {
      expect(screen.getByText('Your Human Edge Profile')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Click the share button
    const shareButton = screen.getByText('Share Your Profile');
    await user.click(shareButton);
    
    // Check if clipboard.writeText was called with the correct URL
    expect(mockClipboardWriteText).toHaveBeenCalledWith(
      'https://aifightclub.example.com/profile/profile-123'
    );
    
    // Check if button text changes to "Copied!"
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    }, { timeout: 6000 });
    
    // Text should revert back after timeout
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Share Your Profile')).toBeInTheDocument();
    }, { timeout: 6000 });
  }, 20000);
  
  it('resets game and navigates to home when starting a new game', async () => {
    await renderWithProviders(<ResultsProfile />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    // Wait for profile to load
    await waitFor(() => {
      expect(screen.getByText('Your Human Edge Profile')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Click the start new game button
    const newGameButton = screen.getByText('Start a New Game');
    await user.click(newGameButton);
    
    // Check if resetGame was called
    expect(mockResetGame).toHaveBeenCalled();
    
    // Check if router.push was called with '/'
    expect(mockPush).toHaveBeenCalledWith('/');
  });
  
  it('navigates to home without resetting game when viewing shared profile', async () => {
    await renderWithProviders(<ResultsProfile profileId="profile-123" />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    // Wait for profile to load
    await waitFor(() => {
      expect(screen.getByText('Your Human Edge Profile')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Click the create your own profile button
    const createProfileButton = screen.getByText('Create Your Own Profile');
    await user.click(createProfileButton);
    
    // Check if resetGame was NOT called
    expect(mockResetGame).not.toHaveBeenCalled();
    
    // Check if router.push was called with '/'
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
