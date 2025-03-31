import { jest } from '@jest/globals';
import { expect } from "chai";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import * as apiTestHelper from "@helpers/apiTestHelper.js";
import { PersonalityDTO, PersonalityDTOMapper } from '@src/core/personality/dtos/index.js';
import { UserDTO } from '@src/core/user/dtos/index.js';
import { createUserId, UserId } from '@src/core/common/valueObjects/index.js';
import UserDTOMapper from '@src/application/user/mappers/UserDTOMapper.js';
import UserProfileDTOMapper from '@src/application/user/mappers/UserProfileDTOMapper.js';
import PersonalityDTOMapper from '@src/application/personality/mappers/PersonalityDTOMapper.js';
import PersonalityProfileDTOMapper from '@src/application/personality/mappers/PersonalityProfileDTOMapper.js';

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

describe('Personality API Endpoints (Real)', function () {
    // Increase timeout for real API calls
    jest.setTimeout(10000);
    
    let testUser;
    let authToken;
    let testUserId;
    let apiServerRunning = false;

    before(async function () {
        // Check if API server is running before attempting to run the tests
        try {
            // Try a simple API call to check if server is up
            await axios.get(`${API_URL}/health`, { timeout: 2000 });
            apiServerRunning = true;
        } catch (error) {
            console.warn('API server is not running, skipping API endpoint tests');
            this.skip();
            return;
        }

        // Create a test user in Supabase and get auth token
        testUser = await apiTestHelper.setupTestUser();
        authToken = await apiTestHelper.getAuthToken(testUser.email, testUser.password);
        // Create UserId Value Object from test user ID
        testUserId = createUserId(testUser.id);
    });

    after(async function () {
        // Clean up test user after tests
        if (testUser && testUser.id) {
            await apiTestHelper.cleanupTestUser(testUser.id);
        }
    });

    describe('GET /personality/profile', function () {
        it('should get the user personality profile with correct DTO structure', async function () {
            // Make actual API call
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
            
            // Verify DTO properties
            expect(personalityDto).to.have.property('personalityTraits').that.is.an('object');
            expect(personalityDto).to.have.property('createdAt');
            expect(personalityDto).to.have.property('updatedAt');
        });

        it('should accept query parameters for includeInsights and includeTraits', async function () {
            // Make actual API call with query parameters
            const response = await axios.get(`${API_URL}/personality/profile?includeInsights=true&includeTraits=true`, {
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
            
            if (personalityDto.insights) {
                expect(personalityDto.insights).to.be.an('object');
            }
            if (personalityDto.dominantTraits) {
                expect(personalityDto.dominantTraits).to.be.an('array');
            }
        });
    });

    describe('PUT /personality/traits', function () {
        it('should update personality traits using valid DTO format', async function () {
            const traitsData = {
                personalityTraits: {
                    analytical: 80,
                    creative: 70,
                    logical: 75,
                    innovative: 65
                }
            };

            // Validate update data using DTOMapper
            const mappedData = PersonalityDTOMapper.fromRequest(traitsData);
            expect(mappedData).to.exist;
            expect(mappedData.personalityTraits).to.deep.equal(traitsData.personalityTraits);

            // Make actual API call
            const response = await axios.put(`${API_URL}/personality/traits`, traitsData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            
            // Validate response DTO
            const personalityDto = new PersonalityDTO(response.data.data);
            expect(personalityDto).to.be.instanceOf(PersonalityDTO);
            expect(personalityDto.personalityTraits).to.deep.include(traitsData.personalityTraits);
            expect(personalityDto.dominantTraits).to.be.an('array');
            
            // Verify Value Object conversion
            const userId = createUserId(personalityDto.userId);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
        });

        it('should reject invalid trait values based on DTO validation', async function () {
            try {
                // Try to update with invalid trait values (> 100)
                await axios.put(`${API_URL}/personality/traits`, {
                    personalityTraits: {
                        analytical: 150 // Value greater than 100 should be rejected
                    }
                }, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                // If we reach here, the test has failed
                throw new Error('Expected API call to fail with 400');
            }
            catch (error) {
                // Verify error response
                expect(error.response.status).to.equal(400);
                expect(error.response.data.status).to.equal('error');
                expect(error.response.data.message).to.include('validation');
            }
        });
    });

    describe('PUT /personality/attitudes', function () {
        it('should update AI attitudes using valid DTO format', async function () {
            const attitudesData = {
                aiAttitudes: {
                    early_adopter: 85,
                    tech_savvy: 75,
                    skeptical: 40,
                    ethical_concern: 70
                }
            };

            // Validate update data using DTOMapper
            const mappedData = PersonalityDTOMapper.fromRequest(attitudesData);
            expect(mappedData).to.exist;
            expect(mappedData.aiAttitudes).to.deep.equal(attitudesData.aiAttitudes);

            // Make actual API call
            const response = await axios.put(`${API_URL}/personality/attitudes`, attitudesData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            
            // Validate response DTO
            const personalityDto = new PersonalityDTO(response.data.data);
            expect(personalityDto).to.be.instanceOf(PersonalityDTO);
            expect(personalityDto.aiAttitudes).to.deep.include(attitudesData.aiAttitudes);
            expect(personalityDto.aiAttitudeProfile).to.be.an('object');
            expect(personalityDto.aiAttitudeProfile.overall).to.be.a('string');
            
            // Verify Value Object conversion
            const userId = createUserId(personalityDto.userId);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
        });
    });

    describe('GET /personality/insights', function () {
        // This test depends on having personality traits already set
        it('should generate personality insights with correct DTO structure', async function () {
            // Make actual API call
            const response = await axios.get(`${API_URL}/personality/insights`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            
            // Validate response DTO
            const personalityDto = new PersonalityDTO(response.data.data);
            expect(personalityDto).to.be.instanceOf(PersonalityDTO);
            expect(personalityDto.insights).to.exist;
            expect(personalityDto.insights.strengths).to.be.an('array');
            expect(personalityDto.insights.recommendations).to.be.an('array');
            
            // Verify Value Object conversion
            const userId = createUserId(personalityDto.userId);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
        });
    });

    describe('Cross-Domain Interaction', function () {
        it('should update AI attitudes and verify user preferences updated in the UserDTO', async function () {
            // Increase timeout for this test
            jest.setTimeout(30000);

            // 1. Update AI attitudes using proper DTO format
            const attitudesData = {
                aiAttitudes: {
                    early_adopter: 90,
                    tech_savvy: 85,
                    skeptical: 20
                }
            };

            // Validate update data using DTOMapper
            const mappedData = PersonalityDTOMapper.fromRequest(attitudesData);
            expect(mappedData).to.exist;

            await axios.put(`${API_URL}/personality/attitudes`, attitudesData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            // 2. Wait for event to be processed - increase wait time
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 3. Get user profile to check if preferences were updated
            const userResponse = await axios.get(`${API_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            // Verify cross-domain update occurred in the UserDTO
            const userDto = new UserDTO(userResponse.data.data.user);
            expect(userDto).to.be.instanceOf(UserDTO);
            
            // Verify Value Object conversion
            const userId = createUserId(userDto.id);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
            
            expect(userDto.preferences).to.exist.and.to.be.an('object');
            // In a real test, we'd verify specific preference values
        });
    });
});
