/**
 * Global Test Setup for Mocha
 * 
 * This file is automatically loaded by Mocha when using --require ./tests/helpers/globalSetup.js
 * It sets up global test configuration and helpers.
 */

const chai = require('chai');
const fs = require('fs');
const path = require('path');

// Set up global test directories
const TEST_LOG_DIR = path.join(__dirname, '..', 'logs');

// Make sure the log directory exists
if (!fs.existsSync(TEST_LOG_DIR)) {
  fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
}

// Set up chai globally
global.expect = chai.expect;
global.assert = chai.assert;

// Set up test environment variables if not already set
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Set up a simple test logger
const testLogger = {
  log: function(message) {
    if (process.env.DEBUG) {
      console.log(message);
    }
  },
  error: function(message) {
    console.error(message);
  }
};

// Make the logger available globally
global.testLogger = testLogger;

// Export the logger for use in tests
module.exports = {
  testLogger
}; 