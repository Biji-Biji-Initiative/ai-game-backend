'use strict';

import express from 'express';
import { authorizeResource } from "#app/core/infra/http/middleware/resourceAuth.js";
import { validateBody, validateQuery, validateParams } from "#app/core/infra/http/middleware/validation.js";

/**
 * Badge Routes
 * Handles routes related to achievement badges
 */
const router = express.Router();

/**
 * Badge routes factory
 * @param {Object} badgeController - Badge controller instance
 * @returns {express.Router} Express router
 */
export default function badgeRoutes(badgeController) {
  // Get all badges for current user
  router.get('/', 
    (req, res) => badgeController.getUserBadges(req, res)
  );
  
  // Get all available badge types
  router.get('/types', 
    (req, res) => badgeController.getBadgeTypes(req, res)
  );
  
  // Get badge progress for current user
  router.get('/progress', 
    (req, res) => badgeController.getBadgeProgress(req, res)
  );
  
  // Get a specific badge by ID
  router.get('/:id', 
    (req, res) => badgeController.getBadgeById(req, res)
  );
  
  // Get badges by category
  router.get('/category/:category', 
    validateParams('category'),
    (req, res) => badgeController.getBadgesByCategory(req, res)
  );
  
  // Check for newly unlocked badges
  router.post('/check-unlocked', 
    (req, res) => badgeController.checkUnlockedBadges(req, res)
  );
  
  // Mark badge as viewed/acknowledged
  router.post('/:id/acknowledge', 
    (req, res) => badgeController.acknowledgeBadge(req, res)
  );
  
  // Get user badge statistics
  router.get('/stats', 
    (req, res) => badgeController.getBadgeStats(req, res)
  );
  
  return router;
}
