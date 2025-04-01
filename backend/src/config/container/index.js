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
const { registerInfrastructureComponents } = infrastructure;
const { registerRepositoryComponents } = repositories;
const { registerServiceComponents } = services;
const { registerCoordinatorComponents } = coordinators;
const { registerControllerComponents } = controllers;
const { registerRouteComponents } = routes;
const { registerConstants } = constants;
/**
 * Create and initialize the DI container
 * @param {Object} config - Application configuration
 * @returns {DIContainer} - The initialized DI container
 */
function createContainer(config) {
    // Create new DI container
    const container = new DIContainer();
    // Register config first since many components depend on it
    container.register('config', () => config, true);
    // Register all component types in the right order
    container
        .registerModule(registerConstants)
        .registerModule(registerInfrastructureComponents)
        .registerModule(registerRepositoryComponents)
        .registerModule(registerServiceComponents)
        .registerModule(registerAIComponents)
        .registerModule(registerCoordinatorComponents)
        .registerModule(registerControllerComponents)
        .registerModule(registerRouteComponents);
    return container;
}
export { createContainer };
export default {
    createContainer
};
