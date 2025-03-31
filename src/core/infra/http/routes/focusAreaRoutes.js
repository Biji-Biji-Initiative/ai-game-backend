import express from 'express';
import FocusAreaController from "@/core/focusArea/controllers/FocusAreaController.js";
import { authenticateUser } from "@/core/infra/http/middleware/auth.js";
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
    router.get('/', authenticateUser, (req, res) => focusAreaController.getUserFocusAreas(req, res));
    
    // Get a specific focus area
    router.get('/:id', authenticateUser, (req, res) => focusAreaController.getFocusArea(req, res));
    
    // Create a new focus area
    router.post('/', authenticateUser, (req, res) => focusAreaController.createFocusArea(req, res));
    
    // Update a focus area
    router.put('/:id', authenticateUser, (req, res) => focusAreaController.updateFocusArea(req, res));
    
    // Delete a focus area
    router.delete('/:id', authenticateUser, (req, res) => focusAreaController.deleteFocusArea(req, res));
    
    // Generate focus areas for a user
    router.post('/generate', authenticateUser, (req, res) => focusAreaController.generateFocusAreas(req, res));
    
    return router;
}
