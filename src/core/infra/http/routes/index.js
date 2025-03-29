const { container } = require('../../../config/container');

'use strict';

/**
 * Routes index file
 * Centralizes all API routes
 */
// const express = require('express');
const router = express.Router();
// const userRoutes = require('./userRoutes');
// const challengeRoutes = require('./challengeRoutes');
// const personalityRoutes = require('./personalityRoutes');
// const progressRoutes = require('./progressRoutes');
// const adaptiveRoutes = require('./adaptiveRoutes');
// const evaluationRoutes = require('./evaluationRoutes');
// const userJourneyRoutes = require('./userJourneyRoutes');
// const focusAreaRoutes = require('./focusAreaRoutes');
// const authRoutes = require('./authRoutes');

// API health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API health check successful',
    timestamp: new Date().toISOString(),
  });
});

// API version and documentation
router.get('/', (req, res) => {
  res.status(200).json({
    name: 'AI Fight Club API',
    version: '1.0.0',
    description: 'API for dynamic AI-driven cognitive challenges',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      challenges: '/api/challenges',
      personality: '/api/personality',
      progress: '/api/progress',
      adaptive: '/api/adaptive',
      evaluations: '/api/evaluations',
      userJourney: '/api/user-journey',
      focusAreas: '/api/focus-areas',
      health: '/api/health',
    },
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/challenges', challengeRoutes);
router.use('/personality', personalityRoutes);
router.use('/progress', progressRoutes);
router.use('/adaptive', adaptiveRoutes);
router.use('/evaluations', evaluationRoutes);
router.use('/user-journey', userJourneyRoutes);
router.use('/focus-areas', focusAreaRoutes);

module.exports = router;
