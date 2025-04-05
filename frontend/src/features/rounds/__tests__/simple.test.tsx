/**
 * Simple test file to demonstrate Vitest v3 working
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple component to test
function SimpleComponent({ text = 'Hello World' }) {
  return <div>{text}</div>;
}

describe('Simple Component', () => {
  it('renders text correctly', () => {
    render(<SimpleComponent text="Test Text" />);
    expect(screen.getByText('Test Text')).toBeInTheDocument();
  });
}); 