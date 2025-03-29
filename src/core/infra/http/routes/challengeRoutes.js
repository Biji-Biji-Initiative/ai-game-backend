const { container } = require('../../../config/container');
const { challengeController } = require('../controllers/challengeController');

'use strict';

/**
 * Challenge Routes Module
 *
 * Defines the Express routes for the Challenge domain
 *
 * @module challengeRoutes
 */

/**
 * @swagger
 * tags:
 *   name: Challenges
 *   description: Challenge management endpoints
 */

// const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  generateChallengeSchema,
  submitChallengeResponseSchema,
  challengeIdSchema,
  userEmailSchema,
} = require('../../../challenge/schemas/challengeApiSchemas');

/**
 * Create and configure challenge routes
 * @param {Object} container - Dependency injection container
 * @returns {Object} Express router
 */
function createChallengeRoutes(container) {
  const router = express.Router();

  // Create controller instance with dependencies
  const challengeController = container.resolve('challengeController');

  /**
   * @swagger
   * /challenges/generate:
   *   post:
   *     summary: Generate a new challenge
   *     description: Generates a new challenge for a user based on provided parameters
   *     tags: [Challenges]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userEmail
   *             properties:
   *               userEmail:
   *                 type: string
   *                 format: email
   *                 description: Email of the user requesting the challenge
   *               focusArea:
   *                 type: string
   *                 description: Focus area for the challenge
   *               challengeType:
   *                 type: string
   *                 description: Type of challenge to generate
   *               formatType:
   *                 type: string
   *                 description: Format type for the challenge
   *               difficulty:
   *                 type: string
   *                 enum: [beginner, intermediate, advanced, expert]
   *                 description: Difficulty level of the challenge
   *     responses:
   *       201:
   *         description: Challenge created successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Unauthorized
   */
  router.post(
    '/generate',
    authenticateUser,
    validateBody(generateChallengeSchema),
    challengeController.generateChallenge.bind(challengeController)
  );

  /**
   * @swagger
   * /challenges/{challengeId}:
   *   get:
   *     summary: Get challenge by ID
   *     description: Retrieves a challenge by its unique identifier
   *     tags: [Challenges]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: challengeId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the challenge to retrieve
   *     responses:
   *       200:
   *         description: Challenge found
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Challenge not found
   */
  router.get(
    '/:challengeId',
    authenticateUser,
    validateParams(challengeIdSchema),
    challengeController.getChallengeById.bind(challengeController)
  );

  // Challenge response submission routes with validation
  router.post(
    '/challenges/:challengeId/submit',
    validateParams(challengeIdSchema),
    validateBody(submitChallengeResponseSchema),
    (req, res, next) => challengeController.submitChallengeResponse(req, res, next)
  );

  // Challenge history route with validation
  router.get(
    '/challenges/user/:userEmail/history',
    validateParams(userEmailSchema),
    (req, res, next) => challengeController.getChallengeHistory(req, res, next)
  );

  return router;
}

module.exports = createChallengeRoutes;
