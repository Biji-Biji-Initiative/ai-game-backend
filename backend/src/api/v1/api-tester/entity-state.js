/**
 * API Tester Entity State Endpoint
 * Provides debug endpoints for fetching domain entity state for the API tester
 */

const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { getRepositoryByEntityType } = require('#app/core/repositories');
const { logger } = require('#app/utils/logger');
const { asyncHandler } = require('#app/api/middleware/asyncHandler');
const { requireAdmin } = require('#app/api/middleware/requireAdmin');
const { isDevMode } = require('#app/utils/environment');

// Create a router
const router = Router();

/**
 * GET /api/v1/api-tester/entity-state
 * Fetches the current state of a domain entity by type and ID
 * Requires either:
 * - Admin permission, or
 * - Dev mode enabled
 */
router.get('/entity-state', requireAdmin(), asyncHandler(async (req, res) => {
  const { type, id } = req.query;
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  
  // Validate parameters
  if (!type || !id) {
    logger.warn('Missing required parameters', { type, id, correlationId });
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: type and id are required'
    });
  }
  
  // Log the request
  logger.info('Fetching entity state', { type, id, correlationId });
  
  try {
    // Get the appropriate repository for the entity type
    const repository = getRepositoryByEntityType(type);
    
    if (!repository) {
      logger.warn('Invalid entity type', { type, correlationId });
      return res.status(400).json({
        success: false,
        error: `Invalid entity type: ${type}`
      });
    }
    
    // Fetch the entity from the repository
    const entity = await repository.findById(id);
    
    if (!entity) {
      logger.warn('Entity not found', { type, id, correlationId });
      return res.status(404).json({
        success: false,
        error: `Entity not found: ${type} with ID ${id}`
      });
    }
    
    // Return the entity state
    return res.json({
      success: true,
      entity: entity.toJSON ? entity.toJSON() : entity
    });
  } catch (error) {
    logger.error('Error fetching entity state', {
      type,
      id,
      correlationId,
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      success: false,
      error: `Error fetching entity state: ${error.message}`
    });
  }
}));

module.exports = router; 