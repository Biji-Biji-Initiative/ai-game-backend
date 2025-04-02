import express from 'express';
import { logger } from "#app/core/infra/logging/logger.js";
import { getCacheService, getCacheInvalidationManager } from "#app/core/infra/cache/cacheFactory.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
// Fix the import path to point to the correct file
import { requireAdmin } from "../middleware/auth.js";
import { infraLogger as domainLogger } from "#app/core/infra/logging/domainLogger.js"; // Import logger
'use strict';

/**
 * System Routes
 * Provides monitoring, metrics, and debugging endpoints
 */
const router = express.Router();

/**
 * System routes factory
 * @returns {express.Router} Express router
 */
export default function systemRoutes(container) {
    const systemController = container.get('systemController');

    if (!systemController) {
        logger.error('SystemController not found in container. System routes will be unavailable.');
        // Return a fallback router
        router.all('*', (req, res) => {
            res.status(501).json({ 
                error: 'System routes unavailable', 
                message: 'SystemController failed to initialize.'
            });
        });
        return router;
    }

    // Require admin authentication for all system routes
    // router.use(authenticateUser); // Removed as this is now applied at a higher level
    router.use(requireAdmin);
    
    /**
     * GET /system/health
     * System health check endpoint
     */
    // Health check endpoint removed - using centralized implementation in app.js directly
    // See '/api/v1/health' endpoint mounted directly in app.js
    
    /**
     * GET /system/metrics/cache
     * Cache metrics endpoint
     */
    router.get('/metrics/cache', (req, res) => {
        try {
            const cacheService = getCacheService();
            const cacheInvalidator = getCacheInvalidationManager();
            
            const metrics = {
                cache: cacheService.getMetrics(),
                invalidation: cacheInvalidator.getMetrics()
            };
            
            res.status(200).json({
                status: 'success',
                data: metrics
            });
        } catch (error) {
            logger.error('Error retrieving cache metrics', {
                error: error.message,
                stack: error.stack
            });
            
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve cache metrics'
            });
        }
    });
    
    /**
     * GET /system/metrics/events
     * Event bus metrics endpoint
     */
    router.get('/metrics/events', (req, res) => {
        try {
            const eventBus = container.get('eventBus');
            if (!eventBus || typeof eventBus.getMetrics !== 'function') {
                return res.status(404).json({
                    status: 'error',
                    message: 'Event bus metrics not available'
                });
            }
            
            const eventMetrics = eventBus.getMetrics();
            
            res.status(200).json({
                status: 'success',
                data: eventMetrics
            });
        } catch (error) {
            logger.error('Error retrieving event metrics', {
                error: error.message,
                stack: error.stack
            });
            
            res.status(500).json({
                status: 'error',
                message: 'Failed to retrieve event metrics'
            });
        }
    });
    
    /**
     * POST /system/cache/invalidate
     * Manually invalidate cache patterns for maintenance
     */
    router.post('/cache/invalidate', async (req, res) => {
        try {
            const { pattern, entityType, entityId } = req.body;
            
            if (!pattern && !entityType) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Either pattern or entityType is required'
                });
            }
            
            const cacheInvalidator = getCacheInvalidationManager();
            let result = false;
            
            if (pattern) {
                result = await cacheInvalidator.invalidatePattern(pattern);
            } else if (entityType && entityId) {
                result = await cacheInvalidator.invalidateEntity(entityType, entityId);
            } else if (entityType && !entityId) {
                result = await cacheInvalidator.invalidateListCaches(entityType);
            }
            
            res.status(200).json({
                status: result ? 'success' : 'error',
                message: result ? 'Cache invalidated successfully' : 'Failed to invalidate cache'
            });
        } catch (error) {
            logger.error('Error invalidating cache', {
                error: error.message,
                stack: error.stack
            });
            
            res.status(500).json({
                status: 'error',
                message: 'Failed to invalidate cache: ' + error.message
            });
        }
    });
    
    /**
     * POST /system/cache/reset-metrics
     * Reset cache metrics counters
     */
    router.post('/cache/reset-metrics', (req, res) => {
        try {
            const cacheInvalidator = getCacheInvalidationManager();
            
            cacheInvalidator.resetMetrics();
            
            res.status(200).json({
                status: 'success',
                message: 'Cache metrics reset successfully'
            });
        } catch (error) {
            logger.error('Error resetting cache metrics', {
                error: error.message,
                stack: error.stack
            });
            
            res.status(500).json({
                status: 'error',
                message: 'Failed to reset cache metrics'
            });
        }
    });
    
    /**
     * POST /system/event-bus/reset-metrics
     * Reset event bus metrics counters
     */
    router.post('/event-bus/reset-metrics', (req, res) => {
        try {
            const eventBus = container.get('eventBus');
            if (!eventBus || typeof eventBus.resetMetrics !== 'function') {
                return res.status(404).json({
                    status: 'error',
                    message: 'Event bus reset metrics not available'
                });
            }
            
            eventBus.resetMetrics();
            
            res.status(200).json({
                status: 'success',
                message: 'Event bus metrics reset successfully'
            });
        } catch (error) {
            logger.error('Error resetting event bus metrics', {
                error: error.message,
                stack: error.stack
            });
            
            res.status(500).json({
                status: 'error',
                message: 'Failed to reset event bus metrics'
            });
        }
    });
    
    /**
     * GET /system/config
     * Get application configuration (safe values only)
     */
    router.get('/config', (req, res) => {
        // Only return safe configuration values, not secrets
        const safeConfig = {
            environment: process.env.NODE_ENV || 'development',
            appVersion: process.env.APP_VERSION || '1.0.0',
            apiPrefix: process.env.API_PREFIX || '/api/v1',
            rateLimits: {
                enabled: process.env.RATE_LIMIT_ENABLED === 'true',
                global: {
                    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
                    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
                }
            }
        };
        
        res.status(200).json({
            status: 'success',
            data: safeConfig
        });
    });
    
    /**
     * GET /system/logs
     * Get system logs from log files
     * Requires admin permissions
     */
    if (typeof systemController.getLogs !== 'function') {
        logger.error('systemController.getLogs method is missing.');
    } else {
        router.get('/logs', systemController.getLogs.bind(systemController));
        logger.info('Mounted GET /system/logs endpoint');
    }
    
    logger.info('System routes created.');
    return router;
} 