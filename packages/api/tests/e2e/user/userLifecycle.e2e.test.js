import { jest } from '@jest/globals';
import axios from "axios";
import { expect } from "chai";
import { setupTestUser, cleanupTestUser, getAuthToken } from "@helpers/apiTestHelper.js";
import { UserDTO } from '@src/core/user/dtos/UserDTO.js';
import { createUserId, UserId } from '@src/core/common/valueObjects/index.js';
import UserDTOMapper from '@src/application/user/mappers/UserDTOMapper.js';
import UserProfileDTOMapper from '@src/application/user/mappers/UserProfileDTOMapper.js';

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

describe('User API Endpoints (Real)', function () {
    // Increase timeout for real API calls
    jest.setTimeout(10000);
    
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

    describe('GET /users/me', function () {
        it('should get the current user profile and return a valid UserDTO', async function () {
            // Make actual API call
            const response = await axios.get(`${API_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            
            // Validate response against UserDTO structure
            const userDto = response.data.data.user;
            expect(userDto).to.exist;
            
            // Create a DTO instance to validate structure
            const validatedDto = new UserDTO(userDto);
            expect(validatedDto).to.be.instanceOf(UserDTO);
            
            // Verify Value Object conversion
            const userId = createUserId(userDto.id);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
            
            // Verify DTO properties
            expect(validatedDto.email).to.equal(testUser.email);
            expect(validatedDto).to.have.property('fullName');
            expect(validatedDto).to.have.property('professionalTitle');
            expect(validatedDto).to.have.property('location');
            expect(validatedDto).to.have.property('focusArea');
            expect(validatedDto).to.have.property('lastActive');
            expect(validatedDto).to.have.property('createdAt');
            expect(validatedDto).to.have.property('isActive');
            expect(validatedDto).to.have.property('hasCompletedProfile');
            expect(validatedDto).to.have.property('preferences').that.is.an('object');
        });
    });

    describe('PUT /users/me', function () {
        it('should update the user profile using valid UserDTOMapper input format', async function () {
            const updateData = {
                fullName: `Updated Name ${Date.now()}`,
                professionalTitle: 'Updated Test Engineer',
                location: 'Updated City',
                country: 'Updated Country'
            };

            // Validate update data using DTOMapper
            const mappedData = UserDTOMapper.fromRequest(updateData);
            expect(mappedData).to.exist;

            // Make actual API call
            const response = await axios.put(`${API_URL}/users/me`, updateData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            
            // Validate response DTO
            const userDto = new UserDTO(response.data.data.user);
            expect(userDto).to.be.instanceOf(UserDTO);
            expect(userDto.fullName).to.equal(updateData.fullName);
            expect(userDto.professionalTitle).to.equal(updateData.professionalTitle);
            expect(userDto.location).to.equal(updateData.location);
            expect(userDto.country).to.equal(updateData.country);
        });

        it('should also handle firstName/lastName combination using fromRequest structure', async function () {
            const updateData = {
                firstName: 'Test',
                lastName: `User ${Date.now()}`,
                professionalTitle: 'QA Engineer'
            };

            // Validate update data using DTOMapper
            const mappedData = UserDTOMapper.fromRequest(updateData);
            expect(mappedData).to.exist;
            expect(mappedData.fullName).to.equal(`${updateData.firstName} ${updateData.lastName}`);

            // Make actual API call
            const response = await axios.put(`${API_URL}/users/me`, updateData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            
            // Validate response DTO
            const userDto = new UserDTO(response.data.data.user);
            expect(userDto).to.be.instanceOf(UserDTO);
            expect(userDto.fullName).to.equal(`${updateData.firstName} ${updateData.lastName}`);
        });

        it('should reject invalid update data according to fromRequest validation', async function () {
            try {
                // Try to update with invalid data - empty name instead of fullName
                await axios.put(`${API_URL}/users/me`, { fullName: '' },
                {
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

    describe('PUT /users/me/focus-area', function () {
        it('should update the user focus area using the correct DTO structure', async function () {
            const focusAreaData = {
                focusArea: 'productivity'
            };

            // Validate focus area data using DTOMapper
            const mappedData = UserDTOMapper.fromRequest(focusAreaData);
            expect(mappedData).to.exist;
            expect(mappedData.focusArea).to.equal(focusAreaData.focusArea);

            // Make actual API call
            const response = await axios.put(`${API_URL}/users/me/focus-area`, focusAreaData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            
            // Validate response DTO
            const userDto = new UserDTO(response.data.data.user);
            expect(userDto).to.be.instanceOf(UserDTO);
            expect(userDto.id).to.be.a('string');
            expect(userDto.focusArea).to.equal(focusAreaData.focusArea);
        });
    });

    describe('Authentication Required', function () {
        it('should reject requests without auth token', async function () {
            try {
                // Try to make request without auth token
                await axios.get(`${API_URL}/users/me`);
                // If we reach here, the test has failed
                throw new Error('Expected API call to fail with 401');
            }
            catch (error) {
                // Verify error response
                expect(error.response.status).to.equal(401);
                expect(error.response.data.status).to.equal('error');
            }
        });
    });
});
