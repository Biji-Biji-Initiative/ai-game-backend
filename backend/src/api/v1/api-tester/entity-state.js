/**
 * API Tester Entity State Endpoint
 * Provides debug endpoints for fetching domain entity state for the API tester
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '#app/core/infra/logging/logger.js';
import { withControllerErrorHandling } from '#app/core/infra/errors/errorStandardization.js';

// This route likely needs dependencies injected now. 
// Assuming it's created via a factory or class that receives services.
// Example factory function structure:
export default function createEntityStateRoute(dependencies = {}) {
    const { 
        userService, 
        challengeService,
        evaluationService,
        focusAreaService,
        // Add other relevant services here...
    } = dependencies;
    
    // Basic validation to ensure services are provided during setup
    if (!userService || !challengeService /* Add checks for others */) {
      logger.error('Missing required services for createEntityStateRoute');
      // Return a handler that always errors out
      return (req, res) => res.status(500).json({ success: false, error: 'API Tester Route Configuration Error' });
    }

    const router = express.Router();

    const handleEntityStateRequest = async (req, res) => {
        const { type, id } = req.query;
        const correlationId = req.headers['x-correlation-id'] || uuidv4();

        if (!type || !id) {
            logger.warn('Missing required parameters', { type, id, correlationId });
            return res.status(400).json({ success: false, error: 'Missing required parameters: type and id are required' });
        }

        logger.info('API Tester: Fetching entity state', { type, id, correlationId });

        let entity = null;
        let serviceToUse = null;

        // Use a switch or map to select the appropriate *injected* service
        switch (type.toLowerCase()) {
            case 'user':
                serviceToUse = userService;
                break;
            case 'challenge':
                serviceToUse = challengeService;
                break;
            case 'evaluation':
                serviceToUse = evaluationService;
                break;
            case 'focusarea': // Assuming 'focusarea' is the type string
                serviceToUse = focusAreaService;
                break;
            // Add cases for other entity types and their corresponding services
            default:
                logger.warn('API Tester: Invalid entity type requested', { type, correlationId });
                return res.status(400).json({ success: false, error: `Invalid entity type: ${type}` });
        }

        if (!serviceToUse) {
             logger.error('API Tester: Service not found for type, DI issue?', { type, correlationId });
             return res.status(500).json({ success: false, error: `Internal configuration error for entity type: ${type}` });
        }

        try {
            // SIMPLIFIED: Call the standardized findById method on the selected service
            if (typeof serviceToUse.findById !== 'function') {
                logger.error('API Tester: Service does not implement findById method', { type, serviceName: serviceToUse.constructor?.name, correlationId });
                return res.status(500).json({ success: false, error: `Internal configuration error - service for type ${type} does not support findById` });
            }
            
            entity = await serviceToUse.findById(id);

            if (!entity) {
                logger.warn('API Tester: Entity not found via service findById', { type, id, correlationId });
                return res.status(404).json({ success: false, error: `Entity not found: ${type} with ID ${id}` });
            }

            // Return the entity state (prefer toJSON if available)
            return res.json({ success: true, entity: entity.toJSON ? entity.toJSON() : entity });

        } catch (error) {
            logger.error('API Tester: Error fetching entity state via service', {
                type,
                id,
                correlationId,
                service: serviceToUse?.constructor?.name,
                error: error.message,
                stack: error.stack // Be cautious logging full stack in production
            });
            // Use status code from error if available and operational, otherwise 500
            const statusCode = (error.isOperational && error.statusCode) ? error.statusCode : 500;
            return res.status(statusCode).json({ success: false, error: `Error fetching entity state: ${error.message}` });
        }
    };

    // Apply standardized error handling to the handler
    const safeHandler = withControllerErrorHandling(handleEntityStateRequest, {
        controllerName: 'ApiTesterEntityState',
        logger: logger
    });

    // Define the route
    router.get('/entity-state', safeHandler);

    return router; // Return the configured router
}

// --- Original Code (Commented out / To be removed) ---
/*
const router = express.Router();

router.get('/entity-state', withControllerErrorHandling(async (req, res) => {
  const { type, id } = req.query;
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  
  // ... validation ...
  
  logger.info('Fetching entity state', { type, id, correlationId });
  
  try {
    const repository = getRepositoryByEntityType(type);
    
    if (!repository) { ... }
    
    const entity = await repository.findById(id);
    
    if (!entity) { ... }
    
    return res.json({ success: true, entity: entity.toJSON ? entity.toJSON() : entity });
  } catch (error) { ... }
}));

export default router;
*/ 