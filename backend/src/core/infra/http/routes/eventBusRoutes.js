import express from 'express';
import { requireAdmin } from "#app/core/infra/http/middleware/auth.js";
import { logger } from "#app/core/infra/logging/logger.js";
import { createValidationMiddleware } from "#app/core/infra/http/middleware/validationFactory.js";
import { z } from "zod";

'use strict';

// Validation schemas
const dlqQuerySchema = z.object({
  status: z.string().optional(),
  eventName: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).optional()
}).strict();

const dlqIdParamSchema = z.object({
  id: z.string().uuid("DLQ entry ID must be a valid UUID")
}).strict();

const retryAllSchema = z.object({
  status: z.string().optional(),
  eventName: z.string().optional()
}).strict();

/**
 * Event Bus Routes
 * 
 * Provides monitoring and management endpoints for the event bus system,
 * including Dead Letter Queue management.
 * @param {Object} options - Dependencies
 * @param {Object} options.deadLetterQueueService - DLQ service instance
 * @param {Object} options.eventBus - Event bus instance
 */
export default function eventBusRoutes(options = {}) {
  const router = express.Router();
  const { deadLetterQueueService, eventBus } = options;
  
  // Apply authentication and admin middleware to all routes
  router.use(requireAdmin);
  
  /**
   * GET /api/events/metrics
   * Get event bus metrics
   */
  router.get('/metrics', (req, res) => {
    try {
      const metrics = eventBus.getMetrics();
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get event metrics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get event metrics'
      });
    }
  });
  
  /**
   * GET /api/events/history
   * Get event history
   */
  router.get('/history', (req, res) => {
    try {
      const { eventName, correlationId, limit } = req.query;
      
      const options = {};
      if (eventName) options.eventName = eventName;
      if (correlationId) options.correlationId = correlationId;
      if (limit) options.limit = parseInt(limit, 10);
      
      const history = eventBus.getEventHistory(options);
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Failed to get event history', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get event history'
      });
    }
  });
  
  /**
   * GET /api/events/dlq
   * Get failed events from the dead letter queue
   */
  router.get('/dlq', 
    ...createValidationMiddleware({ query: dlqQuerySchema }),
    async (req, res) => {
      try {
        const { status, eventName, limit, offset } = req.query;
        
        const options = {};
        if (status) options.status = status;
        if (eventName) options.eventName = eventName;
        if (limit) options.limit = limit;
        if (offset) options.offset = offset;
        
        const failedEvents = await eventBus.getFailedEvents(options);
        
        res.json({
          success: true,
          data: failedEvents,
          count: failedEvents.length
        });
      } catch (error) {
        logger.error('Failed to get DLQ events', { error });
        res.status(500).json({
          success: false,
          error: 'Failed to get DLQ events',
          message: error.message
        });
      }
    }
  );
  
  /**
   * POST /api/events/dlq/:id/retry
   * Retry a specific failed event
   */
  router.post('/dlq/:id/retry', 
    ...createValidationMiddleware({ params: dlqIdParamSchema }),
    async (req, res) => {
      try {
        const { id } = req.params;
        
        const success = await eventBus.retryFromDLQ(id);
        
        res.json({
          success,
          message: success ? 'Event retry initiated' : 'Failed to retry event'
        });
      } catch (error) {
        logger.error('Failed to retry DLQ event', { error, id: req.params.id });
        res.status(500).json({
          success: false,
          error: 'Failed to retry event',
          message: error.message
        });
      }
    }
  );
  
  /**
   * POST /api/events/dlq/retry-all
   * Retry all failed events matching criteria
   */
  router.post('/dlq/retry-all', 
    ...createValidationMiddleware({ body: retryAllSchema }),
    async (req, res) => {
      try {
        const { status, eventName } = req.body;
        
        const options = {};
        if (status) options.status = status;
        if (eventName) options.eventName = eventName;
        
        const results = await eventBus.retryFailedEvents(options);
        
        res.json({
          success: true,
          data: results
        });
      } catch (error) {
        logger.error('Failed to retry DLQ events', { error });
        res.status(500).json({
          success: false,
          error: 'Failed to retry events',
          message: error.message
        });
      }
    }
  );
  
  /**
   * DELETE /api/events/dlq/:id
   * Delete a specific failed event
   */
  router.delete('/dlq/:id', 
    ...createValidationMiddleware({ params: dlqIdParamSchema }),
    async (req, res) => {
      try {
        const { id } = req.params;
        
        const success = await deadLetterQueueService.deleteEntry(id);
        
        res.json({
          success,
          message: success ? 'Event deleted from DLQ' : 'Failed to delete event'
        });
      } catch (error) {
        logger.error('Failed to delete DLQ event', { error, id: req.params.id });
        res.status(500).json({
          success: false,
          error: 'Failed to delete event',
          message: error.message
        });
      }
    }
  );
  
  /**
   * PUT /api/events/dlq/:id/resolve
   * Mark a failed event as resolved without retrying
   */
  router.put('/dlq/:id/resolve', 
    ...createValidationMiddleware({ params: dlqIdParamSchema }),
    async (req, res) => {
      try {
        const { id } = req.params;
        
        const success = await deadLetterQueueService.resolveEntry(id);
        
        res.json({
          success,
          message: success ? 'Event marked as resolved' : 'Failed to resolve event'
        });
      } catch (error) {
        logger.error('Failed to resolve DLQ event', { error, id: req.params.id });
        res.status(500).json({
          success: false,
          error: 'Failed to resolve event',
          message: error.message
        });
      }
    }
  );
  
  return router;
} 