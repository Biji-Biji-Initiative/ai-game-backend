import '@testing-library/jest-dom';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';
import PromptViewer from '../PromptViewer';
import { useGameStore, Trait, FocusArea } from '@/store/useGameStore';
import { createMockGameStore } from '@/tests/storeMocks';
import { jest } from '@jest/globals';
import React from 'react';
import { useRouter } from 'next/navigation';

// Import test setup to extend Jest matchers
import '@/tests/jest-setup';

// Mock timers
jest.useFakeTimers();

// Mock the game store
jest.mock('@/store/useGameStore', () => ({
  useGameStore: jest.fn(),
  __esModule: true
}));

// Mock the API services
jest.mock('@/services/api/services', () => ({
  useGetSharedProfile: jest.fn(),
  __esModule: true
}));

// Mock the Next.js router for App Router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  })),
  usePathname: jest.fn(() => '/prompts'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock clipboard API
const mockClipboardWriteText = jest.fn().mockResolvedValue(null);
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockClipboardWriteText,
  },
  writable: true,
});

describe('PromptViewer', () => {
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
  
  const mockResponses = {
    round1: {
      challenge: 'Create a solution that leverages human creativity in a way AI cannot replicate.',
      userResponse: 'My solution leverages intuitive thinking and emotional resonance...',
    },
    round2: {
      aiResponse: 'As an AI, I would approach this by analyzing patterns in existing creative works...',
      userResponse: 'The AI approach is limited because it relies on existing patterns...',
    },
    round3: {
      challenge: 'Develop a framework that combines human creativity with AI capabilities...',
      userResponse: 'My framework would involve collaborative ideation sessions where humans...',
    }
  };
  
  let mockPush: jest.Mock;
  let mockGameStoreInstance: ReturnType<typeof createMockGameStore>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn()
    });
    
    // Reset pathname mock
    (jest.requireMock('next/navigation').usePathname as jest.Mock).mockReturnValue('/prompts');

    // Mock the game store with full game data
    mockGameStoreInstance = createMockGameStore({
      traits: mockTraits,
      focus: mockFocus,
      responses: mockResponses
    });
    
    // Properly type the mock implementation with unknown casting
    (useGameStore as unknown as jest.Mock).mockImplementation((selector) => {
      // If selector function is provided, use it with the mock store
      if (typeof selector === 'function') {
        return selector(mockGameStoreInstance);
      }
      // Otherwise return the full mock store
      return mockGameStoreInstance;
    });
  });
  
  test('renders the component with the initial template selected', async () => {
    await renderWithProviders(<PromptViewer />);
    
    // Check that the component renders with the first prompt template selected
    expect(screen.getByText('Trait Assessment Generation')).toBeInTheDocument();
    expect(screen.getByText('Generates questions for assessing human traits')).toBeInTheDocument();
    
    // Check that the compiled prompt includes the template content
    const compiledPrompt = screen.getByText(/You are an AI assistant helping to assess human characteristics/i);
    expect(compiledPrompt).toBeInTheDocument();
  });
  
  // Setting Jest timeout to 15 seconds
  jest.setTimeout(15000);
  
  test('allows changing prompt template and updates variables', async () => {
    await renderWithProviders(<PromptViewer />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    // Open the select dropdown
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);
    
    // Select a different prompt template
    const focusAreasOption = screen.getByRole('option', { name: 'Focus Areas Generation' });
    await user.click(focusAreasOption);
    
    // Check that the description updates
    expect(screen.getByText('Recommends focus areas based on trait assessment')).toBeInTheDocument();
    
    // Check that variables are updated for the new template
    expect(screen.getByLabelText('traitScores')).toBeInTheDocument();
    
    // Check that traitScores variable is pre-populated from game state
    const traitScoresInput = screen.getByLabelText('traitScores');
    expect(traitScoresInput).toHaveValue('Creativity: 8/10\nEmpathy: 7/10');
  });
  
  test('pre-populates round1-challenge variables from game state', async () => {
    await renderWithProviders(<PromptViewer />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    // Open the select dropdown
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);
    
    // Select the Round 1 Challenge template
    const round1Option = screen.getByRole('option', { name: 'Round 1 Challenge' });
    await user.click(round1Option);
    
    // Check that the variables are pre-populated from game state
    const traitsInput = screen.getByLabelText('traits');
    expect(traitsInput).toHaveValue('Creativity: 8/10\nEmpathy: 7/10');
    
    const focusAreaInput = screen.getByLabelText('focusArea');
    expect(focusAreaInput).toHaveValue('Creative Thinking: Generating original ideas and solutions');
  });
  
  test('updates compiled prompt when variables change', async () => {
    await renderWithProviders(<PromptViewer />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    // Find the variable input for traits
    const traitsInput = screen.getByLabelText('traits');
    
    // Update the variable
    await user.clear(traitsInput);
    await user.type(traitsInput, 'Creativity, Critical Thinking, Adaptability');
    
    // Check that the compiled prompt includes the updated variable
    const compiledPrompt = screen.getByText(/Please generate a set of questions that will help evaluate the following human traits:/i);
    expect(compiledPrompt).toBeInTheDocument();
    expect(compiledPrompt).toHaveTextContent('Creativity, Critical Thinking, Adaptability');
  });
  
  test('simulates testing a prompt', async () => {
    await renderWithProviders(<PromptViewer />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    // Test the prompt
    const testButton = screen.getByRole('button', { name: 'Test Prompt' });
    await user.click(testButton);
    
    // Button should change to "Testing..." while test is in progress
    expect(screen.getByRole('button', { name: 'Testing...' })).toBeInTheDocument();
    
    // Advance timer to complete the simulated API call
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    
    // Check that test response is displayed
    await waitFor(() => {
      expect(screen.getByText('Test Response')).toBeInTheDocument();
      expect(screen.getByText(/This is a simulated response/)).toBeInTheDocument();
    }, { timeout: 6000 });
    
    // Button should return to original state
    expect(screen.getByRole('button', { name: 'Test Prompt' })).toBeInTheDocument();
  });
  
  test('pre-populates profile-generation template with all game data', async () => {
    await renderWithProviders(<PromptViewer />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    // Open the select dropdown
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);
    
    // Select the Profile Generation template
    const profileOption = screen.getByRole('option', { name: 'Profile Generation' });
    await user.click(profileOption);
    
    // Check all variables are pre-populated
    const variableIds = [
      'traits', 'focusArea', 
      'round1Challenge', 'round1Response', 
      'aiResponse', 'round2Analysis',
      'round3Challenge', 'round3Response'
    ];
    
    for (const varId of variableIds) {
      const input = screen.getByLabelText(varId);
      expect(input).toBeInTheDocument();
      expect(input).not.toHaveValue('');
    }
    
    // Verify specific values
    expect(screen.getByLabelText('round1Challenge')).toHaveValue(mockResponses.round1.challenge);
    expect(screen.getByLabelText('round3Response')).toHaveValue(mockResponses.round3.userResponse);
  });
  
  test('shows textarea for long variables and input for short ones', async () => {
    await renderWithProviders(<PromptViewer />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    // Open the select dropdown and choose a template with both long and short variables
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);
    
    const profileOption = screen.getByRole('option', { name: 'Profile Generation' });
    await user.click(profileOption);
    
    // Check that response variables use textareas (these should be multiline)
    const round1ResponseInput = screen.getByLabelText('round1Response');
    expect(round1ResponseInput.tagName.toLowerCase()).toBe('textarea');
    
    // Check that simple variables use regular inputs
    const focusAreaInput = screen.getByLabelText('focusArea');
    expect(focusAreaInput.tagName.toLowerCase()).toBe('input');
  });
});
