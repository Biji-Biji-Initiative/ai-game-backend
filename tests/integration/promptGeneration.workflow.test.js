import { expect } from "chai";
import { v4 as uuidv4 } from "uuid";
import testEnv from "../loadEnv.js";
import { skipIfMissingEnv } from "../helpers/testHelpers.js";
import { config } from "dotenv";
import * as apiTestHelper from "../helpers/apiTestHelper.js";
import openai from "../../../src/infra/openai";
import { createClient } from "@supabase/supabase-js";
({ config }.config());
// Test variables
const TEST_ID = `test_${Date.now()}`;
// Use a known test user email that exists in the database
const TEST_USER_EMAIL = 'permanent-test-user@example.com';
describe('Integration: Prompt Generation Workflow', function () {
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    // Set longer timeout for API calls
    this.timeout(30000);
    // Skip if API keys not available
    before(function () {
        if (!testEnv.getTestConfig().openai.apiKey) {
            console.warn('OPENAI_API_KEY not found, skipping integration tests');
            this.skip();
        }
        if (!testEnv.getTestConfig().supabase.url || !testEnv.getTestConfig().supabase.key) {
            console.warn('SUPABASE credentials not found, skipping integration tests');
            this.skip();
        }
    });
    let openaiClient;
    let supabaseClient;
    let promptRepository;
    beforeEach(function () {
        // Create OpenAI client
        const { OpenAIClient } = openai;
        openaiClient = new OpenAIClient({ apiKey: testEnv.getTestConfig().openai.apiKey
        });
        supabaseClient = createClient(testEnv.getTestConfig().supabase.url, testEnv.getTestConfig().supabase.key);
        // Create a simple Prompt class for this test
        /**
         *
         */
        class Prompt {
            /**
             *
             */
            constructor(data) {
                this.id = data.id || uuidv4();
                this.name = data.name;
                this.description = data.description;
                this.template = data.template;
                this.variables = data.variables || [];
                this.domain = data.domain || 'challenge';
                this.created_at = data.createdAt || new Date().toISOString();
                this.user_email = data.user_email || TEST_USER_EMAIL;
                this.is_active = data.is_active !== undefined ? data.is_active : true;
            }
        }
        // Create prompt repository that uses Supabase
        promptRepository = {
            save: async (prompt) => {
                try {
                    console.log('Saving prompt with user_email:', prompt.user_email);
                    const { data, error } = await supabaseClient
                        .from('prompts')
                        .upsert({
                        id: prompt.id,
                        name: prompt.name,
                        description: prompt.description,
                        template: prompt.template,
                        variables: prompt.variables,
                        domain: prompt.domain,
                        created_at: prompt.created_at,
                        user_email: prompt.user_email,
                        is_active: prompt.is_active
                    })
                        .select();
                    if (error) {
                        console.error('Error saving prompt:', error);
                        throw new Error('Failed to save prompt: ' + error.message);
                    }
                    return data && data.length > 0 ? data[0] : prompt;
                }
                catch (e) {
                    console.error('Repository save error:', e.message);
                    throw e;
                }
            },
            findById: async (id) => {
                try {
                    const { data, error } = await supabaseClient
                        .from('prompts')
                        .select('*')
                        .eq('id', id)
                        .single();
                    if (error) {
                        throw new Error('Failed to find prompt: ' + error.message);
                    }
                    return new Prompt({
                        id: data.id,
                        name: data.name,
                        description: data.description,
                        template: data.template,
                        variables: data.variables,
                        domain: data.domain,
                        createdAt: data.created_at,
                        user_email: data.user_email,
                        is_active: data.is_active
                    });
                }
                catch (e) {
                    console.error('Repository find error:', e.message);
                    throw e;
                }
            },
            delete: async (id) => {
                try {
                    const { error } = await supabaseClient
                        .from('prompts')
                        .delete()
                        .eq('id', id);
                    if (error) {
                        throw new Error('Failed to delete prompt: ' + error.message);
                    }
                    return true;
                }
                catch (e) {
                    console.error('Repository delete error:', e.message);
                    throw e;
                }
            }
        };
    });
    afterEach(async function () {
        // Clean up any test data - we'll implement this in the test itself
    });
    it('should generate a prompt template and save it to Supabase', async function () {
        // 1. ARRANGE
        const domain = 'challenge';
        const description = 'A prompt for generating logical reasoning challenges that test critical thinking skills';
        let prompt = null;
        try {
            // First, ensure we have a valid test user in Supabase
            let testUserEmail = TEST_USER_EMAIL;
            // Try to verify if the test user exists in Supabase
            const { data: userData, error: userError } = await supabaseClient
                .from('users')
                .select('email')
                .eq('email', testUserEmail)
                .limit(1);
            if (userError || !userData || userData.length === 0) {
                console.log('Test user not found, trying to create or find one...');
                // Try to get a test user from the API helper
                try {
                    const testUser = await apiTestHelper.setupTestUser();
                    testUserEmail = testUser.email;
                    console.log('Using test user from API helper:', testUserEmail);
                }
                catch (userSetupError) {
                    console.warn('Could not set up test user:', userSetupError.message);
                    // Look for any user in the database as a fallback
                    const { data: anyUser, error: anyUserError } = await supabaseClient
                        .from('users')
                        .select('email')
                        .limit(1);
                    if (!anyUserError && anyUser && anyUser.length > 0) {
                        testUserEmail = anyUser[0].email;
                        console.log('Using existing user from database:', testUserEmail);
                    }
                    else {
                        console.warn('Could not find any users in the database, test may fail');
                    }
                }
            }
            else {
                console.log('Found existing test user:', testUserEmail);
            }
            // 2. ACT - Generate the prompt template
            const promptText = `Create a prompt template for an AI system in the ${domain} domain.
      
      Description: ${description}
      
      Provide a response in JSON format with these properties:
      name: A name for the prompt template (short but descriptive)
      description: A detailed description of what this prompt does
      template: The actual prompt template text with variables in curly braces like {variable_name}
      variables: An array of variable names that should be replaced in the template`;
            const completion = await openaiClient.responses.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are an expert prompt engineer who specializes in creating effective prompts for AI systems.' },
                    { role: 'user', content: promptText }
                ],
                response_format: { type: 'json_object' }
            });
            const responseText = completion.choices[0].message.content;
            const promptData = JSON.parse(responseText);
            // Create a prompt instance with test identifier
            prompt = {
                id: uuidv4(),
                name: `TEST-${TEST_ID}: ${promptData.name}`,
                description: promptData.description,
                template: promptData.template,
                variables: promptData.variables,
                domain: domain,
                created_at: new Date().toISOString(),
                user_email: testUserEmail,
                is_active: true
            };
            // Save to Supabase
            const savedPrompt = await promptRepository.save(prompt);
            // 3. ASSERT - Verify saved prompt
            expect(savedPrompt).to.exist;
            expect(savedPrompt.id).to.equal(prompt.id);
            // Retrieve from Supabase to verify
            const retrievedPrompt = await promptRepository.findById(prompt.id);
            // Verify retrieved prompt
            expect(retrievedPrompt).to.exist;
            expect(retrievedPrompt.id).to.equal(prompt.id);
            expect(retrievedPrompt.name).to.include(TEST_ID); // Ensure we found our test record
            expect(retrievedPrompt.template).to.equal(promptData.template);
            expect(retrievedPrompt.variables).to.deep.equal(promptData.variables);
        }
        finally {
            // Clean up - Delete test data
            if (prompt && prompt.id) {
                try {
                    await promptRepository.delete(prompt.id);
                    console.log(`Test prompt deleted: ${prompt.id}`);
                }
                catch (cleanupError) {
                    console.warn('Failed to delete test prompt:', cleanupError.message);
                }
            }
        }
    });
});
