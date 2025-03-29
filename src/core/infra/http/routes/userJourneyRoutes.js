'use strict';
const { userJourneyController } = require('../controllers/userJourneyController');

// const express = require('express');
const router = express.Router();
// const UserJourneyController = require('../core/userJourney/controllers/UserJourneyController');
const { authenticateUser, requireAdmin } = require('../core/infra/http/middleware/auth');
// const container = require('../config/container');

// Create controller instance with injected dependencies
const userJourneyController = new UserJourneyController({
  userJourneyCoordinator: container.get('userJourneyCoordinator'),
  userRepository: container.get('userRepository'),
});

// Track user event
router.post('/events', (req, res, next) => userJourneyController.trackEvent(req, res, next));

// Get user journey events
router.get('/users/:email/events', authenticateUser, (req, res, next) =>
  userJourneyController.getUserEvents(req, res, next)
);

// Get user activity summary
router.get('/users/:email/activity', authenticateUser, (req, res, next) =>
  userJourneyController.getUserActivitySummary(req, res, next)
);

// Get user engagement metrics
router.get('/users/:email/engagement', authenticateUser, (req, res, next) =>
  userJourneyController.getUserEngagementMetrics(req, res, next)
);

module.exports = router;
