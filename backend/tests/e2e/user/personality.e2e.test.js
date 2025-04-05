/**
 * Personality E2E Tests
 *
 * This test suite covers operations related to user personality:
 * - Fetching personality profiles
 * - Updating personality traits
 * - Updating AI attitudes
 * - Generating personality insights
 * - Cross-domain interactions between personality and user preferences
 */
import { expect } from "chai";
import { v4 as uuidv4 } from "uuid";
import { setupTestUser, cleanupTestUser, getAuthToken, apiRequest } from "../../helpers/apiTestHelper.js";
import { createUserId, UserId } from "../../../src/core/common/valueObjects/index.js";

describe('Personality E2E Tests', function () {
    // Restore test logic
    this.timeout(20000);
    
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

    describe('GET /api/v1/personality/profile', function () {
        it('should get the user personality profile and validate structure', async function () {
            // Make API request using helper
            const response = await apiRequest('get', 'api/v1/personality/profile', null, authToken);

            // Verify response status and basic success flag
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.be.an('object');
            
            // Validate expected properties directly on the response data
            expect(response.data.data).to.have.property('userId').that.is.a('string');
            expect(response.data.data).to.have.property('personalityTraits').that.is.an('object');
            expect(response.data.data).to.have.property('createdAt');
            expect(response.data.data).to.have.property('updatedAt');

            // Optionally, verify Value Object conversion if needed
            const userId = createUserId(response.data.data.userId);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
        });

        it('should accept query parameters for includeInsights and includeTraits', async function () {
            // Make API request with query parameters
            const response = await apiRequest('get', 'api/v1/personality/profile?includeInsights=true&includeTraits=true', null, authToken);

            // Verify response status and basic success flag
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.be.an('object');
            
            // Validate response structure (existence and type)
            expect(response.data.data).to.have.property('userId');
            
            // Check optional fields based on query params
            // These might or might not be present depending on backend logic
            if (response.data.data.insights !== undefined) {
                expect(response.data.data.insights).to.be.an('object');
                if (response.data.data.insights.strengths !== undefined) {
                    expect(response.data.data.insights.strengths).to.be.an('array');
                }
                 if (response.data.data.insights.recommendations !== undefined) {
                    expect(response.data.data.insights.recommendations).to.be.an('array');
                }
            }
            
            if (response.data.data.dominantTraits !== undefined) {
                 expect(response.data.data.dominantTraits).to.be.an('array');
            }
        });
    });

    describe('PUT /api/v1/personality/traits', function () {
        it('should update personality traits and verify via GET', async function () {
            const timestamp = Date.now();
            const traitsData = {
                personalityTraits: {
                    analytical: 80,
                    creative: 70,
                    logical: 75,
                    innovative: 65,
                    testTraitTimestamp: timestamp
                }
            };

            // Make update request
            const updateResponse = await apiRequest('put', 'api/v1/personality/traits', traitsData, authToken);

            // Verify update response
            expect(updateResponse.status).to.equal(200);
            expect(updateResponse.data.success).to.be.true;
            expect(updateResponse.data.data).to.be.an('object');
            expect(updateResponse.data.data.personalityTraits).to.deep.include(traitsData.personalityTraits);
            expect(updateResponse.data.data).to.have.property('dominantTraits').that.is.an('array'); // Check structure
            
            // Verify Value Object conversion
            const updatedUserId = createUserId(updateResponse.data.data.userId);
            expect(updatedUserId).to.be.instanceOf(UserId);
            expect(updatedUserId.value).to.equal(testUser.id);
            
            // Fetch profile separately to verify persistence
            const getResponse = await apiRequest('get', 'api/v1/personality/profile', null, authToken);
            
            // Verify GET response
            expect(getResponse.status).to.equal(200);
            expect(getResponse.data.success).to.be.true;
            expect(getResponse.data.data.personalityTraits).to.deep.include(traitsData.personalityTraits);
        });

        it('should reject invalid trait values', async function () {
            // Try to update with invalid trait values (> 100)
            const response = await apiRequest('put', 'api/v1/personality/traits', {
                personalityTraits: {
                    analytical: 150 // Value greater than 100 should be rejected
                }
            }, authToken);
            
            // Verify error response
            expect(response.status).to.equal(400);
            expect(response.data.success).to.be.false;
            expect(response.data.message).to.include('validation');
        });
    });

    describe('PUT /api/v1/personality/attitudes', function () {
        it('should update AI attitudes and verify via GET', async function () {
            const timestamp = Date.now();
            const attitudesData = {
                aiAttitudes: {
                    early_adopter: 85,
                    tech_savvy: 75,
                    skeptical: 40,
                    ethical_concern: 70,
                    test_timestamp: timestamp
                }
            };

            // Make update request
            const updateResponse = await apiRequest('put', 'api/v1/personality/attitudes', attitudesData, authToken);

            // Verify response
            expect(updateResponse.status).to.equal(200);
            expect(updateResponse.data.success).to.be.true;
            expect(updateResponse.data.data.aiAttitudes).to.deep.include(attitudesData.aiAttitudes);
            expect(updateResponse.data.data.aiAttitudeProfile).to.be.an('object'); // Check structure
            expect(updateResponse.data.data.aiAttitudeProfile.overall).to.be.a('string');
            
            // Verify Value Object conversion
            const userId = createUserId(updateResponse.data.data.userId);
            expect(userId).to.be.instanceOf(UserId);
            expect(userId.value).to.equal(testUser.id);
            
            // Fetch profile separately to verify persistence
            const getResponse = await apiRequest('get', 'api/v1/personality/profile', null, authToken);

            // Verify GET response
            expect(getResponse.status).to.equal(200);
            expect(getResponse.data.success).to.be.true;
            expect(getResponse.data.data.aiAttitudes).to.deep.include(attitudesData.aiAttitudes);
        });

        it('should reject invalid attitude values', async function () {
            // Try to update with invalid attitude values
            const response = await apiRequest('put', 'api/v1/personality/attitudes', {
                aiAttitudes: {
                    skeptical: 110 // Value greater than 100 should be rejected
                }
            }, authToken);
            
            // Verify error response
            expect(response.status).to.equal(400);
            expect(response.data.success).to.be.false;
            expect(response.data.message).to.include('validation');
        });
    });

    describe('POST /api/v1/personality/insights', function () {
        it('should generate personality insights and verify structure', async function () {
            // Optional: Update profile first to ensure data exists
            await apiRequest('put', 'api/v1/personality/traits', { personalityTraits: { analytical: 80 } }, authToken);

            // Request insights generation
            const response = await apiRequest('post', 'api/v1/personality/insights', null, authToken);
            
            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.be.an('object');
            
            // Validate insights structure directly on response data
            expect(response.data.data).to.have.property('strengths').that.is.an('array');
            expect(response.data.data).to.have.property('recommendations').that.is.an('array');
            
            // Fetch profile to verify insights are persisted (check structure again)
            const getResponse = await apiRequest('get', 'api/v1/personality/profile?includeInsights=true', null, authToken);
            expect(getResponse.data.data.insights).to.deep.equal(response.data.data);
        });
    });
    
    describe('Cross-domain Interaction: Personality and User Preferences', function () {
        it('should update user profile and verify personality profile remains consistent', async function () {
            // First, update user profile information 
            const profileUpdate = {
                full_name: 'Updated Test User Cross',
                professional_title: 'Cross Domain Tester',
                location: 'Integration City'
            };
            
            const userUpdateResponse = await apiRequest('put', 'api/v1/user/profile', profileUpdate, authToken);
            expect(userUpdateResponse.status).to.equal(200);
            
            // Now, fetch personality profile - check its structure and key fields
            const personalityResponse = await apiRequest('get', 'api/v1/personality/profile', null, authToken);
            expect(personalityResponse.status).to.equal(200);
            expect(personalityResponse.data.success).to.be.true;
            expect(personalityResponse.data.data).to.be.an('object');
            expect(personalityResponse.data.data).to.have.property('userId').that.equals(testUser.id);
            expect(personalityResponse.data.data).to.not.have.property('fullName'); // Ensure separation
        });
    });
});
