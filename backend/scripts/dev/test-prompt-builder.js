/**
 * Prompt Builder Facade Test
 * 
 * This script tests the prompt builder facade to ensure it correctly
 * delegates to the appropriate specialized builders based on type.
 */

require('dotenv').config();
const promptBuilder = require('../src/core/prompt/promptBuilder');
const { logger } = require('../src/utils/logger');

// Test data
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

const testUserResponse = `
I'll analyze the ethical implications of the AI system showing higher false positive rates for certain demographic groups...

First, let's consider the ethical implications:
1. Fairness and Equity: The disparity in false positive rates raises serious fairness concerns.
2. Non-maleficence: Higher false positives can lead to unnecessary interventions and harm.
3. Autonomy: Patient autonomy may be undermined without transparency.
4. Trust: Bias could damage trust in both the healthcare institution and AI systems.
5. Resource Allocation: Healthcare resources may be inequitably distributed.

Framework for Addressing the Bias:
1. Data Audit and Bias Detection
2. Technical Interventions
3. Governance Structure
4. Clinical Integration Guidelines
5. Transparency and Communication

Implementation would require ongoing assessment and continuous improvement.
`;

const testUser = {
  id: 'test-user-id',
  name: 'Test User',
  skillLevel: 'intermediate',
  focusAreas: ['AI Ethics', 'Critical Thinking'],
  learningGoals: ['Understand ethical frameworks in AI', 'Improve analysis skills']
};

const testHistory = {
  previousScores: {
    overall: 75,
    ethical_reasoning: 78,
    comprehensiveness: 72,
    clarity: 76
  },
  consistentStrengths: ['ethical_reasoning'],
  areasNeedingImprovement: ['comprehensiveness']
};

/**
 * Test the prompt builder's ability to build evaluation prompts
 */
async function testEvaluationPromptBuilder() {
  console.log('Testing Evaluation Prompt Builder...');
  
  try {
    // Get registered prompt types
    const promptTypes = promptBuilder.getRegisteredPromptTypes();
    console.log(`Available prompt types: ${promptTypes.join(', ')}`);
    
    // Build an evaluation prompt using the generic buildPrompt function
    console.log('\nBuilding evaluation prompt using generic buildPrompt...');
    
    const evaluationPrompt = await promptBuilder.buildPrompt('evaluation', {
      challenge: testChallenge,
      userResponse: testUserResponse,
      user: testUser,
      evaluationHistory: testHistory
    });
    
    console.log(`Generated prompt with ${evaluationPrompt.length} characters`);
    console.log(`Preview: ${evaluationPrompt.substring(0, 200)}...\n`);
    
    // Create a specialized builder for evaluations and use it
    console.log('Creating specialized evaluation prompt builder...');
    
    const buildEvaluationPrompt = promptBuilder.createBuilder('evaluation');
    
    const specializedPrompt = await buildEvaluationPrompt({
      challenge: testChallenge,
      userResponse: testUserResponse,
      user: testUser,
      evaluationHistory: testHistory
    });
    
    console.log(`Generated specialized prompt with ${specializedPrompt.length} characters`);
    
    // Verify the prompts are identical (the specialized builder should delegate to the same underlying builder)
    console.log(`\nVerifying specialized builder produces identical results: ${evaluationPrompt === specializedPrompt ? 'SUCCESS ✅' : 'FAILURE ❌'}`);
    
    return true;
  } catch (error) {
    console.error('Error testing evaluation prompt builder:', error);
    return false;
  }
}

/**
 * Test how the prompt builder handles invalid inputs
 */
async function testErrorHandling() {
  console.log('\nTesting Error Handling...');
  
  try {
    // Test with invalid type
    try {
      console.log('Testing with invalid prompt type...');
      await promptBuilder.buildPrompt('nonexistent', { test: 'data' });
      console.log('FAILURE ❌ - Should have thrown an error for invalid type');
      return false;
    } catch (error) {
      console.log(`SUCCESS ✅ - Correctly threw error for invalid type: "${error.message}"`);
    }
    
    // Test with missing required parameters
    try {
      console.log('Testing with missing required parameters...');
      await promptBuilder.buildPrompt('evaluation', {});
      console.log('FAILURE ❌ - Should have thrown an error for missing parameters');
      return false;
    } catch (error) {
      console.log(`SUCCESS ✅ - Correctly threw error for missing parameters: "${error.message}"`);
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error in error handling test:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== PROMPT BUILDER FACADE TEST ===\n');
  
  try {
    // Test each component
    const evaluationResult = await testEvaluationPromptBuilder();
    const errorHandlingResult = await testErrorHandling();
    
    // Report overall results
    console.log('\n=== TEST RESULTS ===');
    console.log(`Evaluation Prompt Builder: ${evaluationResult ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`Error Handling: ${errorHandlingResult ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`Overall: ${evaluationResult && errorHandlingResult ? 'PASS ✅' : 'FAIL ❌'}`);
    
    if (evaluationResult && errorHandlingResult) {
      console.log('\nPrompt Builder Facade is working correctly! ✨');
    } else {
      console.log('\nPrompt Builder Facade tests failed. Please check the logs above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
runTests(); 