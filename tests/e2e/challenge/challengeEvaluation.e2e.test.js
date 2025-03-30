/**
 * Challenge-Evaluation Flow E2E Tests
 * 
 * This test suite validates the end-to-end flow from challenge generation to evaluation:
 * 1. Generating challenges with specific parameters
 * 2. Submitting user responses to challenges
 * 3. Generating AI evaluations with proper feedback
 * 4. Retrieving evaluations and verifying their structure
 * 5. Listing user challenges and evaluations
 * 
 * These tests ensure that the complete challenge-evaluation flow works correctly,
 * with proper data validation and persistence across API endpoints.
 */

import { expect } from "chai";
import * as axios from "axios";
import { v4 as uuidv4 } from "uuid";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import * as apiTestHelper from "../../helpers/apiTestHelper.js";
import { ChallengeDTO, ChallengeDTOMapper } from "../../../src/core/challenge/dtos/index.js";
import { EvaluationDTO, EvaluationDTOMapper } from "../../../src/core/evaluation/dtos/index.js";
import { createUserId, createChallengeId, createEvaluationId, UserId, ChallengeId, EvaluationId } from "../../../src/core/common/valueObjects/index.js";
// Timeout for API requests
const API_TIMEOUT = 40000;
// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
describe('E2E: Challenge-Evaluation Flow', function () {
    // Set longer timeout for API calls
    this.timeout(30000);
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    // Configure longer timeout for E2E tests
    this.timeout(API_TIMEOUT);
    // Skip if API keys not available
    before(function () {
        if (!process.env.API_URL && !process.env.TEST_API_URL) {
            console.warn('API_URL not set, skipping E2E tests');
            this.skip();
        }
    });
    // Test variables
    let apiClient;
    let testUser;
    let testUserId;
    let authToken;
    let challengeId;
    let challengeIdVO;
    let evaluationId;
    let evaluationIdVO;
    before(async function () {
        // Skip tests if OpenAI API key is not available
        if (!testEnv.getTestConfig().openai.apiKey) {
            console.warn('OPENAI_API_KEY not found, skipping E2E tests');
            this.skip();
        }
        // Create API client with authentication
        try {
            const apiSetup = await apiTestHelper.setupApiClient();
            apiClient = apiSetup.apiClient;
            testUser = apiSetup.testUser;
            authToken = apiSetup.authToken;
            // Create Value Object for the user ID
            testUserId = createUserId(testUser.id);
            // Log successful setup
            console.log(`Test user created: ${testUser.email}`);
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
                await apiClient.delete(`/api/evaluations/${evaluationId}`);
                console.log(`Evaluation deleted: ${evaluationId}`);
            }
            // Delete challenge if it exists
            if (challengeId) {
                await apiClient.delete(`/api/challenges/${challengeId}`);
                console.log(`Challenge deleted: ${challengeId}`);
            }
            // Clean up test user
            await apiTestHelper.cleanupTestUser(testUser.id);
            console.log(`Test user cleaned up: ${testUser.email}`);
        }
        catch (error) {
            console.warn('Failed to clean up test data:', error.message);
        }
    });
    describe('Challenge Generation and Evaluation', function () {
        it('should generate a challenge, submit a response, and get an evaluation', async function () {
            // Step 1: Generate a challenge
            const challengeRequestData = {
                focusArea: 'AI Ethics',
                difficulty: 'medium',
                type: 'text'
            };
            // Validate request data using DTOMapper
            const mappedData = ChallengeDTOMapper.fromRequest(challengeRequestData);
            expect(mappedData).to.exist;
            const challengeResponse = await apiClient.post('/api/challenges/generate', challengeRequestData);
            // Verify challenge response
            expect(challengeResponse.status).to.equal(200);
            expect(challengeResponse.data.success).to.be.true;
            expect(challengeResponse.data.data).to.exist;
            // Create a DTO and validate it
            const challengeDto = new ChallengeDTO(challengeResponse.data.data);
            expect(challengeDto).to.be.instanceOf(ChallengeDTO);
            // Save challenge ID for later
            challengeId = challengeResponse.data.data.id;
            challengeIdVO = createChallengeId(challengeId);
            // Verify challenge format using DTO
            expect(challengeDto.title).to.be.a('string').and.not.empty;
            expect(challengeDto.content).to.be.an('object');
            expect(challengeDto.content.description).to.be.a('string').and.not.empty;
            // Verify user ID is correct
            const challengeUserId = createUserId(challengeDto.userId);
            expect(challengeUserId).to.be.instanceOf(UserId);
            expect(challengeUserId.value).to.equal(testUser.id);
            // Step 2: Get the challenge by ID to verify it was saved
            const getChallengeResponse = await apiClient.get(`/api/challenges/${challengeId}`);
            // Verify get challenge response
            expect(getChallengeResponse.status).to.equal(200);
            expect(getChallengeResponse.data.success).to.be.true;
            // Create a DTO and validate it
            const retrievedChallengeDto = new ChallengeDTO(getChallengeResponse.data.data);
            expect(retrievedChallengeDto).to.be.instanceOf(ChallengeDTO);
            expect(retrievedChallengeDto.id).to.equal(challengeId);
            // Step 3: Submit a response to the challenge
            const responseText = 'This is a test response to the challenge. To address ethical issues in AI, I would implement regular bias audits, ensure diverse training data, and establish an ethics review board for oversight.';
            const evaluationRequestData = {
                challengeId: challengeId,
                responseText: responseText
            };
            // Validate request data using DTOMapper
            const mappedEvaluationData = EvaluationDTOMapper.fromRequest(evaluationRequestData);
            expect(mappedEvaluationData).to.exist;
            const evaluationResponse = await apiClient.post('/api/evaluations/submit', evaluationRequestData);
            // Verify evaluation response
            expect(evaluationResponse.status).to.equal(200);
            expect(evaluationResponse.data.success).to.be.true;
            expect(evaluationResponse.data.data).to.exist;
            // Create a DTO and validate it
            const evaluationDto = new EvaluationDTO(evaluationResponse.data.data);
            expect(evaluationDto).to.be.instanceOf(EvaluationDTO);
            // Save evaluation ID for later
            evaluationId = evaluationResponse.data.data.id;
            evaluationIdVO = createEvaluationId(evaluationId);
            // Verify evaluation format using DTO
            const evaluationChallengeId = createChallengeId(evaluationDto.challengeId);
            expect(evaluationChallengeId).to.be.instanceOf(ChallengeId);
            expect(evaluationChallengeId.value).to.equal(challengeId);
            expect(evaluationDto.responseText).to.equal(responseText);
            expect(evaluationDto.overallScore).to.be.a('number');
            expect(evaluationDto.feedback).to.be.a('string').and.not.empty;
            expect(evaluationDto.strengths).to.be.an('array').and.not.empty;
            expect(evaluationDto.areasForImprovement).to.be.an('array');
            const evaluationUserId = createUserId(evaluationDto.userId);
            expect(evaluationUserId).to.be.instanceOf(UserId);
            expect(evaluationUserId.value).to.equal(testUser.id);
            // Step 4: Get evaluations for the challenge
            const getEvaluationsResponse = await apiClient.get(`/api/challenges/${challengeId}/evaluations`);
            // Verify get evaluations response
            expect(getEvaluationsResponse.status).to.equal(200);
            expect(getEvaluationsResponse.data.success).to.be.true;
            expect(getEvaluationsResponse.data.data).to.be.an('array').with.lengthOf.at.least(1);
            // Verify the evaluation we created is in the list using DTOs
            const evaluations = getEvaluationsResponse.data.data;
            const createdEvaluation = evaluations.find(e => e.id === evaluationId);
            expect(createdEvaluation).to.exist;
            const foundEvaluationDto = new EvaluationDTO(createdEvaluation);
            expect(foundEvaluationDto).to.be.instanceOf(EvaluationDTO);
            const foundEvaluationId = createEvaluationId(foundEvaluationDto.id);
            expect(foundEvaluationId).to.be.instanceOf(EvaluationId);
            expect(foundEvaluationId.value).to.equal(evaluationId);
        });
        it('should get a list of user challenges and evaluations', async function () {
            // Skip if no challenge was created
            if (!challengeId) {
                this.skip();
            }
            // Get user challenges
            const userChallengesResponse = await apiClient.get('/api/challenges/user');
            // Verify user challenges response
            expect(userChallengesResponse.status).to.equal(200);
            expect(userChallengesResponse.data.success).to.be.true;
            expect(userChallengesResponse.data.data).to.be.an('array');
            // Verify the challenge we created is in the list using DTOs
            const userChallenges = userChallengesResponse.data.data;
            const createdChallenge = userChallenges.find(c => c.id === challengeId);
            expect(createdChallenge).to.exist;
            const foundChallengeDto = new ChallengeDTO(createdChallenge);
            expect(foundChallengeDto).to.be.instanceOf(ChallengeDTO);
            const foundChallengeId = createChallengeId(foundChallengeDto.id);
            expect(foundChallengeId).to.be.instanceOf(ChallengeId);
            expect(foundChallengeId.value).to.equal(challengeId);
            // Get user evaluations
            const userEvaluationsResponse = await apiClient.get('/api/evaluations/user');
            // Verify user evaluations response
            expect(userEvaluationsResponse.status).to.equal(200);
            expect(userEvaluationsResponse.data.success).to.be.true;
            expect(userEvaluationsResponse.data.data).to.be.an('array');
            // Verify the evaluation we created is in the list using DTOs
            if (evaluationId) {
                const userEvaluations = userEvaluationsResponse.data.data;
                const createdEvaluation = userEvaluations.find(e => e.id === evaluationId);
                expect(createdEvaluation).to.exist;
                const foundEvaluationDto = new EvaluationDTO(createdEvaluation);
                expect(foundEvaluationDto).to.be.instanceOf(EvaluationDTO);
                const foundEvaluationId = createEvaluationId(foundEvaluationDto.id);
                expect(foundEvaluationId).to.be.instanceOf(EvaluationId);
                expect(foundEvaluationId.value).to.equal(evaluationId);
                const foundChallengeid = createChallengeId(foundEvaluationDto.challengeId);
                expect(foundChallengeid).to.be.instanceOf(ChallengeId);
                expect(foundChallengeid.value).to.equal(challengeId);
            }
        });
    });
});
