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
import { OpenAIStateManager } from "#app/core/infra/openai/stateManager.js";

// --- ADDED IMPORTS from extension ---
import OpenAIResponsesAdapter from "#app/core/ai/adapters/OpenAIResponsesAdapter.js";
import { promptTypesExtended } from "#app/core/prompt/promptTypesExtended.js";
// --- END ADDED IMPORTS ---

/**
 * Register AI related components in the container
 * @param {DIContainer} container - The DI container
 * @param {Logger} logger - The logger instance passed down from container registration
 */
function registerAIComponents(container, logger) {
    // Use passed-in logger or fallback
    const aiLogger = logger || container.get('logger').child({ context: 'DI-AI' });
    aiLogger.info('Registering AI components...');
    
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
        
        // 2. Register the OpenAIStateManager IMPLEMENTATION with a different name
        aiLogger.info('[DI AI] Registering OpenAIStateManager implementation...');
        container.register('_openAIStateManagerImpl', c => new OpenAIStateManager({
            openAIClient: c.get('openAIClient'),
            logger: c.get('logger') // Or a specific AI logger
            // redisCache: c.get('redisCache') // Optional: Add if redis is registered
        }), true); // Singleton
        aiLogger.info('[DI AI] OpenAIStateManager implementation registered as _openAIStateManagerImpl.');
        
        // 3. Register the AI Client ADAPTER (Port Implementation)
        aiLogger.info('[DI AI] Registering AI client adapter...');
        const aiClientAdapter = new OpenAIClientAdapter({
            openAIClient: container.get('openAIClient'), // Use the already registered SDK client
            logger: container.get('logger')
        });
        container.register('aiClient', () => aiClientAdapter, true);
        aiLogger.info('[DI AI] AI client adapter registered.');
        
        // 4. Register the AI State Manager ADAPTER (Port Implementation) using the IMPLEMENTATION
        aiLogger.info('[DI AI] Registering AI state manager adapter...');
        const stateManagerAdapter = new OpenAIStateManagerAdapter({
            openAIStateManager: container.get('_openAIStateManagerImpl'), // CHANGED NAME to _openAIStateManagerImpl
            logger: container.get('logger')
        });
        container.register('aiStateManager', () => stateManagerAdapter, true); // Keep name 'aiStateManager' for the adapter
        aiLogger.info('[DI AI] AI state manager adapter registered.');
        
        // 5. Register FocusAreaThreadState ADAPTER (Port Implementation)
        aiLogger.info('[DI AI] Registering FocusAreaThreadState adapter...');
        const focusAreaThreadAdapter = new FocusAreaThreadStateAdapter({
            openAIStateManager: container.get('_openAIStateManagerImpl'), // CHANGED NAME to _openAIStateManagerImpl
            logger: container.get('focusAreaLogger') // Specific logger
        });
        container.register('focusAreaThreadState', () => focusAreaThreadAdapter, true);
        aiLogger.info('[DI AI] FocusAreaThreadState adapter registered.');
        
        // --- ADDED REGISTRATIONS from extension (excluding conflicting openAIStateManager) ---
        aiLogger.info('[DI AI] Registering openAIResponsesAdapter...');
        container.register('openAIResponsesAdapter', () => {
          const config = container.get('config');
          const openAIClient = container.get('openAIClient');
          // Use the adapter registered above under 'aiStateManager'
          const stateManager = container.get('aiStateManager'); 

          return new OpenAIResponsesAdapter({
            openAIClient,
            stateManager,
            config: config.ai?.openai,
            logger: container.get('logger')
          });
        }, true); // Assuming singleton
        aiLogger.info('[DI AI] openAIResponsesAdapter registered.');

        aiLogger.info('[DI AI] Registering promptTypes...');
        container.register('promptTypes', () => {
          return promptTypesExtended;
        }, true); // Assuming singleton
        aiLogger.info('[DI AI] promptTypes registered.');
        // --- END ADDED REGISTRATIONS ---
        
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
            container.register('openAIResponsesAdapter', () => ({ /* mock */ }), true); // Add mock
            container.register('promptTypes', () => ({ /* mock */ }), true); // Add mock
            
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
