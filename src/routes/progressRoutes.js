/**
 * Progress Routes
 * Handles routes related to user progress tracking
 */
const express = require('express');
const router = express.Router();
const ProgressController = require('../core/progress/controllers/ProgressController');
const { authenticateUser } = require('../core/infra/http/middleware/auth');
const container = require('../config/container');

// Create controller instance with dependencies
const progressController = new ProgressController({
  logger: container.get('logger'),
  progressService: container.get('progressService')
});

// Get current user's overall progress
router.get('/', authenticateUser, (req, res) => progressController.getUserProgress(req, res));

// Get all progress records for current user
router.get('/all', authenticateUser, (req, res) => progressController.getAllUserProgress(req, res));

// Get progress for a specific challenge
router.get('/challenge/:challengeId', authenticateUser, (req, res) => progressController.getChallengeProgress(req, res));

// Record a challenge completion
router.post('/complete', authenticateUser, (req, res) => progressController.recordChallengeCompletion(req, res));

// Update skill levels
router.put('/skills', authenticateUser, (req, res) => progressController.updateSkillLevels(req, res));

// Set focus area
router.put('/focus-area', authenticateUser, (req, res) => progressController.setFocusArea(req, res));

module.exports = router; 