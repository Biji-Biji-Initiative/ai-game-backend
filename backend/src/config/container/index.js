// // ADDED: Log entry into this module
// console.log('[container/index.js] Module execution START');

import { DIContainer } from "#app/core/infra/di/DIContainer.js";
import infrastructure from "#app/config/container/infrastructure.js";
import repositories from "#app/config/container/repositories.js";
import services from "#app/config/container/services.js";
import coordinators from "#app/config/container/coordinators.js";
import controllers from "#app/config/container/controllers.js";
import routes from "#app/config/container/routes.js";
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
const { registerRouteComponents } = routes;
const { registerConstants } = constants;
// console.log('[container/index.js] Finished extracting registration functions.');

/**
 * Create and initialize the DI container
 * @param {Object} config - Application configuration
 * @returns {DIContainer} - The initialized DI container
 */
function createContainer(config) {
    // console.log('[container/index.js] createContainer function START');
    // console.log('[container/index.js] Creating new DIContainer instance...');
    const container = new DIContainer();
    // console.log('[container/index.js] DIContainer instance created.');
    
    // console.log('[container/index.js] Registering \'config\'...');
    container.register('config', () => config, true);
    // console.log('[container/index.js] \'config\' registered.');

    // console.log('[container/index.js] Registering component modules...');
    container
        .registerModule(registerConstants)
        .registerModule(registerInfrastructureComponents)
        .registerModule(registerRepositoryComponents)
        .registerModule(registerServiceComponents)
        .registerModule(registerAIComponents)
        .registerModule(registerCoordinatorComponents)
        .registerModule(registerControllerComponents)
        .registerModule(registerRouteComponents);
        
    // // Moved logs outside the chain
    // console.log('[container/index.js] Registered Constants.');
    // console.log('[container/index.js] Registered Infrastructure.');
    // console.log('[container/index.js] Registered Repositories.');
    // console.log('[container/index.js] Registered Services.');
    // console.log('[container/index.js] Registered AI.');
    // console.log('[container/index.js] Registered Coordinators.');
    // console.log('[container/index.js] Registered Controllers.');
    // console.log('[container/index.js] Registered Routes.');
        
    // console.log('[container/index.js] All component modules registered.');
    // console.log('[container/index.js] createContainer function END');
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
