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
    router.get('/profile', (req, res, next) => personalityController.getPersonalityProfile(req, res, next));
    
    // Update personality traits
    router.put('/traits', (req, res, next) => personalityController.updatePersonalityTraits(req, res, next));
    
    // Update AI attitudes
    router.put('/attitudes', (req, res, next) => personalityController.updateAIAttitudes(req, res, next));
    
    // Generate insights from personality data
    router.post('/insights/generate', (req, res, next) => personalityController.generateInsights(req, res, next));
    
    // Get insights
    router.get('/insights', (req, res, next) => personalityController.getInsights(req, res, next));
    
    // Calculate challenge compatibility
    router.post('/compatibility', (req, res, next) => personalityController.calculateChallengeCompatibility(req, res, next));
    
    return router;
}
