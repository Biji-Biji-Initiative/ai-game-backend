import express from 'express';
import AdaptiveController from "#app/core/adaptive/controllers/AdaptiveController.js";
// import { authenticateUser } from "#app/core/infra/http/middleware/auth.js"; // Removed as auth is applied at a higher level
'use strict';

/**
 * Adaptive Routes
 * Handles routes related to adaptive difficulty and personalization
 */
const router = express.Router();

/**
 * Adaptive routes factory
 * @param {AdaptiveController} adaptiveController - Adaptive controller instance
 * @returns {express.Router} Express router
 */
export default function adaptiveRoutes(adaptiveController) {
    // Get adaptive settings for a user
    router.get('/settings', (req, res) => adaptiveController.getAdaptiveSettings(req, res));
    
    // Update adaptive settings
    router.put('/settings', (req, res) => adaptiveController.updateAdaptiveSettings(req, res));
    
    // Get challenge recommendations
    router.get('/recommendations', (req, res) => adaptiveController.getRecommendations(req, res));
    
    // Record difficulty feedback
    router.post('/feedback', (req, res) => adaptiveController.recordDifficultyFeedback(req, res));
    
    return router;
}
