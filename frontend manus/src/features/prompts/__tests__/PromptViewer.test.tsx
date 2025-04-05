/**
 * PromptViewer component tests
 */
import '@testing-library/jest-dom';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/test-utils';
import PromptViewer from '../PromptViewer';
import type { Trait, FocusArea } from '@/store/useGameStore';
import { useGameStore } from '@/store/useGameStore';
import { createMockGameStore } from '@/tests/storeMocks';
import { jest, expect } from '@jest/globals';
import React from 'react';

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

// Mock router functions
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockForward = jest.fn();
const mockRefresh = jest.fn();
const mockPrefetch = jest.fn();
const mockUsePathname = jest.fn(() => '/prompts');
const mockUseSearchParams = jest.fn(() => new URLSearchParams());

// Mock the Next.js router for App Router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    forward: mockForward,
    refresh: mockRefresh,
    prefetch: mockPrefetch
  })),
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}));

// Mock clipboard API properly
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: jest.fn(() => Promise.resolve()),
  },
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
  
  let mockGameStoreInstance: ReturnType<typeof createMockGameStore>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset pathname mock
    mockUsePathname.mockReturnValue('/prompts');
    
    // Mock the game store with full game data
    mockGameStoreInstance = createMockGameStore({
      personality: {
        traits: mockTraits,
        attitudes: []
      },
      focus: mockFocus,
      responses: mockResponses
    });
    
    // Properly type the mock implementation with correct casting
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
    // For testing TypeScript errors with DOM matchers, we'll keep the @ts-expect-error
    // comments for now. Once we're sure the setup is working, we can remove them.
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(screen.getByText('Trait Assessment Generation')).toBeInTheDocument();
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(screen.getByText('Generates questions for assessing human traits')).toBeInTheDocument();
    
    // Check that the compiled prompt includes the template content
    const compiledPrompt = screen.getByText(/You are an AI assistant helping to assess human characteristics/i);
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(compiledPrompt).toBeInTheDocument();
  });
  
  test('uses the user traits and focus area from the game store', async () => {
    await renderWithProviders(<PromptViewer />);
    
    // Check that the prompt includes trait information
    const promptText = screen.getByTestId('compiled-prompt').textContent;
    expect(promptText).toContain('Creativity: 8');
    expect(promptText).toContain('Empathy: 7');
    
    // Check that input fields show game store data
    const focusAreaInput = screen.getByLabelText('Focus Area:');
    expect(focusAreaInput.tagName.toLowerCase()).toBe('input');
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(focusAreaInput).toHaveValue('Creative Thinking');
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
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(screen.getByText('Recommends focus areas based on trait assessment')).toBeInTheDocument();
    
    // Check that variables are updated for the new template
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(screen.getByLabelText('traitScores')).toBeInTheDocument();
    
    // Check that traitScores variable is pre-populated from game state
    const traitScoresInput = screen.getByLabelText('traitScores');
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
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
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(traitsInput).toHaveValue('Creativity: 8/10\nEmpathy: 7/10');
    
    const focusAreaInput = screen.getByLabelText('focusArea');
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
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
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(compiledPrompt).toBeInTheDocument();
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(compiledPrompt).toHaveTextContent('Creativity, Critical Thinking, Adaptability');
  });
  
  test('simulates testing a prompt', async () => {
    await renderWithProviders(<PromptViewer />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    // Test the prompt
    const testButton = screen.getByRole('button', { name: 'Test Prompt' });
    await user.click(testButton);
    
    // Button should change to "Testing..." while test is in progress
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(screen.getByRole('button', { name: 'Testing...' })).toBeInTheDocument();
    
    // Advance timer to complete the simulated API call
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    
    // Check that test response is displayed
    await waitFor(() => {
      // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
      expect(screen.getByText('Test Response')).toBeInTheDocument();
      // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
      expect(screen.getByText(/This is a simulated response/)).toBeInTheDocument();
    }, { timeout: 6000 });
    
    // Button should return to original state
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
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
      // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
      expect(input).toBeInTheDocument();
      // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
      expect(input).not.toHaveValue('');
    }
    
    // Verify specific values
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(screen.getByLabelText('round1Challenge')).toHaveValue(mockResponses.round1.challenge);
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
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

  test('allows changing the prompt template', async () => {
    const user = userEvent.setup({ delay: null });
    await renderWithProviders(<PromptViewer />);
    
    // Template selector should have a value
    const templateSelector = screen.getByLabelText('Select Template:');
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(templateSelector).toHaveValue('trait-assessment');
    
    // Change the selected template
    await user.selectOptions(templateSelector, 'focus-area-discovery');
    
    // Check that the template changed
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(templateSelector).toHaveValue('focus-area-discovery');
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(screen.getByLabelText('Select Template:')).toHaveValue('focus-area-discovery');
  });
  
  test('allows copying the compiled prompt to clipboard', async () => {
    const user = userEvent.setup({ delay: null });
    await renderWithProviders(<PromptViewer />);
    
    // Find and click the copy button
    await user.click(screen.getByRole('button', { name: /copy/i }));
    
    // Verify clipboard was called
    await waitFor(() => {
      // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
      expect(screen.getByText('Copied to clipboard!')).toBeInTheDocument();
      // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
      expect(screen.getByRole('status')).toHaveTextContent('Copied to clipboard!');
    });
    
    // Verify the notification disappears
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    await waitFor(() => {
      // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
      expect(screen.queryByText('Copied to clipboard!')).not.toBeInTheDocument();
    });
  });
  
  test('allows exporting the compiled prompt', async () => {
    const user = userEvent.setup({ delay: null });
    await renderWithProviders(<PromptViewer />);
    
    // Find and click the export button
    await user.click(screen.getByRole('button', { name: /export/i }));
    
    // Verify user is redirected to the editor
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/editor');
    });
  });
  
  test('allows entering custom focus area input', async () => {
    const user = userEvent.setup({ delay: null });
    await renderWithProviders(<PromptViewer />);
    
    // Find the focus area input
    const focusAreaInput = screen.getByLabelText('Focus Area:');
    
    // Clear it and type a new value
    await user.clear(focusAreaInput);
    await user.type(focusAreaInput, 'Custom Focus Area');
    
    // Check that the focus area was updated
    // @ts-expect-error - Jest DOM matchers not recognized by TypeScript
    expect(focusAreaInput).toHaveValue('Custom Focus Area');
    
    // Verify the prompt text updates with the new focus area
    const promptText = screen.getByTestId('compiled-prompt').textContent;
    expect(promptText).toContain('Custom Focus Area');
  });
});
