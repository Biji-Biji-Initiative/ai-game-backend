/**
 * Evaluation Flow E2E Tests
 * 
 * This test suite validates the evaluation functionality:
 * 1. Creating challenges that can be evaluated
 * 2. Submitting responses to challenges (triggers AI evaluation)
 * 3. Retrieving evaluations with AI-generated feedback
 * 4. Listing evaluations by user and challenge
 * 5. Verifying persistence of evaluations in the database
 * 
 * These tests ensure the full evaluation workflow functions correctly,
 * with proper data validation, AI-powered scoring, and feedback generation.
 */

import { expect } from "chai";
import { v4 as uuidv4 } from "uuid";
import { getTestConfig, hasRequiredVars } from "../../config/testConfigBridge.js";
import { setupTestUser, getAuthToken, apiRequest } from "../../helpers/apiTestHelper.js";
import { createUserId, createChallengeId, createEvaluationId, UserId, ChallengeId, EvaluationId } from "../../../src/core/common/valueObjects/index.js";

// Timeout for API requests (longer for OpenAI processing)
const API_TIMEOUT = 40000;

/**
 * Helper function to conditionally skip tests if required env vars are missing
 * @param {Array<string>} requiredVars - Array of required environment variable names
 * @param {string} message - Message to display if test is skipped
 */
function skipIfMissingEnv(requiredVars, message = 'Missing required environment variables') {
    before(function() {
        if (!hasRequiredVars(requiredVars)) {
            console.log(`Skipping test suite: ${message} for ${requiredVars.join(', ')}`);
            this.skip();
        }
    });
}

describe('Challenge Evaluation E2E Tests', function () {
    // Set longer timeout for API calls
    this.timeout(API_TIMEOUT);
    
    before(function () {
        // Use the function defined locally
        skipIfMissingEnv(['OPENAI_API_KEY'], 'Missing required environment variables for openai');
    });

    // Test variables
    let testUser;
    let testUserId;
    let authToken;
    let challengeId;
    let challengeIdVO;
    let evaluationId;
    let evaluationIdVO;

    before(async function () {
        // Set up test user and auth token
        try {
            // Get test user
            testUser = await setupTestUser();
            console.log(`Test user created: ${testUser.email}`);
            
            // Create Value Object for user ID
            testUserId = createUserId(testUser.id);
            
            // Get auth token
            authToken = await getAuthToken(testUser.email, testUser.password);
        }
        catch (error) {
            console.error('Failed to set up API client:', error.message);
            throw error;
        }
    });

    after(async function () {
        // Clean up test data
        try {
            // Delete evaluation if it exists
            if (evaluationId) {
                await apiRequest('delete', `api/v1/evaluations/${evaluationId}`, null, authToken);
                console.log(`Evaluation deleted: ${evaluationId}`);
            }
            
            // Delete challenge if it exists
            if (challengeId) {
                await apiRequest('delete', `api/v1/challenges/${challengeId}`, null, authToken);
                console.log(`Challenge deleted: ${challengeId}`);
            }
            
            // We're using a persistent test user, so no need to clean up
            console.log(`Test user retained: ${testUser.email}`);
        }
        catch (error) {
            console.warn('Failed to clean up test data:', error.message);
        }
    });

    describe('Challenge Evaluation Flow', function () {
        it('should create a challenge, submit a response, and get an AI-generated evaluation', async function () {
            // Skip if no auth token is available
            if (!authToken) {
                this.skip();
            }
            
            // Step 1: Create a challenge
            const challengeData = {
                title: 'Critical Thinking Challenge',
                content: {
                    description: 'Analyze the ethical implications of using AI in automated decision making.'
                },
                type: 'critical_thinking',
                difficulty: 'medium',
                focusArea: 'AI Ethics'
            };
            
            // Use standardized apiRequest helper with correct API URL - Ticket 6 requirement
            const challengeResponse = await apiRequest('post', 'api/v1/challenges', challengeData, authToken);
            
            // Verify challenge creation
            expect(challengeResponse.status).to.equal(200);
            expect(challengeResponse.data.success).to.be.true;
            expect(challengeResponse.data.data).to.exist;
            
            // Save challenge ID for later
            challengeId = challengeResponse.data.data.id;
            challengeIdVO = createChallengeId(challengeId);
            
            // Verify challenge properties
            expect(challengeResponse.data.data.title).to.equal(challengeData.title);
            expect(challengeResponse.data.data.content).to.deep.include(challengeData.content);
            expect(challengeResponse.data.data.type).to.equal(challengeData.type);
            expect(challengeResponse.data.data.difficulty).to.equal(challengeData.difficulty);
            
            // Step 2: Submit a response to the challenge (triggers AI evaluation)
            const responseText = 'Automated decision making using AI raises several ethical concerns. First, there\'s the issue of bias in the training data which can perpetuate discrimination. Second, there\'s lack of transparency when decisions are made by complex algorithms that even their creators may not fully understand. Third, accountability becomes unclear when an AI makes a harmful decision. To address these issues, organizations should: 1) Ensure diverse and representative training data, 2) Implement explainable AI techniques, 3) Maintain human oversight for critical decisions, and 4) Establish clear accountability frameworks that assign responsibility for AI-driven outcomes.';
            
            const evaluationRequestData = {
                challengeId: challengeId,
                responseText: responseText
            };
            
            // Submit response for evaluation using correct endpoint POST /api/v1/evaluations/ - Ticket 6 requirement
            const evaluationResponse = await apiRequest('post', 'api/v1/evaluations', evaluationRequestData, authToken);
            
            // Verify evaluation response
            expect(evaluationResponse.status).to.equal(200);
            expect(evaluationResponse.data.success).to.be.true;
            expect(evaluationResponse.data.data).to.exist;
            
            // Save evaluation ID for later
            evaluationId = evaluationResponse.data.data.id;
            evaluationIdVO = createEvaluationId(evaluationId);
            
            // Verify evaluation format and content
            // Check challenge association
            expect(evaluationResponse.data.data.challengeId).to.equal(challengeId);
            
            // Check stored response matches submitted text
            expect(evaluationResponse.data.data.responseText).to.equal(responseText);
            
            // Enhanced assertions for AI evaluation results - Ticket 6 requirement
            // 1. Check score field is present and within expected range
            const scoreField = evaluationResponse.data.data.score || evaluationResponse.data.data.overallScore;
            expect(scoreField).to.be.a('number');
            expect(scoreField).to.be.within(0, 100, 'Score should be between 0 and 100');
            
            // 2. Check feedback is substantial and meaningful
            expect(evaluationResponse.data.data.feedback).to.be.a('string').and.not.empty;
            expect(evaluationResponse.data.data.feedback.length).to.be.greaterThan(50, 'AI-generated feedback should be substantial');
            
            // 3. Check for meaningful feedback components - should contain analysis keywords
            expect(evaluationResponse.data.data.feedback.toLowerCase()).to.satisfy(feedback => {
                return feedback.includes('analysis') || 
                       feedback.includes('ethical') || 
                       feedback.includes('evaluate') || 
                       feedback.includes('consider') ||
                       feedback.includes('improve');
            }, 'Feedback should contain evaluation-related keywords');
            
            // 4. Check strengths are present and meaningful
            expect(evaluationResponse.data.data.strengths).to.be.an('array');
            if (evaluationResponse.data.data.strengths.length > 0) {
                expect(evaluationResponse.data.data.strengths[0]).to.be.a('string').and.not.empty;
                expect(evaluationResponse.data.data.strengths[0].length).to.be.greaterThan(10, 'Strengths should be substantive');
            }
            
            // 5. Check areas for improvement field (may be named differently)
            const weaknessesField = evaluationResponse.data.data.areasForImprovement || evaluationResponse.data.data.weaknesses;
            expect(weaknessesField).to.be.an('array');
            if (weaknessesField.length > 0) {
                expect(weaknessesField[0]).to.be.a('string');
                expect(weaknessesField[0].length).to.be.greaterThan(10, 'Areas for improvement should be substantive');
            }
            
            // Step 3: Get the evaluation by ID to verify persistence
            const getEvaluationResponse = await apiRequest('get', `api/v1/evaluations/${evaluationId}`, null, authToken);
            
            // Verify get evaluation response
            expect(getEvaluationResponse.status).to.equal(200);
            expect(getEvaluationResponse.data.success).to.be.true;
            
            // Verify the retrieved evaluation ID is correct
            expect(getEvaluationResponse.data.data.id).to.equal(evaluationId);
            
            // Verify the retrieved feedback and score match what we got initially
            expect(getEvaluationResponse.data.data.feedback).to.equal(evaluationResponse.data.data.feedback);
            
            const retrievedScoreField = getEvaluationResponse.data.data.score || getEvaluationResponse.data.data.overallScore;
            expect(retrievedScoreField).to.equal(scoreField);
        });

        it('should retrieve all evaluations for the current user', async function () {
            // Skip if no evaluation was created
            if (!evaluationId || !authToken) {
                this.skip();
            }
            
            // Get evaluations for the current user
            const userEvaluationsResponse = await apiRequest('get', 'api/v1/evaluations', null, authToken);
            
            // Verify listing response
            expect(userEvaluationsResponse.status).to.equal(200);
            expect(userEvaluationsResponse.data.success).to.be.true;
            expect(userEvaluationsResponse.data.data).to.be.an('array');
            
            // Find our created evaluation in the list
            const userEvaluations = userEvaluationsResponse.data.data;
            const createdEvaluation = userEvaluations.find(e => e.id === evaluationId);
            expect(createdEvaluation).to.exist;
            
            // Verify the evaluation ID is correct
            const foundEvaluationId = createEvaluationId(createdEvaluation.id);
            expect(foundEvaluationId).to.be.instanceOf(EvaluationId);
            expect(foundEvaluationId.value).to.equal(evaluationId);
            
            // Enhanced assertions for returned evaluation data
            expect(createdEvaluation.score || createdEvaluation.overallScore).to.be.a('number');
            expect(createdEvaluation.feedback).to.be.a('string').and.not.empty;
        });

        it('should retrieve evaluations for a specific challenge', async function () {
            // Skip if no evaluation was created or no authToken
            if (!evaluationId || !challengeId || !authToken) {
                this.skip();
            }
            
            // Get evaluations for the specific challenge
            const challengeEvaluationsResponse = await apiRequest('get', `api/v1/challenges/${challengeId}/evaluations`, null, authToken);
            
            // Verify listing response
            expect(challengeEvaluationsResponse.status).to.equal(200);
            expect(challengeEvaluationsResponse.data.success).to.be.true;
            expect(challengeEvaluationsResponse.data.data).to.be.an('array');
            
            // Find our created evaluation in the list
            const challengeEvaluations = challengeEvaluationsResponse.data.data;
            const createdEvaluation = challengeEvaluations.find(e => e.id === evaluationId);
            expect(createdEvaluation).to.exist;
            
            // Verify it belongs to the right challenge
            expect(createdEvaluation.challengeId).to.equal(challengeId);
            
            // Verify the evaluation ID is correct
            const foundEvaluationId = createEvaluationId(createdEvaluation.id);
            expect(foundEvaluationId).to.be.instanceOf(EvaluationId);
            expect(foundEvaluationId.value).to.equal(evaluationId);
            
            // Enhanced assertions for returned evaluation data
            expect(createdEvaluation.score || createdEvaluation.overallScore).to.be.a('number');
            expect(createdEvaluation.feedback).to.be.a('string').and.not.empty;
        });
    });
});
