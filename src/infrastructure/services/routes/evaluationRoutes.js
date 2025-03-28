/**
 * Evaluation Routes
 * Handles routes related to evaluation operations
 */
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../core/infra/http/middleware/auth');
const EvaluationController = require('../core/evaluation/controllers/EvaluationController');
const container = require('../config/container');

// Create controller instance with dependencies
const evaluationController = new EvaluationController({
  logger: container.get('logger'),
  evaluationService: container.get('evaluationService'),
  openAIStateManager: container.get('openAIStateManager'),
  challengeRepository: container.get('challengeRepository')
});

// Generate an evaluation for a challenge response
router.post('/', authenticateUser, (req, res) => evaluationController.createEvaluation(req, res));

// Get an evaluation by ID
router.get('/:id', authenticateUser, (req, res) => evaluationController.getEvaluationById(req, res));

// Get all evaluations for a user
router.get('/user/:userId', authenticateUser, (req, res) => evaluationController.getEvaluationsForUser(req, res));

// Get evaluations for a specific challenge
router.get('/challenge/:challengeId', authenticateUser, (req, res) => evaluationController.getEvaluationsForChallenge(req, res));

// Stream an evaluation for a challenge response
router.post('/stream', authenticateUser, (req, res) => evaluationController.streamEvaluation(req, res));

module.exports = router; 