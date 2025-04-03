'use strict';

// // ADDED: Log entry into this module
// console.log('[container.js] Module execution START');

import config from "#app/config/config.js";
import { createContainer } from "#app/config/container/index.js";
import LogService from "#app/core/system/services/LogService.js";

// Initialize the container with all application components
const container = createContainer(config);

// Register LogService directly if needed
try {
    // Try to resolve logService to see if it exists
    container.get('logService');
    // If we get here, it exists
} catch (error) {
    // logService wasn't registered, so add it
    container.register('logService', c => new LogService({
        logger: c.get('logger')
    }), true);
    container.logger.info('[ContainerSetup] LogService registered locally.');
}

// // ADDED: Log before export
// console.log('[container.js] Exporting container...');
export { container };
export default { container };
// // ADDED: Log module end
// console.log('[container.js] Module execution END');
