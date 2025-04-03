// // ADDED: Log entry into this module
// console.log('[container/index.js] Module execution START');

import { DIContainer } from "#app/core/infra/di/DIContainer.js";
// Import the actual Logger class
import { Logger } from "#app/core/infra/logging/logger.js"; 
import infrastructure from "#app/config/container/infrastructure.js";
import repositories from "#app/config/container/repositories.js";
import services from "#app/config/container/services.js";
import coordinators from "#app/config/container/coordinators.js";
import controllers from "#app/config/container/controllers.js";
// Removed routes import as we're using directRoutes.js instead
import { registerAIComponents } from "#app/config/container/ai.js";
import constants from "#app/config/container/constants.js";
'use strict';

// // ADDED: Log before extracting registration functions
// console.log('[container/index.js] Extracting registration functions...');
const { registerInfrastructureComponents } = infrastructure;
const { registerRepositoryComponents } = repositories;
const { registerServiceComponents } = services;
const { registerCoordinatorComponents } = coordinators;
const { registerControllerComponents } = controllers;
// Removed registerRouteComponents - using direct mounting instead
const { registerConstants } = constants;
// console.log('[container/index.js] Finished extracting registration functions.');

/**
 * Create and initialize the DI container
 * @param {Object} config - Application configuration
 * @returns {DIContainer} - The initialized DI container
 */
function createContainer(config) {
    const container = new DIContainer();
    
    // Create the base application logger FIRST
    const baseLogger = new Logger('app'); 
    container.logger = baseLogger; 
    
    container.register('config', () => config, true);
    container.registerInstance('logger', baseLogger); 

    // Register modules in sequence - constants FIRST to ensure they're available to all services
    container.registerModule(registerConstants, 'constants', baseLogger);
    container.registerModule(registerInfrastructureComponents, 'infrastructure', baseLogger);
    container.registerModule(registerRepositoryComponents, 'repositories', baseLogger);
    container.registerModule(registerServiceComponents, 'services', baseLogger);
    container.registerModule(registerAIComponents, 'ai', baseLogger);
    container.registerModule(registerCoordinatorComponents, 'coordinators', baseLogger);
    container.registerModule(registerControllerComponents, 'controllers', baseLogger);
    // Removed routes registration as we're using directRoutes.js instead
        
    return container;
}

// // ADDED: Log before export
// console.log('[container/index.js] Exporting createContainer...');
export { createContainer };
// // ADDED: Log module end
// console.log('[container/index.js] Module execution END');

export default {
    createContainer
};
