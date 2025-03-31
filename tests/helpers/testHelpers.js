/**
 * Test Helpers
 *
 * A collection of helper functions to simplify testing across the application.
 * These helpers handle common tasks like creating test data, setting up mocks,
 * and verifying responses in a standardized way.
 */
import sinon from 'sinon';
import { v4 as uuidv4 } from 'uuid';
import { expect } from 'chai';
import OpenAIClient from "@/core/infra/openai/client.js";
import { MessageRole } from "@/core/infra/openai/types.js";
import testConfig from '../loadEnv.js';
/**
 * Creates an in-memory repository for testing
 * @param {Object} initialData - Optional initial data to populate the repository
 * @returns {Object} - Repository object with CRUD methods
 */
function createInMemoryRepository(initialData = {}) {
    const items = { ...initialData };
    return {
        save: async (item) => {
            const id = item.id || uuidv4();
            const savedItem = { ...item, id };
            items[id] = savedItem;
            return savedItem;
        },
        findById: async (id) => {
            return items[id] || null;
        },
        findAll: async () => {
            return Object.values(items);
        },
        findByFilter: async (filterFn) => {
            return Object.values(items).filter(filterFn);
        },
        update: async (id, updateData) => {
            if (!items[id]) {
                return null;
            }
            items[id] = { ...items[id], ...updateData };
            return items[id];
        },
        delete: async (id) => {
            if (!items[id]) {
                return false;
            }
            delete items[id];
            return true;
        },
        clear: async () => {
            Object.keys(items).forEach(key => delete items[key]);
        },
        // Additional methods for specific repositories
        findByUserId: async (userId) => {
            return Object.values(items).filter(item => item.userId === userId);
        },
        findByFocusArea: async (focusArea) => {
            return Object.values(items).filter(item => item.focusArea === focusArea);
        }
    };
}
/**
 * Creates an OpenAI client mock for testing
 * @param {Object} options - Configuration options
 * @param {Object} options.defaultResponse - Default response to return from sendMessage
 * @param {Object} options.defaultJsonResponse - Default response to return from sendJsonMessage
 * @returns {Object} - Mocked OpenAI client
 */
function createOpenAIClientMock(options = {}) {
    const sandbox = sinon.createSandbox();
    const responseId = options.responseId || `resp_${uuidv4()}`;
    const defaultResponse = options.defaultResponse || {
        responseId,
        content: 'Mock response from OpenAI'
    };
    const defaultJsonResponse = options.defaultJsonResponse || {
        responseId,
        data: {
            result: 'Mock JSON response from OpenAI',
            score: 85,
            analysis: 'This is a mock analysis'
        }
    };
    return {
        client: {
            sendMessage: sandbox.stub().resolves(defaultResponse),
            sendJsonMessage: sandbox.stub().resolves(defaultJsonResponse),
            streamMessage: sandbox.stub()
        },
        sandbox
    };
}
/**
 * Creates an OpenAI state manager mock for testing
 * @returns {Object} - Mocked OpenAI state manager and sandbox
 */
function createOpenAIStateManagerMock() {
    const sandbox = sinon.createSandbox();
    return {
        stateManager: {
            findOrCreateConversationState: sandbox.stub().callsFake((userId, context) => {
                return Promise.resolve({
                    id: uuidv4(),
                    userId,
                    context,
                    lastResponseId: null,
                    createdAt: new Date().toISOString()
                });
            }),
            updateLastResponseId: sandbox.stub().resolves(true),
            getLastResponseId: sandbox.stub().resolves(null),
            deleteConversationState: sandbox.stub().resolves(true)
        },
        sandbox
    };
}
/**
 * Sets up a real OpenAI client for integration tests
 * @returns {Object} - Real OpenAI client or null if API key not available
 */
function setupRealOpenAIClient() {
    if (!testConfig.hasRequiredVars('openai')) {
        console.warn('OPENAI_API_KEY not found, skipping real OpenAI client setup');
        return null;
    }
    const config = testConfig.getTestConfig().openai;
    return new OpenAIClient({
        apiKey: config.apiKey,
        organization: config.organization
    });
}
/**
 * Creates a standard test structure for challenges
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Test challenge
 */
function createTestChallenge(overrides = {}) {
    return {
        id: overrides.id || uuidv4(),
        userId: overrides.userId || 'test-user-id',
        title: overrides.title || 'Test Challenge',
        description: overrides.description || 'A test challenge description',
        content: overrides.content || {
            scenario: 'Test scenario for the challenge',
            questions: [
                { id: 'q1', text: 'What are the implications of this scenario?' },
                { id: 'q2', text: 'How would you address these challenges?' }
            ]
        },
        difficulty: overrides.difficulty || 'intermediate',
        focusArea: overrides.focusArea || 'AI Ethics',
        challengeType: overrides.challengeType || 'critical-analysis',
        formatType: overrides.formatType || 'case-study',
        estimatedTime: overrides.estimatedTime || 15,
        keywords: overrides.keywords || ['test', 'ai', 'ethics'],
        learningObjectives: overrides.learningObjectives || ['Learn testing', 'Understand AI ethics'],
        status: overrides.status || 'published',
        aiGenerated: overrides.aiGenerated !== undefined ? overrides.aiGenerated : true,
        createdAt: overrides.createdAt || new Date().toISOString(),
        responseId: overrides.responseId || `resp_${uuidv4()}`,
        threadId: overrides.threadId || uuidv4()
    };
}
/**
 * Creates a standard test structure for focus areas
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Test focus area
 */
function createTestFocusArea(overrides = {}) {
    return {
        id: overrides.id || uuidv4(),
        userId: overrides.userId || 'test-user-id',
        name: overrides.name || 'Test Focus Area',
        description: overrides.description || 'A test focus area description',
        priority: overrides.priority || 'high',
        createdAt: overrides.createdAt || new Date().toISOString(),
        responseId: overrides.responseId || `resp_${uuidv4()}`,
        threadId: overrides.threadId || uuidv4()
    };
}
/**
 * Creates a standard test structure for user profile
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Test user profile
 */
function createTestUserProfile(overrides = {}) {
    return {
        id: overrides.id || 'test-user-id',
        name: overrides.name || 'Test User',
        email: overrides.email || 'test@example.com',
        personalityTraits: overrides.personalityTraits || {
            openness: 0.8,
            conscientiousness: 0.7,
            extraversion: 0.5,
            agreeableness: 0.6,
            neuroticism: 0.3
        },
        aiAttitudes: overrides.aiAttitudes || {
            optimism: 0.7,
            concern: 0.4,
            engagement: 0.8
        },
        preferences: overrides.preferences || {
            learningStyle: 'practical',
            challengeType: 'case-study',
            difficultyPreference: 'balanced'
        },
        createdAt: overrides.createdAt || new Date().toISOString()
    };
}
/**
 * Verify standard OpenAI Responses API response format
 * @param {Object} response - The response to verify
 */
function verifyOpenAIResponseFormat(response) {
    expect(response).to.exist;
    expect(response.responseId).to.be.a('string').and.match(/^resp_/);
    if (response.data) {
        expect(response.data).to.be.an('object');
    }
    else if (response.content) {
        expect(response.content).to.be.a('string');
    }
    else {
        throw new Error('Response missing both data and content fields');
    }
}
/**
 * Helper to skip tests if certain environment variables are missing
 * @param {Mocha.Context} context - The mocha test context
 * @param {string} testType - Type of test requirements ('openai', 'supabase', etc.)
 * @returns {boolean} - Whether the test was skipped
 */
function skipIfMissingEnv(context, testType) {
    // Skip if explicitly set to skip via env var
    if (process.env.SKIP_OPENAI_TESTS === 'true' && testType === 'openai') {
        console.warn('Skipping OpenAI tests due to SKIP_OPENAI_TESTS=true');
        context.skip();
        return true;
    }
    if (process.env.SKIP_SUPABASE_TESTS === 'true' && testType === 'supabase') {
        console.warn('Skipping Supabase tests due to SKIP_SUPABASE_TESTS=true');
        context.skip();
        return true;
    }
    // Skip if required environment variables are missing
    if (!testConfig.hasRequiredVars(testType)) {
        console.warn(`Required environment variables for ${testType} tests are missing, skipping tests`);
        context.skip();
        return true;
    }
    return false;
}
/**
 * Creates a timeout promise for tests
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} - Promise that resolves after the timeout
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Retries a function until it succeeds or timeouts
 * @param {Function} fn - Function to retry
 * @param {Object} options - Options for retrying
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.retryDelay - Delay between retries in milliseconds
 * @param {Function} options.shouldRetry - Function to determine if retry should occur
 * @returns {Promise} - Promise that resolves with the function result
 */
async function retry(fn, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    const shouldRetry = options.shouldRetry || (err => true);
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            if (!shouldRetry(err) || attempt === maxRetries - 1) {
                throw err;
            }
            console.warn(`Attempt ${attempt + 1} failed, retrying in ${retryDelay}ms`);
            await wait(retryDelay);
        }
    }
    throw lastError;
}
export { createInMemoryRepository, createOpenAIClientMock, createOpenAIStateManagerMock, setupRealOpenAIClient, createTestChallenge, createTestFocusArea, createTestUserProfile, verifyOpenAIResponseFormat, skipIfMissingEnv, wait, retry, MessageRole };
