import { OpenAIClientAdapter } from "@/core/ai/index.js";
import { OpenAIStateManagerAdapter } from "@/core/ai/index.js";
import FocusAreaThreadStateAdapter from "@/core/infra/openai/adapters/FocusAreaThreadStateAdapter.js";
'use strict';
/**
 * AI Components Registration
 *
 * This module registers all AI-related components in the DI container.
 */
/**
 * Register AI components in the container
 * @param {DIContainer} container - The DI container
 */
function registerAIComponents(container) {
    // Register AI adapters
    container.register('aiClient', c => {
        return new OpenAIClientAdapter({
            openAIClient: c.get('openAIClient'),
            logger: c.get('logger')
        });
    }, true // Singleton
    );
    container.register('aiStateManager', c => {
        return new OpenAIStateManagerAdapter({
            openAIStateManager: c.get('openAIStateManager'),
            logger: c.get('logger')
        });
    }, true // Singleton
    );
    
    // Register focusAreaThreadState adapter
    container.register('focusAreaThreadState', c => {
        return new FocusAreaThreadStateAdapter({
            openAIStateManager: c.get('openAIStateManager'),
            logger: c.get('focusAreaLogger')
        });
    }, true // Singleton
    );
}
export { registerAIComponents };
export default {
    registerAIComponents
};
