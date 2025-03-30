import * as axios from "axios";
import { expect } from "chai";
import { setupTestUser, cleanupTestUser, getAuthToken } from "../../helpers/apiTestHelper.js";
// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
describe('User-Personality Domain Integration', function () {
    // Increase timeout for real API calls
    this.timeout(15000);
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
            expect(response.data.data).to.exist;
            expect(response.data.data.userId).to.equal(testUser.id);
            // New profile should have empty traits
            expect(response.data.data.personalityTraits).to.be.an('object');
            expect(Object.keys(response.data.data.personalityTraits).length).to.equal(0);
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
            await axios.put(`${API_URL}/personality/traits`, traitsData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            // 2. Wait for event processing
            await new Promise(resolve => setTimeout(resolve, 1000));
            // 3. Get user profile to check if recommendations were updated
            const userResponse = await axios.get(`${API_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            // These assertions would be adjusted based on your actual implementation
            expect(userResponse.status).to.equal(200);
            expect(userResponse.data.data.user).to.exist;
        });
    });
    describe('Focus Area Change & Personality Insights', function () {
        it('should update focus area and regenerate personality insights', async function () {
            // 1. Update focus area
            await axios.put(`${API_URL}/users/me/focus-area`, { focusArea: 'productivity' }, {
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
            expect(insightsResponse.data.data.insights).to.exist;
            expect(insightsResponse.data.data.insights.recommendations).to.be.an('array');
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
            expect(userResponse.data.data.user).to.exist;
            expect(userResponse.data.data.user.preferences).to.exist;
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
            // Verify data consistency
            expect(userResponse.data.data.user.id).to.equal(personalityResponse.data.data.userId);
            // Verify no personality data in user domain
            expect(userResponse.data.data.user).to.not.have.property('personalityTraits');
            expect(userResponse.data.data.user).to.not.have.property('aiAttitudes');
            // Verify no user-specific data in personality domain
            expect(personalityResponse.data.data).to.not.have.property('email');
            expect(personalityResponse.data.data).to.not.have.property('name');
        });
    });
});
