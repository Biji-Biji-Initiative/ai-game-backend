/**
 * Global Test Setup
 * 
 * Configures the test environment and sets up any necessary global state.
 */

const testEnv = require('./setupTestEnv');
const { logger } = require('../../src/core/infra/logging/logger');

// Set test environment
process.env.NODE_ENV = 'test';

// Import test libraries
const chai = require('chai');
const sinon = require('sinon');

// Configure chai
const { expect } = chai;

// Initialize test environment
const env = testEnv.init();

// Configure logging level for tests
logger.level = process.env.TEST_LOG_LEVEL || 'error';

// Export common test utilities
module.exports = {
  expect,
  sinon,
  env,
  
  // Common mock creators
  createRepositoryMock: () => ({
    findById: sinon.stub(),
    findByUserId: sinon.stub(),
    findByEmail: sinon.stub(),
    findAll: sinon.stub(),
    create: sinon.stub(),
    update: sinon.stub(),
    delete: sinon.stub(),
    save: sinon.stub()
  }),
  
  createEventBusMock: () => ({
    publish: sinon.stub(),
    subscribe: sinon.stub()
  }),
  
  createLoggerMock: () => ({
    info: sinon.stub(),
    error: sinon.stub(),
    warn: sinon.stub(),
    debug: sinon.stub()
  }),
  
  createRequestMock: (user = { id: 'test-user-id', email: 'test@example.com' }) => ({
    user,
    params: {},
    body: {},
    query: {},
    headers: {},
    id: 'test-request-id'
  }),
  
  createResponseMock: () => {
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
      send: sinon.stub().returnsThis(),
      success: sinon.stub().returnsThis(),
      paginated: sinon.stub().returnsThis(),
      end: sinon.stub().returnsThis(),
      setHeader: sinon.stub().returnsThis()
    };
    return res;
  }
}; 