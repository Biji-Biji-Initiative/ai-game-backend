import { MessageRole, ResponsesApiModel, ContentType } from "#app/core/infra/openai/types.js";
import openAIConfig from "#app/core/infra/openai/config.js"; // Import directly
'use strict';

/**
 * Constants Registration
 *
 * This module registers constants and enums in the DI container.
 */

/**
 * Register application constants in the container
 * @param {DIContainer} container - The DI container
 * @param {Logger} logger - The logger instance passed down from container registration
 */
function registerConstants(container, logger) { // Remove async
    // Use passed-in logger or fallback
    const constantsLogger = logger || container.get('logger').child({ context: 'DI-Constants' });
    constantsLogger.info('Registering constants...');

    // Register OpenAI types
    container.registerInstance('messageRole', MessageRole);
    container.registerInstance('openAIModels', ResponsesApiModel);
    container.registerInstance('contentType', ContentType);
    container.registerInstance('openAIConfig', openAIConfig); // Register from direct import
}

export { registerConstants };
export default { registerConstants }; 