'use strict';

import express from 'express';
import { authorizeResource } from "#app/core/infra/http/middleware/resourceAuth.js";
import { validateBody, validateQuery, validateParams } from "#app/core/infra/http/middleware/validation.js";

/**
 * Network Routes
 * Handles routes related to neural network progression
 */
const router = express.Router();

/**
 * Network routes factory
 * @param {Object} networkController - Network controller instance
 * @returns {express.Router} Express router
 */
export default function networkRoutes(networkController) {
  // Get user's neural network
  router.get('/', 
    (req, res) => networkController.getUserNetwork(req, res)
  );
  
  // Get network growth over time
  router.get('/growth', 
    validateQuery(['timeframe', 'focusArea']),
    (req, res) => networkController.getNetworkGrowth(req, res)
  );
  
  // Get network node details
  router.get('/nodes/:nodeId', 
    validateParams('nodeId'),
    (req, res) => networkController.getNodeDetails(req, res)
  );
  
  // Get network connection details
  router.get('/connections/:connectionId', 
    validateParams('connectionId'),
    (req, res) => networkController.getConnectionDetails(req, res)
  );
  
  // Get network insights and recommendations
  router.get('/insights', 
    (req, res) => networkController.getNetworkInsights(req, res)
  );
  
  // Compare network with rival
  router.get('/compare/:rivalId', 
    validateParams('rivalId'),
    (req, res) => networkController.compareWithRival(req, res)
  );
  
  // Get network statistics
  router.get('/stats', 
    (req, res) => networkController.getNetworkStats(req, res)
  );
  
  // Update network visualization preferences
  router.put('/preferences', 
    validateBody(['visualizationMode', 'highlightedAreas']),
    (req, res) => networkController.updateNetworkPreferences(req, res)
  );
  
  return router;
}
