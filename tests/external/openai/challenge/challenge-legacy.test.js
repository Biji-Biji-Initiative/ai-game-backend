/**
 * Challenge Module Tests
 * 
 * This file contains tests for the Challenge module, including:
 * - Domain model validation
 * - Thread service functionality
 * - Generation service with OpenAI Responses API
 * - Evaluation service for user responses
 */

// Load environment variables
require('dotenv').config();

// Core modules
const Challenge = require('../../src/core/challenge/models/Challenge');
const challengeThreadService = require('../../src/core/challenge/services/challengeThreadService');
const challengeGenerationService = require('../../src/core/challenge/services/challengeGenerationService');
const challengeEvaluationService = require('../../src/core/challenge/services/challengeEvaluationService');

// Test helpers
const logger = require('../../src/utils/logger');

// Test user data
const testUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  fullName: 'Test User',
  professionalTitle: 'Software Engineer',
  dominantTraits: ['analyticalThinking', 'creativity'],
  focusAreas: ['AI Ethics', 'Human-AI Collaboration']
};

// Test challenge parameters
const testChallengeParams = {
  challengeTypeCode: 'critical-thinking',
  formatTypeCode: 'open-ended',
  focusArea: 'AI Ethics',
  difficulty: 'intermediate',
  difficultySettings: {
    complexity: 0.6,
    depth: 0.6
  }
};

/**
 * Test the Challenge domain model
 */
async function testChallengeDomainModel() {
  console.log('\n----- Testing Challenge Domain Model -----\n');
  
  try {
    // Test Challenge creation
    const challenge = new Challenge({
      userEmail: testUser.email,
      title: 'Test Challenge',
      challengeTypeCode: 'critical-thinking',
      formatTypeCode: 'open-ended',
      focusArea: 'AI Ethics',
      difficulty: 'intermediate',
      content: { context: 'Test content', instructions: 'Test instructions' }
    });
    
    console.log('✅ Challenge created successfully');
    
    // Test Challenge validation
    if (challenge.isValid()) {
      console.log('✅ Challenge is valid');
    } else {
      console.log('❌ Challenge is not valid');
    }
    
    // Test Challenge lifecycle methods
    const responses = [{ questionId: 'q1', answer: 'Test answer' }];
    challenge.submitResponses(responses);
    
    if (challenge.isSubmitted()) {
      console.log('✅ Challenge marked as submitted');
    } else {
      console.log('❌ Challenge not marked as submitted');
    }
    
    const evaluation = { score: 85, feedback: 'Good job!' };
    challenge.complete(evaluation);
    
    if (challenge.isCompleted()) {
      console.log('✅ Challenge marked as completed');
    } else {
      console.log('❌ Challenge not marked as completed');
    }
    
    // Test Challenge serialization
    const serialized = challenge.toObject();
    console.log('✅ Challenge serialized to object:', Object.keys(serialized).join(', '));
    
    return true;
  } catch (error) {
    console.error('❌ Error testing Challenge domain model:', error.message);
    return false;
  }
}

/**
 * Test the Challenge Thread Service
 */
async function testChallengeThreadService() {
  console.log('\n----- Testing Challenge Thread Service -----\n');
  
  try {
    // Test thread creation
    const threadMetadata = await challengeThreadService.createChallengeThread(testUser.email);
    
    if (threadMetadata && threadMetadata.id) {
      console.log(`✅ Thread created with ID: ${threadMetadata.id}`);
    } else {
      console.log('❌ Failed to create thread');
      return false;
    }
    
    // Test evaluation thread creation
    const challengeId = 'test-challenge-1';
    const evalThreadMetadata = await challengeThreadService.createEvaluationThread(testUser.email, challengeId);
    
    if (evalThreadMetadata && evalThreadMetadata.id) {
      console.log(`✅ Evaluation thread created with ID: ${evalThreadMetadata.id}`);
    } else {
      console.log('❌ Failed to create evaluation thread');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing Challenge Thread Service:', error.message);
    return false;
  }
}

/**
 * Test the Challenge Generation Service
 */
async function testChallengeGenerationService() {
  console.log('\n----- Testing Challenge Generation Service -----\n');
  
  try {
    // Create a thread for testing
    const threadMetadata = await challengeThreadService.createChallengeThread(testUser.email);
    
    if (!threadMetadata || !threadMetadata.id) {
      console.log('❌ Failed to create thread for generation');
      return false;
    }
    
    console.log('✅ Thread created for challenge generation');
    
    // Generate a challenge
    const options = {
      threadId: threadMetadata.id,
      temperature: 0.7,
      forceRefresh: true
    };
    
    console.log('Generating challenge... (this may take a few seconds)');
    
    const challenge = await challengeGenerationService.generateChallenge(
      testUser,
      testChallengeParams,
      [],
      options
    );
    
    if (challenge && challenge.isValid()) {
      console.log(`✅ Challenge generated with title: "${challenge.title}"`);
      console.log(`   Type: ${challenge.challengeType}, Format: ${challenge.formatType}`);
      console.log(`   Questions: ${challenge.questions.length}`);
    } else {
      console.log('❌ Failed to generate valid challenge');
      return false;
    }
    
    // Test caching
    console.log('Testing challenge caching...');
    challengeGenerationService.clearCache(testUser.email);
    console.log('✅ Cache cleared successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing Challenge Generation Service:', error.message);
    return false;
  }
}

/**
 * Test the Challenge Evaluation Service
 */
async function testChallengeEvaluationService() {
  console.log('\n----- Testing Challenge Evaluation Service -----\n');
  
  try {
    // Create a challenge for testing
    const challenge = new Challenge({
      id: 'test-challenge-eval-1',
      userEmail: testUser.email,
      title: 'Test Ethics Challenge',
      challengeTypeCode: 'ethical-dilemma',
      formatTypeCode: 'open-ended',
      focusArea: 'AI Ethics',
      difficulty: 'intermediate',
      content: {
        context: 'AI system deployed in healthcare',
        scenario: 'An AI system incorrectly diagnoses a patient. What ethical considerations arise?',
        instructions: 'Analyze the ethical implications and suggest guidelines.'
      },
      questions: [
        {
          id: 'q1',
          text: 'What are the primary ethical concerns in this scenario?',
          type: 'open-ended'
        },
        {
          id: 'q2',
          text: 'How would you balance patient safety with technological innovation?',
          type: 'open-ended'
        }
      ]
    });
    
    // Create mock responses
    const responses = [
      {
        questionId: 'q1',
        answer: 'The primary ethical concerns include patient safety, responsibility for errors, transparency in AI decision-making, and potential biases in the AI system that may have led to misdiagnosis. There\'s also the issue of informed consent - whether patients were fully aware an AI system was involved in their diagnosis.'
      },
      {
        questionId: 'q2',
        answer: 'Balancing patient safety with innovation requires a robust validation framework where AI systems are thoroughly tested before deployment and continuously monitored after. Safety should never be compromised, but innovation shouldn\'t be stifled either. This means implementing strong oversight, creating clear accountability structures, ensuring human doctors review AI recommendations, and establishing processes for addressing errors when they occur.'
      }
    ];
    
    // Create thread for evaluation
    const threadMetadata = await challengeThreadService.createEvaluationThread(
      testUser.email,
      challenge.id
    );
    
    if (!threadMetadata || !threadMetadata.id) {
      console.log('❌ Failed to create thread for evaluation');
      return false;
    }
    
    console.log('✅ Thread created for challenge evaluation');
    
    // Evaluate responses
    const options = {
      threadId: threadMetadata.id,
      temperature: 0.4
    };
    
    console.log('Evaluating challenge responses... (this may take a few seconds)');
    
    const evaluation = await challengeEvaluationService.evaluateResponses(
      challenge,
      responses,
      options
    );
    
    if (evaluation) {
      console.log(`✅ Evaluation completed with score: ${evaluation.overallScore || evaluation.score}`);
      console.log(`   Feedback: ${evaluation.feedback.substring(0, 100)}...`);
      
      if (evaluation.strengths && evaluation.strengths.length > 0) {
        console.log(`   Strengths identified: ${evaluation.strengths.length}`);
      }
      
      if (evaluation.improvementSuggestions && evaluation.improvementSuggestions.length > 0) {
        console.log(`   Improvement suggestions: ${evaluation.improvementSuggestions.length}`);
      }
    } else {
      console.log('❌ Failed to evaluate responses');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing Challenge Evaluation Service:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n===== CHALLENGE MODULE TESTS =====\n');
  
  try {
    // Test each component
    const modelResult = await testChallengeDomainModel();
    const threadResult = await testChallengeThreadService();
    const generationResult = await testChallengeGenerationService();
    const evaluationResult = await testChallengeEvaluationService();
    
    // Print summary
    console.log('\n===== TEST SUMMARY =====\n');
    console.log(`Domain Model Tests: ${modelResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Thread Service Tests: ${threadResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Generation Service Tests: ${generationResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Evaluation Service Tests: ${evaluationResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    const overallResult = modelResult && threadResult && generationResult && evaluationResult;
    console.log(`\nOverall Tests: ${overallResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    return overallResult;
  } catch (error) {
    console.error('Error running tests:', error);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
    .then(result => {
      process.exit(result ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error in tests:', error);
      process.exit(1);
    });
}

module.exports = { runTests }; 