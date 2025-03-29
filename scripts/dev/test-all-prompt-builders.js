/**
 * Comprehensive Prompt Builder Facade Test
 * 
 * This script tests all registered prompt builders to ensure 
 * they are correctly integrated with the prompt builder facade.
 */

require('dotenv').config();
const promptBuilder = require('../src/core/prompt/promptBuilder');
const { PROMPT_TYPES } = require('../src/core/prompt/promptTypes');
const { logger } = require('../src/utils/logger');

// Test data
const testUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  skillLevel: 'intermediate',
  focusAreas: ['AI Ethics', 'Critical Thinking'],
  learningGoals: ['Understand ethical frameworks in AI', 'Improve analysis skills']
};

const testChallenge = {
  id: 'test-challenge-id',
  title: 'AI Ethics Scenario Analysis',
  challengeType: 'analysis',
  focusArea: 'AI Ethics',
  content: {
    context: 'A healthcare company is developing an AI system to predict patient readmission.',
    scenario: 'The AI system consistently shows higher false positive rates for certain demographic groups.',
    instructions: 'Analyze the ethical implications of this scenario and propose a framework for addressing the bias.'
  }
};

// Test parameters by builder type
const testParams = {
  evaluation: {
    challenge: testChallenge,
    userResponse: 'This is a test response to the challenge.',
    user: testUser,
    evaluationHistory: {
      previousScores: { overall: 75 }
    }
  },
  challenge: {
    user: testUser,
    challengeParams: {
      focusArea: 'AI Ethics',
      difficultyLevel: 'intermediate'
    }
  },
  focusArea: {
    user: testUser,
    preferences: {
      interests: ['Technology Ethics', 'Critical Thinking'],
      learningGoals: ['Master ethical reasoning']
    }
  },
  personality: {
    user: testUser,
    assessmentData: {
      responses: ['Sample response 1', 'Sample response 2'],
      completedChallenges: 5
    }
  },
  progress: {
    user: testUser,
    evaluationHistory: {
      previousScores: [70, 75, 80],
      completedChallenges: 10
    }
  }
};

/**
 * Test a specific prompt builder
 * @param {string} type - Prompt type to test
 * @returns {Promise<boolean>} Success status
 */
async function testPromptBuilder(type) {
  console.log(`\nTesting ${type} Prompt Builder...`);
  
  try {
    // Get appropriate parameters for this builder type
    const params = testParams[type] || testParams.evaluation;
    
    // Attempt to build a prompt using the generic buildPrompt function
    const prompt = await promptBuilder.buildPrompt(type, params);
    
    if (!prompt) {
      console.log(`FAILURE ❌ - ${type} builder returned empty prompt`);
      return false;
    }
    
    console.log(`SUCCESS ✅ - Generated ${prompt.length} character prompt with ${type} builder`);
    console.log(`Preview: ${prompt.substring(0, 150)}...\n`);
    
    // Also test the specialized builder
    try {
      const specializedBuilder = promptBuilder.createBuilder(type);
      const specializedPrompt = await specializedBuilder(params);
      
      if (specializedPrompt === prompt) {
        console.log(`SUCCESS ✅ - Specialized ${type} builder matches generic builder result`);
      } else {
        console.log(`WARNING ⚠️ - Specialized ${type} builder produced different result`);
      }
    } catch (specializedError) {
      console.log(`WARNING ⚠️ - Specialized ${type} builder failed: ${specializedError.message}`);
    }
    
    return true;
  } catch (error) {
    console.log(`FAILURE ❌ - ${type} builder error: ${error.message}`);
    return false;
  }
}

/**
 * Test all registered prompt builders
 */
async function testAllPromptBuilders() {
  console.log('=== COMPREHENSIVE PROMPT BUILDER TEST ===\n');
  
  try {
    // Get all registered prompt types
    const registeredTypes = promptBuilder.getRegisteredPromptTypes();
    console.log(`Registered prompt types (${registeredTypes.length}):`);
    console.log(registeredTypes.join(', '));
    
    // Verify all types from PROMPT_TYPES are registered
    const allPromptTypes = Object.values(PROMPT_TYPES);
    const missingTypes = allPromptTypes.filter(type => 
      !registeredTypes.includes(type.toLowerCase())
    );
    
    if (missingTypes.length > 0) {
      console.log(`\nWARNING ⚠️ - Some prompt types are not registered:`);
      console.log(missingTypes.join(', '));
    }
    
    // Test the core builders
    const coreBuilders = ['evaluation', 'challenge', 'focusArea', 'personality', 'progress'];
    const results = {};
    
    for (const type of coreBuilders) {
      results[type] = await testPromptBuilder(type);
    }
    
    // Report results
    console.log('\n=== TEST RESULTS ===');
    let failCount = 0;
    
    for (const [type, success] of Object.entries(results)) {
      console.log(`${type} Builder: ${success ? 'PASS ✅' : 'FAIL ❌'}`);
      if (!success) {failCount++;}
    }
    
    if (failCount === 0) {
      console.log('\nAll prompt builders are working correctly! ✨');
    } else {
      console.log(`\n${failCount} prompt builder(s) failed. Please check the logs above.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected error in test suite:', error);
    process.exit(1);
  }
}

// Run the tests
testAllPromptBuilders(); 