const express = require('express');
const router = express.Router();
const ChallengeController = require('../core/challenge/controllers/ChallengeController');
const container = require('../config/container');

// Get dependencies from container
const challengeCoordinator = container.get('challengeCoordinator');
const logger = container.get('logger');

// Create controller instance
const challengeController = new ChallengeController(challengeCoordinator, logger);

const { 
  validateBody, 
  validateParams 
} = require('../core/infra/http/middleware/validation');
const { 
  generateChallengeSchema,
  submitChallengeResponseSchema,
  challengeIdSchema,
  userEmailSchema
} = require('../core/challenge/schemas/challengeApiSchemas');

// Generate a new challenge
router.post('/generate', 
  validateBody(generateChallengeSchema),
  (req, res, next) => challengeController.generateChallenge(req, res, next)
);

// Submit a response to a challenge
router.post('/:challengeId/submit', 
  validateParams(challengeIdSchema),
  validateBody(submitChallengeResponseSchema),
  (req, res, next) => challengeController.submitChallengeResponse(req, res, next)
);

// Submit a response to a challenge with streaming response
router.post('/:challengeId/submit/stream', 
  validateParams(challengeIdSchema),
  validateBody(submitChallengeResponseSchema),
  (req, res, next) => challengeController.submitChallengeResponseStream(req, res, next)
);

// Get user challenge history
router.get('/user/:email/history', 
  validateParams(userEmailSchema),
  (req, res, next) => challengeController.getChallengeHistory(req, res, next)
);

// Get challenge by ID
router.get('/:challengeId', 
  validateParams(challengeIdSchema),
  (req, res, next) => challengeController.getChallengeById(req, res, next)
);

module.exports = router;
