/**
 * Test script for the Evaluation Domain Model and Repository
 * 
 * This script tests the creation, retrieval, and update of evaluations
 * using the new DDD architecture.
 * 
 * Run with: node test-evaluation-model.js
 */

require('dotenv').config();
const Evaluation = require('./src/core/evaluation/models/Evaluation');
const evaluationRepository = require('./src/repositories/evaluationRepository');
const logger = require('./src/utils/logger');

// Get user and challenge IDs from database
const { supabaseClient: supabase } = require('./src/core/infra/db/supabaseClient');

/**
 *
 */
async function getTestIds() {
  try {
    // Get a user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (userError) {
      throw new Error(`Failed to get user: ${userError.message}`);
    }
    
    if (!userData || userData.length === 0) {
      throw new Error('No users found in database');
    }
    
    // Get a challenge ID
    const { data: challengeData, error: challengeError } = await supabase
      .from('challenges')
      .select('id')
      .limit(1);
    
    if (challengeError) {
      throw new Error(`Failed to get challenge: ${challengeError.message}`);
    }
    
    if (!challengeData || challengeData.length === 0) {
      throw new Error('No challenges found in database');
    }
    
    return {
      userId: userData[0].id,
      challengeId: challengeData[0].id
    };
  } catch (error) {
    console.error('Error getting test IDs', { error: error.message });
    throw error;
  }
}

/**
 *
 */
async function testEvaluationModel() {
  try {
    console.log('========== Testing Evaluation Domain Model ==========');
    
    // Get test IDs
    const { userId, challengeId } = await getTestIds();
    console.log(`Using user ID: ${userId}`);
    console.log(`Using challenge ID: ${challengeId}`);
    
    // Test 1: Create a new Evaluation domain model
    console.log('\n----- Test 1: Create Evaluation Domain Model -----');
    const evaluation = new Evaluation({
      userId,
      challengeId,
      score: 92,
      overallFeedback: 'This is a test evaluation created by the domain model test script.',
      strengths: ['Clear communication', 'Logical structure', 'Good examples'],
      areasForImprovement: ['Add more detail', 'Consider alternative viewpoints'],
      nextSteps: 'Practice using more technical terminology',
      metadata: {
        testSource: 'evaluation-model-test'
      }
    });
    
    console.log('Created domain model:');
    console.log(`- ID: ${evaluation.id}`);
    console.log(`- User ID: ${evaluation.userId}`);
    console.log(`- Challenge ID: ${evaluation.challengeId}`);
    console.log(`- Score: ${evaluation.score}`);
    console.log(`- Strengths: ${evaluation.strengths.length}`);
    console.log(`- Areas for improvement: ${evaluation.areasForImprovement.length}`);
    
    // Test 2: Save evaluation to database
    console.log('\n----- Test 2: Save Evaluation to Database -----');
    const savedEvaluation = await evaluationRepository.saveEvaluation(
      userId,
      challengeId,
      evaluation.toObject()
    );
    
    console.log('Saved evaluation to database:');
    console.log(`- DB ID: ${savedEvaluation.id}`);
    console.log(`- Created at: ${savedEvaluation.createdAt}`);
    
    // Test 3: Retrieve evaluation by ID
    console.log('\n----- Test 3: Retrieve Evaluation by ID -----');
    const retrievedEvaluation = await evaluationRepository.getEvaluationById(savedEvaluation.id);
    
    console.log('Retrieved evaluation:');
    console.log(`- ID: ${retrievedEvaluation.id}`);
    console.log(`- Score: ${retrievedEvaluation.score}`);
    console.log(`- Performance Level: ${retrievedEvaluation.getPerformanceLevel()}`);
    console.log(`- Normalized Score: ${retrievedEvaluation.getNormalizedScore()}`);
    
    // Test 4: Update evaluation
    console.log('\n----- Test 4: Update Evaluation -----');
    retrievedEvaluation.addStrength('Excellent critical thinking');
    retrievedEvaluation.addImprovementArea('Work on time management');
    
    const updatedEvaluation = await evaluationRepository.updateEvaluation(
      retrievedEvaluation.id,
      retrievedEvaluation.toObject()
    );
    
    console.log('Updated evaluation:');
    console.log(`- ID: ${updatedEvaluation.id}`);
    console.log(`- Strengths: ${updatedEvaluation.strengths.length}`);
    console.log(`- Areas for improvement: ${updatedEvaluation.areasForImprovement.length}`);
    console.log(`- Updated at: ${updatedEvaluation.updatedAt}`);
    
    // Test 5: Get evaluations for user
    console.log('\n----- Test 5: Get Evaluations for User -----');
    const userEvaluations = await evaluationRepository.getEvaluationsForUser(userId, { limit: 5 });
    
    console.log(`Retrieved ${userEvaluations.length} evaluations for user:`);
    userEvaluations.forEach((eval, index) => {
      console.log(`${index + 1}. ID: ${eval.id}, Score: ${eval.score}, Created: ${eval.createdAt}`);
    });
    
    console.log('\n========== All Tests Completed Successfully ==========');
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run the tests
testEvaluationModel()
  .then(success => {
    if (success) {
      console.log('Successfully tested Evaluation domain model and repository');
      process.exit(0);
    } else {
      console.error('Tests failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 