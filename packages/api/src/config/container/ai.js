import coreAI from "../../core/ai/index.js";
""../../../core/ai/index.js62;
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
}
export { registerAIComponents };
export default {
    registerAIComponents
};
"