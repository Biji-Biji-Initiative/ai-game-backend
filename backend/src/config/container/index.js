'use strict';

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
import { diVisualizer } from "#app/core/infra/logging/DIVisualizer.js"; // Import DI visualizer

// Extract registration functions
const { registerInfrastructureComponents } = infrastructure;
const { registerRepositoryComponents } = repositories;
const { registerServiceComponents } = services;
const { registerCoordinatorComponents } = coordinators;
const { registerControllerComponents } = controllers;
// Removed registerRouteComponents - using direct mounting instead
const { registerConstants } = constants;
const { registerMapperComponents } = mappers; // Extract mappers registration function

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
        
        // Log the registration through DI visualizer
        const type = singleton ? 'singleton' : 'transient';
        diVisualizer.trackRegistration(name, type, 'custom');
        
        return result;
    };

    // Monkey patch the registerInstance method to log instance registrations
    const originalRegisterInstance = container.registerInstance;
    container.registerInstance = function(name, instance) {
        // Call the original method
        const result = originalRegisterInstance.call(this, name, instance);
        
        // Log the registration through DI visualizer
        diVisualizer.trackRegistration(name, 'instance', 'core');
        
        return result;
    };

    // Monkey patch the registerModule method to log module registrations
    const originalRegisterModule = container.registerModule;
    container.registerModule = function(registerFn, moduleName, logger) {
        console.log(`📦 Loading module: ${moduleName}`);
        diVisualizer.trackModuleRegistration(moduleName);
        
        // Create a proxy for the container to intercept registrations
        const containerProxy = new Proxy(this, {
            get(target, prop) {
                if (prop === 'register') {
                    return function(name, factory, singleton = false) {
                        // Call the original register method
                        const result = target.register(name, factory, singleton);
                        
                        // Log the registration through DI visualizer
                        const type = singleton ? 'singleton' : 'transient';
                        diVisualizer.trackRegistration(name, type, moduleName);
                        
                        return result;
                    };
                }
                if (prop === 'registerInstance') {
                    return function(name, instance) {
                        // Call the original registerInstance method
                        const result = target.registerInstance(name, instance);
                        
                        // Log the registration through DI visualizer
                        diVisualizer.trackRegistration(name, 'instance', moduleName);
                        
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

    // Monkey patch the get method to log resolutions
    const originalGet = container.get;
    container.get = function(name) {
        const startTime = Date.now();
        try {
            // Call the original method
            const result = originalGet.call(this, name);
            
            // Log the resolution through DI visualizer
            const endTime = Date.now();
            const duration = endTime - startTime;
            diVisualizer.trackResolution(name, true, duration);
            
            return result;
        } catch (error) {
            // Log the failed resolution through DI visualizer
            const endTime = Date.now();
            const duration = endTime - startTime;
            diVisualizer.trackResolution(name, false, duration);
            
            throw error;
        }
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
    
    // Print DI container summary
    diVisualizer.printSummary();
        
    return container;
}

export { createContainer };

export default {
    createContainer
};
