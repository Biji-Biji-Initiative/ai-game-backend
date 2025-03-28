/**
 * Progress Coordinator
 * 
 * Application-level coordinator that handles user progress tracking
 * following Single Responsibility Principle.
 * 
 * @module ProgressCoordinator
 * @requires BaseCoordinator
 */

const BaseCoordinator = require('../BaseCoordinator');
const AppError = require('../../core/infra/errors/AppError');

/**
 * Progress tracking coordinator
 */
class ProgressCoordinator extends BaseCoordinator {
  /**
   * Create a new ProgressCoordinator
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.progressService - Service for progress operations
   * @param {Object} dependencies.userRepository - Repository for user operations
   * @param {Object} dependencies.eventBus - Event bus for domain events
   * @param {Object} dependencies.EventTypes - Event type constants
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor(dependencies) {
    super({
      name: 'ProgressCoordinator',
      logger: dependencies?.logger
    });
    
    // Validate critical dependencies
    const requiredDependencies = [
      'progressService',
      'userRepository'
    ];
    
    this.validateDependencies(dependencies, requiredDependencies);
    
    // Initialize services
    this.progressService = dependencies.progressService;
    this.userRepository = dependencies.userRepository;
    this.eventBus = dependencies.eventBus;
    this.EventTypes = dependencies.EventTypes;
  }

  /**
   * Update user progress after completing a challenge
   * @param {string} userEmail - User's email
   * @param {string} focusArea - Focus area of the challenge
   * @param {string} challengeId - Challenge ID 
   * @param {Object} evaluation - Challenge evaluation results
   * @returns {Promise<Object>} Updated progress data
   */
  async updateProgressAfterChallenge(userEmail, focusArea, challengeId, evaluation) {
    return this.executeOperation(async () => {
      // Get the user
      const user = await this.userRepository.findByEmail(userEmail);
      if (!user) {
        throw new AppError(`User with email ${userEmail} not found`, 404, {
          errorCode: 'USER_NOT_FOUND'
        });
      }
      
      // Extract key metrics from evaluation
      const score = evaluation.score || 0;
      const metrics = {
        score,
        difficulty: evaluation.difficulty || 'medium',
        completionTime: evaluation.completionTime,
        strengths: evaluation.strengths || [],
        areas_for_improvement: evaluation.areasForImprovement || []
      };
      
      // Update progress using domain service
      const updatedProgress = await this.progressService.updateProgress(
        user.id,
        focusArea,
        challengeId,
        metrics
      );
      
      // Publish domain event if event bus available
      if (this.eventBus && this.EventTypes) {
        await this.eventBus.publishEvent(this.EventTypes.USER_PROGRESS_UPDATED, {
          userId: user.id,
          userEmail,
          focusArea,
          challengeId,
          metrics
        });
      }
      
      return updatedProgress;
    }, 'updateProgressAfterChallenge', { userEmail, focusArea, challengeId }, AppError);
  }

  /**
   * Get progress summary for a user
   * @param {string} userEmail - User's email
   * @returns {Promise<Object>} Progress summary
   */
  async getProgressSummary(userEmail) {
    return this.executeOperation(async () => {
      // Get the user
      const user = await this.userRepository.findByEmail(userEmail);
      if (!user) {
        throw new AppError(`User with email ${userEmail} not found`, 404, {
          errorCode: 'USER_NOT_FOUND'
        });
      }
      
      // Get progress summary
      return this.progressService.getProgressSummary(user.id);
    }, 'getProgressSummary', { userEmail }, AppError);
  }

  /**
   * Get detailed progress for a specific focus area
   * @param {string} userEmail - User's email
   * @param {string} focusArea - Focus area to get progress for
   * @returns {Promise<Object>} Detailed progress data
   */
  async getFocusAreaProgress(userEmail, focusArea) {
    return this.executeOperation(async () => {
      // Get the user
      const user = await this.userRepository.findByEmail(userEmail);
      if (!user) {
        throw new AppError(`User with email ${userEmail} not found`, 404, {
          errorCode: 'USER_NOT_FOUND'
        });
      }
      
      // Get detailed progress for focus area
      return this.progressService.getFocusAreaProgress(user.id, focusArea);
    }, 'getFocusAreaProgress', { userEmail, focusArea }, AppError);
  }
}

module.exports = ProgressCoordinator; 