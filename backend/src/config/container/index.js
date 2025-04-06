'use strict';

import { container } from "#app/core/infra/di/DIContainer.js";
import { infraLogger } from "#app/core/infra/logging/domainLogger.js";
import { diVisualizer } from "#app/core/infra/logging/DIVisualizer.js";
import { startupLogger } from "#app/core/infra/logging/StartupLogger.js";
import { logger } from "#app/core/infra/logging/logger.js";

// Import container modules
import { registerConstants } from './constants.js';
import { registerInfrastructureComponents } from './infrastructure.js';
import { registerRepositoryComponents } from './repositories.js';
import { registerServiceComponents } from './services.js';
import { registerAIComponents } from './ai.js';
import { registerCoordinatorComponents } from './coordinators.js';
import { registerControllerComponents } from './controllers.js';
import { registerMapperComponents } from './mappers.js';

/**
 * Initialize the DI container with all application dependencies
 * @param {Object} config - Application configuration
 * @returns {Object} Initialized container
 */
export function initializeContainer(config) {
  // Set logger for container
  container.logger = infraLogger;
  
  // Log container initialization start
  startupLogger.logComponentInitialization('di', 'pending', {
    message: 'Initializing dependency injection container'
  });

  // Register configuration as a singleton instance
  container.registerInstance('config', config);
  diVisualizer.trackRegistration('config', 'instance', 'constants');
  
  // Register logger as a singleton instance
  container.registerInstance('logger', logger);
  diVisualizer.trackRegistration('logger', 'instance', 'infrastructure');
  
  // Register modules
  try {
    // Constants
    startupLogger.logComponentInitialization('di.constants', 'pending');
    container.registerModule(registerConstants, 'constants');
    diVisualizer.trackModuleRegistration('constants', 10);
    startupLogger.logComponentInitialization('di.constants', 'success');
    
    // Infrastructure
    startupLogger.logComponentInitialization('di.infrastructure', 'pending');
    container.registerModule(registerInfrastructureComponents, 'infrastructure');
    diVisualizer.trackModuleRegistration('infrastructure', 15);
    startupLogger.logComponentInitialization('di.infrastructure', 'success');
    
    // Repositories
    startupLogger.logComponentInitialization('di.repositories', 'pending');
    container.registerModule(registerRepositoryComponents, 'repositories');
    diVisualizer.trackModuleRegistration('repositories', 12);
    startupLogger.logComponentInitialization('di.repositories', 'success');
    
    // Services
    startupLogger.logComponentInitialization('di.services', 'pending');
    container.registerModule(registerServiceComponents, 'services');
    diVisualizer.trackModuleRegistration('services', 20);
    startupLogger.logComponentInitialization('di.services', 'success');
    
    // AI
    startupLogger.logComponentInitialization('di.ai', 'pending');
    container.registerModule(registerAIComponents, 'ai');
    diVisualizer.trackModuleRegistration('ai', 5);
    startupLogger.logComponentInitialization('di.ai', 'success');
    
    // Coordinators
    startupLogger.logComponentInitialization('di.coordinators', 'pending');
    container.registerModule(registerCoordinatorComponents, 'coordinators');
    diVisualizer.trackModuleRegistration('coordinators', 8);
    startupLogger.logComponentInitialization('di.coordinators', 'success');
    
    // Controllers
    startupLogger.logComponentInitialization('di.controllers', 'pending');
    container.registerModule(registerControllerComponents, 'controllers');
    diVisualizer.trackModuleRegistration('controllers', 15);
    startupLogger.logComponentInitialization('di.controllers', 'success');
    
    // Mappers
    startupLogger.logComponentInitialization('di.mappers', 'pending');
    container.registerModule(registerMapperComponents, 'mappers');
    diVisualizer.trackModuleRegistration('mappers', 10);
    startupLogger.logComponentInitialization('di.mappers', 'success');
    
    // Log container initialization completion
    startupLogger.logComponentInitialization('di', 'success', {
      message: 'Dependency injection container initialized successfully',
      componentCount: diVisualizer.getStats().totalRegistrations
    });
    
    // Print DI container summary through startupLogger
    diVisualizer.printSummary(true);
    
    return container;
  } catch (error) {
    // Log container initialization error
    startupLogger.logComponentInitialization('di', 'error', {
      message: 'Failed to initialize dependency injection container',
      error: error.message
    });
    
    throw error;
  }
}

export default container;
