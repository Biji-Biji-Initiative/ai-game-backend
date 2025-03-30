import * as axios from "axios";
import { expect } from "chai";
import { setupTestUser, cleanupTestUser, getAuthToken } from "../../helpers/apiTestHelper.js";
import UserDTOMapper from "../../../src/application/user/mappers/UserDTOMapper.js";
import UserProfileDTOMapper from "../../../src/application/user/mappers/UserProfileDTOMapper.js";
// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
describe('User API Endpoints', function () {
    // Increase timeout for real API calls
    this.timeout(10000);
    let testUser;
    let authToken;
    before(async function () {
        // Create a test user in Supabase and get auth token
        testUser = await setupTestUser();
        authToken = await getAuthToken(testUser.email, testUser.password);
    });
    after(async function () {
        // Clean up test user after tests
        if (testUser && testUser.id) {
            await cleanupTestUser(testUser.id);
        }
    });
    describe('GET /users/me', function () {
        it('should get the current user profile', async function () {
            // Make actual API call
            const response = await axios.get(`${API_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            expect(response.data.data.user).to.exist;
            expect(response.data.data.user.email).to.equal(testUser.email);
        });
    });
    describe('PUT /users/me', function () {
        it('should update the user profile', async function () {
            const updateData = {
                name: `Updated Name ${Date.now()}`,
                professionalTitle: 'Updated Test Engineer',
                location: 'Updated City'
            };
            // Make actual API call
            const response = await axios.put(`${API_URL}/users/me`, updateData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            expect(response.data.data.user.fullName).to.equal(updateData.name);
            expect(response.data.data.user.professionalTitle).to.equal(updateData.professionalTitle);
            expect(response.data.data.user.location).to.equal(updateData.location);
        });
        it('should reject invalid update data', async function () {
            try {
                // Try to update with invalid data
                await axios.put(`${API_URL}/users/me`, { name: '' }, // Empty name should be rejected
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
            }
        });
    });
    describe('PUT /users/me/focus-area', function () {
        it('should update the user focus area', async function () {
            const focusAreaData = {
                focusArea: 'productivity'
            };
            // Make actual API call
            const response = await axios.put(`${API_URL}/users/me/focus-area`, focusAreaData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            expect(response.data.data.user.focusArea).to.equal(focusAreaData.focusArea);
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
            }
        });
    });
});
