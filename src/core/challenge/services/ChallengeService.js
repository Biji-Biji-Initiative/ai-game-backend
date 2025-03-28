/**
 * Challenge Service
 * 
 * Core domain service for challenge operations with integrated caching.
 * Acts as the primary interface for challenge-related domain operations.
 */

const { challengeLogger } = require('../../../core/infra/logging/domainLogger');
const Challenge = require('../models/Challenge');
const { 
  ChallengeNotFoundError, 
  ChallengeValidationError 
} = require('../errors/ChallengeErrors');

// Cache TTL constants
const CHALLENGE_CACHE_TTL = 600; // 10 minutes
const CHALLENGE_LIST_CACHE_TTL = 120; // 2 minutes
const CHALLENGE_USER_TTL = 300; // 5 minutes for user-specific challenges
const CHALLENGE_CONFIG_TTL = 1800; // 30 minutes for config data

/**
 * Challenge Service class with standardized caching
 */
class ChallengeService {
  /**
   * Create a new ChallengeService
   * @param {Object} dependencies - Dependencies
   * @param {ChallengeRepository} dependencies.challengeRepository - Repository for challenge data access
   * @param {Object} dependencies.logger - Logger instance
   * @param {CacheService} dependencies.cacheService - Cache service for optimizing data access
   * @throws {Error} If required dependencies are missing
   */
  constructor({ challengeRepository, logger, cacheService }) {
    if (!challengeRepository) {
      throw new Error('challengeRepository is required for ChallengeService');
    }
    
    if (!cacheService) {
      throw new Error('cacheService is required for ChallengeService');
    }
    
    this.challengeRepository = challengeRepository;
    this.logger = logger || challengeLogger.child({ component: 'service:challenge' });
    this.cache = cacheService;
  }

  /**
   * Get a challenge by ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Challenge>} Challenge if found
   * @throws {ChallengeNotFoundError} If challenge not found
   */
  async getChallengeById(challengeId) {
    if (!challengeId) {
      throw new ChallengeValidationError('Challenge ID is required');
    }
    
    try {
      const cacheKey = `challenge:id:${challengeId}`;
      const challenge = await this.cache.getOrSet(cacheKey, async () => {
        const challenge = await this.challengeRepository.findById(challengeId);
        
        if (!challenge) {
          return null; // Cache will store null to prevent repeated DB lookups for non-existent challenges
        }
        
        return challenge;
      }, CHALLENGE_CACHE_TTL);
      
      if (!challenge) {
        throw new ChallengeNotFoundError(`Challenge with ID ${challengeId} not found`);
      }
      
      return challenge;
    } catch (error) {
      if (error instanceof ChallengeNotFoundError) {
        throw error;
      }
      
      this.logger.error('Error getting challenge by ID', {
        error: error.message,
        stack: error.stack,
        challengeId
      });
      
      throw error;
    }
  }

  /**
   * Get all challenges for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Challenge>>} Array of challenges
   */
  async getChallengesForUser(userId) {
    if (!userId) {
      throw new ChallengeValidationError('User ID is required');
    }
    
    try {
      const cacheKey = `challenges:user:${userId}`;
      
      return this.cache.getOrSet(cacheKey, async () => {
        const challenges = await this.challengeRepository.findByUserId(userId);
        
        // Cache individual challenges too
        challenges.forEach(challenge => {
          this.cache.set(`challenge:id:${challenge.id}`, challenge, CHALLENGE_CACHE_TTL);
        });
        
        return challenges;
      }, CHALLENGE_USER_TTL);
    } catch (error) {
      this.logger.error('Error getting challenges for user', {
        error: error.message,
        stack: error.stack,
        userId
      });
      
      throw error;
    }
  }

  /**
   * Get recent challenges for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of challenges to return
   * @returns {Promise<Array<Challenge>>} Array of recent challenges
   */
  async getRecentChallengesForUser(userId, limit = 5) {
    if (!userId) {
      throw new ChallengeValidationError('User ID is required');
    }
    
    try {
      const criteria = { userId };
      const options = { 
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      
      const cacheKey = `challenges:user:${userId}:recent:${limit}`;
      
      return this.cache.getOrSet(cacheKey, async () => {
        const challenges = await this.challengeRepository.findByCriteria(criteria, options);
        
        // Cache individual challenges too
        challenges.forEach(challenge => {
          this.cache.set(`challenge:id:${challenge.id}`, challenge, CHALLENGE_CACHE_TTL);
        });
        
        return challenges;
      }, CHALLENGE_USER_TTL);
    } catch (error) {
      this.logger.error('Error getting recent challenges for user', {
        error: error.message,
        stack: error.stack,
        userId,
        limit
      });
      
      throw error;
    }
  }

  /**
   * Save a challenge
   * @param {Challenge} challenge - Challenge to save
   * @returns {Promise<Challenge>} Saved challenge
   */
  async saveChallenge(challenge) {
    if (!challenge) {
      throw new ChallengeValidationError('Challenge object is required');
    }
    
    if (!(challenge instanceof Challenge)) {
      throw new ChallengeValidationError('Object must be a Challenge instance');
    }
    
    try {
      const savedChallenge = await this.challengeRepository.save(challenge);
      
      // Update cache with new data
      this.cache.set(`challenge:id:${savedChallenge.id}`, savedChallenge, CHALLENGE_CACHE_TTL);
      
      // Invalidate user's challenges lists and all list caches
      if (savedChallenge.userId) {
        this.invalidateUserChallengeCache(savedChallenge.userId);
      }
      
      this.invalidateChallengeLists();
      
      return savedChallenge;
    } catch (error) {
      this.logger.error('Error saving challenge', {
        error: error.message,
        stack: error.stack,
        challengeId: challenge.id
      });
      
      throw error;
    }
  }

  /**
   * Update a challenge
   * @param {string} challengeId - Challenge ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Challenge>} Updated challenge
   */
  async updateChallenge(challengeId, updateData) {
    if (!challengeId) {
      throw new ChallengeValidationError('Challenge ID is required');
    }
    
    if (!updateData || typeof updateData !== 'object') {
      throw new ChallengeValidationError('Update data must be an object');
    }
    
    try {
      // First, retrieve the existing challenge (bypassing cache to get fresh data)
      const existingChallenge = await this.challengeRepository.findById(challengeId);
      
      if (!existingChallenge) {
        throw new ChallengeNotFoundError(`Challenge with ID ${challengeId} not found`);
      }
      
      let savedChallenge;
      
      // If updateData is a Challenge instance, use its data
      if (updateData instanceof Challenge) {
        savedChallenge = await this.challengeRepository.save(updateData);
      } else {
        // Otherwise, update the existing challenge
        Object.keys(updateData).forEach(key => {
          existingChallenge[key] = updateData[key];
        });
        
        savedChallenge = await this.challengeRepository.save(existingChallenge);
      }
      
      // Update cache with new data
      this.cache.set(`challenge:id:${challengeId}`, savedChallenge, CHALLENGE_CACHE_TTL);
      
      // Invalidate user's challenges lists and all list caches
      if (savedChallenge.userId) {
        this.invalidateUserChallengeCache(savedChallenge.userId);
      }
      
      this.invalidateChallengeLists();
      
      return savedChallenge;
    } catch (error) {
      if (error instanceof ChallengeNotFoundError) {
        throw error;
      }
      
      this.logger.error('Error updating challenge', {
        error: error.message,
        stack: error.stack,
        challengeId
      });
      
      throw error;
    }
  }

  /**
   * Delete a challenge
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteChallenge(challengeId) {
    if (!challengeId) {
      throw new ChallengeValidationError('Challenge ID is required');
    }
    
    try {
      // Get the challenge first to have user ID for cache invalidation
      const challenge = await this.challengeRepository.findById(challengeId);
      
      if (!challenge) {
        throw new ChallengeNotFoundError(`Challenge with ID ${challengeId} not found`);
      }
      
      const result = await this.challengeRepository.deleteById(challengeId);
      
      if (result) {
        // Delete challenge from cache
        this.cache.delete(`challenge:id:${challengeId}`);
        
        // Invalidate user's challenges lists
        if (challenge.userId) {
          this.invalidateUserChallengeCache(challenge.userId);
        }
        
        // Invalidate any search/list caches
        this.invalidateChallengeLists();
      }
      
      return result;
    } catch (error) {
      if (error instanceof ChallengeNotFoundError) {
        throw error;
      }
      
      this.logger.error('Error deleting challenge', {
        error: error.message,
        stack: error.stack,
        challengeId
      });
      
      throw error;
    }
  }

  /**
   * Find challenges by criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} [options] - Search options
   * @returns {Promise<Array<Challenge>>} Array of matching challenges
   */
  async findChallenges(criteria, options = {}) {
    try {
      // Create a cache key based on criteria and options
      const criteriaStr = JSON.stringify(criteria || {});
      const optionsStr = JSON.stringify(options || {});
      const cacheKey = `challenges:find:${criteriaStr}:${optionsStr}`;
      
      return this.cache.getOrSet(cacheKey, async () => {
        const challenges = await this.challengeRepository.findByCriteria(criteria, options);
        
        // Cache individual challenges
        challenges.forEach(challenge => {
          this.cache.set(`challenge:id:${challenge.id}`, challenge, CHALLENGE_CACHE_TTL);
        });
        
        return challenges;
      }, CHALLENGE_LIST_CACHE_TTL);
    } catch (error) {
      this.logger.error('Error finding challenges', {
        error: error.message,
        stack: error.stack,
        criteria,
        options
      });
      
      throw error;
    }
  }
  
  /**
   * Get challenges by focus area
   * @param {string} focusArea - Focus area name
   * @param {Object} [options] - Query options
   * @returns {Promise<Array<Challenge>>} Array of challenges
   */
  async getChallengesByFocusArea(focusArea, options = {}) {
    if (!focusArea) {
      throw new ChallengeValidationError('Focus area is required');
    }
    
    try {
      const cacheKey = `challenges:focusArea:${focusArea}:${JSON.stringify(options)}`;
      
      return this.cache.getOrSet(cacheKey, async () => {
        const challenges = await this.challengeRepository.findByCriteria(
          { focusArea },
          options
        );
        
        // Cache individual challenges
        challenges.forEach(challenge => {
          this.cache.set(`challenge:id:${challenge.id}`, challenge, CHALLENGE_CACHE_TTL);
        });
        
        return challenges;
      }, CHALLENGE_LIST_CACHE_TTL);
    } catch (error) {
      this.logger.error('Error getting challenges by focus area', {
        error: error.message,
        stack: error.stack,
        focusArea,
        options
      });
      
      throw error;
    }
  }
  
  /**
   * Get challenges by type
   * @param {string} challengeType - Challenge type
   * @param {Object} [options] - Query options
   * @returns {Promise<Array<Challenge>>} Array of challenges
   */
  async getChallengesByType(challengeType, options = {}) {
    if (!challengeType) {
      throw new ChallengeValidationError('Challenge type is required');
    }
    
    try {
      const cacheKey = `challenges:type:${challengeType}:${JSON.stringify(options)}`;
      
      return this.cache.getOrSet(cacheKey, async () => {
        const challenges = await this.challengeRepository.findByCriteria(
          { challengeType },
          options
        );
        
        // Cache individual challenges
        challenges.forEach(challenge => {
          this.cache.set(`challenge:id:${challenge.id}`, challenge, CHALLENGE_CACHE_TTL);
        });
        
        return challenges;
      }, CHALLENGE_LIST_CACHE_TTL);
    } catch (error) {
      this.logger.error('Error getting challenges by type', {
        error: error.message,
        stack: error.stack,
        challengeType,
        options
      });
      
      throw error;
    }
  }
  
  /**
   * Helper to invalidate all user-specific challenge caches
   * @param {string} userId - User ID
   * @private
   */
  invalidateUserChallengeCache(userId) {
    if (!userId) return;
    
    try {
      // Delete standard user challenge caches
      this.cache.delete(`challenges:user:${userId}`);
      
      // Find and delete all recent challenge caches
      const recentCacheKeys = this.cache.keys(`challenges:user:${userId}:recent:`);
      
      recentCacheKeys.forEach(key => this.cache.delete(key));
      
      this.logger.debug(`Invalidated ${recentCacheKeys.length + 1} user challenge caches for user ${userId}`);
    } catch (error) {
      this.logger.warn('Error invalidating user challenge caches', { error: error.message });
    }
  }
  
  /**
   * Helper to invalidate all challenge list caches
   * @private
   */
  invalidateChallengeLists() {
    try {
      // Categories of caches to invalidate
      const prefixes = [
        'challenges:find:',
        'challenges:type:',
        'challenges:focusArea:'
      ];
      
      // Find all matching keys
      let keysToInvalidate = [];
      prefixes.forEach(prefix => {
        const matchingKeys = this.cache.keys(prefix);
        keysToInvalidate.push(...matchingKeys);
      });
      
      // Delete all matching keys
      keysToInvalidate.forEach(key => this.cache.delete(key));
      
      this.logger.debug(`Invalidated ${keysToInvalidate.length} challenge list caches`);
    } catch (error) {
      this.logger.warn('Error invalidating challenge list caches', { error: error.message });
    }
  }
}

module.exports = ChallengeService; 