import express from 'express';
import PersonalityController from "#app/core/personality/controllers/PersonalityController.js";
// import { authenticateUser } from "#app/core/infra/http/middleware/auth.js"; // Removed incorrect import
'use strict';

/**
 * Personality Routes
 * Handles routes related to user personality data and insights
 */
const router = express.Router();

/**
 * Personality routes factory
 * @param {PersonalityController} personalityController - Personality controller instance
 * @returns {express.Router} Express router
 */
export default function personalityRoutes(personalityController) {
    // Get user's personality profile
    router.get('/profile', (req, res) => personalityController.getPersonalityProfile(req, res));
    
    // Update personality traits
    router.put('/traits', (req, res) => personalityController.updatePersonalityTraits(req, res));
    
    // Update AI attitudes
    router.put('/attitudes', (req, res) => personalityController.updateAIAttitudes(req, res));
    
    // Generate insights from personality data
    router.post('/insights/generate', (req, res) => personalityController.generateInsights(req, res));
    
    // Get insights
    router.get('/insights', (req, res) => personalityController.getInsights(req, res));
    
    // Calculate challenge compatibility
    router.post('/compatibility', (req, res) => personalityController.calculateChallengeCompatibility(req, res));
    
    return router;
}
