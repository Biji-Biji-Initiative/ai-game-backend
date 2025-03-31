/**
 * Configuration Validation Test Script
 * 
 * A simple script to test the configuration validation functionality
 * without the complexities of test frameworks.
 */

import { validateConfig } from '../config/schemas/configSchema.js';
import config from '../config/config.js';

// Test invalid configurations
function testInvalidConfig() {
  console.log('Testing invalid configuration...');
  
  // Create an invalid configuration with various issues
  const invalidConfig = {
    ...config,
    server: {
      ...config.server,
      port: -1, // Invalid port
      environment: 'invalid-env', // Invalid environment
    },
    api: {
      ...config.api,
      prefix: 'no-leading-slash', // Missing leading slash
    }
  };
  
  try {
    validateConfig(invalidConfig);
    console.error('❌ Test failed: Invalid configuration was accepted');
    return false;
  } catch (error) {
    console.log('✅ Test passed: Invalid configuration was rejected');
    console.log('Validation error message:');
    console.log(error.message);
    return true;
  }
}

// Test valid configuration
function testValidConfig() {
  console.log('\nTesting valid configuration...');
  
  try {
    const validatedConfig = validateConfig(config);
    console.log('✅ Test passed: Valid configuration was accepted');
    return true;
  } catch (error) {
    console.error('❌ Test failed: Valid configuration was rejected');
    console.error('Error:', error.message);
    return false;
  }
}

// Run all tests
function runTests() {
  console.log('=== Configuration Validation Tests ===\n');
  
  const invalidTest = testInvalidConfig();
  const validTest = testValidConfig();
  
  console.log('\n=== Test Summary ===');
  console.log(`Invalid config test: ${invalidTest ? 'PASSED' : 'FAILED'}`);
  console.log(`Valid config test: ${validTest ? 'PASSED' : 'FAILED'}`);
  
  const allPassed = invalidTest && validTest;
  console.log(`\nOverall result: ${allPassed ? 'ALL TESTS PASSED' : 'TESTS FAILED'}`);
  
  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runTests(); 