import { DIContainer } from "@src/core/infra/di/DIContainer.js";
/**
 * Test Container Configuration
 *
 * Creates a container specifically for test purposes that provides
 * all the dependencies needed by the services without requiring
 * external services like Supabase.
 */
const DIContainer = DIContainer;
// Create a test-specific container
const testContainer = new DIContainer();
// Mock OpenAI types
const OpenAITypes = {
    MessageRole: {
        SYSTEM: 'system',
        USER: 'user',
        ASSISTANT: 'assistant'
    }
};
// Mock OpenAI client
const mockOpenAIClient = {
    sendJsonMessage: jest.fn().mockResolvedValue({
        responseId: 'mock-response-id',
        data: {
            overallScore: 85,
            categoryScores: { clarity: 90, accuracy: 80 },
            feedback: 'Good work',
            strengths: ['Clear explanation'],
            improvements: ['Add more depth']
        }
    }),
    streamMessage: jest.fn().mockImplementation(() => {
        const mockStream = {
            async *[Symbol.asyncIterator]() {
                yield {
                    response_id: 'mock-stream-id',
                    output: [{ content: [{ text: 'Mock stream output' }] }]
                };
            }
        };
        return mockStream;
    })
};
// Mock OpenAI state manager
const mockOpenAIStateManager = {
    findOrCreateConversationState: jest.fn().mockResolvedValue({ id: 'mock-state-id' }),
    getLastResponseId: jest.fn().mockResolvedValue('mock-previous-id'),
    updateLastResponseId: jest.fn().mockResolvedValue(true)
};
// Mock logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })
};
// Register core dependencies
testContainer.registerInstance('openAIClient', mockOpenAIClient);
testContainer.registerInstance('openAIStateManager', mockOpenAIStateManager);
testContainer.registerInstance('logger', mockLogger);
// Register configuration
testContainer.register('openAIConfig', () => ({
    OpenAITypes: OpenAITypes
}), true);
// Register prompt builder
testContainer.register('promptBuilder', () => {
    return {
        buildPrompt: jest.fn().mockImplementation((type, params) => {
            // Create a dynamic system message based on user data
            const user = params.user || {};
            const personalityProfile = params.personalityProfile || {};
            return {
                prompt: 'Mock prompt content for testing',
                systemMessage: `Custom system message for ${user.skillLevel || 'standard'} level user with ${personalityProfile.communicationStyle || 'default'} communication style`
            };
        })
    };
}, true);
export default testContainer;
