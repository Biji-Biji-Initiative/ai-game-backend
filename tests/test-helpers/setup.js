// Common test setup for unit and integration tests
import chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';

// Configure chai
chai.use(sinonChai);

// Export chai components
export const expect = chai.expect;

// Export a sandbox for each test
export function createSandbox() {
  return sinon.createSandbox();
}

// Test helper functions
export function mockResponse() {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  res.send = sinon.stub().returns(res);
  res.sendStatus = sinon.stub().returns(res);
  res.end = sinon.stub().returns(res);
  res.set = sinon.stub().returns(res);
  res.header = sinon.stub().returns(res);
  return res;
}

export function mockRequest(options = {}) {
  const req = {};
  req.body = options.body || {};
  req.params = options.params || {};
  req.query = options.query || {};
  req.headers = options.headers || {};
  req.session = options.session || {};
  req.user = options.user || null;
  req.method = options.method || 'GET';
  req.path = options.path || '/';
  req.id = options.id || 'test-request-id';
  return req;
}

// Standard timeout for async tests
export const testTimeout = 5000;

// Helper function to skip tests conditionally
export function skipIfMissingEnv(envVar) {
  if (!process.env[envVar]) {
    console.log(`Skipping test: Missing environment variable ${envVar}`);
    return true;
  }
  return false;
}

// Helper for async tests that might time out
export function runWithTimeout(asyncFn, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Test timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    asyncFn()
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}
