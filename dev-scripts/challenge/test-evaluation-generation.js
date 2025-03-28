/**
 * Test script for the Evaluation Service
 * 
 * This script tests the dynamic generation of evaluations
 * using the OpenAI Responses API and our new DDD architecture.
 * 
 * Run with: node test-evaluation-generation.js
 */

require('dotenv').config();
const evaluationService = require('./src/core/evaluation/services/evaluationService');
const evaluationThreadService = require('./src/core/evaluation/services/evaluationThreadService');
const evaluationRepository = require('./src/repositories/evaluationRepository');
const logger = require('./src/utils/logger');

// Get user and challenge IDs from database
const supabase = require('./src/lib/supabase');

async function getTestData() {
  try {
    // Get a user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (userError) {
      throw new Error(`Failed to get user: ${userError.message}`);
    }
    
    if (!userData || userData.length === 0) {
      throw new Error('No users found in database');
    }
    
    // Get a challenge ID and content
    const { data: challengeData, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, content, challenge_type, format_type')
      .limit(1);
    
    if (challengeError) {
      throw new Error(`Failed to get challenge: ${challengeError.message}`);
    }
    
    if (!challengeData || challengeData.length === 0) {
      throw new Error('No challenges found in database');
    }
    
    return {
      user: userData[0],
      challenge: challengeData[0]
    };
  } catch (error) {
    console.error('Error getting test data', { error: error.message });
    throw error;
  }
}

async function testEvaluationGeneration() {
  try {
    console.log('========== Testing Evaluation Generation Service ==========');
    
    // Get test data
    const { user, challenge } = await getTestData();
    console.log(`Using user ID: ${user.id}`);
    console.log(`Using challenge: "${challenge.title}" (ID: ${challenge.id})`);
    
    // Test 1: Create an evaluation thread
    console.log('\n----- Test 1: Create Evaluation Thread -----');
    const threadMetadata = await evaluationThreadService.createEvaluationThread(user.id);
    
    console.log('Created evaluation thread:');
    console.log(`- Thread ID: ${threadMetadata.id}`);
    
    // Format challenge data for the evaluation service
    const formattedChallenge = {
      id: challenge.id,
      title: challenge.title,
      challengeType: challenge.challenge_type,
      formatType: challenge.format_type,
      content: challenge.content,
      userEmail: user.email
    };
    
    // Create a sample user response
    const userResponse = "I believe AI systems should be developed with strong ethical guidelines. First, transparency is crucial so users understand how AI makes decisions. Second, privacy must be respected, with data collection minimized and properly secured. Third, bias must be actively detected and mitigated. Finally, AI should ultimately enhance human autonomy rather than diminish it. Companies developing AI need robust governance frameworks and should involve diverse perspectives throughout the development process.";
    
    // Test 2: Generate an evaluation
    console.log('\n----- Test 2: Generate Dynamic Evaluation -----');
    console.log('Generating evaluation for user response...');
    console.log('User response excerpt:', userResponse.substring(0, 100) + '...');
    
    const evaluation = await evaluationService.evaluateResponse(
      formattedChallenge,
      userResponse,
      { threadId: threadMetadata.id }
    );
    
    console.log('Generated evaluation:');
    console.log(`- ID: ${evaluation.id}`);
    console.log(`- Score: ${evaluation.score}`);
    console.log(`- Performance Level: ${evaluation.getPerformanceLevel()}`);
    console.log(`- Overall Feedback: ${evaluation.overallFeedback.substring(0, 150)}...`);
    console.log('- Strengths:');
    evaluation.strengths.forEach((strength, index) => {
      console.log(`  ${index + 1}. ${strength}`);
    });
    console.log('- Areas for Improvement:');
    evaluation.areasForImprovement.forEach((area, index) => {
      console.log(`  ${index + 1}. ${area}`);
    });
    
    // Test 3: Save the evaluation to the database
    console.log('\n----- Test 3: Save Generated Evaluation -----');
    const savedEvaluation = await evaluationRepository.saveEvaluation(
      user.id,
      challenge.id,
      evaluation.toObject()
    );
    
    console.log('Saved evaluation to database:');
    console.log(`- DB ID: ${savedEvaluation.id}`);
    console.log(`- Created at: ${savedEvaluation.createdAt}`);
    
    // Test 4: Stream evaluation
    console.log('\n----- Test 4: Stream Evaluation (this will print in real-time) -----');
    console.log('Starting evaluation streaming...');
    
    let streamedContent = '';
    
    // Setup callbacks
    const callbacks = {
      onChunk: (chunk) => {
        process.stdout.write(chunk); // Print directly to see streaming effect
        streamedContent += chunk;
      },
      onComplete: (fullText) => {
        console.log('\n\nEvaluation streaming complete!');
        console.log(`Total streamed content length: ${streamedContent.length} characters`);
      },
      onError: (error) => {
        console.error('Streaming error:', error);
      }
    };
    
    // Stream the evaluation
    await evaluationService.streamEvaluation(
      formattedChallenge,
      userResponse,
      callbacks,
      { threadId: threadMetadata.id }
    );
    
    // Test 5: Process evaluation
    console.log('\n----- Test 5: Process Raw Evaluation Data -----');
    
    // Create some raw evaluation data (simulating data from another source)
    const rawEvaluationData = {
      userId: user.id,
      challengeId: challenge.id,
      score: 75,
      overallFeedback: 'This is raw evaluation feedback that needs processing',
      strengths: ['Good point one', 'Good point two'],
      areasForImprovement: ['Improvement area one']
    };
    
    const processedEvaluation = evaluationService.processEvaluation(rawEvaluationData);
    
    console.log('Processed evaluation:');
    console.log(`- ID: ${processedEvaluation.id}`);
    console.log(`- Performance Level: ${processedEvaluation.getPerformanceLevel()}`);
    console.log(`- Normalized Score: ${processedEvaluation.getNormalizedScore()}`);
    console.log(`- Metrics:`, processedEvaluation.metrics);
    
    console.log('\n========== All Tests Completed Successfully ==========');
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run the tests
testEvaluationGeneration()
  .then(success => {
    if (success) {
      console.log('Successfully tested Evaluation generation service');
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