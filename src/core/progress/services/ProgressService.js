/**
 * Progress Service
 * 
 * Handles business logic for tracking user progress across challenges and focus areas.
 */

const Progress = require('../models/Progress');
const ProgressRepository = require('../repositories/ProgressRepository');
const { EventTypes, eventBus } = require('../../common/events/domainEvents');
const { v4: uuidv4 } = require('uuid');

class ProgressService {
  /**
   * Create a new ProgressService
   * @param {ProgressRepository} progressRepository - Repository for progress data access
   * @param {Object} logger - Logger instance
   * @param {CacheService} cacheService - Cache service for optimizing data access
   */
  constructor(progressRepository, logger, cacheService) {
    this.progressRepository = progressRepository || new ProgressRepository();
    this.logger = logger || console;
    this.cache = cacheService;
  }

  /**
   * Get or create a progress record for a user
   * @param {string} userId - User ID
   * @returns {Promise<Progress>} Progress record
   */
  async getOrCreateProgress(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Try to find existing progress
      let progress = await this.progressRepository.findByUserId(userId);
      
      // If no progress exists, create a new one
      if (!progress) {
        progress = new Progress({
          id: uuidv4(),
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        progress = await this.progressRepository.save(progress);
        
        // Publish domain event for new progress record
        await eventBus.publish(EventTypes.PROGRESS_CREATED, {
          userId,
          progressId: progress.id
        });

        this.logger.info('Created new progress record', { userId, progressId: progress.id });
      }
      
      return progress;
    } catch (error) {
      this.logger.error('Error getting or creating progress', { 
        error: error.message, 
        stack: error.stack,
        userId 
      });
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
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!challengeId) {
      throw new Error('Challenge ID is required');
    }
    
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error('Score must be a number between 0 and 100');
    }
    
    try {
      // Get user progress
      const progress = await this.getOrCreateProgress(userId);
      
      // Record the challenge completion
      progress.recordChallengeCompletion(challengeId, score, completionTime, evaluationData);
      
      // Save updated progress
      const updatedProgress = await this.progressRepository.save(progress);
      
      this.logger.info('Recorded challenge completion', { 
        userId, 
        challengeId, 
        score 
      });
      
      // Invalidate cache if using caching
      if (this.cache) {
        this.invalidateProgressCache(userId);
      }
      
      return updatedProgress;
    } catch (error) {
      this.logger.error('Error recording challenge completion', { 
        error: error.message, 
        stack: error.stack,
        userId,
        challengeId 
      });
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
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!skillLevels || typeof skillLevels !== 'object') {
      throw new Error('Skill levels must be an object');
    }
    
    try {
      // Get user progress
      const progress = await this.getOrCreateProgress(userId);
      
      // Update skill levels
      progress.updateSkillLevels(skillLevels);
      
      // Save updated progress
      const updatedProgress = await this.progressRepository.save(progress);
      
      this.logger.info('Updated skill levels', { 
        userId, 
        skillCount: Object.keys(skillLevels).length 
      });
      
      // Invalidate cache if using caching
      if (this.cache) {
        this.invalidateProgressCache(userId);
      }
      
      return updatedProgress;
    } catch (error) {
      this.logger.error('Error updating skill levels', { 
        error: error.message, 
        stack: error.stack,
        userId 
      });
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
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!focusArea) {
      throw new Error('Focus area is required');
    }
    
    try {
      // Get user progress
      const progress = await this.getOrCreateProgress(userId);
      
      // Set focus area
      progress.setFocusArea(focusArea);
      
      // Save updated progress
      const updatedProgress = await this.progressRepository.save(progress);
      
      this.logger.info('Set focus area', { userId, focusArea });
      
      // Invalidate cache if using caching
      if (this.cache) {
        this.invalidateProgressCache(userId);
      }
      
      return updatedProgress;
    } catch (error) {
      this.logger.error('Error setting focus area', { 
        error: error.message, 
        stack: error.stack,
        userId,
        focusArea 
      });
      throw error;
    }
  }

  /**
   * Get all progress records for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Progress>>} Array of progress records
   */
  async getAllProgressForUser(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    try {
      // Use cache if available
      if (this.cache) {
        const cacheKey = `progress:user:${userId}:all`;
        return this.cache.getOrSet(cacheKey, async () => {
          return this.progressRepository.findAllByUserId(userId);
        }, 300); // Cache for 5 minutes
      }
      
      return this.progressRepository.findAllByUserId(userId);
    } catch (error) {
      this.logger.error('Error getting all progress for user', { 
        error: error.message, 
        stack: error.stack,
        userId 
      });
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
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!challengeId) {
      throw new Error('Challenge ID is required');
    }
    
    try {
      // Use cache if available
      if (this.cache) {
        const cacheKey = `progress:user:${userId}:challenge:${challengeId}`;
        return this.cache.getOrSet(cacheKey, async () => {
          return this.progressRepository.findByUserAndChallenge(userId, challengeId);
        }, 300); // Cache for 5 minutes
      }
      
      return this.progressRepository.findByUserAndChallenge(userId, challengeId);
    } catch (error) {
      this.logger.error('Error getting progress for challenge', { 
        error: error.message, 
        stack: error.stack,
        userId,
        challengeId 
      });
      throw error;
    }
  }

  /**
   * Get progress records by focus area
   * @param {string} focusArea - Focus area name
   * @returns {Promise<Array<Progress>>} Array of progress records
   */
  async getProgressByFocusArea(focusArea) {
    if (!focusArea) {
      throw new Error('Focus area is required');
    }
    
    try {
      // Use cache if available
      if (this.cache) {
        const cacheKey = `progress:focusArea:${focusArea}`;
        return this.cache.getOrSet(cacheKey, async () => {
          return this.progressRepository.findByFocusArea(focusArea);
        }, 300); // Cache for 5 minutes
      }
      
      return this.progressRepository.findByFocusArea(focusArea);
    } catch (error) {
      this.logger.error('Error getting progress by focus area', { 
        error: error.message, 
        stack: error.stack,
        focusArea 
      });
      throw error;
    }
  }

  /**
   * Calculate user's overall progress
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Overall progress statistics
   */
  async calculateOverallProgress(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    try {
      // Use cache if available
      if (this.cache) {
        const cacheKey = `progress:user:${userId}:stats`;
        return this.cache.getOrSet(cacheKey, async () => {
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
            skillLevels: progress.skillLevels || {},
            strengths: progress.strengths || [],
            weaknesses: progress.weaknesses || []
          };
        }, 300); // Cache for 5 minutes
      }
      
      // Get user progress directly if not using cache
      const progress = await this.getOrCreateProgress(userId);
      
      // Return statistics
      return {
        totalChallenges: progress.statistics.totalChallenges || 0,
        averageScore: progress.statistics.averageScore || 0,
        highestScore: progress.statistics.highestScore || 0,
        averageCompletionTime: progress.statistics.averageCompletionTime || 0,
        streakDays: progress.statistics.streakDays || 0,
        lastActive: progress.statistics.lastActive || null,
        skillLevels: progress.skillLevels || {},
        strengths: progress.strengths || [],
        weaknesses: progress.weaknesses || []
      };
    } catch (error) {
      this.logger.error('Error calculating overall progress', { 
        error: error.message, 
        stack: error.stack,
        userId 
      });
      throw error;
    }
  }

  /**
   * Delete a progress record
   * @param {string} id - Progress ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteProgress(id) {
    if (!id) {
      throw new Error('Progress ID is required');
    }
    
    try {
      // Get the progress record first to get the userId for cache invalidation
      const progress = await this.progressRepository.findById(id);
      const result = await this.progressRepository.delete(id);
      
      if (result && progress && this.cache) {
        this.invalidateProgressCache(progress.userId);
      }
      
      this.logger.info('Deleted progress record', { id });
      
      return result;
    } catch (error) {
      this.logger.error('Error deleting progress', { 
        error: error.message, 
        stack: error.stack,
        id 
      });
      throw error;
    }
  }

  /**
   * Delete all progress records for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteAllProgressForUser(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    try {
      const result = await this.progressRepository.deleteAllForUser(userId);
      
      if (result && this.cache) {
        this.invalidateProgressCache(userId);
      }
      
      this.logger.info('Deleted all progress for user', { userId });
      
      return result;
    } catch (error) {
      this.logger.error('Error deleting all progress for user', { 
        error: error.message, 
        stack: error.stack,
        userId 
      });
      throw error;
    }
  }
  
  /**
   * Helper method to invalidate all progress cache for a user
   * @param {string} userId - User ID
   * @private
   */
  invalidateProgressCache(userId) {
    if (!this.cache || !userId) return;
    
    try {
      // Get all keys with userId
      const userKeys = this.cache.keys(`progress:user:${userId}`);
      
      // Invalidate each key
      userKeys.forEach(key => this.cache.delete(key));
      
      this.logger.debug(`Invalidated ${userKeys.length} progress cache entries for user`, {
        userId
      });
    } catch (error) {
      this.logger.warn('Error invalidating progress cache', { 
        error: error.message,
        userId 
      });
    }
  }
}

module.exports = ProgressService; 