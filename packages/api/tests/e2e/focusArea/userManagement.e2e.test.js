import { jest } from '@jest/globals';
/**
 * User Management E2E Tests
 * 
 * This test suite validates the User Management API endpoints and workflows:
 * 1. Retrieving user profiles from the API
 * 2. Updating user profiles with proper validation
 * 3. Setting and retrieving user focus areas
 * 4. Managing personality traits and preferences
 * 5. Authorization and authentication flows
 * 
 * These tests ensure that the User Management API functions correctly
 * with proper DTOs, validation, and authentication.
 */

import { expect } from "chai";
import * as axios from "axios";
import crypto from "crypto";
import { skipIfMissingEnv } from "@helpers/testHelpers.js";
import { config } from "dotenv";
import * as apiTestHelper from "@helpers/apiTestHelper.js";
import { UserDTO, UserDTOMapper } from '@src/core/user/dtos/index.js';
import { PersonalityDTO, PersonalityDTOMapper } from '@src/core/personality/dtos/index.js';
import { createUserId, UserId } from '@src/core/common/valueObjects/index.js';
import UserDTOMapper from '@src/application/user/mappers/UserDTOMapper.js';
import UserProfileDTOMapper from '@src/application/user/mappers/UserProfileDTOMapper.js';
import FocusAreaDTOMapper from '@src/application/focusArea/mappers/FocusAreaDTOMapper.js';

({ config }.config());

// Timeout for API requests
const API_TIMEOUT = 30000;

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// Generate a unique test ID
const TEST_ID = `test_${Date.now()}`;

describe('E2E: User Management API', function () {
    // Set longer timeout for API calls
    jest.setTimeout(30000);
    
    before(function () {
        skipIfMissingEnv(this, 'supabase');
    });

    // Configure longer timeout for E2E tests
    this.timeout(API_TIMEOUT);

    // Skip if API URLs not available
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

    before(async function () {
        // Set up test user and auth token
        try {
            // Create a new test user for this run
            const uniqueEmail = `test-user-${TEST_ID}@example.com`;
            testUser = await apiTestHelper.setupTestUser({
                email: uniqueEmail,
                password: 'Test1234!',
                fullName: 'E2E Test User'
            });
            console.log(`Test user created: ${testUser.email}`);
            
            // Create a Value Object for the user ID
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
            // Delete test user if it exists
            if (testUserId) {
                await apiTestHelper.apiRequest('delete', `/users/${testUserId.value}`, null, authToken);
                console.log(`Test user deleted: ${testUserId.value}`);
            }
        }
        catch (error) {
            console.warn('Failed to clean up test data:', error.message);
        }
    });

    describe('User API Flow', function () {
        it('should get current user profile', async function () {
            // Skip if no auth token is available
            if (!authToken) {
                this.skip();
            }
            
            const response = await apiTestHelper.apiRequest('get', '/users/me', null, authToken);
            
            // Verify the response
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.exist;
            
            // Validate response against UserDTO structure
            const userDto = new UserDTO(response.data.data);
            expect(userDto).to.be.instanceOf(UserDTO);
            
            // Verify Value Object conversion
            const userId = createUserId(userDto.id);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
            
            console.log('Successfully retrieved user profile');
        });

        it('should update user profile', async function () {
            // Skip if no auth token is available
            if (!authToken) {
                this.skip();
            }
            
            const updateData = {
                professionalTitle: 'Software Engineer',
                location: 'Test City'
            };
            
            // Validate update data using DTOMapper
            const mappedData = UserDTOMapper.fromRequest(updateData);
            expect(mappedData).to.exist;
            
            const response = await apiTestHelper.apiRequest(
                'put', 
                `/users/${testUserId.value}`, 
                updateData, 
                authToken
            );
            
            // Verify the response
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.exist;
            
            // Validate response DTO
            const userDto = new UserDTO(response.data.data);
            expect(userDto).to.be.instanceOf(UserDTO);
            expect(userDto.professionalTitle).to.equal(updateData.professionalTitle);
            expect(userDto.location).to.equal(updateData.location);
            
            // Verify Value Object conversion
            const userId = createUserId(userDto.id);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
            
            console.log('Successfully updated user profile');
        });

        it('should set user focus area', async function () {
            // Skip if no auth token is available
            if (!authToken) {
                this.skip();
            }
            
            const focusAreaData = {
                focusArea: 'Software Development',
                threadId: `thread_${crypto.randomUUID()}`
            };
            
            // Validate focus area data using DTOMapper
            const mappedData = UserDTOMapper.fromRequest(focusAreaData);
            expect(mappedData).to.exist;
            
            const response = await apiTestHelper.apiRequest(
                'put', 
                `/users/${testUserId.value}/focus-area`, 
                focusAreaData, 
                authToken
            );
            
            // Verify the response
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.exist;
            
            // Validate response DTO
            const userDto = new UserDTO(response.data.data);
            expect(userDto).to.be.instanceOf(UserDTO);
            expect(userDto.focusArea).to.equal(focusAreaData.focusArea);
            expect(userDto.focusAreaThreadId).to.equal(focusAreaData.threadId);
            
            // Verify Value Object conversion
            const userId = createUserId(userDto.id);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
            
            console.log('Successfully set user focus area');
        });

        it('should update personality traits', async function () {
            // Skip if no auth token is available
            if (!authToken) {
                this.skip();
            }
            
            const traitsData = {
                personalityTraits: {
                    openness: 8,
                    conscientiousness: 7,
                    extraversion: 6,
                    agreeableness: 9,
                    neuroticism: 4
                }
            };
            
            // Validate personality traits data using DTOMapper
            const mappedData = PersonalityDTOMapper.fromRequest(traitsData);
            expect(mappedData).to.exist;
            expect(mappedData.personalityTraits).to.deep.equal(traitsData.personalityTraits);
            
            const response = await apiTestHelper.apiRequest(
                'put', 
                `/users/${testUserId.value}/personality`, 
                traitsData, 
                authToken
            );
            
            // Verify the response
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.exist;
            
            // Convert to DTO and validate
            const personalityDto = new PersonalityDTO(response.data.data);
            expect(personalityDto).to.be.instanceOf(PersonalityDTO);
            
            // Verify this is the correct user's personality
            const userId = createUserId(personalityDto.userId);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
            
            // Check personality traits were updated
            expect(personalityDto.personalityTraits).to.deep.include(traitsData.personalityTraits);
            
            console.log('Successfully updated personality traits');
        });

        it('should get user by ID', async function () {
            // Skip if no auth token is available
            if (!authToken) {
                this.skip();
            }
            
            const response = await apiTestHelper.apiRequest(
                'get', 
                `/users/${testUserId.value}`, 
                null, 
                authToken
            );
            
            // Verify the response
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.exist;
            
            // Validate response DTO
            const userDto = new UserDTO(response.data.data);
            expect(userDto).to.be.instanceOf(UserDTO);
            expect(userDto.email).to.equal(testUser.email);
            expect(userDto.focusArea).to.equal('Software Development');
            
            // Verify Value Object conversion
            const userId = createUserId(userDto.id);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
            
            console.log('Successfully retrieved user by ID');
        });
    });
});
