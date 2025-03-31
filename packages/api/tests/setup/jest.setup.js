/**
 * Jest setup file
 */
import { v4 as uuidv4 } from 'uuid';
import { User } from '@src/domain/entities/User.js';
import { Email } from '@src/domain/valueObjects/Email.js';

// Set up global utilities for tests
global.testUtils = {
  generateId: () => uuidv4(),

  createValidEmail: () => new Email(`test-${uuidv4()}@example.com`),

  createUser: (overrides = {}) => {
    const defaults = {
      id: uuidv4(),
      email: new Email(`test-${uuidv4()}@example.com`),
      name: 'Test User',
      createdAt: new Date(),
      roles: ['user']
    };

    return new User(
      overrides.id ?? defaults.id,
      overrides.email ?? defaults.email,
      overrides.name ?? defaults.name,
      overrides.createdAt ?? defaults.createdAt,
      overrides.roles ?? defaults.roles
    );
  }
};

// Mock console methods to reduce noise during tests
global.console = {
  ...global.console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Keep error for test debugging
  // error: jest.fn(),
  warn: jest.fn()
};

// Auto-reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Global error handler to catch unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

// Extend Jest matchers
expect.extend({
  toBeValidUuid(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () => `expected ${received} to be a valid UUID`
    };
  }
});
