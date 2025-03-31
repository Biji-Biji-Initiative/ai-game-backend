import express from 'express';
import { logger } from "@/core/infra/logging/logger.js";
import { getCacheService, getCacheInvalidationManager } from "@/core/infra/cache/cacheFactory.js";
import domainEvents from "@/core/common/events/domainEvents.js";
import { authenticateUser, requireAdmin } from "@/core/infra/http/middleware/auth.js";
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
export default function systemRoutes() {
    // Require admin authentication for all system routes
    router.use(authenticateUser);
    router.use(requireAdmin);
    
    /**
     * GET /system/health
     * System health check endpoint
     */
    router.get('/health', (req, res) => {
        const healthData = {
            status: 'ok',
            uptime: process.uptime(),
            timestamp: Date.now(),
            memoryUsage: process.memoryUsage()
        };
        
        res.status(200).json({
            status: 'success',
            data: healthData
        });
    });
    
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
            const eventMetrics = domainEvents.getMetrics();
            
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
            domainEvents.reset();
            
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
    
    return router;
} 