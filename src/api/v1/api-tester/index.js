/**
 * API Tester Routes
 * Provides debug endpoints for the API tester
 */

const { Router } = require('express');
const entityStateRouter = require('./entity-state');
const { isDevMode } = require('@/utils/environment');
const { requireAdmin } = require('@/api/middleware/requireAdmin');

// Create a router
const router = Router();

// Only allow these routes in development mode or for admin users
router.use((req, res, next) => {
  if (isDevMode() || req.user?.isAdmin) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    error: 'API Tester endpoints are only available in development mode or for admin users'
  });
});

// Register the entity-state endpoint
router.use('/', entityStateRouter);

module.exports = router; 