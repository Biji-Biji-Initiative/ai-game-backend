import express from 'express';
// import { authenticateUser } from "#app/core/infra/http/middleware/auth.js"; // Removed as auth is applied at a higher level
import UserJourneyController from "#app/core/userJourney/controllers/UserJourneyController.js";
'use strict';

/**
 * User Journey Routes
 * Handles routes related to user learning journey tracking
 */
const router = express.Router();

/**
 * User journey routes factory
 * @param {UserJourneyController} userJourneyController - User journey controller instance
 * @returns {express.Router} Express router
 */
export default function userJourneyRoutes(userJourneyController) {
    // Get current user's journey
    router.get('/', (req, res) => userJourneyController.getUserJourney(req, res));
    
    // Start a new journey event
    router.post('/events', (req, res) => userJourneyController.startJourneyEvent(req, res));
    
    // Complete a journey event
    router.put('/events/:eventId/complete', (req, res) => userJourneyController.completeJourneyEvent(req, res));
    
    // Get journey events
    router.get('/events', (req, res) => userJourneyController.getJourneyEvents(req, res));
    
    // Get journey statistics
    router.get('/stats', (req, res) => userJourneyController.getJourneyStats(req, res));
    
    return router;
}
