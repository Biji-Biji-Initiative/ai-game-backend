'use strict';

/**
 * Routes Registration
 * 
 * This module registers all API routes in the DI container.
 */

/**
 * Register route components in the container
 * @param {DIContainer} container - The DI container
 */
function registerRouteComponents(container) {
  // Register route modules
  container.register(
    'userRoutes',
    c => {
      const userRoutes = require('../../routes/userRoutes');
      return userRoutes(c.get('userController'));
    },
    true
  );

  container.register(
    'personalityRoutes',
    c => {
      const personalityRoutes = require('../../routes/personalityRoutes');
      return personalityRoutes(c.get('personalityController'));
    },
    true
  );

  container.register(
    'progressRoutes',
    c => {
      const progressRoutes = require('../../routes/progressRoutes');
      return progressRoutes(c.get('progressController'));
    },
    true
  );

  container.register(
    'adaptiveRoutes',
    c => {
      const adaptiveRoutes = require('../../routes/adaptiveRoutes');
      return adaptiveRoutes(c.get('adaptiveController'));
    },
    true
  );

  container.register(
    'focusAreaRoutes',
    c => {
      const focusAreaRoutes = require('../../routes/focusAreaRoutes');
      return focusAreaRoutes(c.get('focusAreaController'));
    },
    true
  );

  container.register(
    'challengeRoutes',
    c => {
      const challengeRoutes = require('../../routes/challengeRoutes');
      return challengeRoutes(c.get('challengeController'));
    },
    true
  );

  container.register(
    'evaluationRoutes',
    c => {
      const evaluationRoutes = require('../../routes/evaluationRoutes');
      return evaluationRoutes(c.get('evaluationController'));
    },
    true
  );

  container.register(
    'userJourneyRoutes',
    c => {
      const userJourneyRoutes = require('../../routes/userJourneyRoutes');
      return userJourneyRoutes(c.get('userJourneyController'));
    },
    true
  );

  // AI-related routes
  container.register(
    'aiChatRoutes',
    c => {
      const aiChatRoutes = require('../../routes/ai/aiChatRoutes');
      return aiChatRoutes(c.get('aiChatController'));
    },
    true
  );

  container.register(
    'aiAnalysisRoutes',
    c => {
      const aiAnalysisRoutes = require('../../routes/ai/aiAnalysisRoutes');
      return aiAnalysisRoutes(c.get('aiAnalysisController'));
    },
    true
  );

  // Register root routes that consolidate all route modules
  container.register(
    'apiRoutes',
    c => {
      const express = require('express');
      const router = express.Router();
      
      // Mount domain-specific routes
      router.use('/users', c.get('userRoutes'));
      router.use('/personalities', c.get('personalityRoutes'));
      router.use('/progress', c.get('progressRoutes'));
      router.use('/adaptive', c.get('adaptiveRoutes'));
      router.use('/focus-areas', c.get('focusAreaRoutes'));
      router.use('/challenges', c.get('challengeRoutes'));
      router.use('/evaluations', c.get('evaluationRoutes'));
      router.use('/user-journey', c.get('userJourneyRoutes'));
      
      // Mount AI-related routes
      router.use('/ai/chat', c.get('aiChatRoutes'));
      router.use('/ai/analysis', c.get('aiAnalysisRoutes'));
      
      return router;
    },
    true
  );
}

module.exports = registerRouteComponents; 