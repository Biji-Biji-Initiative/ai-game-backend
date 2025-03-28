/**
 * Challenge Controller
 * 
 * Handles HTTP requests related to challenge operations.
 * Located within the challenge domain following our DDD architecture.
 */
const { challengeLogger } = require('../../../core/infra/logging/domainLogger');
const { 
  ChallengeNotFoundError, 
  ChallengeGenerationError, 
  ChallengeResponseError 
} = require('../errors/ChallengeErrors');
const { 
  validateBody, 
  validateParams 
} = require('../../../core/infra/http/middleware/validation');
const {
  generateChallengeSchema,
  submitChallengeResponseSchema,
  challengeIdSchema,
  userEmailSchema
} = require('../schemas/challengeApiSchemas');

/**
 * Challenge Controller Class
 */
class ChallengeController {
  /**
   * Create a new ChallengeController
   * @param {Object} challengeCoordinator - Application-level challenge coordinator
   * @param {Object} logger - Domain-specific logger
   */
  constructor(challengeCoordinator, logger = null) {
    this.challengeCoordinator = challengeCoordinator;
    this.logger = logger || challengeLogger.child('controller');
  }

  /**
   * Generate a new challenge
   */
  async generateChallenge(req, res, next) {
    try {
      const { email, focusArea, challengeType, difficulty } = req.body;
      
      this.logger.debug('Generating new challenge', { email, focusArea, challengeType });
      
      const params = {
        userEmail: email,
        focusArea: focusArea || 'general',
        challengeType: challengeType || 'critical-thinking',
        difficulty: difficulty || 'medium'
      };
      
      const challenge = await this.challengeCoordinator.generateAndPersistChallenge(params);
      
      this.logger.info('Successfully generated challenge', { 
        email, 
        challengeId: challenge.id 
      });
      
      return res.status(201).json({
        status: 'success',
        data: {
          challenge
        }
      });
    } catch (error) {
      this.logger.error('Error generating challenge', { 
        error: error.message,
        stack: error.stack
      });
      
      if (error instanceof ChallengeGenerationError) {
        return next(error);
      }
      
      next(new ChallengeGenerationError(error.message));
    }
  }

  /**
   * Submit a response to a challenge
   */
  async submitChallengeResponse(req, res, next) {
    try {
      const { challengeId } = req.params;
      const { response, userEmail } = req.body;
      
      this.logger.debug('Submitting challenge response', { 
        challengeId, 
        userEmail 
      });
      
      const result = await this.challengeCoordinator.submitChallengeResponse({
        challengeId,
        userEmail,
        response
      });
      
      this.logger.info('Successfully submitted challenge response', {
        challengeId,
        userEmail
      });
      
      return res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      this.logger.error('Error submitting challenge response', { 
        error: error.message,
        challengeId: req.params.challengeId,
        stack: error.stack
      });
      
      if (error instanceof ChallengeNotFoundError) {
        return next(error);
      }
      
      next(new ChallengeResponseError(error.message));
    }
  }

  /**
   * Submit a challenge response with streaming evaluation
   */
  async submitChallengeResponseStream(req, res, next) {
    try {
      const { challengeId } = req.params;
      const { response, userEmail } = req.body;
      
      this.logger.debug('Setting up streaming response submission', { 
        challengeId, 
        userEmail 
      });
      
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
        const result = await this.challengeCoordinator.submitChallengeResponseWithStreaming({
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
        
        this.logger.error('Error in streaming evaluation', { 
          error: error.message,
          challengeId
        });
      }
    } catch (error) {
      this.logger.error('Error setting up streaming response', { 
        error: error.message,
        challengeId: req.params.challengeId,
        stack: error.stack
      });
      next(new ChallengeResponseError(error.message));
    }
  }

  /**
   * Get challenge history for a user
   */
  async getChallengeHistory(req, res, next) {
    try {
      const { email } = req.params;
      
      this.logger.debug('Getting challenge history', { email });
      
      const challenges = await this.challengeCoordinator.getChallengeHistoryForUser(email);
      
      return res.status(200).json({
        status: 'success',
        results: challenges.length,
        data: {
          challenges
        }
      });
    } catch (error) {
      this.logger.error('Error getting challenge history', { 
        error: error.message,
        email: req.params.email,
        stack: error.stack
      });
      next(new ChallengeNotFoundError(error.message));
    }
  }

  /**
   * Get a challenge by ID
   */
  async getChallengeById(req, res, next) {
    try {
      const { challengeId } = req.params;
      
      this.logger.debug('Getting challenge by ID', { challengeId });
      
      const challenge = await this.challengeCoordinator.getChallengeById(challengeId);
      
      if (!challenge) {
        throw new ChallengeNotFoundError(`Challenge with ID ${challengeId} not found`);
      }
      
      return res.status(200).json({
        status: 'success',
        data: {
          challenge
        }
      });
    } catch (error) {
      this.logger.error('Error getting challenge by ID', { 
        error: error.message,
        challengeId: req.params.challengeId,
        stack: error.stack
      });
      
      if (error instanceof ChallengeNotFoundError) {
        return next(error);
      }
      
      next(new ChallengeNotFoundError(error.message));
    }
  }
  
  /**
   * Set up controller routes with validation middleware
   * @param {Object} router - Express router object
   */
  setupRoutes(router) {
    // Challenge generation route with body validation
    router.post(
      '/challenges/generate',
      validateBody(generateChallengeSchema),
      this.generateChallenge.bind(this)
    );
    
    // Challenge response submission routes with validation
    router.post(
      '/challenges/:challengeId/submit',
      validateParams(challengeIdSchema),
      validateBody(submitChallengeResponseSchema),
      this.submitChallengeResponse.bind(this)
    );
    
    router.post(
      '/challenges/:challengeId/submit-stream',
      validateParams(challengeIdSchema),
      validateBody(submitChallengeResponseSchema),
      this.submitChallengeResponseStream.bind(this)
    );
    
    // Challenge history route with validation
    router.get(
      '/challenges/user/:email/history',
      validateParams(userEmailSchema),
      this.getChallengeHistory.bind(this)
    );
    
    // Get challenge by ID route with validation
    router.get(
      '/challenges/:challengeId',
      validateParams(challengeIdSchema),
      this.getChallengeById.bind(this)
    );
  }
}

module.exports = ChallengeController; 