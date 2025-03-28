/**
 * Challenge Controller
 * 
 * HTTP Controller for challenge-related endpoints
 * Follows Single Responsibility Principle by delegating domain logic to coordinators
 * 
 * @module ChallengeController
 */

const AppError = require('../../infra/errors/AppError');
const { logger } = require('../../infra/logging/logger');

/**
 * Controller responsible for handling challenge-related HTTP requests
 */
class ChallengeController {
  /**
   * Create a new ChallengeController
   * @param {Object} dependencies - Injected dependencies
   * @param {ChallengeCoordinator} dependencies.challengeCoordinator - Coordinator for challenge operations
   * @param {ProgressCoordinator} dependencies.progressCoordinator - Coordinator for progress tracking
   */
  constructor({ challengeCoordinator, progressCoordinator }) {
    this.challengeCoordinator = challengeCoordinator;
    this.progressCoordinator = progressCoordinator;
    this.logger = logger.child({ controller: 'ChallengeController' });
  }

  /**
   * Generate a new challenge
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {Function} next - Express next function
   */
  async generateChallenge(req, res, next) {
    try {
      const { userEmail, focusArea, challengeType, formatType, difficulty } = req.body;
      
      this.logger.info('Generating challenge', { userEmail, focusArea, challengeType });
      
      // Basic validation
      if (!userEmail) {
        return next(new AppError('User email is required', 400, { 
          errorCode: 'MISSING_PARAMETER',
          metadata: { parameter: 'userEmail' }
        }));
      }
      
      // Delegate to coordinator
      const challenge = await this.challengeCoordinator.generateAndPersistChallenge({
        userEmail,
        focusArea,
        challengeType,
        formatType,
        difficulty
      });
      
      res.status(201).json({
        success: true,
        data: challenge
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit a response to a challenge
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {Function} next - Express next function
   */
  async submitChallengeResponse(req, res, next) {
    try {
      const { challengeId } = req.params;
      const { response, userEmail } = req.body;
      
      this.logger.info('Submitting challenge response', { challengeId, userEmail });
      
      // Basic validation
      if (!challengeId || !response) {
        return next(new AppError('Challenge ID and response are required', 400, {
          errorCode: 'MISSING_PARAMETER'
        }));
      }
      
      // Delegate to coordinator
      const result = await this.challengeCoordinator.submitChallengeResponse({
        challengeId,
        userEmail,
        response,
        progressTrackingService: this.progressCoordinator
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a challenge by ID
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {Function} next - Express next function
   */
  async getChallengeById(req, res, next) {
    try {
      const { challengeId } = req.params;
      
      this.logger.info('Getting challenge by ID', { challengeId });
      
      // Delegate to coordinator
      const challenge = await this.challengeCoordinator.getChallengeById(challengeId);
      
      res.status(200).json({
        success: true,
        data: challenge
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get challenge history for a user
   * @param {Request} req - Express request
   * @param {Response} res - Express response
   * @param {Function} next - Express next function
   */
  async getChallengeHistory(req, res, next) {
    try {
      const { userEmail } = req.params;
      
      this.logger.info('Getting challenge history', { userEmail });
      
      // Delegate to coordinator
      const challenges = await this.challengeCoordinator.getChallengeHistoryForUser(userEmail);
      
      res.status(200).json({
        success: true,
        data: challenges
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ChallengeController; 