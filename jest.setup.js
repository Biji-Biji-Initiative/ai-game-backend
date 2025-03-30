// Jest setup file for ESM support and test environment configuration
import { jest } from '@jest/globals';
import chai from 'chai';

// Increase the default timeout for all tests
jest.setTimeout(30000);

// Add chai expect to global scope for easy use in tests
global.expect = chai.expect;

// Make Chai work better with Jest
chai.config.includeStack = true;

// Override some global functions to handle both Mocha and Jest conventions
global.beforeAll = global.beforeAll || global.before;
global.afterAll = global.afterAll || global.after;

// Log when setup is complete
console.log('Jest setup file loaded - Using Chai for assertions');
