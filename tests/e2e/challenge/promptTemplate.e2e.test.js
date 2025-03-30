/**
 * Prompt Template E2E Tests
 * 
 * This test suite validates the Prompt Template API functionality:
 * 1. Generating prompt templates via AI with proper parameters
 * 2. Retrieving generated templates with correct structure
 * 3. Listing user prompt templates
 * 4. Rendering templates with variable substitution
 * 
 * These tests ensure that prompt templates can be created, managed,
 * and correctly rendered with variables for use in various domains.
 */

import { expect } from "chai";
import * as axios from "axios";
import testEnv from "../../loadEnv.js";
import { skipIfMissingEnv } from "../../helpers/testHelpers.js";
import { config } from "dotenv";
import * as apiTestHelper from "../../helpers/apiTestHelper.js";
import { PromptTemplateDTO, PromptTemplateDTOMapper } from "../../../src/core/prompt/dtos/index.js";
import { createUserId, createPromptTemplateId, UserId, PromptTemplateId } from "../../../src/core/common/valueObjects/index.js";

({ config }.config());

// Timeout for API requests
const API_TIMEOUT = 40000;

// Base URL for API requests
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

describe('E2E: Prompt Template API', function () {
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
    let axiosInstance;
    let testUser;
    let testUserId;
    let authToken;
    let generatedPromptId;
    let generatedPromptIdVO;

    before(async function () {
        // Skip tests if OpenAI API key is not available
        if (!testEnv.getTestConfig().openai.apiKey) {
            console.warn('OPENAI_API_KEY not found, skipping E2E tests');
            this.skip();
        }
        
        // Set up test user and auth token
        try {
            // Get test user
            testUser = await apiTestHelper.setupTestUser();
            console.log(`Test user created: ${testUser.email}`);
            
            // Create Value Object for user ID
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
            // Delete prompt if it exists
            if (generatedPromptId) {
                await apiTestHelper.apiRequest('delete', `/prompts/${generatedPromptId}`, null, authToken);
                console.log(`Prompt deleted: ${generatedPromptId}`);
            }
            
            // We're using a persistent test user, so no need to clean up
            console.log(`Test user retained: ${testUser.email}`);
        }
        catch (error) {
            console.warn('Failed to clean up test data:', error.message);
        }
    });

    describe('Prompt Template Flow', function () {
        it('should generate a prompt template using AI via the API', async function () {
            // Skip if no auth token is available
            if (!authToken) {
                this.skip();
            }
            
            // Step 1: Request AI-generated prompt template
            const generationData = {
                domain: 'challenge',
                description: 'A prompt for generating logical reasoning challenges that test critical thinking skills'
            };
            
            // Validate generation data using DTOMapper
            const mappedData = PromptTemplateDTOMapper.fromRequest(generationData);
            expect(mappedData).to.exist;
            
            const generationResponse = await apiTestHelper.apiRequest('post', '/prompts/generate', generationData, authToken);
            
            // Verify prompt template generation
            expect(generationResponse.status).to.equal(200);
            expect(generationResponse.data.success).to.be.true;
            expect(generationResponse.data.data).to.exist;
            
            // Create a DTO and validate it
            const promptTemplateDto = new PromptTemplateDTO(generationResponse.data.data);
            expect(promptTemplateDto).to.be.instanceOf(PromptTemplateDTO);
            
            // Save prompt ID for later
            generatedPromptId = generationResponse.data.data.id;
            generatedPromptIdVO = createPromptTemplateId(generatedPromptId);
            
            // Step 2: Retrieve the generated prompt template
            const retrieveResponse = await apiTestHelper.apiRequest('get', `/prompts/${generatedPromptId}`, null, authToken);
            
            // Verify retrieved prompt template
            expect(retrieveResponse.status).to.equal(200);
            expect(retrieveResponse.data.success).to.be.true;
            expect(retrieveResponse.data.data).to.exist;
            
            // Create a DTO and validate it
            const retrievedPromptDto = new PromptTemplateDTO(retrieveResponse.data.data);
            expect(retrievedPromptDto).to.be.instanceOf(PromptTemplateDTO);
            
            // Verify prompt template structure
            const promptTemplateId = createPromptTemplateId(retrievedPromptDto.id);
            expect(promptTemplateId).to.be.instanceOf(PromptTemplateId);
            expect(promptTemplateId.value).to.equal(generatedPromptId);
            
            expect(retrievedPromptDto.name).to.be.a('string').and.not.empty;
            expect(retrievedPromptDto.description).to.be.a('string').and.not.empty;
            expect(retrievedPromptDto.template).to.be.a('string').and.not.empty;
            expect(retrievedPromptDto.variables).to.be.an('array').and.not.empty;
            expect(retrievedPromptDto.domain).to.equal(generationData.domain);
            
            // If userId is available in the DTO, validate it as a Value Object
            if (retrievedPromptDto.userId) {
                const userId = createUserId(retrievedPromptDto.userId);
                expect(userId).to.be.instanceOf(UserId);
                expect(userId.value).to.equal(testUser.id);
            }
            
            console.log('Successfully generated and retrieved prompt template:', {
                id: retrievedPromptDto.id,
                name: retrievedPromptDto.name
            });
        });

        it('should list user prompt templates including the generated one', async function () {
            // Skip if no prompt was created
            if (!generatedPromptId || !authToken) {
                this.skip();
            }
            
            const listResponse = await apiTestHelper.apiRequest('get', '/prompts/user', null, authToken);
            
            // Verify list response
            expect(listResponse.status).to.equal(200);
            expect(listResponse.data.success).to.be.true;
            expect(listResponse.data.data).to.be.an('array');
            
            // Verify the prompt we created is in the list
            const userPrompts = listResponse.data.data;
            const createdPrompt = userPrompts.find(p => p.id === generatedPromptId);
            expect(createdPrompt).to.exist;
            
            // Create a DTO and validate it
            const foundPromptDto = new PromptTemplateDTO(createdPrompt);
            expect(foundPromptDto).to.be.instanceOf(PromptTemplateDTO);
            
            // Verify the prompt ID is correct
            const foundPromptId = createPromptTemplateId(foundPromptDto.id);
            expect(foundPromptId).to.be.instanceOf(PromptTemplateId);
            expect(foundPromptId.value).to.equal(generatedPromptId);
            
            // If userId is available in the DTO, validate it as a Value Object
            if (foundPromptDto.userId) {
                const userId = createUserId(foundPromptDto.userId);
                expect(userId).to.be.instanceOf(UserId);
                expect(userId.value).to.equal(testUser.id);
            }
        });

        it('should render a prompt template with variables', async function () {
            // Skip if no prompt was created
            if (!generatedPromptId || !authToken) {
                this.skip();
            }
            
            // Step 1: Get the prompt template to determine variables
            const promptResponse = await apiTestHelper.apiRequest('get', `/prompts/${generatedPromptId}`, null, authToken);
            
            // Create a DTO and validate it
            const promptTemplateDto = new PromptTemplateDTO(promptResponse.data.data);
            expect(promptTemplateDto).to.be.instanceOf(PromptTemplateDTO);
            
            const variables = promptTemplateDto.variables;
            
            // Create test values for each variable
            const variableValues = {};
            variables.forEach(variable => {
                variableValues[variable] = `Test value for ${variable}`;
            });
            
            // Step 2: Render the prompt with variables
            const renderData = { variables: variableValues };
            
            // Validate render data if a mapper method exists
            if (PromptTemplateDTOMapper.fromRenderRequest) {
                const mappedRenderData = PromptTemplateDTOMapper.fromRenderRequest(renderData);
                expect(mappedRenderData).to.exist;
            }
            
            const renderResponse = await apiTestHelper.apiRequest(
                'post', 
                `/prompts/${generatedPromptId}/render`, 
                renderData, 
                authToken
            );
            
            // Verify render response
            expect(renderResponse.status).to.equal(200);
            expect(renderResponse.data.success).to.be.true;
            expect(renderResponse.data.data).to.exist;
            expect(renderResponse.data.data.renderedPrompt).to.be.a('string').and.not.empty;
            
            // Verify variables were replaced
            const renderedPrompt = renderResponse.data.data.renderedPrompt;
            
            // Each variable value should appear in the rendered prompt
            Object.values(variableValues).forEach(value => {
                expect(renderedPrompt).to.include(value);
            });
            
            // No variable placeholders should remain
            variables.forEach(variable => {
                expect(renderedPrompt).to.not.include(`{${variable}}`);
            });
        });
    });
});
