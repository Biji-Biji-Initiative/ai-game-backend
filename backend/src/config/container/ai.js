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
    const aiLogger = container.get('logger').child({ context: 'DI-AI' });
    aiLogger.info('[DI AI] Registering AI components...');
    
    // Register the OpenAI SDK client FIRST (external dependency)
    try {
        aiLogger.info('[DI AI] Creating OpenAI client...');
        if (!config.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is required');
        }
        const openAIClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
        
        aiLogger.info('[DI AI] Registering openAIClient...');
        container.register('openAIClient', () => openAIClient, true);
        aiLogger.info('[DI AI] OpenAI client registered.');
        
        aiLogger.info('[DI AI] Registering AI client adapter...');
        // NOTE: Instantiate adapters here, but register the *instance* using registerInstance or a factory
        const aiClientAdapter = new OpenAIClientAdapter({
            openAIClient: openAIClient,
            logger: container.get('logger')
        });
        container.register('aiClient', () => aiClientAdapter, true);
        aiLogger.info('[DI AI] AI client adapter registered.');
        
        aiLogger.info('[DI AI] Registering AI state manager adapter...');
        // NOTE: Passing openAIClient (the SDK instance) to OpenAIStateManagerAdapter might be incorrect.
        // It likely expects the OpenAIStateManager *implementation* registered in infrastructure.js.
        // Let's assume it expects the SDK client for now based on the original code.
        const stateManagerAdapter = new OpenAIStateManagerAdapter({
            openAIStateManager: container.get('openAIStateManager'), // Corrected: Inject the implementation
            logger: container.get('logger')
        });
        container.register('aiStateManager', () => stateManagerAdapter, true);
        aiLogger.info('[DI AI] AI state manager adapter registered.');
        
        aiLogger.info('[DI AI] Registering FocusAreaThreadState adapter...');
        const focusAreaAdapter = new FocusAreaThreadStateAdapter({
            openAIStateManager: stateManagerAdapter, // This adapter depends on the previous adapter
            logger: container.get('focusAreaLogger') || container.get('logger')
        });
        container.register('focusAreaThreadState', () => focusAreaAdapter, true);
        aiLogger.info('[DI AI] FocusAreaThreadState adapter registered.');
        
        aiLogger.info('[DI AI] AI components registered successfully.');
    } catch (error) {
        aiLogger.error(`[DI AI] Error registering AI components: ${error.message}`, { stack: error.stack });
        
        // Register fallback mock implementations for development
        if (process.env.NODE_ENV !== 'production') {
            aiLogger.warn('[DI AI] Registering mock AI components for development...');
            
            container.register('openAIClient', () => ({ /* mock */ }), true);
            container.register('aiClient', () => ({ /* mock */ }), true);
            container.register('aiStateManager', () => ({ /* mock */ }), true);
            container.register('focusAreaThreadState', () => ({ /* mock */ }), true);
            
            aiLogger.warn('[DI AI] Mock AI components registered.');
        } else {
            throw new Error(`Failed to register AI components: ${error.message}`);
        }
    }
}

export { registerAIComponents };
export default {
    registerAIComponents
};
