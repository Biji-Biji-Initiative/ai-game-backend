// Test file for challenge caching
require('dotenv').config();
const challengeGenerationService = require('./src/core/challenge/services/challengeGenerationService');
const challengeThreadService = require('./src/core/challenge/services/challengeThreadService');
const { logger } = require('./src/utils/logger');

console.log('Testing challenge caching with dynamic challenge types');

/**
 * Test challenge caching
 */
async function testChallengeCaching() {
  // Sample user data
  const userData = {
    email: 'test-user-' + Date.now() + '@example.com',
    fullName: 'Test User',
    professionalTitle: 'Software Engineer',
    dominantTraits: ['analyticalThinking', 'creativity'],
    focusAreas: ['AI Ethics', 'Human-AI Collaboration']
  };
  
  // Sample challenge params with custom type
  const challengeParams = {
    challengeTypeCode: 'ai-ethical-paradox',
    formatTypeCode: 'open-ended',
    focusArea: 'AI Ethics',
    difficulty: 'intermediate'
  };
  
  // Create a thread for testing
  console.log('Creating challenge thread...');
  const threadMetadata = await challengeThreadService.createChallengeThread(userData.email);
  
  if (!threadMetadata || !threadMetadata.id) {
    throw new Error('Failed to create thread for generation');
  }
  
  console.log(`Thread created with ID: ${threadMetadata.id}`);
  
  // First challenge generation (should call the API)
  console.log('\nFirst challenge generation (API call expected):');
  console.time('First generation');
  
  const firstChallenge = await challengeGenerationService.generateChallenge(
    userData,
    challengeParams,
    [],
    {
      threadId: threadMetadata.id,
      temperature: 0.7,
      allowDynamicTypes: true,
      forceRefresh: true // Force a fresh generation
    }
  );
  
  console.timeEnd('First generation');
  
  if (!firstChallenge) {
    throw new Error('Failed to generate first challenge');
  }
  
  console.log(`✅ First challenge generated: "${firstChallenge.title}"`);
  console.log(`Type: ${firstChallenge.getChallengeTypeName()}`);
  console.log(`Cache status: ${firstChallenge.fromCache ? 'From cache' : 'Fresh generation'}`);
  
  // Second challenge generation with same parameters (should use cache)
  console.log('\nSecond challenge generation (cache expected):');
  console.time('Second generation');
  
  const secondChallenge = await challengeGenerationService.generateChallenge(
    userData,
    challengeParams,
    [],
    {
      threadId: threadMetadata.id,
      temperature: 0.7,
      allowDynamicTypes: true,
      forceRefresh: false // Allow cache usage
    }
  );
  
  console.timeEnd('Second generation');
  
  if (!secondChallenge) {
    throw new Error('Failed to retrieve second challenge');
  }
  
  console.log(`✅ Second challenge retrieved: "${secondChallenge.title}"`);
  console.log(`Type: ${secondChallenge.getChallengeTypeName()}`);
  console.log(`Cache status: ${secondChallenge.fromCache ? 'From cache' : 'Fresh generation'}`);
  
  // Verify it's the same challenge
  if (firstChallenge.id !== secondChallenge.id) {
    throw new Error('Cache not working correctly - different challenge returned');
  }
  
  console.log('✅ Cache working correctly - same challenge returned');
  
  // Clear cache and try again (should generate a new challenge)
  console.log('\nClearing cache and generating again:');
  challengeGenerationService.clearCache(userData.email);
  console.log('Cache cleared');
  
  console.time('Third generation');
  
  const thirdChallenge = await challengeGenerationService.generateChallenge(
    userData,
    challengeParams,
    [],
    {
      threadId: threadMetadata.id,
      temperature: 0.7,
      allowDynamicTypes: true,
      forceRefresh: false // Allow cache but it's cleared
    }
  );
  
  console.timeEnd('Third generation');
  
  if (!thirdChallenge) {
    throw new Error('Failed to generate third challenge');
  }
  
  console.log(`✅ Third challenge generated: "${thirdChallenge.title}"`);
  console.log(`Type: ${thirdChallenge.getChallengeTypeName()}`);
  console.log(`Cache status: ${thirdChallenge.fromCache ? 'From cache' : 'Fresh generation'}`);
  
  // Verify it's a different challenge
  if (firstChallenge.id === thirdChallenge.id) {
    throw new Error('Cache clearing not working correctly - same challenge returned');
  }
  
  console.log('✅ Cache clearing working correctly - new challenge returned');
  
  return 'Challenge caching tests completed successfully';
}

// Run the test
testChallengeCaching()
  .then(result => {
    console.log(result);
    process.exit(0);
  })
  .catch(error => {
    console.error('ERROR:', error.message);
    process.exit(1);
  }); 