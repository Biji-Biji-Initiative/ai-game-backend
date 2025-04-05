/**
 * Example Test File Using Component Test Helpers
 * 
 * This is a simple example of how to use the component-test-helpers
 * to avoid circular dependencies in tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/tests/test-utils';

// Import helpers
import { 
  setupGameStoreMock, 
  createMockChallenge,
  resetAllMocks 
} from '@/tests/component-test-helpers';

// Define any mock functions first
const mockPush = vi.fn();
const mockSaveResponse = vi.fn();

// Mock router - must be before the component is imported
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  }),
  usePathname: () => '/'
}));

// Now import the component and types
import { GamePhase } from '@/store/useGameStore';
import { useGameStore } from '@/store/useGameStore';

// Create a simple component for testing
const SimpleComponent = () => {
  const { gamePhase, currentChallenge } = useGameStore(state => ({
    gamePhase: state.gamePhase,
    currentChallenge: state.currentChallenge
  }));

  return (
    <div>
      <h1>Current Phase: {gamePhase}</h1>
      {currentChallenge && (
        <div>
          <h2>Challenge: {currentChallenge.title}</h2>
          <p>{currentChallenge.description}</p>
        </div>
      )}
    </div>
  );
};

describe('SimpleComponent Example', () => {
  beforeEach(() => {
    resetAllMocks();
    
    // Set up the default game store mock
    const mockStore = setupGameStoreMock({
      gamePhase: GamePhase.ROUND1,
    });
    
    // Apply the mock implementation
    vi.mocked(useGameStore).mockImplementation(mockStore);
  });
  
  it('renders the current game phase', () => {
    renderWithProviders(<SimpleComponent />);
    
    expect(screen.getByText('Current Phase: round1')).toBeInTheDocument();
  });
  
  it('renders the challenge when available', () => {
    // Set up a mock store with a challenge
    const mockStore = setupGameStoreMock({
      gamePhase: GamePhase.ROUND1,
      currentChallenge: createMockChallenge({
        title: 'Test Challenge Title',
        description: 'This is a test challenge description'
      })
    });
    vi.mocked(useGameStore).mockImplementation(mockStore);
    
    renderWithProviders(<SimpleComponent />);
    
    expect(screen.getByText('Challenge: Test Challenge Title')).toBeInTheDocument();
    expect(screen.getByText('This is a test challenge description')).toBeInTheDocument();
  });
}); 