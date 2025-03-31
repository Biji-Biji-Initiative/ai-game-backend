import { DIContainer } from "../../core/infra/di/DIContainer.js";
import infrastructure from "../container/infrastructure.js";
import repositories from "../container/repositories.js";
import services from "../container/services.js";
import coordinators from "../container/coordinators.js";
import controllers from "../container/controllers.js";
import routes from "../container/routes.js";
import factories from "../container/factories.js";
import { registerAIComponents } from "../container/ai.js";
import constants from "../container/constants.js";
import { createContainer as createAwilix, asValue } from 'awilix';
'use strict';
const { registerInfrastructureComponents } = infrastructure;
const { registerRepositoryComponents } = repositories;
const { registerServiceComponents } = services;
const { registerCoordinatorComponents } = coordinators;
const { registerControllerComponents } = controllers;
const { registerRouteComponents } = routes;
const { registerConstants } = constants;

/**
 * Create an adapter for Awilix container that implements the expected DIContainer interface
 * @param {Object} awilixContainer - Awilix container
 * @returns {Object} - Container adapter with the expected interface
 */
function createContainerAdapter(awilixContainer) {
    return {
        // Implement get method using Awilix resolve
        get: function(name) {
            return awilixContainer.resolve(name);
        },

        // Implement resolve method (just an alias for get)
        resolve: function(name) {
            return awilixContainer.resolve(name);
        },

        // Implement registerInstance method
        registerInstance: function(name, instance) {
            awilixContainer.register({
                [name]: asValue(instance)
            });
            return this; // For chaining
        },

        // Implement register method
        register: function(name, factory, singleton = false) {
            // Awilix doesn't use the same registration approach,
            // so we need to adapt the factory function to work with it
            awilixContainer.register({
                [name]: {
                    resolve: () => factory(this),
                    lifetime: singleton ? 'SINGLETON' : 'TRANSIENT'
                }
            });
            return this; // For chaining
        },

        // Implement has method
        has: function(name) {
            return awilixContainer.hasRegistration(name);
        }
    };
}

/**
 * Create and initialize the DI container
 * @param {Object} config - Application configuration
 * @returns {DIContainer} - The initialized DI container
 */
function createContainer(config) {
    // Create new Awilix container
    const awilixContainer = createAwilix();

    // Create adapter that implements the expected interface
    const container = createContainerAdapter(awilixContainer);

    // Register config as value
    container.registerInstance('config', config);

    // Register all application components
    registerInfrastructureComponents(container);
    registerRepositoryComponents(container);
    factories(container); // Register factory components
    registerServiceComponents(container);
    registerCoordinatorComponents(container);
    registerControllerComponents(container);
    registerRouteComponents(container);
    registerAIComponents(container);
    registerConstants(container);

    return container;
}

/**
 * Validates that all critical dependencies can be resolved from the container
 * @param {Object} container - DI container to validate
 * @param {boolean} failFast - If true, exit process on failure (for production)
 * @returns {boolean} - True if all critical dependencies are valid, false otherwise
 */
function validateDependencies(container, failFast = false) {
    // List of critical dependencies that must be resolvable for the application to function
    // Only list dependencies that are actually in the codebase
    const criticalDependencies = [
        // Core services
        'userService',
        'challengeService',
        'evaluationService',
        'progressService',
        'personalityService',
        'userJourneyService',
        'focusAreaService',
        'focusAreaThreadService',
        'focusAreaValidationService',

        // Infrastructure
        'supabase',
        'logger',
        'eventBus',

        // Controllers - critical for routes
        'userController',
        'challengeController',
        'evaluationController'
    ];

    const missingDependencies = [];

    // Try to resolve each critical dependency
    for (const dep of criticalDependencies) {
        try {
            container.resolve(dep);
        } catch (error) {
            missingDependencies.push(dep);
        }
    }

    // If there are missing dependencies
    if (missingDependencies.length > 0) {
        // Log the error with all missing dependencies
        let logger;
        try {
            logger = container.resolve('logger');
        } catch (error) {
            // If logger can't be resolved, use console
            logger = console;
        }

        logger.error('Critical dependencies missing from container', { missingDependencies });

        // In production, exit the process to fail fast
        if (failFast) {
            console.error('Application startup failed: Missing critical dependencies');
            console.error('Missing:', missingDependencies.join(', '));
            process.exit(1);
        }

        return false;
    }

    return true;
}

export { createContainer, validateDependencies };
export default {
    createContainer,
    validateDependencies
};
