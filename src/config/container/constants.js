import { MessageRole, ResponsesApiModel, ContentType } from "../../core/infra/openai/types.js";

/**
 * Constants Registration
 *
 * This module registers constants and enums in the DI container.
 */

/**
 * Register constant values in the container
 * @param {DIContainer} container - The DI container
 */
function registerConstants(container) {
    // Register OpenAI types
    container.registerInstance('messageRole', MessageRole);
    container.registerInstance('openAIModels', ResponsesApiModel);
    container.registerInstance('contentType', ContentType);
}

export { registerConstants };
export default { registerConstants }; 