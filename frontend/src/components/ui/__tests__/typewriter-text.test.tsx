import React from 'react';
import { render } from '@testing-library/react';
import { TypewriterText } from '../typewriter-text';
import '@testing-library/jest-dom';

// Mock the store module
jest.mock('@/store', () => ({
  useUserPreferencesStore: () => ({
    animationsEnabled: false // Always disable animations for tests
  })
}));

describe('TypewriterText', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <TypewriterText text="Hello World" />
    );
    expect(container).toBeInTheDocument();
  });
});
