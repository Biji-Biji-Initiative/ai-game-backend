/**
 * Global Jest Setup
 * 
 * This file configures Jest for all test runs, ensuring consistent behavior
 * across all test suites. It provides centralized setup/teardown logic and
 * common test utilities to reduce duplication across test files.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set longer timeout for all tests
jest.setTimeout(15000);

// Silence console during tests to reduce noise
// Comment these out if you need to debug tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Only silence console in CI environments or when explicitly requested
if (process.env.CI === 'true' || process.env.SILENT_TESTS === 'true') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Restore console after tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Set default environment variables for all tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * Common test utilities
 * These can be imported in test files using: import { setupLogDir, mockLogger } from '../jest.setup.js';
 */

/**
 * Sets up the logs directory for testing
 * @returns {string} Path to the logs directory
 */
const setupLogDir = () => {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
};

/**
 * Creates a mock logger for testing
 * @returns {Object} Mock logger with spy methods
 */
const mockLogger = () => {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
};

/**
 * Creates a spy on the real logger
 * @param {Object} logger - The logger instance to spy on
 * @returns {Object} The original logger with spied methods
 */
const spyOnLogger = logger => {
  jest.spyOn(logger, 'info');
  jest.spyOn(logger, 'error');
  jest.spyOn(logger, 'warn');
  jest.spyOn(logger, 'debug');
  return logger;
};

/**
 * Helper to create temporary test files
 * @param {string} filePath - Path to create the file
 * @param {string} content - Content to write to the file
 */
const createTempFile = (filePath, content = '') => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
};

/**
 * Helper to clean up temporary test files
 * @param {string} filePath - Path to the file to remove
 */
const cleanupTempFile = filePath => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Export utilities for use in test files
export {
  setupLogDir,
  mockLogger,
  spyOnLogger,
  createTempFile,
  cleanupTempFile,
};
