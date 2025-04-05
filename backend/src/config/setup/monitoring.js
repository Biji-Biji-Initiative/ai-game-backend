// Integrate monitoring components with Express app
import { monitoringIntegration } from '#app/core/infra/logging/MonitoringIntegration.js';

/**
 * Configure monitoring and visualization tools
 * @param {Express} app - Express application
 */
export const configureMonitoring = (app) => {
  // Add Prometheus metrics middleware (should be early in middleware chain)
  app.use(monitoringIntegration.getMetricsMiddleware());
  
  // Mount monitoring dashboard at /monitoring
  app.use('/monitoring', monitoringIntegration.getRouter());
  
  // Log successful monitoring setup
  console.log('✅ Monitoring and visualization tools configured');
};
