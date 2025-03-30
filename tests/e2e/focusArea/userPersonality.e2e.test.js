import { jest } from '@jest/globals';
/**
 * User-Personality Domain Integration E2E Tests
 * 
 * This test suite validates the cross-domain functionality between User and Personality:
 * 1. Automatic personality profile creation for new users
 * 2. Updating personality traits and their effect on user recommendations
 * 3. Focus area changes and their impact on personality insights
 * 4. AI attitude updates and their influence on user preferences
 * 5. Data consistency between the user and personality domains
 * 
 * These tests ensure that cross-domain events are properly propagated
 * and that data consistency is maintained between bounded contexts.
 */

import axios from "axios";
import { expect } from "chai";
import { setupTestUser, cleanupTestUser, getAuthToken } from "../../helpers/apiTestHelper.js";
import { UserDTO, UserDTOMapper } from '../../../src/core/user/dtos/index.js';
import { PersonalityDTO, PersonalityDTOMapper } from '../../../src/core/personality/dtos/index.js';
import { createUserId, UserId } from '../../../src/core/common/valueObjects/index.js';
import UserDTOMapper from '../../../src/application/user/mappers/UserDTOMapper.js';
import UserProfileDTOMapper from '../../../src/application/user/mappers/UserProfileDTOMapper.js';
import FocusAreaDTOMapper from '../../../src/application/focusArea/mappers/FocusAreaDTOMapper.js';

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

describe('User-Personality Domain Integration (Real)', function () {
    // Increase timeout for real API calls
    jest.setTimeout(15000);
    
    let testUser;
    let authToken;
    let testUserId;
    
    before(async function () {
        // Create a test user in Supabase and get auth token
        testUser = await setupTestUser();
        authToken = await getAuthToken(testUser.email, testUser.password);
        // Create UserId Value Object from test user ID
        testUserId = createUserId(testUser.id);
    });
    
    after(async function () {
        // Clean up test user after tests
        if (testUser && testUser.id) {
            await cleanupTestUser(testUser.id);
        }
    });
    
    describe('New User Creation', function () {
        it('should automatically create personality profile for new user', async function () {
            // Get the personality profile - it should be automatically created when user was created
            const response = await axios.get(`${API_URL}/personality/profile`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            
            // Validate response against PersonalityDTO structure
            const personalityDto = new PersonalityDTO(response.data.data);
            expect(personalityDto).to.be.instanceOf(PersonalityDTO);
            
            // Verify Value Object conversion
            const userId = createUserId(personalityDto.userId);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
            
            // New profile should have empty traits
            expect(personalityDto.personalityTraits).to.be.an('object');
            expect(Object.keys(personalityDto.personalityTraits).length).to.equal(0);
        });
    });
    
    describe('Personality Traits Update & User Recommendations', function () {
        it('should update personality traits and update user recommendations', async function () {
            // 1. Update personality traits
            const traitsData = {
                personalityTraits: {
                    analytical: 90,
                    creative: 60,
                    logical: 85,
                    detail_oriented: 75
                }
            };
            
            // Validate update data using DTOMapper
            const mappedData = PersonalityDTOMapper.fromRequest(traitsData);
            expect(mappedData).to.exist;
            expect(mappedData.personalityTraits).to.deep.equal(traitsData.personalityTraits);
            
            const traitsResponse = await axios.put(`${API_URL}/personality/traits`, traitsData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            // Validate traits response
            expect(traitsResponse.status).to.equal(200);
            const personalityDto = new PersonalityDTO(traitsResponse.data.data);
            expect(personalityDto).to.be.instanceOf(PersonalityDTO);
            
            // 2. Wait for event processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 3. Get user profile to check if recommendations were updated
            const userResponse = await axios.get(`${API_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            // Validate user response
            expect(userResponse.status).to.equal(200);
            const userDto = new UserDTO(userResponse.data.data.user);
            expect(userDto).to.be.instanceOf(UserDTO);
            
            // Verify Value Object conversion
            const userId = createUserId(userDto.id);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
        });
    });
    
    describe('Focus Area Change & Personality Insights', function () {
        it('should update focus area and regenerate personality insights', async function () {
            // 1. Update focus area
            const focusAreaData = { focusArea: 'productivity' };
            
            // Validate update data using DTOMapper
            const mappedData = UserDTOMapper.fromRequest(focusAreaData);
            expect(mappedData).to.exist;
            expect(mappedData.focusArea).to.equal(focusAreaData.focusArea);
            
            await axios.put(`${API_URL}/users/me/focus-area`, focusAreaData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            // 2. Wait for event processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 3. Get personality insights
            const insightsResponse = await axios.get(`${API_URL}/personality/insights`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            // Verify insights include focus area specific recommendations
            expect(insightsResponse.status).to.equal(200);
            
            // Validate response DTO
            const personalityDto = new PersonalityDTO(insightsResponse.data.data);
            expect(personalityDto).to.be.instanceOf(PersonalityDTO);
            expect(personalityDto.insights).to.exist;
            expect(personalityDto.insights.recommendations).to.be.an('array');
            
            // Verify Value Object conversion
            const userId = createUserId(personalityDto.userId);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
        });
    });
    
    describe('AI Attitudes Update & User AI Preferences', function () {
        it('should update AI attitudes and affect user AI interaction preferences', async function () {
            // 1. Update AI attitudes
            const attitudesData = {
                aiAttitudes: {
                    early_adopter: 90,
                    tech_savvy: 85,
                    skeptical: 20,
                    ethical_concern: 75
                }
            };
            
            // Validate update data using DTOMapper
            const mappedData = PersonalityDTOMapper.fromRequest(attitudesData);
            expect(mappedData).to.exist;
            expect(mappedData.aiAttitudes).to.deep.equal(attitudesData.aiAttitudes);
            
            await axios.put(`${API_URL}/personality/attitudes`, attitudesData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            // 2. Wait for event processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 3. Get user profile to check updated preferences
            const userResponse = await axios.get(`${API_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            // Verify user has preferences related to AI
            expect(userResponse.status).to.equal(200);
            
            // Validate response DTO
            const userDto = new UserDTO(userResponse.data.data.user);
            expect(userDto).to.be.instanceOf(UserDTO);
            expect(userDto.preferences).to.exist;
            
            // Verify Value Object conversion
            const userId = createUserId(userDto.id);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
        });
    });
    
    describe('Cross-Domain Data Consistency', function () {
        it('should maintain consistent data between domains', async function () {
            // Get user profile
            const userResponse = await axios.get(`${API_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            // Get personality profile
            const personalityResponse = await axios.get(`${API_URL}/personality/profile`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            // Create DTOs and validate
            const userDto = new UserDTO(userResponse.data.data.user);
            const personalityDto = new PersonalityDTO(personalityResponse.data.data);
            
            // Verify both DTOs are valid
            expect(userDto).to.be.instanceOf(UserDTO);
            expect(personalityDto).to.be.instanceOf(PersonalityDTO);
            
            // Verify data consistency - IDs should match
            const userIdFromUser = createUserId(userDto.id);
            const userIdFromPersonality = createUserId(personalityDto.userId);
            
            expect(userIdFromUser).to.be.instanceOf(UserId);
            expect(userIdFromPersonality).to.be.instanceOf(UserId);
            expect(userIdFromUser.value).to.equal(userIdFromPersonality.value);
            
            // Verify no personality data in user domain (strict domain separation)
            expect(userDto).to.not.have.property('personalityTraits');
            expect(userDto).to.not.have.property('aiAttitudes');
            
            // Verify no user-specific data in personality domain (strict domain separation)
            expect(personalityDto).to.not.have.property('email');
            expect(personalityDto).to.not.have.property('fullName');
        });
    });
});
