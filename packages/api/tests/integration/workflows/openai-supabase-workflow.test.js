import { jest } from '@jest/globals';
import { expect } from "chai";
import { v4 as uuidv4 } from "uuid";
import testEnv from "@tests/loadEnv.js";
import { skipIfMissingEnv } from "@helpers/testHelpers.js";
import { config } from "dotenv";
import * as apiTestHelper from "@helpers/apiTestHelper.js";
import openai from '@src/infra/openai.js';
import { createClient } from "@supabase/supabase-js";
import { createUserId, createChallengeId, UserId, ChallengeId } from '@src/core/common/valueObjects/index.js';
import { ChallengeDTO, ChallengeDTOMapper } from '@src/core/challenge/dtos/index.js';
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError, ChallengeRepositoryError, ChallengeGenerationError } from '@src/core/challenge/errors/ChallengeErrors.js';
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError, ChallengeRepositoryError, ChallengeGenerationError } from "@src/core/challenge/errors/ChallengeErrors.js";
({ config }.config());
// Test variables
const TEST_ID = `test_${Date.now()}`;
// Use a known test user email that exists in the database
const TEST_USER_EMAIL = 'permanent-test-user@example.com';
describe('Integration: OpenAI to Supabase Workflow', function () {
    before(function () {
        skipIfMissingEnv(this, 'openai');
    });
    // Set longer timeout for API calls
    jest.setTimeout(30000);
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
    let challengeRepository;
    let testUserIdVO;
    beforeEach(function () {
        // Create OpenAI client
        const { OpenAIClient } = openai;
        openaiClient = new OpenAIClient({ apiKey: testEnv.getTestConfig().openai.apiKey
        });
        supabaseClient = createClient(testEnv.getTestConfig().supabase.url, testEnv.getTestConfig().supabase.key);
        // Create a simple Challenge class for this test
        /**
         *
         */
        class Challenge {
            /**
             *
             */
            constructor(data) {
                this.id = data.id || createChallengeId(uuidv4());
                this.title = data.title;
                this.content = { description: data.description };
                this.difficulty = data.difficulty || 'medium';
                this.challenge_type = data.category || 'logical-reasoning';
                this.format_type = data.format_type || 'text';
                this.focus_area = data.focus_area || 'reasoning';
                this.status = 'test';
                this.created_at = data.createdAt || new Date().toISOString();
                this.ai_generated = true;
                this.userId = data.userId || testUserIdVO || createUserId(TEST_USER_EMAIL);
            }
        }
        // Create challenge repository that uses Supabase
        challengeRepository = {
            save: async (challenge) => {
                try {
                    console.log('Saving challenge with userId:', challenge.userId instanceof UserId ? challenge.userId.value : challenge.userId);
                    
                    // Convert the challenge to a DTO format for storage
                    const challengeDTO = ChallengeDTOMapper.toDTO(challenge);
                    
                    const { data, error } = await supabaseClient
                        .from('challenges')
                        .upsert({
                            id: challenge.id instanceof ChallengeId ? challenge.id.value : challenge.id,
                            title: challenge.title,
                            content: challenge.content,
                            difficulty: challenge.difficulty,
                            challenge_type: challenge.challenge_type,
                            format_type: challenge.format_type,
                            focus_area: challenge.focus_area,
                            status: challenge.status,
                            created_at: challenge.created_at,
                            ai_generated: challenge.ai_generated,
                            user_email: challengeDTO.user_email || TEST_USER_EMAIL
                        })
                        .select();

                    if (error) {
                        console.error('Error saving challenge:', error);
                        throw new Error('Failed to save challenge: ' + error.message);
                    }

                    // Convert the database data back to a domain model
                    return data && data.length > 0 
                        ? new Challenge({
                            id: createChallengeId(data[0].id),
                            title: data[0].title,
                            description: data[0].content?.description || 'No description',
                            difficulty: data[0].difficulty,
                            category: data[0].challenge_type,
                            format_type: data[0].format_type,
                            focus_area: data[0].focus_area,
                            createdAt: data[0].created_at,
                            userId: createUserId(data[0].user_email || TEST_USER_EMAIL)
                        }) 
                        : challenge;
                }
                catch (ChallengeError) {
                    console.error('Repository save error:', e.message);
                    throw e;
                }
            },
            findById: async (id) => {
                try {
                    // Convert ID to primitive for database query if it's a Value Object
                    const idValue = id instanceof ChallengeId ? id.value : id;
                    
                    const { data, error } = await supabaseClient
                        .from('challenges')
                        .select('*')
                        .eq('id', idValue)
                        .single();

                    if (error) {
                        throw new Error('Failed to find challenge: ' + error.message);
                    }

                    // Convert the database data to a domain model with Value Objects
                    return new Challenge({
                        id: createChallengeId(data.id),
                        title: data.title,
                        description: data.content?.description || 'No description',
                        difficulty: data.difficulty,
                        category: data.challenge_type,
                        createdAt: data.created_at,
                        userId: createUserId(data.user_email || TEST_USER_EMAIL)
                    });
                }
                catch (ChallengeError) {
                    console.error('Repository find error:', e.message);
                    throw e;
                }
            },
            delete: async (id) => {
                try {
                    // Convert ID to primitive for database query if it's a Value Object
                    const idValue = id instanceof ChallengeId ? id.value : id;
                    
                    const { error } = await supabaseClient
                        .from('challenges')
                        .delete()
                        .eq('id', idValue);

                    if (error) {
                        throw new Error('Failed to delete challenge: ' + error.message);
                    }
                    return true;
                }
                catch (ChallengeError) {
                    console.error('Repository delete error:', e.message);
                    throw e;
                }
            }
        };
    });
    afterEach(async function () {
        // Clean up any test data - we'll implement this in the test itself
    });
    it('should generate a challenge and save it to Supabase', async function () {
        // 1. ARRANGE
        const category = 'logical-reasoning';
        let challenge = null;
        let challengeIdVO = null;
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
                    testUserIdVO = createUserId(testUser.email);
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
                        testUserIdVO = createUserId(testUserEmail);
                        console.log('Using existing user from database:', testUserEmail);
                    }
                    else {
                        console.warn('Could not find any users in the database, test may fail');
                        // Create a default test user ID
                        testUserIdVO = createUserId(testUserEmail);
                    }
                }
            }
            else {
                console.log('Found existing test user:', testUserEmail);
                testUserIdVO = createUserId(testUserEmail);
            }
            // 2. ACT - Generate the challenge
            const prompt = `Generate a cognitive challenge in the ${category} category. 
        The challenge should test critical thinking and problem-solving abilities.
        Format the response as a JSON object with these properties:
        title: A catchy title for the challenge
        description: A detailed description of the challenge
        difficulty: The difficulty level (easy, medium, or hard)`;
            const completion = await openaiClient.responses.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are an expert at creating engaging cognitive challenges that test problem-solving abilities.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' }
            });
            const responseText = completion.choices[0].message.content;
            const challengeData = JSON.parse(responseText);
            // Create a challenge ID Value Object
            challengeIdVO = createChallengeId(uuidv4());
            // Create a Challenge domain model instance with test identifier
            challenge = {
                id: challengeIdVO,
                title: `TEST-${TEST_ID}: ${challengeData.title}`,
                content: { description: challengeData.description },
                difficulty: challengeData.difficulty,
                challenge_type: category,
                format_type: 'text',
                focus_area: 'reasoning',
                status: 'test',
                created_at: new Date().toISOString(),
                ai_generated: true,
                userId: testUserIdVO
            };
            // Save to Supabase
            const savedChallenge = await challengeRepository.save(challenge);
            // 3. ASSERT - Verify saved challenge
            expect(savedChallenge).to.exist;
            expect(savedChallenge.id).to.be.instanceOf(ChallengeId);
            expect(savedChallenge.id.value).to.equal(challengeIdVO.value);
            expect(savedChallenge.userId).to.be.instanceOf(UserId);
            expect(savedChallenge.userId.value).to.equal(testUserIdVO.value);
            // Retrieve from Supabase to verify
            const retrievedChallenge = await challengeRepository.findById(challengeIdVO);
            // Verify retrieved challenge
            expect(retrievedChallenge).to.exist;
            expect(retrievedChallenge.id).to.be.instanceOf(ChallengeId);
            expect(retrievedChallenge.id.value).to.equal(challengeIdVO.value);
            expect(retrievedChallenge.title).to.include(TEST_ID); // Ensure we found our test record
            expect(retrievedChallenge.userId).to.be.instanceOf(UserId);
        }
        finally {
            // Clean up - Delete test data
            if (challengeIdVO) {
                try {
                    await challengeRepository.delete(challengeIdVO);
                    console.log(`Test challenge deleted: ${challengeIdVO.value}`);
                }
                catch (cleanupError) {
                    console.warn('Failed to delete test challenge:', cleanupError.message);
                }
            }
        }
    });
});
