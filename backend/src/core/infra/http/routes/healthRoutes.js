import express from "express";
'use strict';

// Restore regular imports, remove manual ones
// import HealthCheckController from "#app/core/infra/health/HealthCheckController.js";
// import HealthCheckService from "#app/core/infra/health/HealthCheckService.js";
// import { infraLogger as logger } from "#app/core/infra/logging/domainLogger.js";
// import { runDatabaseHealthCheck } from "#app/core/infra/db/databaseConnection.js";
// import { checkOpenAIStatus } from "#app/core/infra/openai/healthCheck.js";
// import { container } from "#app/config/container.js"; 

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
function createHealthRoutes(container, ExpressRouter) { // Accept Router constructor
    if (!ExpressRouter) {
        console.error('[HealthRoutes] ExpressRouter constructor was not provided!');
        throw new Error('ExpressRouter constructor is required.'); 
    }
    const router = ExpressRouter(); // Use the passed Router constructor
    
    try {
        console.log('[HealthRoutes] Attempting to get healthCheckController...');
        const healthCheckController = container.get('healthCheckController');
        console.log('[HealthRoutes] Retrieved healthCheckController:', typeof healthCheckController);
        
        if (healthCheckController) {
            console.log('[HealthRoutes] Controller properties:', Object.keys(healthCheckController));
            console.log('[HealthRoutes] Has checkHealth method?', typeof healthCheckController.checkHealth);
        }
        
        // Ensure controller was retrieved and has the checkHealth method
        if (!healthCheckController || typeof healthCheckController.checkHealth !== 'function') {
             console.error('[HealthRoutes] Validation Failed: Invalid controller or method.', {
                 controllerType: typeof healthCheckController,
                 hasCheckHealth: healthCheckController ? typeof healthCheckController.checkHealth : 'N/A'
             });
             throw new Error('HealthCheckController or its checkHealth method is invalid or missing.');
        }

        console.log('[HealthRoutes] Controller seems valid, attaching route...');
        router.get('', healthCheckController.checkHealth);
        console.log('[HealthRoutes] Route attached successfully.');
        
    } catch (error) {
        console.error('[HealthRoutes] Failed to create health check routes:', error);
        // Provide a fallback route if controller fails to load
        router.get('', (req, res) => {
            res.status(503).json({
                status: 'error',
                message: 'Health check service is unavailable during setup',
                error: error.message
            });
        });
    }
    
    return router;
}

export default createHealthRoutes;
