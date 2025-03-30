import express from 'express';
import ProgressController from "../../../progress/controllers/ProgressController.js";
import { authenticateUser } from "../../../infra/http/middleware/auth.js";
'use strict';

/**
 * Progress Routes
 * Handles routes related to user progress tracking
 */
const router = express.Router();

/**
 * Progress routes factory
 * @param {ProgressController} progressController - Progress controller instance
 * @returns {express.Router} Express router
 */
export default function progressRoutes(progressController) {
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
    
    return router;
}
