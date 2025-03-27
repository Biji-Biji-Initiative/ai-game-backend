/**
 * Challenge Controller
 * Handles challenge generation, submission, and history with adaptive difficulty
 * Refactored to follow Clean Architecture principles with Dependency Injection
 */

// Import container for dependency injection
const container = require('../config/container');

// Get services and utilities from container
const { AppError } = container.get('errorHandler');
const config = container.get('config');
const logger = container.get('logger');

// Get repositories and services from container
const userRepository = container.get('userRepository');
const challengeService = container.get('challengeService');
const userService = container.get('userService');

// Get utility services from container
const difficultyManager = container.get('difficultyManager');
const progressTrackingService = container.get('progressTrackingService');
const userJourneyService = container.get('userJourneyService');

/**
 * Generate a new challenge for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const generateChallenge = async (req, res, next) => {
  try {
    const { email, focusArea, challengeType, formatType, difficulty } = req.body;

    // Basic validation
    if (!email) {
      throw new AppError('Email is required', 400);
    }
    
    try {
      // Use the unified service method to generate and persist the challenge
      const challenge = await challengeService.generateAndPersistChallenge({
        email,
        focusArea,
        challengeType,
        formatType,
        difficulty,
        config,
        difficultyManager
      });
      
      // Record challenge generation event via service
      userJourneyService.recordUserEvent(email, 'challenge_generated', {
        challengeId: challenge.id,
        challengeType: challenge.challengeType,
        focusArea: challenge.focusArea,
        difficulty: challenge.difficulty
      });

      // Generate learning insights for the user via service
      const user = await userRepository.getUserByEmail(email);
      const userJourney = userJourneyService.getUserJourneyInsights(user);
      
      // Return the challenge with learning insights
      res.status(201).json({
        status: 'success',
        data: {
          challenge,
          userJourney
        }
      });
    } catch (serviceError) {
      // Convert service errors to AppError for consistent API responses
      if (serviceError.message.includes('not found')) {
        throw new AppError(serviceError.message, 404, { errorCode: 'RESOURCE_NOT_FOUND' });
      } else if (serviceError.message.includes('Invalid')) {
        throw new AppError(serviceError.message, 400);
      } else {
        throw new AppError(`Failed to generate challenge: ${serviceError.message}`, 500);
      }
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Submit a response to a challenge
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const submitChallengeResponse = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const { responses } = req.body;

    try {
      // Use the unified service method to submit and evaluate the challenge response
      const result = await challengeService.submitChallengeResponse({
        challengeId,
        responses,
        progressTrackingService,
        userJourneyService
      });

      // Return the evaluation result
      res.status(200).json({
        status: 'success',
        data: {
          evaluation: result.evaluation,
          challenge: result.challenge
        }
      });
    } catch (serviceError) {
      // Convert service errors to AppError for consistent API responses
      if (serviceError.message.includes('not found')) {
        throw new AppError(serviceError.message, 404, { errorCode: 'RESOURCE_NOT_FOUND' });
      } else if (serviceError.message.includes('already completed')) {
        throw new AppError(serviceError.message, 400, { errorCode: 'INVALID_OPERATION' });
      } else if (serviceError.message.includes('must be provided') || 
                serviceError.message.includes('must have questionId')) {
        throw new AppError(serviceError.message, 400, { errorCode: 'INVALID_INPUT' });
      } else {
        throw new AppError(`Failed to submit challenge response: ${serviceError.message}`, 500);
      }
    }
  } catch (error) {
    logger.error('Error submitting challenge response', { 
      error: error.message, 
      challengeId: req.params.challengeId,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get challenge history for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getChallengeHistory = async (req, res, next) => {
  try {
    const { email } = req.params;

    // Check if user exists using repository
    const user = await userRepository.getUserByEmail(email);
    if (!user) {
      throw new AppError(`User with email ${email} not found`, 404, { errorCode: 'RESOURCE_NOT_FOUND' });
    }

    // Get user's challenges from service
    const userChallenges = challengeService.getChallengesByUserEmail(email);

    res.status(200).json({
      status: 'success',
      results: userChallenges.length,
      data: {
        challenges: userChallenges
      }
    });
  } catch (error) {
    logger.error('Error getting challenge history', { error: error.message });
    next(error);
  }
};

// generateChallengeContent has been moved to openaiService.js

/**
 * Evaluate challenge responses using OpenAI with dynamic prompt construction
 * @param {Object} challenge - Challenge object
 * @param {Array} responses - User's responses
 * @returns {Promise<Object>} - Evaluation results
 */
/**
 * Evaluate challenge responses
 * @param {Object} challenge - Challenge object
 * @param {Array} responses - User's responses
 * @returns {Promise<Object>} - Evaluation results
 */
const evaluateChallengeResponse = async (challenge, responses) => {
  try {
    // Get user profile from repository
    const user = userRepository.getUserByEmail(challenge.userEmail);
    if (!user) {
      throw new AppError('User not found for challenge evaluation', 404);
    }
    
    // Combine challenge content with user responses
    let userResponse = '';
    
    // Handle different response formats
    if (Array.isArray(responses) && responses.every(r => r.questionId && r.answer)) {
      // Format responses with questions
      userResponse = challenge.content.questions.map(question => {
        const response = responses.find(r => r.questionId === question.id);
        return `Question: ${question.text}\nAnswer: ${response ? response.answer : 'No answer provided'}\n\n`;
      }).join('');
    } else if (Array.isArray(responses) && responses.length > 0 && responses[0].text) {
      // Free-form text responses
      userResponse = responses.map(r => r.text).join('\n\n');
    } else {
      // Fallback
      userResponse = JSON.stringify(responses);
    }
    
    // Use the challengeService to evaluate the response
    return await challengeService.evaluateChallengeResponse(challenge, responses);
  } catch (error) {
    logger.error('Error evaluating challenge response', { error: error.message });
    throw new Error(`Failed to evaluate challenge response: ${error.message}`);
  }
};

/**
 * Get a challenge by its ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getChallengeById = async (req, res, next) => {
  try {
    const { challengeId } = req.params;

    // Get challenge from service
    const challenge = challengeService.getChallengeById(challengeId);
    
    if (!challenge) {
      throw new AppError(`Challenge with ID ${challengeId} not found`, 404, { errorCode: 'RESOURCE_NOT_FOUND' });
    }

    res.status(200).json({
      status: 'success',
      data: {
        challenge
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed user progress and learning insights
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getUserProgress = async (req, res, next) => {
  try {
    const { email } = req.params;

    // Use repository to get user
    const user = userRepository.getUserByEmail(email);
    if (!user) {
      throw new AppError(`User with email ${email} not found`, 404, { errorCode: 'RESOURCE_NOT_FOUND' });
    }
    
    // Get user's progress data from challenge service
    const progressData = await challengeService.getUserProgressData(email);
    
    res.status(200).json({
      status: 'success',
      data: progressData
    });
  } catch (error) {
    logger.error('Error getting user progress', { error: error.message });
    next(error);
  }
};

/**
 * Submit a challenge response with streaming response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const submitChallengeResponseStream = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const { responses } = req.body;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    // Send a function to write SSE data
    const sendEvent = (type, content) => {
      res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
    };

    try {
      // Get the challenge
      const challenge = await challengeService.getChallengeById(challengeId);
      if (!challenge) {
        sendEvent('error', `Challenge with ID ${challengeId} not found`);
        res.end();
        return;
      }

      // Send initial events
      sendEvent('evaluation.started', 'Starting evaluation of your response');
      
      // Create callbacks for streaming
      const onEvaluationProgress = (type, content) => {
        sendEvent(type, content);
      };

      // Use the unified service method to submit and evaluate the challenge response with streaming
      await challengeService.submitChallengeResponseStream({
        challengeId,
        responses,
        progressTrackingService,
        userJourneyService,
        onEvaluationProgress
      });

      // Send completion event
      sendEvent('evaluation.complete', 'Evaluation complete');
      res.end();
    } catch (serviceError) {
      // Send error event
      sendEvent('error', serviceError.message);
      res.end();
    }
  } catch (error) {
    logger.error('Error in streaming challenge response', { 
      error: error.message, 
      challengeId: req.params.challengeId,
      stack: error.stack
    });
    
    // If headers haven't been sent yet, send an error event
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
      res.end();
    } else {
      // Otherwise just end the response
      res.end();
    }
  }
};

module.exports = {
  generateChallenge,
  submitChallengeResponse,
  submitChallengeResponseStream,
  getChallengeHistory,
  getChallengeById,
  getUserProgress
};
