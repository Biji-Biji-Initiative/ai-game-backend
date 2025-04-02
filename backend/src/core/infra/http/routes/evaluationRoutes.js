'use strict';

import express from 'express';
import EvaluationController from "#app/core/evaluation/controllers/EvaluationController.js";
import { requireAdmin } from "#app/core/infra/http/middleware/auth.js";
import { authorizeResource, authorizeUserSpecificResource } from "#app/core/infra/http/middleware/resourceAuth.js";

/**
 * Evaluation Routes
 * Handles routes related to evaluation and feedback
 */
const router = express.Router();

/**
 * Evaluation routes factory
 * @param {EvaluationController} evaluationController - Evaluation controller instance
 * @returns {express.Router} Express router
 */
export default function evaluationRoutes(evaluationController) {
  // Function to get the owner of an evaluation for authorization
  const getEvaluationOwner = async (evaluationId, req) => {
    const container = req.app.get('container');
    if (!container) {
      throw new Error('Container not available in request');
    }
    
    const evaluationRepository = container.get('evaluationRepository');
    const evaluation = await evaluationRepository.findById(evaluationId);
    return evaluation ? evaluation.userId : null;
  };
  
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

  // Submit a new evaluation
  router.post('/', 
    (req, res) => evaluationController.createEvaluation(req, res)
  );
  
  // Stream an evaluation
  router.post('/stream', 
    (req, res) => evaluationController.streamEvaluation(req, res)
  );
  
  // Get evaluations for a challenge (must be owner of the challenge or admin)
  router.get('/challenge/:challengeId', 
    authorizeResource({
      resourceType: 'challenge',
      paramName: 'challengeId',
      action: 'read',
      getResourceOwner: getChallengeOwner
    }),
    (req, res) => evaluationController.getEvaluationsForChallenge(req, res)
  );
  
  // Get evaluations for current user (personal data)
  router.get('/user/me', 
    (req, res) => {
      // Set userId param to current user's ID
      req.params.userId = req.user.id;
      return evaluationController.getEvaluationsForUser(req, res);
    }
  );
  
  // Get evaluations for a specific user (must be same user or admin)
  router.get('/user/:userId', 
    authorizeUserSpecificResource('userId'),
    (req, res) => evaluationController.getEvaluationsForUser(req, res)
  );
  
  // Get an evaluation by ID (must be owner or admin)
  router.get('/:id', 
    authorizeResource({
      resourceType: 'evaluation',
      paramName: 'id',
      action: 'read',
      getResourceOwner: getEvaluationOwner
    }),
    (req, res) => evaluationController.getEvaluationById(req, res)
  );
  
  // Delete an evaluation (admin only)
  router.delete('/:id',
    requireAdmin,
    (req, res) => evaluationController.deleteEvaluation(req, res)
  );
  
  return router;
}
