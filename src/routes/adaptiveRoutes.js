/**
 * Adaptive Routes
 * Handles routes related to adaptive learning features
 */
const express = require('express');
const router = express.Router();
const AdaptiveController = require('../core/adaptive/controllers/AdaptiveController');
const { authenticateUser } = require('../core/infra/http/middleware/auth');

// Create controller instance
const adaptiveController = new AdaptiveController();

// Get personalized recommendations
router.get('/recommendations', authenticateUser, (req, res) => adaptiveController.getRecommendations(req, res));

// Generate a dynamic challenge
router.get('/challenge/generate', authenticateUser, (req, res) => adaptiveController.generateChallenge(req, res));

// Adjust difficulty based on user performance
router.post('/difficulty/adjust', authenticateUser, (req, res) => adaptiveController.adjustDifficulty(req, res));

// Calculate optimal difficulty
router.get('/difficulty/calculate', authenticateUser, (req, res) => adaptiveController.calculateDifficulty(req, res));

module.exports = router; 