// Import testing library matchers
import '@testing-library/jest-dom';

// This file manually imports and sets up the testing environment
// It's imported by test files to ensure all matchers are available

// Extend Expect matchers
// This helps TypeScript recognize testing-library matchers
declare global {
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface Expect {
      toBeInTheDocument(): any;
      toHaveTextContent(text: string | RegExp): any;
      toHaveValue(value: string | string[] | number | null): any;
      toBeDisabled(): any;
      toBeEnabled(): any;
      toBeChecked(): any;
      toHaveClass(className: string): any;
      toHaveAttribute(attr: string, value?: any): any;
      toBeVisible(): any;
      toBeFocused(): any;
      toContainElement(element: HTMLElement | null): any;
      toBeInvalid(): any;
      toBeValid(): any;
      toHaveBeenCalled(): any;
      toHaveBeenCalledWith(...args: any[]): any;
      toBe(expected: any): any;
    }
  }
}

// Setup fake timers globally
jest.useFakeTimers();

// Suppress common React act() warnings that pollute test output
const originalConsoleError = console.error;
console.error = (...args) => {
  // Skip act warnings
  if (
    /Warning.*not wrapped in act/.test(args[0]) ||
    /Warning.*You seem to have overlapping act/.test(args[0])
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver which is not available in JSDom
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Export to make TypeScript treat as a module
export {}; 