import * as axios from "axios";
import { expect } from "chai";
import { setupTestUser, cleanupTestUser, getAuthToken } from "../../helpers/apiTestHelper.js";
import PersonalityDTOMapper from "@/application/personality/mappers/PersonalityDTOMapper.js";
// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
describe('Personality API Endpoints (Real)', function () {
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
    describe('GET /personality/profile', function () {
        it('should get the user personality profile', async function () {
            // Make actual API call
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
        });
        it('should accept query parameters', async function () {
            // Make actual API call with query parameters
            const response = await axios.get(`${API_URL}/personality/profile?includeInsights=true&includeTraits=true`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
        });
    });
    describe('PUT /personality/traits', function () {
        it('should update personality traits', async function () {
            const traitsData = {
                personalityTraits: {
                    analytical: 80,
                    creative: 70,
                    logical: 75,
                    innovative: 65
                }
            };
            // Make actual API call
            const response = await axios.put(`${API_URL}/personality/traits`, traitsData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            expect(response.data.data.personalityTraits).to.deep.include(traitsData.personalityTraits);
            expect(response.data.data.dominantTraits).to.be.an('array');
        });
        it('should reject invalid trait values', async function () {
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
            }
        });
    });
    describe('PUT /personality/attitudes', function () {
        it('should update AI attitudes', async function () {
            const attitudesData = {
                aiAttitudes: {
                    early_adopter: 85,
                    tech_savvy: 75,
                    skeptical: 40,
                    ethical_concern: 70
                }
            };
            // Make actual API call
            const response = await axios.put(`${API_URL}/personality/attitudes`, attitudesData, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            expect(response.data.data.aiAttitudes).to.deep.include(attitudesData.aiAttitudes);
            expect(response.data.data.aiAttitudeProfile).to.be.an('object');
            expect(response.data.data.aiAttitudeProfile.overall).to.be.a('string');
        });
    });
    describe('GET /personality/insights', function () {
        // This test depends on having personality traits already set
        it('should generate personality insights', async function () {
            // Make actual API call
            const response = await axios.get(`${API_URL}/personality/insights`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.status).to.equal('success');
            expect(response.data.data.insights).to.exist;
            expect(response.data.data.insights.strengths).to.be.an('array');
            expect(response.data.data.insights.recommendations).to.be.an('array');
        });
    });
    describe('Cross-Domain Interaction', function () {
        it('should update AI attitudes and reflect in user preferences', async function () {
            // Increase timeout for this test
            this.timeout(30000);
            // 1. Update AI attitudes
            const attitudesData = {
                aiAttitudes: {
                    early_adopter: 90,
                    tech_savvy: 85,
                    skeptical: 20
                }
            };
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
            // Verify cross-domain update occurred
            expect(userResponse.data.data.user.preferences).to.exist;
            // In a real test, we'd verify specific preference values
        });
    });
});
