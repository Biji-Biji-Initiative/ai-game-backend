import { logger } from "../../infra/logging/logger.js";
'use strict';
/**
 * Cache Invalidation Manager
 *
 * This service provides a centralized, domain-aware cache invalidation strategy that
 * maintains cache consistency across the application. It implements standardized
 * invalidation patterns based on domain entities and their relationships.
 *
 * Cache invalidation is organized by domain contexts (User, Challenge, FocusArea, etc.)
 * and follows a consistent pattern for entities and their related caches. This approach
 * ensures that when domain state changes, all affected caches are properly invalidated.
 *
 * @module CacheInvalidationManager
 * @requires logger
 */
/**
 * Domain-specific cache key prefixes
 *
 * These prefixes ensure cache keys are properly namespaced by domain context
 * and support the pattern-based invalidation strategy.
 *
 * @enum {string}
 */
const CacheKeyPrefixes = {
  USER: 'user',
  CHALLENGE: 'challenge',
  FOCUS_AREA: 'focusarea',
  EVALUATION: 'evaluation',
  PERSONALITY: 'personality',
  RECOMMENDATION: 'recommendation'
};
/**
 * Cache Invalidation Manager class
 *
 * Responsible for orchestrating cache invalidation based on domain events and
 * entity state changes. It ensures that all related caches are invalidated
 * when domain entities are modified, maintaining cache consistency.
 */
class CacheInvalidationManager {
  /**
   * Create a new Cache Invalidation Manager
   *
   * @param {Object} cacheService - The cache service instance to use for invalidation operations.
   * @throws {Error} If the cache service is not provided.
   */
  constructor(cacheService) {
    if (!cacheService) {
      throw new Error('Cache service is required for the Cache Invalidation Manager');
    }
    this.cache = cacheService;
    this.logger = logger.child({
      component: 'cache-invalidation-manager'
    });
  }
  /**
   * Invalidate a specific cache key
   *
   * Removes a single, exact cache key from the cache.
   *
   * @param {string} key - The exact cache key to invalidate.
   * @returns {Promise<boolean>} True if invalidation was successful, false otherwise.
   */
  async invalidateKey(key) {
    try {
      await this.cache.del(key);
      this.logger.debug(`Invalidated cache key: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating cache key: ${key}`, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Invalidate cache keys matching a pattern
   *
   * Removes all cache keys that match the specified pattern.
   * Pattern matching depends on the underlying cache provider implementation.
   *
   * @param {string} pattern - The pattern to match cache keys (e.g., 'user:byId:*').
   * @returns {Promise<boolean>} True if invalidation was successful, false otherwise.
   */
  async invalidatePattern(pattern) {
    try {
      await this.cache.delPattern(pattern);
      this.logger.debug(`Invalidated cache keys matching pattern: ${pattern}`);
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating cache pattern: ${pattern}`, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Invalidate an entity and all related caches by entity ID and type
   *
   * This is the primary method for entity-based invalidation. It removes
   * the entity's direct cache as well as any patterns that might include
   * references to this entity.
   *
   * @param {string} entityType - The entity type prefix (e.g., 'user', 'challenge').
   * @param {string} entityId - The unique identifier of the entity.
   * @returns {Promise<boolean>} True if all invalidations were successful, false if any failed.
   */
  async invalidateEntity(entityType, entityId) {
    if (!entityType || !entityId) {
      this.logger.warn('Invalid entity type or ID provided for cache invalidation', {
        entityType,
        entityId
      });
      return false;
    }
    try {
      // Invalidate the entity by ID
      await this.invalidateKey(`${entityType}:byId:${entityId}`);
      // Invalidate any pattern that might include this entity
      await this.invalidatePattern(`${entityType}:*:${entityId}:*`);
      await this.invalidatePattern(`${entityType}:*:*:${entityId}`);
      this.logger.debug(`Invalidated ${entityType} entity with ID: ${entityId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating ${entityType} entity: ${entityId}`, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Invalidate all caches related to a user
   *
   * This comprehensive invalidation removes all user-specific caches
   * and related entity caches that reference the user. This should be
   * called when user data changes significantly.
   *
   * @param {string} userId - The unique identifier of the user.
   * @returns {Promise<boolean>} True if all invalidations were successful, false if any failed.
   */
  async invalidateUserCaches(userId) {
    if (!userId) {
      this.logger.warn('No user ID provided for user cache invalidation');
      return false;
    }
    try {
      // Invalidate the user entity
      await this.invalidateEntity(CacheKeyPrefixes.USER, userId);
      // Invalidate user-related lists
      await this.invalidatePattern(`${CacheKeyPrefixes.USER}:list:*`);
      await this.invalidatePattern(`${CacheKeyPrefixes.USER}:search:*`);
      // Invalidate user-specific data in other domains
      await this.invalidatePattern(`${CacheKeyPrefixes.CHALLENGE}:byUser:${userId}:*`);
      await this.invalidatePattern(`${CacheKeyPrefixes.FOCUS_AREA}:byUser:${userId}:*`);
      await this.invalidatePattern(`${CacheKeyPrefixes.EVALUATION}:byUser:${userId}:*`);
      await this.invalidatePattern(`${CacheKeyPrefixes.PERSONALITY}:byUser:${userId}:*`);
      await this.invalidatePattern(`${CacheKeyPrefixes.RECOMMENDATION}:byUser:${userId}:*`);
      this.logger.info(`Invalidated all caches for user: ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating user caches: ${userId}`, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Invalidate all caches related to a challenge
   *
   * Removes challenge-specific caches and related entity caches.
   * Should be called when challenge data is created, updated, or deleted.
   *
   * @param {string} challengeId - The unique identifier of the challenge.
   * @returns {Promise<boolean>} True if all invalidations were successful, false if any failed.
   */
  async invalidateChallengeCaches(challengeId) {
    if (!challengeId) {
      this.logger.warn('No challenge ID provided for challenge cache invalidation');
      return false;
    }
    try {
      // Invalidate the challenge entity
      await this.invalidateEntity(CacheKeyPrefixes.CHALLENGE, challengeId);
      // Invalidate challenge lists
      await this.invalidatePattern(`${CacheKeyPrefixes.CHALLENGE}:list:*`);
      await this.invalidatePattern(`${CacheKeyPrefixes.CHALLENGE}:search:*`);
      await this.invalidatePattern(`${CacheKeyPrefixes.CHALLENGE}:recent:*`);
      // Invalidate related evaluations
      await this.invalidatePattern(`${CacheKeyPrefixes.EVALUATION}:byChallenge:${challengeId}:*`);
      this.logger.info(`Invalidated all caches for challenge: ${challengeId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating challenge caches: ${challengeId}`, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Invalidate all caches related to a focus area
   *
   * Removes focus area caches and related challenge caches.
   * Should be called when focus area data changes.
   *
   * @param {string} focusAreaId - The unique identifier of the focus area.
   * @returns {Promise<boolean>} True if all invalidations were successful, false if any failed.
   */
  async invalidateFocusAreaCaches(focusAreaId) {
    if (!focusAreaId) {
      this.logger.warn('No focus area ID provided for focus area cache invalidation');
      return false;
    }
    try {
      // Invalidate the focus area entity
      await this.invalidateEntity(CacheKeyPrefixes.FOCUS_AREA, focusAreaId);
      // Invalidate focus area lists
      await this.invalidatePattern(`${CacheKeyPrefixes.FOCUS_AREA}:list:*`);
      // Invalidate related challenges if applicable
      await this.invalidatePattern(`${CacheKeyPrefixes.CHALLENGE}:byFocusArea:${focusAreaId}:*`);
      this.logger.info(`Invalidated all caches for focus area: ${focusAreaId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating focus area caches: ${focusAreaId}`, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Invalidate all caches related to an evaluation
   *
   * Removes evaluation caches and optionally related user and challenge caches.
   *
   * @param {string} evaluationId - The unique identifier of the evaluation.
   * @param {string} [userId] - The related user ID, if available.
   * @param {string} [challengeId] - The related challenge ID, if available.
   * @returns {Promise<boolean>} True if all invalidations were successful, false if any failed.
   */
  async invalidateEvaluationCaches(evaluationId, userId, challengeId) {
    if (!evaluationId) {
      this.logger.warn('No evaluation ID provided for evaluation cache invalidation');
      return false;
    }
    try {
      // Invalidate the evaluation entity
      await this.invalidateEntity(CacheKeyPrefixes.EVALUATION, evaluationId);
      // Invalidate evaluation lists
      await this.invalidatePattern(`${CacheKeyPrefixes.EVALUATION}:list:*`);
      // If userId is provided, invalidate user-specific evaluation caches
      if (userId) {
        await this.invalidatePattern(`${CacheKeyPrefixes.EVALUATION}:byUser:${userId}:*`);
      }
      // If challengeId is provided, invalidate challenge-specific evaluation caches
      if (challengeId) {
        await this.invalidatePattern(`${CacheKeyPrefixes.EVALUATION}:byChallenge:${challengeId}:*`);
      }
      this.logger.info(`Invalidated all caches for evaluation: ${evaluationId}`, {
        userId: userId || 'not provided',
        challengeId: challengeId || 'not provided'
      });
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating evaluation caches: ${evaluationId}`, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Invalidate all caches related to a personality profile
   *
   * Removes personality profile caches and optionally related user caches.
   *
   * @param {string} personalityId - The unique identifier of the personality profile.
   * @param {string} [userId] - The related user ID, if available.
   * @returns {Promise<boolean>} True if all invalidations were successful, false if any failed.
   */
  async invalidatePersonalityCaches(personalityId, userId) {
    if (!personalityId) {
      this.logger.warn('No personality ID provided for personality cache invalidation');
      return false;
    }
    try {
      // Invalidate the personality entity
      await this.invalidateEntity(CacheKeyPrefixes.PERSONALITY, personalityId);
      // If userId is provided, invalidate user-specific personality caches
      if (userId) {
        await this.invalidatePattern(`${CacheKeyPrefixes.PERSONALITY}:byUser:${userId}:*`);
      }
      this.logger.info(`Invalidated all caches for personality: ${personalityId}`, {
        userId: userId || 'not provided'
      });
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating personality caches: ${personalityId}`, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Invalidate all list-type caches for a specific entity type
   *
   * Typically used after bulk operations or data imports that
   * affect multiple entities of the same type.
   *
   * @param {string} entityType - The entity type prefix (e.g., 'user', 'challenge').
   * @returns {Promise<boolean>} True if all invalidations were successful, false if any failed.
   */
  async invalidateListCaches(entityType) {
    if (!entityType) {
      this.logger.warn('No entity type provided for list cache invalidation');
      return false;
    }
    try {
      await this.invalidatePattern(`${entityType}:list:*`);
      await this.invalidatePattern(`${entityType}:search:*`);
      this.logger.info(`Invalidated all list caches for entity type: ${entityType}`);
      return true;
    } catch (error) {
      this.logger.error(`Error invalidating list caches for entity type: ${entityType}`, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
  /**
   * Invalidate all caches in the system
   *
   * This is a nuclear option that should be used with extreme caution,
   * typically only during deployments or major data migrations.
   *
   * @returns {Promise<boolean>} True if invalidation was successful, false otherwise.
   */
  async invalidateAll() {
    try {
      await this.cache.clear();
      this.logger.warn('Invalidated ALL caches - this should only be used during maintenance');
      return true;
    } catch (error) {
      this.logger.error('Error invalidating all caches', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }
}
export { CacheInvalidationManager };
export { CacheKeyPrefixes };
export default {
  CacheInvalidationManager,
  CacheKeyPrefixes
};