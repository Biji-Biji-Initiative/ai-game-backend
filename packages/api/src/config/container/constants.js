import { MessageRole, ResponsesApiModel, ContentType } from "../../core/infra/openai/types.js";
import userApiSchemas from "../../core/user/schemas/userApiSchemas.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Constants Registration
 *
 * This module registers constants and enums in the DI container.
 *
 * NOTE: Direct imports are preferred over DI registration for constants
 * because:
 * 1. Constants are unchanging and don't require runtime configuration
 * 2. They don't benefit from the testing flexibility of DI
 * 3. TypeScript/IDE tooling works better with direct imports
 * 4. It reduces unnecessary container overhead
 *
 * We should gradually migrate to direct imports for all constants
 * unless there's a specific need for registration (e.g., dynamic config).
 */

/**
 * Register constant values in the container
 * @param {DIContainer} container - The DI container
 * @deprecated Use direct imports instead of the DI container for simple constants
 */
function registerConstants(container) {
    // Register OpenAI MessageRole for backward compatibility
    // This should be refactored to use direct imports
    container.registerInstance('messageRole', MessageRole);

    // REMOVED: These constants were never used from the container
    // and should be directly imported when needed
    // container.registerInstance('openAIModels', ResponsesApiModel);
    // container.registerInstance('contentType', ContentType);

    // Register file system path constants
    container.registerInstance('paths.root', path.resolve(__dirname, '../..'));
    container.registerInstance('paths.data', path.resolve(__dirname, '../../data'));
    container.registerInstance('paths.temp', path.resolve(__dirname, '../../tmp'));

    // Register API schemas
    container.registerInstance('userApiSchemas', userApiSchemas);
}

export { registerConstants };
export default { registerConstants };
