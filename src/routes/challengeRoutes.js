/**
 * Challenge Routes
 * 
 * Defines API routes for challenge-related operations
 * Configures middleware and validation for each route
 * 
 * @module challengeRoutes
 * @requires express
 * @requires validation
 */

const express = require('express');
const { validateBody, validateParams } = require('../core/infra/http/middleware/validation');
const { authenticateUser } = require('../core/infra/http/middleware/auth');
const {
  generateChallengeSchema,
  submitChallengeResponseSchema,
  challengeIdSchema,
  userEmailSchema
} = require('../core/challenge/schemas/challengeApiSchemas');

/**
 * Create and configure challenge routes
 * @param {Object} container - Dependency injection container
 * @returns {Router} Configured router
 */
function createChallengeRoutes(container) {
  const router = express.Router();
  const challengeController = container.resolve('challengeController');
  
  // Challenge generation route with body validation
  router.post(
    '/generate',
    authenticateUser,
    validateBody(generateChallengeSchema),
    (req, res, next) => challengeController.generateChallenge(req, res, next)
  );
  
  // Challenge response submission routes with validation
  router.post(
    '/:challengeId/submit',
    authenticateUser,
    validateParams(challengeIdSchema),
    validateBody(submitChallengeResponseSchema),
    (req, res, next) => challengeController.submitChallengeResponse(req, res, next)
  );
  
  // Challenge history route with validation
  router.get(
    '/user/:userEmail/history',
    authenticateUser,
    validateParams(userEmailSchema),
    (req, res, next) => challengeController.getChallengeHistory(req, res, next)
  );
  
  // Get challenge by ID route with validation
  router.get(
    '/:challengeId',
    authenticateUser,
    validateParams(challengeIdSchema),
    (req, res, next) => challengeController.getChallengeById(req, res, next)
  );
  
  return router;
}

module.exports = createChallengeRoutes;
