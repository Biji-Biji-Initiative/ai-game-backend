const express = require('express');
const router = express.Router();
const FocusAreaController = require('../core/focusArea/controllers/FocusAreaController');
const { authenticateUser, requireAdmin } = require('../core/infra/http/middleware/auth');

// Create controller instance
const focusAreaController = new FocusAreaController();

// Get all focus areas
router.get('/', (req, res, next) => focusAreaController.getAllFocusAreas(req, res, next));

// Get focus areas for a user
router.get('/users/:email', authenticateUser, (req, res, next) => focusAreaController.getFocusAreasForUser(req, res, next));

// Set focus areas for a user
router.put('/users/:email', authenticateUser, (req, res, next) => focusAreaController.setFocusAreasForUser(req, res, next));

// Get recommended focus areas for a user
router.get('/users/:email/recommended', authenticateUser, (req, res, next) => focusAreaController.getRecommendedFocusAreas(req, res, next));

// Generate a new focus area (admin only)
router.post('/', authenticateUser, requireAdmin, (req, res, next) => focusAreaController.generateFocusArea(req, res, next));

module.exports = router; 