'use strict';

import express from 'express';
import ChallengeController from "#app/core/challenge/controllers/ChallengeController.js";
import { requireAdmin } from "#app/core/infra/http/middleware/auth.js";
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
    (req, res) => challengeController.listChallenges(req, res)
  );
  
  // Get challenge types (moved before /:id route)
  router.get('/types', 
    (req, res) => challengeController.getChallengeTypes(req, res)
  );
  
  // Generate a personalized challenge (moved before /:id route)
  router.post('/generate', 
    (req, res) => challengeController.generateChallenge(req, res)
  );
  
  // Get a specific challenge (must be owner or admin)
  router.get('/:id', 
    authorizeResource({
      resourceType: 'challenge',
      paramName: 'id',
      action: 'read',
      getResourceOwner: getChallengeOwner
    }),
    (req, res) => challengeController.getChallengeById(req, res)
  );
  
  // Submit challenge response (must be owner or admin)
  router.post('/:id/responses', 
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
    authorizeResource({
      resourceType: 'user',
      paramName: 'userId',
      action: 'read'
    }),
    (req, res) => challengeController.getChallengeHistory(req, res)
  );
  
  // Create a new challenge
  router.post('/', 
    (req, res) => challengeController.createChallenge(req, res)
  );
  
  // Admin operations
  
  // Delete a challenge (admin only)
  router.delete('/:id',
    requireAdmin,
    (req, res) => challengeController.deleteChallenge(req, res)
  );
  
  return router;
}
