'use strict';

const {
  applyRepositoryErrorHandling,
  applyServiceErrorHandling,
  applyControllerErrorHandling,
  createErrorMapper
} = require('../../../core/infra/errors/centralizedErrorUtils');

// Import domain-specific error classes
const {
  ProgressError,
  ProgressNotFoundError,
  ProgressValidationError,
  ProgressProcessingError,
} = require('../errors/ProgressErrors');
const { ProgressDTOMapper } = require('../dtos/ProgressDTO');

/**
 * Progress Controller
 * 
 * Handles HTTP requests related to user progress operations.
 */

/**
 *
 */
class ProgressController {
  /**
   * Create a new ProgressController
   * @param {Object} dependencies - Dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.progressService - Progress service
   */
  /**
   * Method constructor
   */
  constructor(dependencies = {}) {
    const { logger, progressService } = dependencies;
    
    this.logger = logger;
    this.progressService = progressService;
    
    // Apply error handling to controller methods
    this.getUserProgress = applyControllerErrorHandling(this, 'getUserProgress', 'progress', progressControllerErrorMappings);
    
    this.recordChallengeCompletion = applyControllerErrorHandling(this, 'recordChallengeCompletion', 'progress', progressControllerErrorMappings);
    
    this.getChallengeProgress = applyControllerErrorHandling(this, 'getChallengeProgress', 'progress', progressControllerErrorMappings);
    
    this.updateSkillLevels = applyControllerErrorHandling(this, 'updateSkillLevels', 'progress', progressControllerErrorMappings);
    
    this.setFocusArea = applyControllerErrorHandling(this, 'setFocusArea', 'progress', progressControllerErrorMappings);
    
    this.getAllUserProgress = applyControllerErrorHandling(this, 'getAllUserProgress', 'progress', progressControllerErrorMappings);
  }

  /**
   * Get the current user's progress
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  /**
   * Method getUserProgress
   */
  getUserProgress(req, res) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get overall progress
    const progress = await this.progressService.calculateOverallProgress(req.user.id);

    // Convert to DTO
    const progressSummaryDto = ProgressDTOMapper.toSummaryDTO(progress);

    // Return progress data
    return res.status(200).json({
      status: 'success',
      data: { progress: progressSummaryDto }
    });
  }

  /**
   * Record a challenge completion
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  /**
   * Method recordChallengeCompletion
   */
  recordChallengeCompletion(req, res) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Convert request to domain parameters
    const params = ProgressDTOMapper.fromRequest(req.body);
    const { challengeId, challengeScore: score, completionTime, evaluationData } = req.body;
    
    // Basic validation
    if (!challengeId) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Challenge ID is required'
      });
    }

    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Score must be a number between 0 and 100'
      });
    }

    if (isNaN(completionTime) || completionTime < 0) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Completion time must be a positive number'
      });
    }

    // Record challenge completion
    const progress = await this.progressService.recordChallengeCompletion(
      req.user.id,
      params.challengeId,
      params.challengeScore,
      completionTime,
      evaluationData || {}
    );

    // Convert to DTO
    const progressDto = ProgressDTOMapper.toDTO(progress);

    // Return updated progress
    return res.status(200).json({
      status: 'success',
      data: {
        challengeId: progressDto.challengeId,
        score: progressDto.averageScore,
        completionTime,
        statistics: progress.statistics,
        skillLevels: progress.skillLevels
      }
    });
  }

  /**
   * Get user's progress for a specific challenge
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  /**
   * Method getChallengeProgress
   */
  getChallengeProgress(req, res) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { challengeId } = req.params;
    
    if (!challengeId) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Challenge ID is required'
      });
    }

    // Get progress for this challenge
    const progress = await this.progressService.getProgressForChallenge(
      req.user.id,
      challengeId
    );

    if (!progress) {
      return res.status(404).json({
        status: 'error',
        message: 'No progress found for this challenge'
      });
    }

    // Convert to DTO
    const progressDto = ProgressDTOMapper.toDTO(progress);

    // Return progress data
    return res.status(200).json({
      status: 'success',
      data: {
        challengeId,
        score: progressDto.averageScore,
        completionTime: progress.completionTime,
        skillLevels: progress.skillLevels,
        strengths: progress.strengths,
        weaknesses: progress.weaknesses,
        completedAt: progressDto.updatedAt
      }
    });
  }

  /**
   * Update user's skill levels
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  /**
   * Method updateSkillLevels
   */
  updateSkillLevels(req, res) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { skillLevels } = req.body;
    
    if (!skillLevels || typeof skillLevels !== 'object') {
      return res.status(400).json({ 
        status: 'error',
        message: 'Skill levels are required and must be an object'
      });
    }

    // Update skill levels
    const progress = await this.progressService.updateSkillLevels(
      req.user.id,
      skillLevels
    );

    // Convert to DTO
    const progressDto = ProgressDTOMapper.toDTO(progress);

    // Return updated skill levels
    return res.status(200).json({
      status: 'success',
      data: {
        skillLevels: progress.skillLevels,
        updatedAt: progressDto.updatedAt
      }
    });
  }

  /**
   * Set focus area for user's progress
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  /**
   * Method setFocusArea
   */
  setFocusArea(req, res) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Convert request to domain parameters
    const params = ProgressDTOMapper.fromRequest(req.body);
    
    if (!params.focusArea) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Focus area is required'
      });
    }

    // Set focus area
    const progress = await this.progressService.setFocusArea(
      req.user.id,
      params.focusArea
    );

    // Convert to DTO
    const progressDto = ProgressDTOMapper.toDTO(progress);

    // Return updated progress
    return res.status(200).json({
      status: 'success',
      data: {
        focusArea: progressDto.focusArea,
        updatedAt: progressDto.updatedAt
      }
    });
  }
  
  /**
   * Get all progress for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  /**
   * Method getAllUserProgress
   */
  getAllUserProgress(req, res) {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all progress records
    const progressRecords = await this.progressService.getAllProgressForUser(req.user.id);

    // Convert to DTOs
    const progressDtos = ProgressDTOMapper.toDTOCollection(progressRecords);

    // Return progress data
    return res.status(200).json({
      status: 'success',
      data: {
        progressRecords: progressDtos.map(p => ({
          id: p.id,
          challengeId: p.challengeId,
          focusArea: p.focusArea,
          averageScore: p.averageScore,
          completedAt: p.updatedAt
        })),
        count: progressRecords.length
      }
    });
  }
}

module.exports = ProgressController; 