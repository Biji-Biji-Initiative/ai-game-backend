'use strict';

/**
 * Dependency Injection Container Configuration
 * Exports the configured DI container for the application
 * 
 * This file now uses the modular container configuration approach
 * and serves as a compatibility layer for existing code.
 */
const config = require('./config');
const initializeContainer = require('./container/index');

// Initialize the container with all application components
const container = initializeContainer(config);

// Export the container for use in the application
module.exports = { container };
