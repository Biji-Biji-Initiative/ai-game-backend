/**
 * Challenge Controller
 * 
 * Handles HTTP requests related to challenge operations.
 * Located within the challenge domain following our DDD architecture.
 */
const { logger } = require('../../../core/infra/logging/logger');
const AppError = require('../../../core/infra/errors/AppError');
const container = require('../../../config/container');

/**
 * Generate a new challenge
 */
const generateChallenge = async (req, res, next) => {
  try {
    const challengeCoordinator = container.get('challengeCoordinator');
    const { email, focusArea, challengeType, difficulty } = req.body;
    
    if (!email) {
      throw new AppError('Email is required', 400);
    }
    
    const params = {
      userEmail: email,
      focusArea: focusArea || 'general',
      challengeType: challengeType || 'critical-thinking',
      difficulty: difficulty || 'medium'
    };
    
    const challenge = await challengeCoordinator.generateAndPersistChallenge(params);
    
    res.status(201).json({
      status: 'success',
      data: {
        challenge
      }
    });
  } catch (error) {
    logger.error('Error generating challenge', { error: error.message });
    next(error);
  }
};

/**
 * Submit a response to a challenge
 */
const submitChallengeResponse = async (req, res, next) => {
  try {
    const challengeCoordinator = container.get('challengeCoordinator');
    const { challengeId } = req.params;
    const { response, userEmail } = req.body;
    
    if (!response) {
      throw new AppError('Response is required', 400);
    }
    
    if (!userEmail) {
      throw new AppError('User email is required', 400);
    }
    
    const result = await challengeCoordinator.submitChallengeResponse({
      challengeId,
      userEmail,
      response
    });
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('Error submitting challenge response', { 
      error: error.message,
      challengeId: req.params.challengeId
    });
    next(error);
  }
};

/**
 * Submit a challenge response with streaming evaluation
 */
const submitChallengeResponseStream = async (req, res, next) => {
  try {
    const challengeCoordinator = container.get('challengeCoordinator');
    const { challengeId } = req.params;
    const { response, userEmail } = req.body;
    
    if (!response) {
      throw new AppError('Response is required', 400);
    }
    
    if (!userEmail) {
      throw new AppError('User email is required', 400);
    }
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Subscribe to evaluation events
    const onEvaluationProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // Start evaluation process
    try {
      const result = await challengeCoordinator.submitChallengeResponseWithStreaming({
        challengeId,
        userEmail,
        response,
        onProgress: onEvaluationProgress
      });
      
      // Send final result
      res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
      res.end();
    } catch (error) {
      // Send error to client
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
      
      logger.error('Error in streaming evaluation', { 
        error: error.message,
        challengeId
      });
    }
  } catch (error) {
    logger.error('Error setting up streaming response', { 
      error: error.message,
      challengeId: req.params.challengeId
    });
    next(error);
  }
};

/**
 * Get challenge history for a user
 */
const getChallengeHistory = async (req, res, next) => {
  try {
    const challengeCoordinator = container.get('challengeCoordinator');
    const { email } = req.params;
    
    if (!email) {
      throw new AppError('Email is required', 400);
    }
    
    const challenges = await challengeCoordinator.getChallengeHistoryForUser(email);
    
    res.status(200).json({
      status: 'success',
      results: challenges.length,
      data: {
        challenges
      }
    });
  } catch (error) {
    logger.error('Error getting challenge history', { 
      error: error.message,
      email: req.params.email
    });
    next(error);
  }
};

/**
 * Get a challenge by ID
 */
const getChallengeById = async (req, res, next) => {
  try {
    const challengeCoordinator = container.get('challengeCoordinator');
    const { challengeId } = req.params;
    
    if (!challengeId) {
      throw new AppError('Challenge ID is required', 400);
    }
    
    const challenge = await challengeCoordinator.getChallengeById(challengeId);
    
    if (!challenge) {
      throw new AppError('Challenge not found', 404);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        challenge
      }
    });
  } catch (error) {
    logger.error('Error getting challenge by ID', { 
      error: error.message,
      challengeId: req.params.challengeId
    });
    next(error);
  }
};

module.exports = {
  generateChallenge,
  submitChallengeResponse,
  submitChallengeResponseStream,
  getChallengeHistory,
  getChallengeById
}; 