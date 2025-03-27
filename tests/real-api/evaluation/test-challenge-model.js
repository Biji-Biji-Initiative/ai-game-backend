// Test file for Challenge domain model
const Challenge = require('./src/core/challenge/models/Challenge');
const { v4: uuidv4 } = require('uuid');

console.log('Testing Challenge domain model with improved error handling');

function testChallengeCreation() {
  console.log('\n--- Testing Challenge Creation ---');
  
  try {
    // Test valid creation
    const validData = {
      userEmail: 'test@example.com',
      title: 'Test Challenge',
      challengeTypeCode: 'critical-thinking',
      formatTypeCode: 'open-ended',
      focusArea: 'AI Ethics',
      difficulty: 'intermediate',
      content: { context: 'Test context', instructions: 'Test instructions' }
    };
    
    const challenge = new Challenge(validData);
    console.log('✅ Successfully created challenge:', challenge.title);
    console.log('Challenge type name:', challenge.getChallengeTypeName());
    console.log('Format type name:', challenge.getFormatTypeName());
    
    // Test custom type creation
    const customTypeData = {
      userEmail: 'test@example.com',
      title: 'Custom Challenge',
      challengeTypeCode: 'ai-ethical-paradox',
      formatTypeCode: 'scenario-analysis',
      focusArea: 'Human-AI Collaboration',
      difficulty: 'advanced',
      content: { context: 'Test context', instructions: 'Test instructions' },
      typeMetadata: {
        name: 'AI Ethical Paradox',
        description: 'Custom type for testing'
      }
    };
    
    const customChallenge = new Challenge(customTypeData);
    console.log('\n✅ Successfully created custom type challenge:', customChallenge.title);
    console.log('Custom challenge type name:', customChallenge.getChallengeTypeName());
    console.log('Custom format type name:', customChallenge.getFormatTypeName());
    
    // Test completely novel type (not in predefined list)
    const novelTypeData = {
      userEmail: 'test@example.com',
      title: 'Novel Challenge',
      challengeTypeCode: 'multimodal-interaction-design',
      formatTypeCode: 'interactive-prototype',
      focusArea: 'Human-AI Collaboration',
      difficulty: 'advanced',
      content: { context: 'Test context', instructions: 'Test instructions' }
    };
    
    const novelChallenge = new Challenge(novelTypeData);
    console.log('\n✅ Successfully created novel type challenge:', novelChallenge.title);
    console.log('Novel challenge type name:', novelChallenge.getChallengeTypeName());
    console.log('Novel format type name:', novelChallenge.getFormatTypeName());
    
    return true;
  } catch (error) {
    console.error('❌ Challenge creation test failed:', error.message);
    return false;
  }
}

function testChallengeValidation() {
  console.log('\n--- Testing Challenge Validation ---');
  
  try {
    // Missing required fields
    try {
      const invalidChallenge = new Challenge({});
      console.error('❌ Should have thrown error for missing fields');
      return false;
    } catch (error) {
      console.log('✅ Correctly caught missing fields error:', error.message);
    }
    
    // Valid data
    const validData = {
      userEmail: 'test@example.com',
      title: 'Test Challenge',
      challengeTypeCode: 'critical-thinking',
      formatTypeCode: 'open-ended',
      focusArea: 'AI Ethics',
      difficulty: 'intermediate',
      content: { context: 'Test context', instructions: 'Test instructions' }
    };
    
    const challenge = new Challenge(validData);
    
    // Test submission
    const responses = [
      { questionId: 'q1', answer: 'Test answer 1' },
      { questionId: 'q2', answer: 'Test answer 2' }
    ];
    
    challenge.submitResponses(responses);
    console.log('✅ Successfully submitted responses');
    console.log('Challenge status after submission:', challenge.status);
    
    // Test completion
    const evaluation = {
      overallScore: 85,
      feedback: 'Good job',
      strengths: ['Critical thinking', 'Clear explanation'],
      improvementSuggestions: ['More depth']
    };
    
    challenge.complete(evaluation);
    console.log('✅ Successfully completed challenge');
    console.log('Challenge status after completion:', challenge.status);
    
    return true;
  } catch (error) {
    console.error('❌ Challenge validation test failed:', error.message);
    return false;
  }
}

function testErrorHandling() {
  console.log('\n--- Testing Error Handling ---');
  
  try {
    // Valid data for setup
    const validData = {
      userEmail: 'test@example.com',
      title: 'Test Challenge',
      challengeTypeCode: 'critical-thinking',
      formatTypeCode: 'open-ended',
      focusArea: 'AI Ethics',
      difficulty: 'intermediate',
      content: { context: 'Test context', instructions: 'Test instructions' }
    };
    
    const challenge = new Challenge(validData);
    
    // Test empty responses array
    try {
      challenge.submitResponses([]);
      console.error('❌ Should have thrown error for empty responses array');
      return false;
    } catch (error) {
      console.log('✅ Correctly caught empty responses error:', error.message);
    }
    
    // Test invalid responses type
    try {
      challenge.submitResponses('not an array');
      console.error('❌ Should have thrown error for invalid responses type');
      return false;
    } catch (error) {
      console.log('✅ Correctly caught invalid responses type error:', error.message);
    }
    
    // Test completing challenge without submission
    try {
      const newChallenge = new Challenge(validData);
      newChallenge.complete({ overallScore: 85 });
      console.error('❌ Should have thrown error for completing unsubmitted challenge');
      return false;
    } catch (error) {
      console.log('✅ Correctly caught unsubmitted challenge error:', error.message);
    }
    
    // Test invalid evaluation data
    try {
      // Submit responses first
      challenge.submitResponses([{ questionId: 'q1', answer: 'Test answer' }]);
      
      // Try to complete with invalid evaluation
      challenge.complete(null);
      console.error('❌ Should have thrown error for invalid evaluation data');
      return false;
    } catch (error) {
      console.log('✅ Correctly caught invalid evaluation data error:', error.message);
    }
    
    // Test evaluation without score
    try {
      challenge.complete({ feedback: 'Good job but no score' });
      console.error('❌ Should have thrown error for evaluation without score');
      return false;
    } catch (error) {
      console.log('✅ Correctly caught evaluation without score error:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    return false;
  }
}

// Run all tests
const testResults = {
  creation: testChallengeCreation(),
  validation: testChallengeValidation(),
  errorHandling: testErrorHandling()
};

console.log('\n--- Test Results Summary ---');
for (const [test, result] of Object.entries(testResults)) {
  console.log(`${test}: ${result ? '✅ PASSED' : '❌ FAILED'}`);
}

const allPassed = Object.values(testResults).every(r => r === true);
console.log(`\nOverall result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`); 