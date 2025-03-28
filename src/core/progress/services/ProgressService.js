/**
 * Progress Service
 * 
 * Handles business logic for tracking user progress across challenges and focus areas.
 */

const Progress = require('../models/Progress');
const ProgressRepository = require('../repositories/ProgressRepository');
const domainEvents = require('../../common/events/domainEvents');
const { v4: uuidv4 } = require('uuid');

class ProgressService {
  constructor(progressRepository) {
    this.progressRepository = progressRepository || new ProgressRepository();
  }

  /**
   * Get or create a progress record for a user
   * @param {string} userId - User ID
   * @returns {Promise<Progress>} Progress record
   */
  async getOrCreateProgress(userId) {
    try {
      // Try to find existing progress
      let progress = await this.progressRepository.findByUserId(userId);
      
      // If no progress exists, create a new one
      if (!progress) {
        progress = new Progress({
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        progress = await this.progressRepository.save(progress);
        
        // Publish domain event for new progress record
        await domainEvents.publish('ProgressRecordCreated', {
          userId,
          progressId: progress.id
        });
      }
      
      return progress;
    } catch (error) {
      console.error('ProgressService.getOrCreateProgress error:', error);
      throw error;
    }
  }

  /**
   * Record a challenge completion for a user
   * @param {string} userId - User ID
   * @param {string} challengeId - Challenge ID
   * @param {number} score - Score achieved (0-100)
   * @param {number} completionTime - Time taken to complete in seconds
   * @param {Object} evaluationData - Additional evaluation data
   * @returns {Promise<Progress>} Updated progress record
   */
  async recordChallengeCompletion(userId, challengeId, score, completionTime, evaluationData = {}) {
    try {
      // Get user progress
      const progress = await this.getOrCreateProgress(userId);
      
      // Record the challenge completion
      progress.recordChallengeCompletion(challengeId, score, completionTime, evaluationData);
      
      // Save updated progress
      return this.progressRepository.save(progress);
    } catch (error) {
      console.error('ProgressService.recordChallengeCompletion error:', error);
      throw error;
    }
  }

  /**
   * Update skill levels for a user
   * @param {string} userId - User ID
   * @param {Object} skillLevels - Skill levels to update
   * @returns {Promise<Progress>} Updated progress record
   */
  async updateSkillLevels(userId, skillLevels) {
    try {
      // Get user progress
      const progress = await this.getOrCreateProgress(userId);
      
      // Update skill levels
      progress.updateSkillLevels(skillLevels);
      
      // Save updated progress
      return this.progressRepository.save(progress);
    } catch (error) {
      console.error('ProgressService.updateSkillLevels error:', error);
      throw error;
    }
  }

  /**
   * Set the focus area for a user's progress
   * @param {string} userId - User ID
   * @param {string} focusArea - Focus area name
   * @returns {Promise<Progress>} Updated progress record
   */
  async setFocusArea(userId, focusArea) {
    try {
      // Get user progress
      const progress = await this.getOrCreateProgress(userId);
      
      // Set focus area
      progress.setFocusArea(focusArea);
      
      // Save updated progress
      return this.progressRepository.save(progress);
    } catch (error) {
      console.error('ProgressService.setFocusArea error:', error);
      throw error;
    }
  }

  /**
   * Get all progress records for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Progress>>} Array of progress records
   */
  async getAllProgressForUser(userId) {
    try {
      return this.progressRepository.findAllByUserId(userId);
    } catch (error) {
      console.error('ProgressService.getAllProgressForUser error:', error);
      throw error;
    }
  }

  /**
   * Get a user's progress for a specific challenge
   * @param {string} userId - User ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Progress|null>} Progress record or null if not found
   */
  async getProgressForChallenge(userId, challengeId) {
    try {
      return this.progressRepository.findByUserAndChallenge(userId, challengeId);
    } catch (error) {
      console.error('ProgressService.getProgressForChallenge error:', error);
      throw error;
    }
  }

  /**
   * Get progress records by focus area
   * @param {string} focusArea - Focus area name
   * @returns {Promise<Array<Progress>>} Array of progress records
   */
  async getProgressByFocusArea(focusArea) {
    try {
      return this.progressRepository.findByFocusArea(focusArea);
    } catch (error) {
      console.error('ProgressService.getProgressByFocusArea error:', error);
      throw error;
    }
  }

  /**
   * Calculate user's overall progress
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Overall progress statistics
   */
  async calculateOverallProgress(userId) {
    try {
      // Get user progress
      const progress = await this.getOrCreateProgress(userId);
      
      // Return statistics
      return {
        totalChallenges: progress.statistics.totalChallenges || 0,
        averageScore: progress.statistics.averageScore || 0,
        highestScore: progress.statistics.highestScore || 0,
        averageCompletionTime: progress.statistics.averageCompletionTime || 0,
        streakDays: progress.statistics.streakDays || 0,
        lastActive: progress.statistics.lastActive || null,
        skillLevels: progress.skillLevels,
        strengths: progress.strengths,
        weaknesses: progress.weaknesses
      };
    } catch (error) {
      console.error('ProgressService.calculateOverallProgress error:', error);
      throw error;
    }
  }

  /**
   * Delete a progress record
   * @param {string} id - Progress ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteProgress(id) {
    try {
      return this.progressRepository.delete(id);
    } catch (error) {
      console.error('ProgressService.deleteProgress error:', error);
      throw error;
    }
  }

  /**
   * Delete all progress records for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteAllProgressForUser(userId) {
    try {
      return this.progressRepository.deleteAllForUser(userId);
    } catch (error) {
      console.error('ProgressService.deleteAllProgressForUser error:', error);
      throw error;
    }
  }
}

module.exports = ProgressService; 