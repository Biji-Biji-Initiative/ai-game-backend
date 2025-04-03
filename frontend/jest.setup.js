/**
 * Jest test setup file
 * This file configures Jest for our React & Next.js application tests
 */

// Import our TypeScript setup file
require('./src/tests/jest-setup');

// Import Testing Library matchers
require('@testing-library/jest-dom');

// Mock the matchMedia function for components that use it
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

// Suppress act() warnings in test output
const originalConsoleError = console.error;
console.error = (...args) => {
  if (/Warning.*not wrapped in act/.test(args[0]) ||
      /Warning.*You seem to have overlapping act/.test(args[0])) {
    return;
  }
  originalConsoleError(...args);
};

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => ({ get: jest.fn() })),
}));

// Set up fake timers
jest.useFakeTimers();
