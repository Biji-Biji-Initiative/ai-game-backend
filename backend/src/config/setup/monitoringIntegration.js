'use strict';

import { monitoringIntegration } from '#app/core/infra/logging/MonitoringIntegration.js';
import { infraLogger } from '#app/core/infra/logging/domainLogger.js';
import { startupLogger } from '#app/core/infra/logging/StartupLogger.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configure monitoring and visualization tools
 * @param {Express} app - Express application
 * @param {Object} config - Application configuration
 * @param {Object} container - DI container
 */
export const configureMonitoring = (app, config, container) => {
  try {
    const logger = container.get('infraLogger') || infraLogger;
    logger.info('[Monitoring] Configuring monitoring and visualization tools...');
    console.log('📊 Configuring monitoring and visualization tools...');
    
    // Add Prometheus metrics middleware (should be early in middleware chain)
    app.use(monitoringIntegration.getMetricsMiddleware());
    startupLogger.logMiddlewareInitialization('prometheusMetrics', 'success', { type: 'monitoring' });
    console.log('  ✓ Prometheus metrics middleware configured');
    
    // Mount monitoring dashboard at /monitoring
    app.use('/monitoring', monitoringIntegration.getRouter());
    startupLogger.logComponentInitialization('routes.monitoring', 'success', { type: 'dashboard' });
    console.log('  ✓ Monitoring dashboard router mounted at /monitoring');
    
    // Serve static assets for monitoring dashboard
    const staticPath = path.resolve(__dirname, '../../core/infra/logging/static');
    app.use('/monitoring/static', express.static(staticPath));
    startupLogger.logMiddlewareInitialization('monitoringStatic', 'success', { 
      type: 'static',
      path: staticPath
    });
    console.log('  ✓ Static assets configured at /monitoring/static');
    console.log('  ✓ Static path: ' + staticPath);
    
    // Log success
    logger.info('[Monitoring] ✅ Monitoring and visualization tools configured successfully');
    console.log('\n✅ Monitoring and visualization tools configured successfully');
    console.log('📊 Monitoring dashboard available at: /monitoring');
  } catch (error) {
    const logger = container.get('infraLogger') || infraLogger;
    logger.error('[Monitoring] Failed to configure monitoring tools', { 
      error: error.message,
      stack: error.stack
    });
    console.log('❌ Failed to configure monitoring tools:');
    console.log(`  Error: ${error.message}`);
    startupLogger.logComponentInitialization('monitoring', 'error', { 
      error: error.message,
      stack: error.stack
    });
  }
};
