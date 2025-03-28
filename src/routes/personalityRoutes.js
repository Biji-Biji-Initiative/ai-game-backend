/**
 * Personality Routes
 * Handles routes related to personality analysis and insights
 */
const express = require('express');
const router = express.Router();
const PersonalityController = require('../core/personality/controllers/PersonalityController');
const { authenticateUser } = require('../core/infra/http/middleware/auth');
const { 
  validateBody,
  validateParams,
  validateQuery 
} = require('../core/infra/http/middleware/validation');
const { 
  updatePersonalityTraitsSchema,
  updateAIAttitudesSchema,
  profileQuerySchema
} = require('../core/personality/schemas/personalityApiSchemas');
const container = require('../config/container');

// Create controller instance with dependencies
const personalityController = new PersonalityController({
  logger: container.get('logger'),
  personalityService: container.get('personalityService'),
  errorHandler: container.get('errorHandler')
});

// Get personality profile
router.get('/profile', 
  authenticateUser, 
  validateQuery(profileQuerySchema),
  (req, res, next) => personalityController.getPersonalityProfile(req, res, next)
);

// Generate insights for current user
router.get('/insights', 
  authenticateUser, 
  (req, res, next) => personalityController.generateInsights(req, res, next)
);

// Update personality traits for current user
router.put('/traits', 
  authenticateUser, 
  validateBody(updatePersonalityTraitsSchema),
  (req, res, next) => personalityController.updatePersonalityTraits(req, res, next)
);

// Update AI attitudes for current user
router.put('/attitudes', 
  authenticateUser, 
  validateBody(updateAIAttitudesSchema),
  (req, res, next) => personalityController.updateAIAttitudes(req, res, next)
);

module.exports = router;
