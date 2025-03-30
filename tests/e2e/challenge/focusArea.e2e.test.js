/**
 * Focus Area E2E Tests
 * 
 * This test suite validates the Focus Area API functionality:
 * 1. Generating personalized focus area recommendations based on user profiles
 * 2. Retrieving focus areas for users
 * 3. Accessing specific focus areas by ID
 * 4. Generating challenges aligned with focus areas
 * 
 * These tests ensure the focus area recommendation system provides
 * personalized learning paths and integrates with the challenge system.
 */

import { expect } from "chai";
import * as axios from "axios";
import { v4 as uuidv4 } from "uuid";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import * as apiTestHelper from "../../helpers/apiTestHelper.js";
import { FocusAreaDTO, FocusAreaDTOMapper } from "../../../src/core/focusArea/dtos/index.js";
import { ChallengeDTO, ChallengeDTOMapper } from "../../../src/core/challenge/dtos/index.js";
import { createUserId, createFocusAreaId, createChallengeId, UserId, FocusAreaId, ChallengeId } from "../../../src/core/common/valueObjects/index.js";

// Timeout for API requests
const API_TIMEOUT = 30000;

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

describe('E2E: Focus Area API', function () {
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
    let focusAreaId;
    let focusAreaIdVO;

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
            
            // Create Value Object for user ID
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
            // Delete focus area if it exists
            if (focusAreaId) {
                await apiClient.delete(`/api/focus-areas/${focusAreaId}`);
                console.log(`Focus area deleted: ${focusAreaId}`);
            }
            
            // Clean up test user
            await apiTestHelper.cleanupTestUser(testUser.id);
            console.log(`Test user cleaned up: ${testUser.email}`);
        }
        catch (error) {
            console.warn('Failed to clean up test data:', error.message);
        }
    });

    describe('Focus Area Recommendations', function () {
        it('should generate a focus area recommendation based on user profile', async function () {
            // User profile data
            const profileData = {
                professionalTitle: 'Product Manager',
                interests: ['AI ethics', 'Product development', 'User experience'],
                skills: ['Project management', 'Data analysis', 'Team leadership']
            };
            
            // Make API request
            const response = await apiClient.post('/api/focus-areas/recommend', profileData);
            
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.exist;
            
            // Save focus area ID for later
            focusAreaId = response.data.data.id;
            focusAreaIdVO = createFocusAreaId(focusAreaId);
            
            // Create focus area DTO if available
            try {
                const focusAreaDto = new FocusAreaDTO(response.data.data);
                expect(focusAreaDto).to.exist;
                
                // Verify focus area format using DTO
                expect(focusAreaDto.name).to.be.a('string').and.not.empty;
                expect(focusAreaDto.description).to.be.a('string').and.not.empty;
                expect(focusAreaDto.skills).to.be.an('array').and.not.empty;
                
                // Verify user ID is correct using Value Object
                const userId = createUserId(focusAreaDto.userId);
                expect(userId).to.be.instanceOf(UserId);
                expect(userId.value).to.equal(testUser.id);
            } catch (error) {
                // If FocusAreaDTO cannot be instantiated, verify the raw data
                const focusArea = response.data.data;
                expect(focusArea.name).to.be.a('string').and.not.empty;
                expect(focusArea.description).to.be.a('string').and.not.empty;
                expect(focusArea.skills).to.be.an('array').and.not.empty;
                expect(focusArea.userId).to.equal(testUser.id);
            }
        });

        it('should retrieve focus areas for the current user', async function () {
            // Skip if no focus area was created
            if (!focusAreaId) {
                this.skip();
            }
            
            // Make API request
            const response = await apiClient.get('/api/focus-areas');
            
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.be.an('array');
            
            // Verify the focus area we created is in the list
            const focusAreas = response.data.data;
            const createdFocusArea = focusAreas.find(fa => fa.id === focusAreaId);
            expect(createdFocusArea).to.exist;
            
            // Create focus area DTO if available
            try {
                const focusAreaDto = new FocusAreaDTO(createdFocusArea);
                expect(focusAreaDto).to.exist;
                
                // Verify focus area ID using Value Object
                const foundFocusAreaId = createFocusAreaId(focusAreaDto.id);
                expect(foundFocusAreaId).to.be.instanceOf(FocusAreaId);
                expect(foundFocusAreaId.value).to.equal(focusAreaId);
                
                // Verify user ID is correct using Value Object
                if (focusAreaDto.userId) {
                    const userId = createUserId(focusAreaDto.userId);
                    expect(userId).to.be.instanceOf(UserId);
                    expect(userId.value).to.equal(testUser.id);
                }
            } catch (error) {
                // If FocusAreaDTO cannot be instantiated, verify the raw data
                expect(createdFocusArea.id).to.equal(focusAreaId);
                if (createdFocusArea.userId) {
                    expect(createdFocusArea.userId).to.equal(testUser.id);
                }
            }
        });

        it('should retrieve a specific focus area by ID', async function () {
            // Skip if no focus area was created
            if (!focusAreaId) {
                this.skip();
            }
            
            // Make API request
            const response = await apiClient.get(`/api/focus-areas/${focusAreaId}`);
            
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.exist;
            
            // Create focus area DTO if available
            try {
                const focusAreaDto = new FocusAreaDTO(response.data.data);
                expect(focusAreaDto).to.exist;
                
                // Verify focus area ID using Value Object
                const retrievedFocusAreaId = createFocusAreaId(focusAreaDto.id);
                expect(retrievedFocusAreaId).to.be.instanceOf(FocusAreaId);
                expect(retrievedFocusAreaId.value).to.equal(focusAreaId);
                
                expect(focusAreaDto.skills).to.be.an('array');
                
                // Verify user ID is correct using Value Object
                if (focusAreaDto.userId) {
                    const userId = createUserId(focusAreaDto.userId);
                    expect(userId).to.be.instanceOf(UserId);
                    expect(userId.value).to.equal(testUser.id);
                }
            } catch (error) {
                // If FocusAreaDTO cannot be instantiated, verify the raw data
                const focusArea = response.data.data;
                expect(focusArea.id).to.equal(focusAreaId);
                expect(focusArea.skills).to.be.an('array');
                if (focusArea.userId) {
                    expect(focusArea.userId).to.equal(testUser.id);
                }
            }
        });
    });

    describe('Focus Area Challenge Integration', function () {
        it('should generate challenges for a focus area', async function () {
            // Skip if no focus area was created
            if (!focusAreaId) {
                this.skip();
            }
            
            // Challenge generation parameters
            const generationParams = {
                count: 1,
                difficulty: 'medium'
            };
            
            // Make API request to generate challenges
            const response = await apiClient.post(`/api/focus-areas/${focusAreaId}/challenges`, generationParams);
            
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.be.an('array');
            
            // Verify challenge format
            if (response.data.data.length > 0) {
                const challenge = response.data.data[0];
                
                // Create challenge DTO if available
                try {
                    const challengeDto = new ChallengeDTO(challenge);
                    expect(challengeDto).to.exist;
                    
                    // Verify challenge ID using Value Object
                    const challengeId = createChallengeId(challengeDto.id);
                    expect(challengeId).to.be.instanceOf(ChallengeId);
                    
                    expect(challengeDto.title).to.be.a('string');
                    
                    // Verify focus area ID using Value Object
                    const challengeFocusAreaId = createFocusAreaId(challengeDto.focusArea);
                    expect(challengeFocusAreaId).to.be.instanceOf(FocusAreaId);
                    expect(challengeFocusAreaId.value).to.equal(focusAreaId);
                    
                    // Verify user ID is correct using Value Object
                    const userId = createUserId(challengeDto.userId);
                    expect(userId).to.be.instanceOf(UserId);
                    expect(userId.value).to.equal(testUser.id);
                } catch (error) {
                    // If ChallengeDTO cannot be instantiated, verify the raw data
                    expect(challenge.id).to.exist;
                    expect(challenge.title).to.be.a('string');
                    expect(challenge.focusArea).to.equal(focusAreaId);
                    expect(challenge.userId).to.equal(testUser.id);
                }
            }
        });
    });
});
