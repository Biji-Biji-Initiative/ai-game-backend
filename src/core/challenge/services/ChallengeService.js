'use strict';

/**
 * Challenge Service
 * 
 * Provides business logic for managing challenges and associated operations.
 * Implements caching for improved performance.
 */

const { v4: uuidv4 } = require('uuid');
const { getCacheService, getCacheInvalidationManager } = require('../../core/infra/cache/cacheFactory');
const {
  applyServiceErrorHandling,
  createErrorMapper
} = require('../../../core/infra/errors/centralizedErrorUtils');

// Import domain-specific error classes
const {
  ChallengeError,
  ChallengeNotFoundError,
  ChallengeValidationError,
  ChallengeProcessingError,
} = require('../errors/ChallengeErrors');
const { ValidationError } = require('../errors/ChallengeErrors');
const {
  Email,
  ChallengeId,
  FocusArea,
  createEmail,
  createChallengeId,
  createFocusArea
} = require('../../common/valueObjects');

// Create error mapper for service
const challengeServiceErrorMapper = createErrorMapper({
  'ValidationError': ValidationError,
  'ChallengeNotFoundError': ChallengeNotFoundError,
  'ChallengeValidationError': ChallengeValidationError,
  'ChallengeProcessingError': ChallengeProcessingError,
  'Error': ChallengeError
}, ChallengeError);

// Get cache services
const cache = getCacheService();
const cacheInvalidator = getCacheInvalidationManager();

// Cache key prefixes
const CACHE_KEYS = {
  CHALLENGE_BY_ID: 'challenge:byId:',
  CHALLENGES_BY_USER: 'challenge:byUser:',
  RECENT_CHALLENGES: 'challenge:recent:',
  CHALLENGES_BY_FOCUS_AREA: 'challenge:byFocusArea:',
  CHALLENGE_SEARCH: 'challenge:search:',
  CHALLENGE_LIST: 'challenge:list:'
};

/**
 * Challenge Service class
 * Responsible for challenge management and operations
 */
class ChallengeService {
  /**
   * Create a new ChallengeService
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.challengeRepository - Challenge repository instance
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor(dependencies = {}) {
    const { challengeRepository, logger } = dependencies;
    
    if (!challengeRepository) {
      throw new Error('Challenge repository is required for ChallengeService');
    }
    
    if (!logger) {
      throw new Error('Logger is required for ChallengeService');
    }
    
    this.repository = challengeRepository;
    this.logger = logger;
    
    // Apply service error handling wrappers to all methods
    applyServiceErrorHandling(this, challengeServiceErrorMapper, [
      'getChallengeById',
      'getChallengesForUser',
      'getRecentChallengesForUser',
      'saveChallenge',
      'updateChallenge',
      'deleteChallenge',
      'searchChallenges',
      'getChallengesByFocusArea',
      'getAllChallenges',
      '_invalidateChallengeRelatedCaches'
    ]);
  }

  /**
   * Get a challenge by ID
   * @param {string|ChallengeId} id - Challenge ID or ChallengeId value object
   * @returns {Promise<Challenge|null>} Challenge object or null if not found
   */
  getChallengeById(id) {
    // Convert to value object if needed
    const challengeIdVO = id instanceof ChallengeId ? id : createChallengeId(id);
    if (!challengeIdVO) {
      throw new ValidationError(`Invalid challenge ID: ${id}`);
    }
    
    const cacheKey = `${CACHE_KEYS.CHALLENGE_BY_ID}${challengeIdVO.value}`;
    
    return cache.getOrSet(cacheKey, () => {
      this.logger.debug(`Getting challenge by ID: ${challengeIdVO.value}`);
      return this.repository.findById(challengeIdVO.value);
    });
  }
  
  /**
   * Get challenges for a specific user
   * @param {string|Email} userEmail - User email or Email value object
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} List of challenges
   */
  getChallengesForUser(userEmail, options = {}) {
    // Convert to value object if needed
    const emailVO = userEmail instanceof Email ? userEmail : createEmail(userEmail);
    if (!emailVO) {
      throw new ValidationError(`Invalid email format: ${userEmail}`);
    }
    
    const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortDir = 'desc' } = options;
    
    // Create a cache key that includes all query parameters
    const cacheKey = `${CACHE_KEYS.CHALLENGES_BY_USER}${emailVO.value}:${limit}:${offset}:${status || 'all'}:${sortBy}:${sortDir}`;
    
    return cache.getOrSet(cacheKey, () => {
      this.logger.debug(`Getting challenges for user: ${emailVO.value}`, { options });
      return this.repository.findByUserEmail(emailVO.value, { limit, offset, status, sortBy, sortDir });
    });
  }
  
  /**
   * Get recent challenges for a user
   * @param {string|Email} userEmail - User email or Email value object
   * @param {number} limit - Maximum number of challenges to return
   * @returns {Promise<Array<Challenge>>} List of recent challenges
   */
  getRecentChallengesForUser(userEmail, limit = 5) {
    // Convert to value object if needed
    const emailVO = userEmail instanceof Email ? userEmail : createEmail(userEmail);
    if (!emailVO) {
      throw new ValidationError(`Invalid email format: ${userEmail}`);
    }
    
    const cacheKey = `${CACHE_KEYS.RECENT_CHALLENGES}${emailVO.value}:${limit}`;
    
    return cache.getOrSet(cacheKey, () => {
      this.logger.debug(`Getting recent challenges for user: ${emailVO.value}`, { limit });
      return this.repository.findRecentByUserEmail(emailVO.value, limit);
    });
  }
  
  /**
   * Find recent challenges for a user (alternative method name for getRecentChallengesForUser)
   * @param {string|Email} userEmail - User email or Email value object
   * @param {number} limit - Maximum number of challenges to return
   * @returns {Promise<Array<Challenge>>} List of recent challenges
   */
  findRecentByUserEmail(userEmail, limit = 5) {
    return this.getRecentChallengesForUser(userEmail, limit);
  }
  
  /**
   * Find challenges by user email (alternative method name for getChallengesForUser)
   * @param {string|Email} userEmail - User email or Email value object
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} List of challenges
   */
  findByUserEmail(userEmail, options = {}) {
    return this.getChallengesForUser(userEmail, options);
  }
  
  /**
   * Save a new challenge
   * @param {Object} challengeData - Challenge data
   * @returns {Promise<Object>} Saved challenge
   */
  async saveChallenge(challengeData) {
    this.logger.debug('Saving new challenge', { challengeData });
    
    // Generate UUID if not provided
    const challenge = {
      ...challengeData,
      id: challengeData.id || uuidv4(),
      createdAt: challengeData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const savedChallenge = await this.repository.save(challenge);
    
    // Invalidate relevant caches
    await this._invalidateChallengeRelatedCaches(savedChallenge);
    
    return savedChallenge;
  }
  
  /**
   * Update an existing challenge
   * @param {string|ChallengeId} id - Challenge ID or ChallengeId value object
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated challenge
   */
  async updateChallenge(id, updateData) {
    // Convert to value object if needed
    const challengeIdVO = id instanceof ChallengeId ? id : createChallengeId(id);
    if (!challengeIdVO) {
      throw new ValidationError(`Invalid challenge ID: ${id}`);
    }
    
    this.logger.debug(`Updating challenge: ${challengeIdVO.value}`);
    
    // Get existing challenge
    const existingChallenge = await this.repository.findById(challengeIdVO.value);
    
    if (!existingChallenge) {
      throw new ChallengeNotFoundError(`Challenge not found with ID: ${challengeIdVO.value}`);
    }
    
    // Merge with existing data and update timestamp
    const challenge = {
      ...existingChallenge,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    const updatedChallenge = await this.repository.update(challengeIdVO.value, challenge);
    
    // Invalidate relevant caches
    await this._invalidateChallengeRelatedCaches(updatedChallenge);
    
    return updatedChallenge;
  }
  
  /**
   * Delete a challenge
   * @param {string|ChallengeId} id - Challenge ID or ChallengeId value object
   * @returns {Promise<boolean>} True if successfully deleted
   */
  async deleteChallenge(id) {
    // Convert to value object if needed
    const challengeIdVO = id instanceof ChallengeId ? id : createChallengeId(id);
    if (!challengeIdVO) {
      throw new ValidationError(`Invalid challenge ID: ${id}`);
    }
    
    this.logger.debug(`Deleting challenge: ${challengeIdVO.value}`);
    
    // Get challenge before deleting (for cache invalidation)
    const challenge = await this.repository.findById(challengeIdVO.value);
    
    if (!challenge) {
      throw new ChallengeNotFoundError(`Challenge not found with ID: ${challengeIdVO.value}`);
    }
    
    const result = await this.repository.delete(challengeIdVO.value);
    
    // Invalidate relevant caches
    await this._invalidateChallengeRelatedCaches(challenge);
    
    return result;
  }
  
  /**
   * Search challenges with filters
   * @param {Object} filters - Search filters
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} List of matching challenges
   */
  searchChallenges(filters = {}, options = {}) {
    const { limit = 10, offset = 0, sortBy = 'createdAt', sortDir = 'desc' } = options;
    
    // Create a cache key that includes search parameters
    const filterKey = JSON.stringify(filters);
    const cacheKey = `${CACHE_KEYS.CHALLENGE_SEARCH}${filterKey}:${limit}:${offset}:${sortBy}:${sortDir}`;
    
    return cache.getOrSet(cacheKey, () => {
      this.logger.debug('Searching challenges', { filters, options });
      return this.repository.search(filters, { limit, offset, sortBy, sortDir });
    });
  }
  
  /**
   * Get challenges by focus area
   * @param {string|FocusArea} focusArea - Focus area code or FocusArea value object
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} List of challenges
   */
  getChallengesByFocusArea(focusArea, options = {}) {
    // Convert to value object if needed
    const focusAreaVO = focusArea instanceof FocusArea ? focusArea : createFocusArea(focusArea);
    if (!focusAreaVO) {
      throw new ValidationError(`Invalid focus area: ${focusArea}`);
    }
    
    const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortDir = 'desc' } = options;
    
    // Create a cache key that includes all query parameters
    const cacheKey = `${CACHE_KEYS.CHALLENGES_BY_FOCUS_AREA}${focusAreaVO.value}:` + 
      `${limit}:${offset}:${status || 'all'}:` + 
      `${sortBy}:${sortDir}`;
    
    return cache.getOrSet(cacheKey, () => {
      this.logger.debug(`Getting challenges for focus area: ${focusAreaVO.value}`, { options });
      return this.repository.findByFocusAreaId(
        focusAreaVO.value, 
        { limit, offset, status, sortBy, sortDir }
      );
    });
  }
  
  /**
   * Get all challenges with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} List of challenges
   */
  getAllChallenges(options = {}) {
    const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortDir = 'desc' } = options;
    
    // Create a cache key that includes all query parameters
    const cacheKey = `${CACHE_KEYS.CHALLENGE_LIST}${limit}:${offset}:${status || 'all'}:${sortBy}:${sortDir}`;
    
    return cache.getOrSet(cacheKey, () => {
      this.logger.debug('Getting all challenges', { options });
      return this.repository.findAll({ limit, offset, status, sortBy, sortDir });
    });
  }
  
  /**
   * Invalidate related challenge caches
   * @param {Object} challenge - Challenge object
   * @private
   */
  async _invalidateChallengeRelatedCaches(challenge) {
    try {
      // Use the cache invalidator for centralized cache invalidation
      await cacheInvalidator.invalidateChallengeCaches(challenge.id);
      
      // Additionally invalidate user-specific caches if userId is present
      if (challenge.userId) {
        await cacheInvalidator.invalidatePattern(`${CACHE_KEYS.CHALLENGES_BY_USER}${challenge.userId}:*`);
        await cacheInvalidator.invalidatePattern(`${CACHE_KEYS.RECENT_CHALLENGES}${challenge.userId}:*`);
      }
      
      // Invalidate focus area related caches if focusAreaId is present
      if (challenge.focusAreaId) {
        await cacheInvalidator.invalidatePattern(`${CACHE_KEYS.CHALLENGES_BY_FOCUS_AREA}${challenge.focusAreaId}:*`);
      }
      
      this.logger.debug(`Invalidated caches for challenge: ${challenge.id}`);
    } catch (error) {
      this.logger.error(`Error invalidating challenge caches: ${error.message}`, {
        error,
        challengeId: challenge.id
      });
    }
  }
}

// Create instance with repository and export it
const challengeService = new ChallengeService();

module.exports = { ChallengeService, challengeService }; 