import express from "express";
'use strict';
/**
 * Health Check Routes - Infrastructure Layer
 *
 * Sets up the routes for system health checks
 */
/**
 * Create health check routes
 * @param {Object} container - DI container
 * @returns {Object} Express router with health check routes
 */
function createHealthRoutes(container) {
    const router = express.Router();
    const healthCheckController = container.get('healthCheckController');
    /**
     * /health:
     *   get:
     *     summary: System health check
     *     description: Comprehensive health check of all system components
     *     tags: [System]
     *     responses:
     *       200:
     *         description: System is healthy
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                   example: success
     *                 message:
     *                   type: string
     *                   example: Server is healthy
     *                 timestamp:
     *                   type: string
     *                   format: date-time
     *                 uptime:
     *                   type: number
     *                   description: Server uptime in seconds
     *                 dependencies:
     *                   type: object
     *                   properties:
     *                     database:
     *                       type: object
     *                     openai:
     *                       type: object
     *       503:
     *         description: System is unhealthy
     */
    router.get('/', healthCheckController.checkHealth);
    return router;
}
export default createHealthRoutes;
