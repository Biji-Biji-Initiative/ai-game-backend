'use strict';

import express from 'express';
import ChallengeController from "#app/core/challenge/controllers/ChallengeController.js";
import { authenticateUser, requireAdmin } from "#app/core/infra/http/middleware/auth.js";
import { authorizeResource } from "#app/core/infra/http/middleware/resourceAuth.js";
import { validateBody, validateQuery, validateParams } from "#app/core/infra/http/middleware/validation.js";

/**
 * Challenge Routes
 * Handles routes related to challenges and exercises
 */
const router = express.Router();

/**
 * Challenge routes factory
 * @param {ChallengeController} challengeController - Challenge controller instance
 * @returns {express.Router} Express router
 */
export default function challengeRoutes(challengeController) {
  // Function to get the owner of a challenge for authorization
  const getChallengeOwner = async (challengeId, req) => {
    const container = req.app.get('container');
    if (!container) {
      throw new Error('Container not available in request');
    }
    
    const challengeRepository = container.get('challengeRepository');
    const challenge = await challengeRepository.findById(challengeId);
    return challenge ? challenge.userId : null;
  };

  // Get all challenges (no special auth needed - filtering based on user is handled in controller)
  router.get('/', 
    authenticateUser, 
    (req, res) => challengeController.getAllChallenges(req, res)
  );
  
  // Get challenge types (moved before /:id route)
  router.get('/types', 
    authenticateUser, 
    (req, res) => challengeController.getChallengeTypes(req, res)
  );
  
  // Generate a personalized challenge (moved before /:id route)
  router.post('/generate', 
    authenticateUser, 
    (req, res) => challengeController.generateChallenge(req, res)
  );
  
  // Get a specific challenge (must be owner or admin)
  router.get('/:id', 
    authenticateUser,
    authorizeResource({
      resourceType: 'challenge',
      paramName: 'id',
      action: 'read',
      getResourceOwner: getChallengeOwner
    }),
    (req, res) => challengeController.getChallenge(req, res)
  );
  
  // Submit challenge response (must be owner or admin)
  router.post('/:id/responses', 
    authenticateUser,
    authorizeResource({
      resourceType: 'challenge',
      paramName: 'id',
      action: 'update',
      getResourceOwner: getChallengeOwner
    }),
    (req, res) => challengeController.submitChallengeResponse(req, res)
  );
  
  // Challenge history for a specific user (must be same user or admin)
  router.get('/user/:userId/history', 
    authenticateUser,
    authorizeResource({
      resourceType: 'user',
      paramName: 'userId',
      action: 'read'
    }),
    (req, res) => challengeController.getChallengeHistoryByUserId(req, res)
  );
  
  // Create a new challenge
  router.post('/', 
    authenticateUser, 
    (req, res) => challengeController.createChallenge(req, res)
  );
  
  // Admin operations
  
  // Delete a challenge (admin only)
  router.delete('/:id',
    authenticateUser,
    requireAdmin,
    (req, res) => challengeController.deleteChallenge(req, res)
  );
  
  return router;
}
