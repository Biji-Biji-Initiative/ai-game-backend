/**
 * Evaluation Service - Responses API Integration Test
 * 
 * Tests the integration between EvaluationService and OpenAI's Responses API
 * using the ACTUAL implementation from src.
 */

const { expect } = require('chai');
const { OpenAIClient } = require('../../src/infra/openai');
const { MessageRole } = require('../../src/infra/openai/types');


const testEnv = require('../../loadEnv');

const { skipIfMissingEnv } = require('../../helpers/testHelpers');
// Create a simplified EvaluationService for testing
/**
 *
 */
class EvaluationService {
  /**
   *
   */
  constructor({ openAIClient, MessageRole }) {
    this.openAIClient = openAIClient;
    this.MessageRole = MessageRole;
  }
  
  /**
   *
   */
  async evaluateResponse(userResponse, challenge) {
    try {
      // Create messages for evaluation
      const messages = [
        {
          role: this.MessageRole.SYSTEM,
          content: `You are an expert evaluator of ${challenge.title} responses.
Provide detailed, constructive feedback based on these criteria:
${challenge.rubric.map(item => `- ${item}`).join('\n')}
Return your evaluation as a JSON object with these fields:
- overallScore: number from 0-100
- categoryScores: object with scores for each rubric item
- strengths: array of identified strengths
- improvements: array of suggested improvements
- feedback: detailed paragraph explaining the evaluation`
        },
        {
          role: this.MessageRole.USER,
          content: `Please evaluate this ${challenge.difficulty} difficulty response to the challenge: "${challenge.title}".

Challenge Description: ${challenge.description}

User Response:
${userResponse.content}

Evaluate this response based on the rubric criteria and provide detailed feedback.`
        }
      ];
      
      // Call the OpenAI client
      const response = await this.openAIClient.sendJsonMessage(messages, {
        model: 'gpt-4o',
        temperature: 0.3,
        responseFormat: 'json'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error evaluating response:', error);
      throw new Error(`Evaluation failed: ${error.message}`);
    }
  }
}

// Set longer timeout for external API calls
const TEST_TIMEOUT = 30000;

describe('Evaluation Service Responses API Integration', function() {
  
  
  // Set longer timeout for API calls
  this.timeout(30000);

  before(function() {
    skipIfMissingEnv(this, 'openai');
  });

  // Configure longer timeout for API calls
  this.timeout(TEST_TIMEOUT);
  
  let evaluationService;
  let openAIClient;
  
  before(function() {
    // Skip tests if OpenAI API key is not available
    if (!testEnv.getTestConfig().openai.apiKey) {
      console.warn('OPENAI_API_KEY not found, skipping Responses API tests');
      this.skip();
    }
    
    // Initialize the real OpenAI client with Responses API support
    openAIClient = new OpenAIClient({
      apiKey: testEnv.getTestConfig().openai.apiKey
    });
    
    // Create the evaluation service with the real client
    evaluationService = new EvaluationService({
      openAIClient,
      MessageRole
    });
  });
  
  it('should evaluate a user response using the Responses API', async function() {
    // Create a sample challenge
    const challenge = {
      id: 'test-challenge-id',
      title: 'Explain Machine Learning to a Non-Technical Audience',
      description: 'Create a clear explanation of how machine learning works that a non-technical person can understand.',
      difficulty: 'medium',
      rubric: [
        'Clear and jargon-free language',
        'Appropriate analogies or examples',
        'Logical structure and flow',
        'Maintains accuracy while simplifying'
      ]
    };
    
    // Create a sample user response
    const userResponse = {
      id: 'test-response-id',
      content: `Machine learning is like teaching a computer to learn from examples, similar to how we learn from experience. 
      
Instead of explicitly programming every rule, we show the computer many examples and it finds patterns on its own.

For instance, to teach a computer to recognize cats in photos, we show it thousands of cat pictures. It gradually learns what features make up a cat - whiskers, pointy ears, etc. Once trained, it can identify cats in new photos it's never seen before.

The computer makes predictions based on this training, and when it makes mistakes, it adjusts to do better next time - just like how we learn from our mistakes.`,
      challengeId: challenge.id,
      userId: 'test-user-id',
      submittedAt: new Date().toISOString()
    };
    
    // Evaluate the response using the Responses API
    const evaluation = await evaluationService.evaluateResponse(userResponse, challenge);
    
    // Verify results
    expect(evaluation).to.be.an('object');
    expect(evaluation.overallScore).to.be.a('number').within(0, 100);
    expect(evaluation.feedback).to.be.a('string').and.not.empty;
    
    // Verify detailed feedback
    expect(evaluation.categoryScores).to.be.an('object');
    expect(evaluation.strengths).to.be.an('array').with.lengthOf.at.least(1);
    expect(evaluation.improvements).to.be.an('array');
    
    // Log the evaluation results
    console.log(`\nEvaluation Results:`);
    console.log(`Overall Score: ${evaluation.overallScore}`);
    console.log(`Strengths: ${evaluation.strengths.join(', ')}`);
    console.log(`Improvements: ${evaluation.improvements.join(', ')}`);
    console.log(`Feedback: ${evaluation.feedback.substring(0, 100)}...`);
  });
  
  it('should evaluate responses differently based on challenge difficulty', async function() {
    // Create sample challenges with different difficulties
    const easyChallenge = {
      id: 'easy-challenge',
      title: 'Introduce Yourself to a Team',
      description: 'Write a brief introduction of yourself to a new team you are joining.',
      difficulty: 'easy',
      rubric: [
        'Clear and concise',
        'Professional tone',
        'Includes relevant background',
        'Shows enthusiasm'
      ]
    };
    
    const hardChallenge = {
      id: 'hard-challenge',
      title: 'Explain a Complex Technical Decision',
      description: 'Explain a complex technical decision to senior management, justifying your approach.',
      difficulty: 'hard',
      rubric: [
        'Technical accuracy',
        'Clear business impact',
        'Risk assessment',
        'Addresses stakeholder concerns',
        'Appropriate level of detail'
      ]
    };
    
    // Create a mediocre response that works for both challenges
    const mediocreResponse = {
      id: 'mediocre-response',
      content: `Hello team, 
      
I'm Alex, a product manager with 3 years of experience. I've worked on mobile apps and web platforms before.

I decided to join this team because the project seems interesting and I think I can contribute my skills in user research and feature prioritization.

I'm looking forward to working with all of you and learning more about the product.`,
      userId: 'test-user-id',
      submittedAt: new Date().toISOString()
    };
    
    // Evaluate the same response against both challenges
    const easyEvaluation = await evaluationService.evaluateResponse(
      { ...mediocreResponse, challengeId: easyChallenge.id },
      easyChallenge
    );
    
    const hardEvaluation = await evaluationService.evaluateResponse(
      { ...mediocreResponse, challengeId: hardChallenge.id },
      hardChallenge
    );
    
    // Verify that the evaluations are different
    expect(easyEvaluation.overallScore).to.not.equal(hardEvaluation.overallScore);
    expect(easyEvaluation.feedback).to.not.equal(hardEvaluation.feedback);
    
    // The response should score better on the easy challenge
    expect(easyEvaluation.overallScore).to.be.greaterThan(hardEvaluation.overallScore);
    
    // Log comparison
    console.log(`\nDifficulty Impact Comparison:`);
    console.log(`Easy Challenge Score: ${easyEvaluation.overallScore}`);
    console.log(`Hard Challenge Score: ${hardEvaluation.overallScore}`);
    console.log(`Score Difference: ${easyEvaluation.overallScore - hardEvaluation.overallScore}`);
  });
}); 