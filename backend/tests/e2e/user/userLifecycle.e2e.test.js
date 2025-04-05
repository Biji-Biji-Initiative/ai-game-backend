/**
 * E2E Tests for User Lifecycle
 *
 * This test suite covers the complete user profile management lifecycle:
 * - Fetching user profile
 * - Updating user details
 * - Updating user focus area
 * - Testing validation and error scenarios
 */
import { expect } from "chai";
import { v4 as uuidv4 } from "uuid";
import { setupTestUser, cleanupTestUser, getAuthToken, apiRequest } from "../../helpers/apiTestHelper.js";
import { UserDTO, UserDTOMapper } from "../../../src/core/user/dtos/UserDTO.js";
import { createUserId, UserId } from "../../../src/core/common/valueObjects/index.js";
import UserProfileDTOMapper from "../../../src/application/user/mappers/UserProfileDTOMapper.js";

describe('User Profile Management E2E Tests', function () {
    // Increase timeout for real API calls
    this.timeout(15000);
    
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

    describe('GET /api/v1/users/me', function () {
        it('should fetch the current user profile with all expected fields', async function () {
            // Make API request using helper
            const response = await apiRequest('get', 'api/v1/users/me', null, authToken);

            // Add debugging logs
            console.log('Full response:', JSON.stringify(response.data, null, 2));
            console.log('Auth token used:', authToken);

            // Verify response
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            expect(response.data.data).to.have.property('user');
            
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
            
            // Verify specific DTO properties
            expect(validatedDto.id).to.equal(testUser.id);
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

    describe('PUT /api/v1/users/me', function () {
        it('should update the user profile and verify persistence via subsequent GET', async function () {
            const uniqueSuffix = Date.now();
            const updateData = {
                fullName: `Updated Name ${uniqueSuffix}`,
                professionalTitle: 'Updated Test Engineer',
                location: 'Updated City',
                country: 'Updated Country'
            };

            // Validate update data using DTOMapper
            const mappedData = UserDTOMapper.fromRequest(updateData);
            expect(mappedData).to.exist;

            // Make PUT request to update profile
            const updateResponse = await apiRequest('put', 'api/v1/users/me', updateData, authToken);

            // Verify update response
            expect(updateResponse.status).to.equal(200);
            expect(updateResponse.data.success).to.be.true;
            
            // Validate response DTO
            const updatedDto = new UserDTO(updateResponse.data.data.user);
            expect(updatedDto).to.be.instanceOf(UserDTO);
            expect(updatedDto.fullName).to.equal(updateData.fullName);
            expect(updatedDto.professionalTitle).to.equal(updateData.professionalTitle);
            expect(updatedDto.location).to.equal(updateData.location);
            expect(updatedDto.country).to.equal(updateData.country);
            
            // Make a separate GET request to verify persistence
            const getResponse = await apiRequest('get', 'api/v1/users/me', null, authToken);
            
            // Verify GET response
            expect(getResponse.status).to.equal(200);
            expect(getResponse.data.success).to.be.true;
            
            // Validate DTO from GET response
            const fetchedDto = new UserDTO(getResponse.data.data.user);
            expect(fetchedDto.fullName).to.equal(updateData.fullName);
            expect(fetchedDto.professionalTitle).to.equal(updateData.professionalTitle);
            expect(fetchedDto.location).to.equal(updateData.location);
            expect(fetchedDto.country).to.equal(updateData.country);
        });

        it('should handle firstName/lastName combination and verify via GET', async function () {
            const uniqueSuffix = Date.now();
            const updateData = {
                firstName: 'Test',
                lastName: `User ${uniqueSuffix}`,
                professionalTitle: 'QA Engineer'
            };

            // Validate update data using DTOMapper
            const mappedData = UserDTOMapper.fromRequest(updateData);
            expect(mappedData).to.exist;
            expect(mappedData.fullName).to.equal(`${updateData.firstName} ${updateData.lastName}`);

            // Make update request
            const updateResponse = await apiRequest('put', 'api/v1/users/me', updateData, authToken);

            // Verify update response
            expect(updateResponse.status).to.equal(200);
            expect(updateResponse.data.success).to.be.true;
            
            // Validate update response DTO
            const updatedDto = new UserDTO(updateResponse.data.data.user);
            expect(updatedDto).to.be.instanceOf(UserDTO);
            expect(updatedDto.fullName).to.equal(`${updateData.firstName} ${updateData.lastName}`);
            
            // Make separate GET request to verify persistence
            const getResponse = await apiRequest('get', 'api/v1/users/me', null, authToken);
            
            // Verify GET response
            expect(getResponse.status).to.equal(200);
            expect(getResponse.data.success).to.be.true;
            
            // Validate DTO from GET response
            const fetchedDto = new UserDTO(getResponse.data.data.user);
            expect(fetchedDto.fullName).to.equal(`${updateData.firstName} ${updateData.lastName}`);
            expect(fetchedDto.professionalTitle).to.equal(updateData.professionalTitle);
        });

        it('should reject empty fullName', async function () {
            // Try to update with invalid data - empty name
            const response = await apiRequest('put', 'api/v1/users/me', { fullName: '' }, authToken);
            
            // Verify error response
            expect(response.status).to.equal(400);
            expect(response.data.success).to.be.false;
            expect(response.data.message).to.include('validation');
        });
        
        it('should reject excessively long input values', async function () {
            // Generate very long string
            const veryLongString = 'a'.repeat(1000);
            
            // Try to update with excessively long data
            const response = await apiRequest('put', 'api/v1/users/me', { 
                fullName: veryLongString 
            }, authToken);
            
            // Verify error response
            expect(response.status).to.equal(400);
            expect(response.data.success).to.be.false;
        });
        
        it('should reject invalid data types', async function () {
            // Try to update with invalid data types
            const response = await apiRequest('put', 'api/v1/users/me', { 
                fullName: 123, // Number instead of string
                location: true // Boolean instead of string
            }, authToken);
            
            // Verify error response
            expect(response.status).to.equal(400);
            expect(response.data.success).to.be.false;
        });
    });

    describe('PUT /api/v1/users/me/focus-area', function () {
        it('should update focus area and verify via subsequent GET', async function () {
            const focusAreaData = {
                focusArea: `productivity-${Date.now()}`
            };

            // Validate focus area data using DTOMapper
            const mappedData = UserDTOMapper.fromRequest(focusAreaData);
            expect(mappedData).to.exist;
            expect(mappedData.focusArea).to.equal(focusAreaData.focusArea);

            // Make update request
            const updateResponse = await apiRequest('put', 'api/v1/users/me/focus-area', focusAreaData, authToken);

            // Verify response
            expect(updateResponse.status).to.equal(200);
            expect(updateResponse.data.success).to.be.true;
            
            // Validate response DTO
            const updatedDto = new UserDTO(updateResponse.data.data.user);
            expect(updatedDto).to.be.instanceOf(UserDTO);
            expect(updatedDto.id).to.be.a('string');
            expect(updatedDto.focusArea).to.equal(focusAreaData.focusArea);
            
            // Make separate GET request to verify persistence
            const getResponse = await apiRequest('get', 'api/v1/users/me', null, authToken);
            
            // Verify GET response
            expect(getResponse.status).to.equal(200);
            expect(getResponse.data.success).to.be.true;
            
            // Validate DTO from GET response
            const fetchedDto = new UserDTO(getResponse.data.data.user);
            expect(fetchedDto.focusArea).to.equal(focusAreaData.focusArea);
        });
        
        it('should reject invalid focus area format', async function () {
            // Try to update with invalid focus area
            const response = await apiRequest('put', 'api/v1/users/me/focus-area', { 
                focusArea: '' // Empty focus area
            }, authToken);
            
            // Verify error response
            expect(response.status).to.equal(400);
            expect(response.data.success).to.be.false;
        });
    });

    describe('Authentication Required', function () {
        it('should reject requests without auth token', async function () {
            // Try to make request without token
            const response = await apiRequest('get', 'api/v1/users/me');
            
            // Verify error response
            expect(response.status).to.equal(401);
            expect(response.data.success).to.be.false;
        });
        
        it('should reject profile updates with invalid token', async function () {
            // Try to update with invalid token
            const response = await apiRequest('put', 'api/v1/users/me', {
                fullName: 'Test Update with Invalid Token'
            }, 'invalid-token');
            
            // Verify error response
            expect(response.status).to.equal(401);
            expect(response.data.success).to.be.false;
        });
    });
});
