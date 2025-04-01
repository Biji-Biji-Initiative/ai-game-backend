'use strict';

/**
 * AI Components Registration Module
 * 
 * This module follows clean architecture principles for registering AI components
 * in the dependency injection container. It adheres to the Ports and Adapters pattern
 * where domain ports are implemented by infrastructure adapters.
 */
import { OpenAIClientAdapter } from "#app/core/ai/adapters/OpenAIClientAdapter.js";
import { OpenAIStateManagerAdapter } from "#app/core/ai/adapters/OpenAIStateManagerAdapter.js";
import FocusAreaThreadStateAdapter from "#app/core/infra/openai/adapters/FocusAreaThreadStateAdapter.js";
import OpenAI from "openai";
import config from "#app/config/env.js";

/**
 * Register AI components in the DI container following hexagonal architecture
 * @param {object} container - The DI container 
 */
function registerAIComponents(container) {
    console.log('Registering AI components following hexagonal architecture...');
    
    // Register the OpenAI SDK client FIRST (external dependency)
    try {
        // Create the OpenAI client immediately, don't wait for lazy initialization
        console.log('Creating OpenAI client with API key...');
        if (!config.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is required in the environment to initialize the OpenAI client');
        }
        
        const openAIClient = new OpenAI({
            apiKey: config.OPENAI_API_KEY
        });
        
        // Register it as a singleton
        container.register('openAIClient', () => openAIClient, true);
        console.log('OpenAI client successfully created and registered');
        
        // NOW register the AI client adapter (implements domain port)
        console.log('Registering AI client adapter...');
        const aiClientAdapter = new OpenAIClientAdapter({
            openAIClient: openAIClient,
            logger: container.get('logger')
        });
        container.register('aiClient', () => aiClientAdapter, true);
        
        // Register the AI state manager adapter (implements domain port)
        console.log('Registering AI state manager adapter...');
        const stateManagerAdapter = new OpenAIStateManagerAdapter({
            openAIStateManager: openAIClient,
            logger: container.get('logger')
        });
        container.register('aiStateManager', () => stateManagerAdapter, true);
        
        // Register the FocusAreaThreadState adapter (implements domain port)
        console.log('Registering FocusAreaThreadState adapter...');
        const focusAreaAdapter = new FocusAreaThreadStateAdapter({
            openAIStateManager: stateManagerAdapter,
            logger: container.get('focusAreaLogger') || container.get('logger')
        });
        container.register('focusAreaThreadState', () => focusAreaAdapter, true);
        
        console.log('AI components registered successfully.');
    } catch (error) {
        console.error(`Error registering AI components: ${error.message}`);
        console.error(error.stack);
        
        // Register fallback mock implementations for development
        if (process.env.NODE_ENV !== 'production') {
            console.log('Registering mock AI components for development...');
            
            // Mock OpenAI client
            container.register('openAIClient', () => ({
                chat: { completions: { create: async () => ({ choices: [{ message: { content: 'Mock AI response' } }] }) } }
            }), true);
            
            // Mock AI client adapter
            container.register('aiClient', () => ({
                generateResponse: async () => 'Mock AI response',
                generateChatCompletion: async () => ({ content: 'Mock AI response' })
            }), true);
            
            // Mock state manager
            container.register('aiStateManager', () => ({
                createThread: async () => 'mock-thread-id',
                addMessageToThread: async () => 'mock-message-id',
                getOrCreateAssistant: async () => 'mock-assistant-id',
                runAssistantOnThread: async () => 'mock-run-id',
                waitForRunCompletion: async () => 'completed',
                getThreadMessages: async () => []
            }), true);
            
            // Mock focus area thread state
            container.register('focusAreaThreadState', () => ({
                createThreadForUser: async () => 'mock-thread-id',
                addUserMessageToThread: async () => 'mock-message-id',
                getResponseFromAssistant: async () => 'Mock focus area suggestion'
            }), true);
            
            console.log('Mock AI components registered for development environment');
        } else {
            // Re-throw in production since AI functionality is critical
            throw new Error(`Failed to register AI components: ${error.message}`);
        }
    }
}

export { registerAIComponents };
export default {
    registerAIComponents
};
