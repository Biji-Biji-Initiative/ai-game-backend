/**
 * Cache Invalidation Event Handlers
 * 
 * This module contains event handlers that listen for domain events
 * and automatically invalidate related caches to ensure data consistency.
 * 
 * These handlers complement the direct cache invalidation done in repositories
 * and provide redundant coverage to ensure data is always fresh.
 */

import { EventTypes } from "#app/core/common/events/domainEvents.js";
import { getCacheInvalidationManager } from "#app/core/infra/cache/cacheFactory.js";
import { logger } from "#app/core/infra/logging/logger.js";
import { getUserIdFromEvent, getEntityIdFromEvent } from "#app/core/common/events/eventUtils.js";

/**
 * Register cache invalidation event handlers with the event bus
 * @param {Object} eventBus - Event bus instance
 */
export function registerCacheInvalidationEventHandlers(eventBus) {
  if (!eventBus) {
    logger.warn('Event bus not provided, cache invalidation event handlers will not be registered');
    return;
  }
  
  const cacheInvalidator = getCacheInvalidationManager();
  const log = logger.child({ component: 'cache-invalidation-handlers' });
  
  log.info('Registering cache invalidation event handlers');
  
  // User-related events
  eventBus.subscribe(EventTypes.USER_CREATED, async (event) => {
    try {
      const userId = getUserIdFromEvent(event);
      if (!userId) {
        log.warn('User ID missing from USER_CREATED event', { event });
        return;
      }
      
      log.debug('Invalidating caches for newly created user', { userId });
      await cacheInvalidator.invalidateUserCaches(userId);
      await cacheInvalidator.invalidateListCaches('user');
    } catch (error) {
      log.error('Error handling USER_CREATED event for cache invalidation', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  eventBus.subscribe(EventTypes.USER_UPDATED, async (event) => {
    try {
      const userId = getUserIdFromEvent(event);
      if (!userId) {
        log.warn('User ID missing from USER_UPDATED event', { event });
        return;
      }
      
      log.debug('Invalidating caches for updated user', { userId });
      await cacheInvalidator.invalidateUserCaches(userId);
    } catch (error) {
      log.error('Error handling USER_UPDATED event for cache invalidation', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  eventBus.subscribe(EventTypes.USER_DEACTIVATED, async (event) => {
    try {
      const userId = getUserIdFromEvent(event);
      if (!userId) {
        log.warn('User ID missing from USER_DEACTIVATED event', { event });
        return;
      }
      
      log.debug('Invalidating caches for deactivated user', { userId });
      await cacheInvalidator.invalidateUserCaches(userId);
      await cacheInvalidator.invalidateListCaches('user');
    } catch (error) {
      log.error('Error handling USER_DEACTIVATED event for cache invalidation', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  // Challenge-related events
  eventBus.subscribe(EventTypes.CHALLENGE_CREATED, async (event) => {
    try {
      const challengeId = getEntityIdFromEvent(event, 'challenge');
      if (!challengeId) {
        log.warn('Challenge ID missing from CHALLENGE_CREATED event', { event });
        return;
      }
      
      log.debug('Invalidating caches for newly created challenge', { challengeId });
      await cacheInvalidator.invalidateChallengeCaches(challengeId);
      await cacheInvalidator.invalidateListCaches('challenge');
      
      // Also invalidate user's challenges if userId is available
      const userId = getUserIdFromEvent(event);
      if (userId) {
        await cacheInvalidator.invalidatePattern(`challenge:byUser:${userId}:*`);
      }
    } catch (error) {
      log.error('Error handling CHALLENGE_CREATED event for cache invalidation', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  eventBus.subscribe(EventTypes.CHALLENGE_UPDATED, async (event) => {
    try {
      const challengeId = getEntityIdFromEvent(event, 'challenge');
      if (!challengeId) {
        log.warn('Challenge ID missing from CHALLENGE_UPDATED event', { event });
        return;
      }
      
      log.debug('Invalidating caches for updated challenge', { challengeId });
      await cacheInvalidator.invalidateChallengeCaches(challengeId);
    } catch (error) {
      log.error('Error handling CHALLENGE_UPDATED event for cache invalidation', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  eventBus.subscribe(EventTypes.CHALLENGE_DELETED, async (event) => {
    try {
      const challengeId = getEntityIdFromEvent(event, 'challenge');
      if (!challengeId) {
        log.warn('Challenge ID missing from CHALLENGE_DELETED event', { event });
        return;
      }
      
      log.debug('Invalidating caches for deleted challenge', { challengeId });
      await cacheInvalidator.invalidateChallengeCaches(challengeId);
      await cacheInvalidator.invalidateListCaches('challenge');
      
      // Also invalidate user's challenges if userId is available
      const userId = getUserIdFromEvent(event);
      if (userId) {
        await cacheInvalidator.invalidatePattern(`challenge:byUser:${userId}:*`);
      }
    } catch (error) {
      log.error('Error handling CHALLENGE_DELETED event for cache invalidation', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  eventBus.subscribe(EventTypes.CHALLENGE_COMPLETED, async (event) => {
    try {
      const challengeId = getEntityIdFromEvent(event, 'challenge');
      if (!challengeId) {
        log.warn('Challenge ID missing from CHALLENGE_COMPLETED event', { event });
        return;
      }
      
      log.debug('Invalidating caches for completed challenge', { challengeId });
      await cacheInvalidator.invalidateChallengeCaches(challengeId);
      
      // Also invalidate user's progress and challenges if userId is available
      const userId = getUserIdFromEvent(event);
      if (userId) {
        await cacheInvalidator.invalidatePattern(`challenge:byUser:${userId}:*`);
        await cacheInvalidator.invalidatePattern(`progress:byUser:${userId}:*`);
      }
    } catch (error) {
      log.error('Error handling CHALLENGE_COMPLETED event for cache invalidation', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  // Evaluation-related events
  eventBus.subscribe(EventTypes.EVALUATION_COMPLETED, async (event) => {
    try {
      const evaluationId = getEntityIdFromEvent(event, 'evaluation');
      if (!evaluationId) {
        log.warn('Evaluation ID missing from EVALUATION_COMPLETED event', { event });
        return;
      }
      
      log.debug('Invalidating caches for completed evaluation', { evaluationId });
      
      const userId = getUserIdFromEvent(event);
      const challengeId = event.data.challengeId;
      
      await cacheInvalidator.invalidateEvaluationCaches(evaluationId, userId, challengeId);
      
      // Also invalidate related entity caches
      if (userId) {
        await cacheInvalidator.invalidatePattern(`progress:byUser:${userId}:*`);
      }
      
      if (challengeId) {
        await cacheInvalidator.invalidateEntity('challenge', challengeId);
      }
    } catch (error) {
      log.error('Error handling EVALUATION_COMPLETED event for cache invalidation', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  // Progress-related events
  eventBus.subscribe(EventTypes.PROGRESS_UPDATED, async (event) => {
    try {
      const userId = getUserIdFromEvent(event);
      if (!userId) {
        log.warn('User ID missing from PROGRESS_UPDATED event', { event });
        return;
      }
      
      log.debug('Invalidating caches for updated progress', { userId });
      await cacheInvalidator.invalidatePattern(`progress:byUser:${userId}:*`);
    } catch (error) {
      log.error('Error handling PROGRESS_UPDATED event for cache invalidation', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  // Focus Area events
  eventBus.subscribe(EventTypes.FOCUS_AREA_SELECTED, async (event) => {
    try {
      const userId = getUserIdFromEvent(event);
      if (!userId) {
        log.warn('User ID missing from FOCUS_AREA_SELECTED event', { event });
        return;
      }
      
      log.debug('Invalidating caches for focus area selection', { userId });
      await cacheInvalidator.invalidateUserCaches(userId);
      await cacheInvalidator.invalidatePattern(`progress:byUser:${userId}:*`);
    } catch (error) {
      log.error('Error handling FOCUS_AREA_SELECTED event for cache invalidation', {
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  log.info('Cache invalidation event handlers registered successfully');
} 