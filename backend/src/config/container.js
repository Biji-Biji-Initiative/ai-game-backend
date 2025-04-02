'use strict';

// // ADDED: Log entry into this module
// console.log('[container.js] Module execution START');

import config from "#app/config/config.js";
import { createContainer } from "#app/config/container/index.js";

// // ADDED: Log before container creation
// console.log('[container.js] About to call createContainer...');
// Initialize the container with all application components
const container = createContainer(config);
// // ADDED: Log after container creation
// console.log('[container.js] createContainer finished. Container instance:', container ? 'Exists' : 'NULL');

// --- Import Services & Repositories (Only if needed directly in this file) ---
// It seems LogService is needed for the System registration below
import LogService from "#app/core/system/services/LogService.js";

// --- Register System Components (Keep these if not registered elsewhere) ---
// Check if LogService is registered in services.js - if so, remove this too.
// For now, assume it might only be registered here.
container.register('logService', c => new LogService({
    logger: c.get('logger')
}), true);

// TODO: Register EventBusController if it exists and is needed (handled in controllers.js now)

// --- Services, Repositories, Infra registration happens within createContainer -> index.js ---

// // ADDED: Log before export
// console.log('[container.js] Exporting container...');
export { container };
export default {
    container
};
// // ADDED: Log module end
// console.log('[container.js] Module execution END');
