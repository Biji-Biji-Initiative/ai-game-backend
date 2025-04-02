'use strict';

import express from 'express';
import { logger as appLogger } from '#app/core/infra/logging/logger.js'; // Import logger

/**
 * Health Check Routes - Infrastructure Layer
 *
 * Sets up the routes for system health checks
 */

/**
 * Create health check routes
 * @param {Object} container - DI container
 * @param {Function} ExpressRouter - The express.Router constructor function
 * @returns {Object} Express router with health check routes
 */
function createHealthRoutes({ container, healthCheckController }) {
    const router = express.Router();
    const logger = appLogger.child({ component: 'HealthRoutes' }); // Create a child logger

    if (!healthCheckController) {
        logger.error('HealthCheckController dependency is missing or invalid. Cannot create health routes.');
        // Mount a fallback route if controller is missing
        router.get('/', (req, res) => {
            res.status(503).json({ status: 'error', message: 'Health check service unavailable (controller missing)' });
        });
        return router;
    }
    
    // Check if the method exists before binding
    if (typeof healthCheckController.checkHealth !== 'function') {
        logger.error('healthCheckController does not have a checkHealth method. Cannot attach health route.');
        router.get('/', (req, res) => {
            res.status(503).json({ status: 'error', message: 'Health check service unavailable (method missing)' });
        });
    } else {
        // Attach the route
        // logger.debug('[HealthRoutes] Controller seems valid, attaching route...'); // REMOVE - too verbose
        router.get('/', healthCheckController.checkHealth.bind(healthCheckController));
        logger.info('[HealthRoutes] Route GET /health attached successfully.'); // Keep as info
    }

    return router;
}

export default createHealthRoutes;
