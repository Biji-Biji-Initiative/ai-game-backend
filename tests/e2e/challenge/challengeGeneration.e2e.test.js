/**
 * Challenge Generation E2E Tests
 * 
 * This test suite validates the Challenge Generation API functionality:
 * 1. Generating AI-powered challenges with proper parameters
 * 2. Retrieving generated challenges with correct structure
 * 3. Listing user challenges and verifying correct ownership
 * 4. Proper validation of challenge properties and structure
 * 
 * These tests ensure that the Challenge Generation process works end-to-end,
 * properly storing the generated challenges and associating them with users.
 */

import { expect } from "chai";
import * as axios from "axios";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import { config } from "dotenv";
import * as apiTestHelper from "../../helpers/apiTestHelper.js";
import { ChallengeDTO, ChallengeDTOMapper } from "../../../src/core/challenge/dtos/index.js";
import { createUserId, createChallengeId, UserId, ChallengeId } from "../../../src/core/common/valueObjects/index.js";

({ config }.config());

// Timeout for API requests
const API_TIMEOUT = 40000;

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

describe('E2E: Challenge Generation API', function () {
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
    let authToken;
    let testUserId;
    let generatedChallengeId;
    let generatedChallengeIdVO;

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
            // Delete challenge if it exists
            if (generatedChallengeId) {
                await apiTestHelper.apiRequest('delete', `/challenges/${generatedChallengeId}`, null, authToken);
                console.log(`Challenge deleted: ${generatedChallengeId}`);
            }
            // We're using a persistent test user, so no need to clean up
            console.log(`Test user retained: ${testUser.email}`);
        }
        catch (error) {
            console.warn('Failed to clean up test data:', error.message);
        }
    });

    describe('Challenge Generation Flow', function () {
        it('should generate a challenge using AI via the API', async function () {
            // Skip if no auth token is available
            if (!authToken) {
                this.skip();
            }
            
            // Step 1: Request AI-generated challenge
            const generationData = {
                category: 'logical-reasoning',
                difficulty: 'medium',
                focusArea: 'reasoning'
            };
            
            // Validate generation data using DTOMapper
            const mappedData = ChallengeDTOMapper.fromRequest(generationData);
            expect(mappedData).to.exist;
            
            const generationResponse = await apiTestHelper.apiRequest('post', '/challenges/generate', generationData, authToken);
            
            // Verify challenge generation
            expect(generationResponse.status).to.equal(200);
            expect(generationResponse.data.success).to.be.true;
            expect(generationResponse.data.data).to.exist;
            
            // Create a DTO and validate it
            const challengeDto = new ChallengeDTO(generationResponse.data.data);
            expect(challengeDto).to.be.instanceOf(ChallengeDTO);
            
            // Save challenge ID for later
            generatedChallengeId = generationResponse.data.data.id;
            generatedChallengeIdVO = createChallengeId(generatedChallengeId);
            
            // Step 2: Retrieve the generated challenge
            const retrieveResponse = await apiTestHelper.apiRequest(
                'get', 
                `/challenges/${generatedChallengeId}`, 
                null, 
                authToken
            );
            
            // Verify retrieved challenge
            expect(retrieveResponse.status).to.equal(200);
            expect(retrieveResponse.data.success).to.be.true;
            expect(retrieveResponse.data.data).to.exist;
            
            // Create a DTO and validate it
            const retrievedChallengeDto = new ChallengeDTO(retrieveResponse.data.data);
            expect(retrievedChallengeDto).to.be.instanceOf(ChallengeDTO);
            
            // Verify challenge structure
            expect(retrievedChallengeDto.id).to.equal(generatedChallengeId);
            expect(retrievedChallengeDto.title).to.be.a('string').and.not.empty;
            expect(retrievedChallengeDto.difficulty).to.equal(generationData.difficulty);
            expect(retrievedChallengeDto.challenge_type || retrievedChallengeDto.challengeType)
                .to.equal(generationData.category);
            expect(retrievedChallengeDto.content).to.exist;
            
            // Verify Value Object conversion
            const challengeId = createChallengeId(retrievedChallengeDto.id);
            expect(challengeId).to.be.instanceOf(ChallengeId);
            
            // If userId is available in the DTO, validate it as a Value Object
            if (retrievedChallengeDto.userId) {
                const userId = createUserId(retrievedChallengeDto.userId);
                expect(userId).to.be.instanceOf(UserId);
                expect(userId.value).to.equal(testUser.id);
            }
            
            console.log('Successfully generated and retrieved challenge:', {
                id: retrievedChallengeDto.id,
                title: retrievedChallengeDto.title
            });
        });

        it('should list user challenges including the generated one', async function () {
            // Skip if no challenge was created
            if (!generatedChallengeId || !authToken) {
                this.skip();
            }
            
            const listResponse = await apiTestHelper.apiRequest('get', '/challenges/user', null, authToken);
            
            // Verify list response
            expect(listResponse.status).to.equal(200);
            expect(listResponse.data.success).to.be.true;
            expect(listResponse.data.data).to.be.an('array');
            
            // Verify the challenge we created is in the list
            const userChallenges = listResponse.data.data;
            const createdChallenge = userChallenges.find(c => c.id === generatedChallengeId);
            expect(createdChallenge).to.exist;
            
            // Create a DTO and validate it
            const foundChallengeDto = new ChallengeDTO(createdChallenge);
            expect(foundChallengeDto).to.be.instanceOf(ChallengeDTO);
            
            // Verify Value Object conversion
            const challengeId = createChallengeId(foundChallengeDto.id);
            expect(challengeId).to.be.instanceOf(ChallengeId);
            expect(challengeId.value).to.equal(generatedChallengeId);
            
            // If userId is available in the DTO, validate it as a Value Object
            if (foundChallengeDto.userId) {
                const userId = createUserId(foundChallengeDto.userId);
                expect(userId).to.be.instanceOf(UserId);
                expect(userId.value).to.equal(testUser.id);
            }
        });
    });
});
