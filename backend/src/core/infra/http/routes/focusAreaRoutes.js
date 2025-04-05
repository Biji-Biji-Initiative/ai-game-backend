import express from 'express';
import FocusAreaController from "#app/core/focusArea/controllers/FocusAreaController.js";
// import { authenticateUser } from "#app/core/infra/http/middleware/auth.js"; // Removed as auth is applied at a higher level
'use strict';

/**
 * Focus Area Routes
 * Handles routes related to focus areas and learning paths
 */
const router = express.Router();

/**
 * Focus area routes factory
 * @param {FocusAreaController} focusAreaController - Focus area controller instance
 * @returns {express.Router} Express router
 */
export default function focusAreaRoutes(focusAreaController) {
    // Get all focus areas for the current user
    router.get('/', (req, res) => focusAreaController.getUserFocusAreas(req, res));
    
    // Create a thread for focus area generation
    router.post('/thread', (req, res) => focusAreaController.createThread(req, res));
    
    // Generate focus areas for a user - MUST be before /:id route to avoid being treated as ID
    router.post('/generate', (req, res) => focusAreaController.generateFocusAreas(req, res));
    
    // Get a specific focus area
    router.get('/:id', (req, res) => focusAreaController.getFocusArea(req, res));
    
    // Create a new focus area
    router.post('/', (req, res) => focusAreaController.createFocusArea(req, res));
    
    // Update a focus area
    router.put('/:id', (req, res) => focusAreaController.updateFocusArea(req, res));
    
    // Delete a focus area
    router.delete('/:id', (req, res) => focusAreaController.deleteFocusArea(req, res));
    
    return router;
}
