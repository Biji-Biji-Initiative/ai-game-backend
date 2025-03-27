/**
 * Progress Controller
 * 
 * Handles HTTP requests related to user progress operations.
 */

class ProgressController {
  /**
   * Create a new ProgressController
   * @param {Object} dependencies - Dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.progressService - Progress service
   */
  constructor(dependencies = {}) {
    const { logger, progressService } = dependencies;
    
    this.logger = logger;
    this.progressService = progressService;
  }

  /**
   * Get the current user's progress
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getUserProgress(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get overall progress
      const progress = await this.progressService.calculateOverallProgress(req.user.id);

      // Return progress data
      return res.status(200).json({
        status: 'success',
        data: { progress }
      });
    } catch (error) {
      this.logger.error('Error getting user progress', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({ 
        status: 'error',
        message: 'Failed to get user progress'
      });
    }
  }

  /**
   * Record a challenge completion
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async recordChallengeCompletion(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { challengeId, score, completionTime, evaluationData } = req.body;
      
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
        challengeId,
        score,
        completionTime,
        evaluationData || {}
      );

      // Return updated progress
      return res.status(200).json({
        status: 'success',
        data: {
          challengeId,
          score,
          completionTime,
          statistics: progress.statistics,
          skillLevels: progress.skillLevels
        }
      });
    } catch (error) {
      this.logger.error('Error recording challenge completion', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to record challenge completion'
      });
    }
  }

  /**
   * Get user's progress for a specific challenge
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getChallengeProgress(req, res) {
    try {
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

      // Return progress data
      return res.status(200).json({
        status: 'success',
        data: {
          challengeId,
          score: progress.score,
          completionTime: progress.completionTime,
          skillLevels: progress.skillLevels,
          strengths: progress.strengths,
          weaknesses: progress.weaknesses,
          completedAt: progress.updatedAt
        }
      });
    } catch (error) {
      this.logger.error('Error getting challenge progress', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get challenge progress'
      });
    }
  }

  /**
   * Update user's skill levels
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async updateSkillLevels(req, res) {
    try {
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

      // Return updated skill levels
      return res.status(200).json({
        status: 'success',
        data: {
          skillLevels: progress.skillLevels,
          updatedAt: progress.updatedAt
        }
      });
    } catch (error) {
      this.logger.error('Error updating skill levels', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      if (error.message.includes('must be a number between 0 and 100')) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update skill levels'
      });
    }
  }

  /**
   * Set focus area for user's progress
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async setFocusArea(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { focusArea } = req.body;
      
      if (!focusArea) {
        return res.status(400).json({ 
          status: 'error',
          message: 'Focus area is required'
        });
      }

      // Set focus area
      const progress = await this.progressService.setFocusArea(
        req.user.id,
        focusArea
      );

      // Return updated progress
      return res.status(200).json({
        status: 'success',
        data: {
          focusArea: progress.focusArea,
          updatedAt: progress.updatedAt
        }
      });
    } catch (error) {
      this.logger.error('Error setting focus area', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to set focus area'
      });
    }
  }
  
  /**
   * Get all progress for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getAllUserProgress(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get all progress records
      const progressRecords = await this.progressService.getAllProgressForUser(req.user.id);

      // Return progress data
      return res.status(200).json({
        status: 'success',
        data: {
          progressRecords: progressRecords.map(p => ({
            id: p.id,
            challengeId: p.challengeId,
            focusArea: p.focusArea,
            score: p.score,
            completionTime: p.completionTime,
            completedAt: p.updatedAt
          })),
          count: progressRecords.length
        }
      });
    } catch (error) {
      this.logger.error('Error getting all user progress', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get all user progress'
      });
    }
  }
}

module.exports = ProgressController; 