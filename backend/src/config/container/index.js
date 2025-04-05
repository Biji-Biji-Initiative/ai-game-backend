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
import mappers from "#app/config/container/mappers.js"; // Import mappers module
import { startupLogger } from "#app/core/infra/logging/StartupLogger.js"; // Import startupLogger
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
const { registerMapperComponents } = mappers; // Extract mappers registration function
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

    // Log DI container initialization
    console.log('📦 Initializing Dependency Injection Container...');

    // Monkey patch the container's register method to log registrations
    const originalRegister = container.register;
    container.register = function(name, factory, singleton = false) {
        // Call the original method
        const result = originalRegister.call(this, name, factory, singleton);
        
        // Log the registration
        startupLogger.logDIRegistration('custom', name, singleton);
        
        return result;
    };

    // Monkey patch the registerModule method to log module registrations
    const originalRegisterModule = container.registerModule;
    container.registerModule = function(registerFn, moduleName, logger) {
        console.log(`📦 Loading module: ${moduleName}`);
        
        // Create a proxy for the container to intercept registrations
        const containerProxy = new Proxy(this, {
            get(target, prop) {
                if (prop === 'register') {
                    return function(name, factory, singleton = false) {
                        // Call the original register method
                        const result = target.register(name, factory, singleton);
                        
                        // Log the registration through startupLogger
                        startupLogger.logDIRegistration(moduleName, name, singleton);
                        
                        return result;
                    };
                }
                return target[prop];
            }
        });
        
        // Call the original method with the proxy
        const result = originalRegisterModule.call(this, 
            (container, logger) => registerFn(containerProxy, logger), 
            moduleName, 
            logger
        );
        
        return result;
    };

    // Register modules in sequence - constants FIRST to ensure they're available to all services
    container.registerModule(registerConstants, 'constants', baseLogger);
    container.registerModule(registerInfrastructureComponents, 'infrastructure', baseLogger);
    container.registerModule(registerRepositoryComponents, 'repositories', baseLogger);
    container.registerModule(registerServiceComponents, 'services', baseLogger);
    container.registerModule(registerAIComponents, 'ai', baseLogger);
    container.registerModule(registerCoordinatorComponents, 'coordinators', baseLogger);
    container.registerModule(registerControllerComponents, 'controllers', baseLogger);
    container.registerModule(registerMapperComponents, 'mappers', baseLogger); // Register mappers
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
