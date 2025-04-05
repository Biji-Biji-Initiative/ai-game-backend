'use strict';

import express from 'express';
import { authorizeResource } from "#app/core/infra/http/middleware/resourceAuth.js";
import { validateBody, validateQuery, validateParams } from "#app/core/infra/http/middleware/validation.js";

/**
 * Rival Routes
 * Handles routes related to AI rivals
 */
const router = express.Router();

/**
 * Rival routes factory
 * @param {Object} rivalController - Rival controller instance
 * @returns {express.Router} Express router
 */
export default function rivalRoutes(rivalController) {
  // Function to get the owner of a rival for authorization
  const getRivalOwner = async (rivalId, req) => {
    const container = req.app.get('container');
    if (!container) {
      throw new Error('Container not available in request');
    }
    
    const rivalRepository = container.get('rivalRepository');
    const rival = await rivalRepository.findById(rivalId);
    return rival ? rival.userId : null;
  };

  // Get all rivals for current user
  router.get('/', 
    (req, res) => rivalController.getUserRivals(req, res)
  );
  
  // Generate a new rival
  router.post('/generate', 
    (req, res) => rivalController.generateRival(req, res)
  );
  
  // Get a specific rival (must be owner)
  router.get('/:id', 
    authorizeResource({
      resourceType: 'rival',
      paramName: 'id',
      action: 'read',
      getResourceOwner: getRivalOwner
    }),
    (req, res) => rivalController.getRivalById(req, res)
  );
  
  // Challenge a rival (must be owner)
  router.post('/:id/challenge', 
    authorizeResource({
      resourceType: 'rival',
      paramName: 'id',
      action: 'update',
      getResourceOwner: getRivalOwner
    }),
    (req, res) => rivalController.challengeRival(req, res)
  );
  
  // Update rival (must be owner)
  router.put('/:id', 
    authorizeResource({
      resourceType: 'rival',
      paramName: 'id',
      action: 'update',
      getResourceOwner: getRivalOwner
    }),
    (req, res) => rivalController.updateRival(req, res)
  );
  
  // Delete rival (must be owner)
  router.delete('/:id',
    authorizeResource({
      resourceType: 'rival',
      paramName: 'id',
      action: 'delete',
      getResourceOwner: getRivalOwner
    }),
    (req, res) => rivalController.deleteRival(req, res)
  );
  
  // Get rival challenge history
  router.get('/:id/history', 
    authorizeResource({
      resourceType: 'rival',
      paramName: 'id',
      action: 'read',
      getResourceOwner: getRivalOwner
    }),
    (req, res) => rivalController.getRivalChallengeHistory(req, res)
  );
  
  return router;
}
