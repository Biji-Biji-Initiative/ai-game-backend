/**
 * Evaluation Flow E2E Tests
 * 
 * This test suite validates the evaluation functionality:
 * 1. Creating challenges that can be evaluated
 * 2. Submitting responses to challenges
 * 3. Generating evaluations with detailed feedback
 * 4. Retrieving evaluations by ID and user
 * 5. Listing evaluations for specific challenges
 * 6. Accessing evaluation categories
 * 
 * These tests ensure the full evaluation workflow functions correctly,
 * with proper data validation, scoring, and feedback generation.
 */

import { expect } from "chai";
import * as axios from "axios";
import { v4 as uuidv4 } from "uuid";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import { config } from "dotenv";
import * as apiTestHelper from "../../helpers/apiTestHelper.js";
import { ChallengeDTO, ChallengeDTOMapper } from "../../../src/core/challenge/dtos/index.js";
import { EvaluationDTO, EvaluationDTOMapper } from "../../../src/core/evaluation/dtos/index.js";
import { CategoryDTO } from "../../../src/core/evaluation/dtos/index.js";
import { createUserId, createChallengeId, createEvaluationId, UserId, ChallengeId, EvaluationId } from "../../../src/core/common/valueObjects/index.js";
import ChallengeDTOMapper from "../../../src/application/challenge/mappers/ChallengeDTOMapper.js";
import ChallengeResponseDTOMapper from "../../../src/application/challenge/mappers/ChallengeResponseDTOMapper.js";
import EvaluationDTOMapper from "../../../src/application/evaluation/mappers/EvaluationDTOMapper.js";

({ config }.config());

// Timeout for API requests
const API_TIMEOUT = 40000;

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

describe('E2E: Evaluation Flow', function () {
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
    let axiosInstance;
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
        
        // Set up test user and auth token
        try {
            // Get test user
            testUser = await apiTestHelper.setupTestUser();
            console.log(`Test user created: ${testUser.email}`);
            
            // Create Value Object for user ID
            testUserId = createUserId(testUser.id);
            
            // Get auth token
            authToken = await apiTestHelper.getAuthToken(testUser.email, testUser.password);
            
            // Create axios instance with authentication
            axiosInstance = axios.create({
                baseURL: API_URL,
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
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
                await apiTestHelper.apiRequest('delete', `/evaluations/${evaluationId}`, null, authToken);
                console.log(`Evaluation deleted: ${evaluationId}`);
            }
            
            // Delete challenge if it exists
            if (challengeId) {
                await apiTestHelper.apiRequest('delete', `/challenges/${challengeId}`, null, authToken);
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
        it('should create a challenge, submit a response, and get an evaluation', async function () {
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
            
            // Validate challenge data using DTOMapper
            const mappedChallengeData = ChallengeDTOMapper.fromRequest(challengeData);
            expect(mappedChallengeData).to.exist;
            
            const challengeResponse = await apiTestHelper.apiRequest('post', '/challenges', challengeData, authToken);
            
            // Verify challenge creation
            expect(challengeResponse.status).to.equal(200);
            expect(challengeResponse.data.success).to.be.true;
            expect(challengeResponse.data.data).to.exist;
            
            // Create a DTO and validate it
            const challengeDto = new ChallengeDTO(challengeResponse.data.data);
            expect(challengeDto).to.be.instanceOf(ChallengeDTO);
            
            // Save challenge ID for later
            challengeId = challengeResponse.data.data.id;
            challengeIdVO = createChallengeId(challengeId);
            
            // Verify challenge format
            expect(challengeDto.title).to.equal(challengeData.title);
            expect(challengeDto.content).to.deep.include(challengeData.content);
            expect(challengeDto.type).to.equal(challengeData.type);
            expect(challengeDto.difficulty).to.equal(challengeData.difficulty);
            
            // Verify user ID is correct
            const userId = createUserId(challengeDto.userId);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
            
            // Step 2: Submit a response to the challenge
            const responseText = 'Automated decision making using AI raises several ethical concerns. First, there\'s the issue of bias in the training data which can perpetuate discrimination. Second, there\'s lack of transparency when decisions are made by complex algorithms that even their creators may not fully understand. Third, accountability becomes unclear when an AI makes a harmful decision. To address these issues, organizations should: 1) Ensure diverse and representative training data, 2) Implement explainable AI techniques, 3) Maintain human oversight for critical decisions, and 4) Establish clear accountability frameworks that assign responsibility for AI-driven outcomes.';
            
            const evaluationRequestData = {
                challengeId: challengeId,
                responseText: responseText
            };
            
            // Validate evaluation request data using DTOMapper
            const mappedEvaluationData = EvaluationDTOMapper.fromRequest(evaluationRequestData);
            expect(mappedEvaluationData).to.exist;
            
            const evaluationResponse = await apiTestHelper.apiRequest('post', '/evaluations/submit', evaluationRequestData, authToken);
            
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
            expect(evaluationDto.score || evaluationDto.overallScore).to.be.a('number');
            expect(evaluationDto.feedback).to.be.a('string').and.not.empty;
            expect(evaluationDto.strengths).to.be.an('array').and.not.empty;
            expect(evaluationDto.areasForImprovement || evaluationDto.weaknesses).to.be.an('array');
            
            const evaluationUserId = createUserId(evaluationDto.userId);
            expect(evaluationUserId).to.be.instanceOf(UserId);
            expect(evaluationUserId.value).to.equal(testUser.id);
            
            // Step 3: Get the evaluation by ID
            const getEvaluationResponse = await apiTestHelper.apiRequest('get', `/evaluations/${evaluationId}`, null, authToken);
            
            // Verify get evaluation response
            expect(getEvaluationResponse.status).to.equal(200);
            expect(getEvaluationResponse.data.success).to.be.true;
            
            // Create a DTO and validate it
            const retrievedEvaluationDto = new EvaluationDTO(getEvaluationResponse.data.data);
            expect(retrievedEvaluationDto).to.be.instanceOf(EvaluationDTO);
            
            // Verify the retrieved evaluation ID is correct
            const retrievedEvaluationId = createEvaluationId(retrievedEvaluationDto.id);
            expect(retrievedEvaluationId).to.be.instanceOf(EvaluationId);
            expect(retrievedEvaluationId.value).to.equal(evaluationId);
        });

        it('should retrieve all evaluations for a user', async function () {
            // Skip if no evaluation was created
            if (!evaluationId || !authToken) {
                this.skip();
            }
            
            const userEvaluationsResponse = await apiTestHelper.apiRequest('get', '/evaluations/user', null, authToken);
            
            // Verify user evaluations response
            expect(userEvaluationsResponse.status).to.equal(200);
            expect(userEvaluationsResponse.data.success).to.be.true;
            expect(userEvaluationsResponse.data.data).to.be.an('array');
            
            // Verify the evaluation we created is in the list using DTOs
            const userEvaluations = userEvaluationsResponse.data.data;
            const createdEvaluation = userEvaluations.find(e => e.id === evaluationId);
            expect(createdEvaluation).to.exist;
            
            // Create a DTO and validate it
            const foundEvaluationDto = new EvaluationDTO(createdEvaluation);
            expect(foundEvaluationDto).to.be.instanceOf(EvaluationDTO);
            
            // Verify the evaluation ID is correct
            const foundEvaluationId = createEvaluationId(foundEvaluationDto.id);
            expect(foundEvaluationId).to.be.instanceOf(EvaluationId);
            expect(foundEvaluationId.value).to.equal(evaluationId);
            
            // Verify the challenge ID is correct
            const foundChallengeId = createChallengeId(foundEvaluationDto.challengeId);
            expect(foundChallengeId).to.be.instanceOf(ChallengeId);
            expect(foundChallengeId.value).to.equal(challengeId);
        });

        it('should retrieve evaluations for a specific challenge', async function () {
            // Skip if no challenge or evaluation was created
            if (!challengeId || !evaluationId || !authToken) {
                this.skip();
            }
            
            const challengeEvaluationsResponse = await apiTestHelper.apiRequest('get', `/challenges/${challengeId}/evaluations`, null, authToken);
            
            // Verify challenge evaluations response
            expect(challengeEvaluationsResponse.status).to.equal(200);
            expect(challengeEvaluationsResponse.data.success).to.be.true;
            expect(challengeEvaluationsResponse.data.data).to.be.an('array');
            
            // Verify the evaluation we created is in the list using DTOs
            const challengeEvaluations = challengeEvaluationsResponse.data.data;
            const createdEvaluation = challengeEvaluations.find(e => e.id === evaluationId);
            expect(createdEvaluation).to.exist;
            
            // Create a DTO and validate it
            const foundEvaluationDto = new EvaluationDTO(createdEvaluation);
            expect(foundEvaluationDto).to.be.instanceOf(EvaluationDTO);
            
            // Verify the evaluation ID is correct
            const foundEvaluationId = createEvaluationId(foundEvaluationDto.id);
            expect(foundEvaluationId).to.be.instanceOf(EvaluationId);
            expect(foundEvaluationId.value).to.equal(evaluationId);
            
            // Verify the challenge ID is correct
            const foundChallengeId = createChallengeId(foundEvaluationDto.challengeId);
            expect(foundChallengeId).to.be.instanceOf(ChallengeId);
            expect(foundChallengeId.value).to.equal(challengeId);
        });
    });

    describe('Evaluation Categories', function () {
        it('should retrieve evaluation categories', async function () {
            if (!authToken) {
                this.skip();
            }
            
            const categoriesResponse = await apiTestHelper.apiRequest('get', '/evaluations/categories', null, authToken);
            
            // Verify categories response
            expect(categoriesResponse.status).to.equal(200);
            expect(categoriesResponse.data.success).to.be.true;
            expect(categoriesResponse.data.data).to.be.an('array');
            
            // Verify category format using DTOs
            const categories = categoriesResponse.data.data;
            expect(categories.length).to.be.at.least(3);
            
            // Check if each category has the expected properties
            const category = categories[0];
            
            // Create a DTO and validate it if CategoryDTO exists
            try {
                const categoryDto = new CategoryDTO(category);
                expect(categoryDto).to.be.instanceOf(CategoryDTO);
            } catch (error) {
                // If CategoryDTO doesn't exist, verify properties directly
                expect(category).to.have.property('id');
                expect(category).to.have.property('name');
                expect(category).to.have.property('description');
            }
        });
    });
});
