/**
 * Basic test script to verify the imports in our fixed files
 * 
 * This version uses relative imports for basic testing.
 */

// For fallbackChallenges.js
async function testFallbackChallenges() {
  console.log('\nTesting fallbackChallenges.js...');
  try {
    const fallbackChallengesModule = await import('../src/core/common/fallbackChallenges.js');
    console.log('✅ Successfully imported fallbackChallenges');
    console.log('Exports:', Object.keys(fallbackChallengesModule));
    
    // Try to use one of the exported functions
    const challenge = fallbackChallengesModule.getFallbackChallenge('critical thinking');
    console.log('Sample challenge title:', challenge.title);
    return true;
  } catch (error) {
    console.error('❌ Error importing fallbackChallenges:', error.message);
    return false;
  }
}

// Test the fixed files
async function runTests() {
  console.log('Testing fixed files with relative imports...');
  
  // Test fallbackChallenges.js
  const fallbackResult = await testFallbackChallenges();
  
  console.log('\nTest results:');
  console.log(`- fallbackChallenges.js: ${fallbackResult ? 'PASSED' : 'FAILED'}`);
}

runTests().catch(error => {
  console.error('Test runner error:', error);
}); 