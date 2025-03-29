'use strict';

/**
 * DI Container initialization and component registration
 * 
 * This module sets up the dependency injection container and registers all components.
 */

const { DIContainer } = require('../../core/infra/di/DIContainer');
const { registerInfrastructureComponents } = require('./infrastructure');
const { registerRepositoryComponents } = require('./repositories');
const { registerServiceComponents } = require('./services');
const { registerCoordinatorComponents } = require('./coordinators');
const { registerControllerComponents } = require('./controllers');
const { registerRouteComponents } = require('./routes');
const { registerAIComponents } = require('./ai');

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

module.exports = { createContainer }; 