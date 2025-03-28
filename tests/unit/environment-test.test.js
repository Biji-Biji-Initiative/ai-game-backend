/**
 * Environment Test
 * 
 * This is a very simple test to verify that our test environment is working
 * and the new path structure is correctly set up.
 */

const { expect } = require('chai');
const testEnv = require('../loadEnv');
const { skipIfMissingEnv } = require('../helpers/testHelpers');

describe('Test Environment', function() {
  it('should load environment variables', function() {
    const config = testEnv.getTestConfig();
    expect(config).to.be.an('object');
    expect(config.openai).to.be.an('object');
    expect(config.supabase).to.be.an('object');
    expect(config.test).to.be.an('object');
  });
  
  it('should have testHelpers available', function() {
    expect(skipIfMissingEnv).to.be.a('function');
  });
}); 