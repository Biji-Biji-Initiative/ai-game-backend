'use strict';

// This file is intentionally left empty as it's being replaced by monitoringIntegration.js
// Keeping this file to avoid breaking imports, but all functionality has been moved
// to monitoringIntegration.js to prevent duplicate middleware registration

// Import the actual implementation to re-export
import { configureMonitoring as actualConfigureMonitoring } from './monitoringIntegration.js';

/**
 * Configure monitoring and visualization tools
 * This is a proxy function that delegates to the actual implementation
 * in monitoringIntegration.js to prevent duplicate middleware registration
 * 
 * @param {Express} app - Express application
 * @param {Object} config - Application configuration
 * @param {Object} container - DI container
 */
export const configureMonitoring = (app, config, container) => {
  console.log('⚠️ Deprecated monitoring.js called, delegating to monitoringIntegration.js');
  // Delegate to the actual implementation
  return actualConfigureMonitoring(app, config, container);
};
