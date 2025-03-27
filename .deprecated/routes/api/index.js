/**
 * API Routes Index
 * 
 * Main router for API endpoints
 */

const express = require('express');
const router = express.Router();

// Import route modules
const challengesRoutes = require('./challenges');
const usersRoutes = require('./users');
const evaluationsRoutes = require('./evaluations');

// Register routes
router.use('/challenges', challengesRoutes);
router.use('/users', usersRoutes);
router.use('/evaluations', evaluationsRoutes);

// API Status route
router.get('/status', (req, res) => {
  res.json({ 
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 