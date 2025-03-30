import { DIContainer } from "../../core/infra/di/DIContainer.js";
import infrastructure from "./infrastructure.js";
import repositories from "./repositories.js";
import services from "./services.js";
import coordinators from "./coordinators.js";
import controllers from "./controllers.js";
import routes from "./routes.js";
import { registerAIComponents } from "./ai.js";
'use strict';
const { registerInfrastructureComponents } = infrastructure;
const { registerRepositoryComponents } = repositories;
const { registerServiceComponents } = services;
const { registerCoordinatorComponents } = coordinators;
const { registerControllerComponents } = controllers;
const { registerRouteComponents } = routes;
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
