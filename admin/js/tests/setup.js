/**
 * Jest test setup file
 */

// Mock localStorage and sessionStorage
class MockStorage {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  key(index) {
    return Object.keys(this.store)[index] || null;
  }

  get length() {
    return Object.keys(this.store).length;
  }
}

// Set up global mocks
global.localStorage = new MockStorage();
global.sessionStorage = new MockStorage();

// Console mocks to prevent test output noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Uncomment to display errors during tests
  // originalConsoleError(...args);
};

console.warn = (...args) => {
  // Uncomment to display warnings during tests
  // originalConsoleWarn(...args);
};

// Restore console methods after tests
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}); 