/**
 * Evaluation Service Domain Tests
 * 
 * Tests for the Evaluation service using in-memory repositories and mocked OpenAI.
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { v4: uuidv4 } = require('uuid');

// Import setup helpers
const testSetup = require('../setup');

describe('Evaluation Service', function() {
  
  // Set longer timeout for API calls
  this.timeout(30000);

  let sandbox;
  let challengeRepository;
  let evaluationRepository;
  let openAIMock;
  let evaluationService;
  
  beforeEach(function() {
    // Set up test environment with in-memory repositories
    const setup = testSetup.setup();
    sandbox = setup.sandbox;
    challengeRepository = setup.challengeRepository;
    evaluationRepository = setup.evaluationRepository;
    openAIMock = setup.openAIClient;
    
    // Set up mock OpenAI response for evaluation
    openAIMock.responses.create.resolves({
      choices: [{
        message: {
          content: JSON.stringify({
            overall_score: 8,
            feedback: 'This is a well-reasoned response that shows good understanding of the ethical implications. The proposed solution is technically feasible and balances fairness with performance requirements.',
            strengths: [
              'Strong understanding of ethical implications',
              'Practical approach to bias mitigation'
            ],
            areas_for_improvement: [
              'Could provide more technical details',
              'Limited discussion of regulatory compliance'
            ],
            category_scores: {
              clarity: 8,
              reasoning: 9,
              originality: 7
            }
          })
        }
      }]
    });
    
    // Create the service to test
    evaluationService = {
      evaluateResponse: async (challenge, responseText) => {
        const prompt = `Evaluate the following response to a cognitive challenge.
        
        Challenge: ${challenge.title}
        ${challenge.content.description}
        
        User's Response:
        ${responseText}
        
        Provide an evaluation in JSON format with these properties:
        overall_score: A number from 1-10 rating the overall quality
        feedback: Detailed feedback explaining the evaluation
        strengths: An array of 2-3 strengths in the response
        areas_for_improvement: An array of 2-3 areas that could be improved
        category_scores: An object with scores for clarity (1-10), reasoning (1-10), and originality (1-10)`;
        
        const completion = await openAIMock.responses.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are an expert evaluator for cognitive challenges.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        });
        
        const responseJson = completion.choices[0].message.content;
        const evaluationData = JSON.parse(responseJson);
        
        const evaluation = {
          id: uuidv4(),
          challengeId: challenge.id,
          userId: challenge.userId,
          responseText: responseText,
          overallScore: evaluationData.overall_score,
          feedback: evaluationData.feedback,
          strengths: evaluationData.strengths,
          areasForImprovement: evaluationData.areas_for_improvement,
          categoryScores: evaluationData.category_scores,
          submittedAt: new Date().toISOString(),
          evaluatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          score: evaluationData.overall_score
        };
        
        // Save to repository
        await evaluationRepository.save(evaluation);
        
        return evaluation;
      },
      
      getEvaluationById: async id => {
        return await evaluationRepository.findById(id);
      },
      
      getEvaluationsByChallengeId: async challengeId => {
        return await evaluationRepository.findByChallengeId(challengeId);
      },
      
      getEvaluationsByUserId: async userId => {
        return await evaluationRepository.findByUserId(userId);
      }
    };
  });
  
  afterEach(function() {
    // Restore sandbox to clean up stubs
    testSetup.teardown(sandbox);
  });
  
  describe('Response Evaluation', function() {
    it('should evaluate a response to a challenge', async function() {
      // Arrange - Create a test challenge and response
      const challenge = {
        id: uuidv4(),
        title: 'Ethical Decision Making in AI',
        content: {
          description: 'How would you address bias in an AI system?'
        },
        userId: 'test-user-123',
        focusArea: 'AI Ethics',
        difficulty: 'medium'
      };
      
      const response = 'I would address bias by carefully examining the training data, ensuring diverse representation, and implementing regular audits of the system\'s decisions to catch any unintended biases that emerge over time.';
      
      // Save challenge to repository
      await challengeRepository.save(challenge);
      
      // Act - Evaluate the response
      const evaluation = await evaluationService.evaluateResponse(challenge, response);
      
      // Assert - Verify the evaluation properties
      expect(evaluation).to.exist;
      expect(evaluation.id).to.exist;
      expect(evaluation.challengeId).to.equal(challenge.id);
      expect(evaluation.userId).to.equal('test-user-123');
      expect(evaluation.responseText).to.equal(response);
      expect(evaluation.overallScore).to.equal(8);
      expect(evaluation.feedback).to.be.a('string').and.not.empty;
      expect(evaluation.strengths).to.be.an('array').with.lengthOf(2);
      expect(evaluation.areasForImprovement).to.be.an('array').with.lengthOf(2);
      expect(evaluation.categoryScores).to.be.an('object');
      expect(evaluation.categoryScores.clarity).to.equal(8);
      expect(evaluation.categoryScores.reasoning).to.equal(9);
      
      // Verify OpenAI was called with the right parameters
      expect(openAIMock.responses.create.calledOnce).to.be.true;
      const callArgs = openAIMock.responses.create.firstCall.args[0];
      expect(callArgs.model).to.equal('gpt-4');
      expect(callArgs.messages[1].content).to.include('Ethical Decision Making in AI');
      expect(callArgs.messages[1].content).to.include(response);
      
      // Verify evaluation was saved to repository
      const savedEvaluation = await evaluationRepository.findById(evaluation.id);
      expect(savedEvaluation).to.exist;
      expect(savedEvaluation.challengeId).to.equal(challenge.id);
      expect(savedEvaluation.overallScore).to.equal(8);
    });
    
    it('should retrieve evaluations by challenge ID', async function() {
      // Arrange - Create a test challenge
      const challenge = {
        id: uuidv4(),
        title: 'Test Challenge',
        content: { description: 'Test description' },
        userId: 'test-user-123'
      };
      
      // Create test evaluations
      const evaluation1 = {
        id: uuidv4(),
        challengeId: challenge.id,
        userId: 'user-1',
        responseText: 'Response from user 1',
        overallScore: 7,
        feedback: 'Good response',
        strengths: ['Strength 1', 'Strength 2'],
        areasForImprovement: ['Area 1', 'Area 2'],
        categoryScores: { clarity: 7, reasoning: 7, originality: 7 }
      };
      
      const evaluation2 = {
        id: uuidv4(),
        challengeId: challenge.id,
        userId: 'user-2',
        responseText: 'Response from user 2',
        overallScore: 9,
        feedback: 'Excellent response',
        strengths: ['Strength A', 'Strength B'],
        areasForImprovement: ['Area A', 'Area B'],
        categoryScores: { clarity: 9, reasoning: 9, originality: 8 }
      };
      
      // Save challenge and evaluations to repositories
      await challengeRepository.save(challenge);
      await evaluationRepository.save(evaluation1);
      await evaluationRepository.save(evaluation2);
      
      // Act - Get evaluations by challenge ID
      const evaluations = await evaluationService.getEvaluationsByChallengeId(challenge.id);
      
      // Assert - Verify the results
      expect(evaluations).to.be.an('array').with.lengthOf(2);
      
      const scores = evaluations.map(e => e.overallScore);
      expect(scores).to.include(7);
      expect(scores).to.include(9);
      
      const users = evaluations.map(e => e.userId);
      expect(users).to.include('user-1');
      expect(users).to.include('user-2');
    });
    
    it('should retrieve evaluations by user ID', async function() {
      // Arrange - Create test challenges and evaluations
      const userId = 'test-user-456';
      
      // Create test challenge
      const challenge1 = {
        id: uuidv4(),
        title: 'Challenge 1',
        content: { description: 'Description 1' }
      };
      
      const challenge2 = {
        id: uuidv4(),
        title: 'Challenge 2',
        content: { description: 'Description 2' }
      };
      
      // Create test evaluations for the same user
      const evaluation1 = {
        id: uuidv4(),
        challengeId: challenge1.id,
        userId: userId,
        responseText: 'Response 1',
        overallScore: 6,
        feedback: 'Feedback 1'
      };
      
      const evaluation2 = {
        id: uuidv4(),
        challengeId: challenge2.id,
        userId: userId,
        responseText: 'Response 2',
        overallScore: 8,
        feedback: 'Feedback 2'
      };
      
      const evaluation3 = {
        id: uuidv4(),
        challengeId: challenge1.id,
        userId: 'different-user',
        responseText: 'Response 3',
        overallScore: 7,
        feedback: 'Feedback 3'
      };
      
      // Save everything to repositories
      await challengeRepository.save(challenge1);
      await challengeRepository.save(challenge2);
      await evaluationRepository.save(evaluation1);
      await evaluationRepository.save(evaluation2);
      await evaluationRepository.save(evaluation3);
      
      // Act - Get evaluations by user ID
      const userEvaluations = await evaluationService.getEvaluationsByUserId(userId);
      
      // Assert - Verify the results
      expect(userEvaluations).to.be.an('array').with.lengthOf(2);
      
      const challengeIds = userEvaluations.map(e => e.challengeId);
      expect(challengeIds).to.include(challenge1.id);
      expect(challengeIds).to.include(challenge2.id);
      
      const scores = userEvaluations.map(e => e.overallScore);
      expect(scores).to.include(6);
      expect(scores).to.include(8);
    });
  });
}); 