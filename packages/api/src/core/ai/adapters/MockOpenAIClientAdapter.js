/**
 * Mock OpenAI Client Adapter
 * 
 * This mock adapter simulates OpenAI API responses for local development
 * and testing when OpenAI credentials are not available or to avoid API costs.
 */
'use strict';

class MockOpenAIClientAdapter {
    /**
     * Create a new MockOpenAIClientAdapter
     * @param {Object} options - Configuration options
     * @param {Object} options.logger - Logger instance
     */
    constructor({ logger } = {}) {
        this.logger = logger;
        this.completionCounter = 0;
        this.embeddingCounter = 0;
        
        this.logger?.info('MockOpenAIClientAdapter initialized - All API calls will return mock data');
    }
    
    /**
     * Mock OpenAI completion with predefined responses
     * 
     * @param {Object} options - Completion options
     * @param {string} options.prompt - The prompt to generate completions for
     * @param {number} [options.maxTokens=100] - Max tokens to generate
     * @param {number} [options.temperature=0.7] - Sampling temperature
     * @param {Array<Object>} [options.messages] - Messages for chat completions
     * @returns {Promise<Object>} Mock completion response
     */
    async createCompletion(options) {
        this.completionCounter++;
        const { prompt, messages, maxTokens = 100, temperature = 0.7 } = options;
        
        this.logger?.debug('Mock OpenAI completion request', { 
            hasPrompt: !!prompt, 
            hasMessages: !!messages, 
            maxTokens, 
            temperature, 
            counter: this.completionCounter
        });
        
        // Prepare a mock response based on common patterns in the input
        let mockResponse = "This is a mock response from the OpenAI API.";
        
        // If we have messages, generate a more contextual response
        if (messages && messages.length) {
            const lastMessage = messages[messages.length - 1];
            const content = lastMessage.content || '';
            
            if (content.includes('evaluate') || content.includes('review')) {
                mockResponse = "Based on my evaluation, this response demonstrates good thinking and clarity. The main strengths are the organized structure and logical flow. Areas for improvement include more specific examples and deeper analysis of the implications.";
            } else if (content.includes('summarize') || content.includes('summary')) {
                mockResponse = "Here's a summary of the key points: 1) The main concept involves strategic planning and execution, 2) Several stakeholders need to be considered, 3) The timeline requires careful coordination of resources.";
            } else if (content.includes('generate') || content.includes('create')) {
                mockResponse = "I've generated the following content based on your request. This should serve as a solid starting point that you can refine further as needed.";
            } else if (content.includes('explain') || content.includes('how')) {
                mockResponse = "Let me explain this concept: It works by following a three-step process. First, you identify the core problem. Second, you analyze the available data. Third, you implement a solution based on your analysis.";
            }
        }
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
            id: `mock-completion-${this.completionCounter}`,
            object: 'completion',
            created: Math.floor(Date.now() / 1000),
            model: 'mock-gpt-3.5-turbo',
            choices: [
                {
                    message: {
                        role: 'assistant',
                        content: mockResponse
                    },
                    index: 0,
                    finish_reason: 'stop'
                }
            ],
            usage: {
                prompt_tokens: 20,
                completion_tokens: 50,
                total_tokens: 70
            }
        };
    }
    
    /**
     * Mock embeddings generation with random vectors
     * 
     * @param {Object} options - Embedding options
     * @param {string|Array<string>} options.input - Text to embed
     * @param {string} [options.model="text-embedding-ada-002"] - Model to use
     * @returns {Promise<Object>} Mock embedding response
     */
    async createEmbedding(options) {
        this.embeddingCounter++;
        const { input } = options;
        const inputArray = Array.isArray(input) ? input : [input];
        
        this.logger?.debug('Mock OpenAI embedding request', { 
            inputCount: inputArray.length, 
            counter: this.embeddingCounter 
        });
        
        // Generate random embedding vectors of appropriate dimension
        const mockEmbeddings = inputArray.map((_, index) => {
            // Create a mock embedding vector (smaller dimension than real embeddings)
            const embedding = Array(128).fill(0).map(() => Math.random() * 2 - 1);
            // Normalize the vector
            const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
            return embedding.map(val => val / magnitude);
        });
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return {
            object: 'list',
            data: mockEmbeddings.map((embedding, index) => ({
                object: 'embedding',
                embedding,
                index
            })),
            model: 'mock-text-embedding-ada-002',
            usage: {
                prompt_tokens: inputArray.join(' ').split(' ').length,
                total_tokens: inputArray.join(' ').split(' ').length
            }
        };
    }
    
    /**
     * Check health of the mock OpenAI client
     * @returns {Promise<Object>} Health status
     */
    async checkHealth() {
        return {
            status: 'ok',
            message: 'Mock OpenAI client is operational',
            latency: 5, // Mock latency in ms
            isMock: true
        };
    }
}

export default MockOpenAIClientAdapter; 