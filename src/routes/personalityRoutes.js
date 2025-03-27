/**
 * Personality Routes
 * Handles routes related to personality analysis and insights
 */
const express = require('express');
const router = express.Router();
const PersonalityController = require('../core/personality/controllers/PersonalityController');
const { authenticateUser } = require('../core/infra/http/middleware/auth');
const container = require('../config/container');

// Create controller instance
const personalityController = new PersonalityController();

// Get personality profile
router.get('/profile', authenticateUser, (req, res) => personalityController.getPersonalityProfile(req, res));

// Generate insights for current user
router.get('/insights', authenticateUser, (req, res) => personalityController.generateInsights(req, res));

// Update personality traits for current user
router.put('/traits', authenticateUser, (req, res) => personalityController.updatePersonalityTraits(req, res));

// Update AI attitudes for current user
router.put('/attitudes', authenticateUser, (req, res) => personalityController.updateAIAttitudes(req, res));

module.exports = router;
