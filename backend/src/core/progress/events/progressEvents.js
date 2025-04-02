'use strict';

import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { logger } from "#app/core/infra/logging/logger.js";

/**
 * Progress Domain Events
 *
 * Events that occur within the Progress domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */

/**
 * Get the ProgressRepository instance from the container.
 * @param {DIContainer} container - The DI container instance.
 * @returns {ProgressRepository}
 */
function getRepo(container) {
    if (!container) {
        logger.error('[progressEvents] Container not provided to getRepo!');
        throw new Error('DI container is required to get ProgressRepository');
    }
    try {
        return container.get('progressRepository');
    } catch (error) {
        logger.error('[progressEvents] Failed to get ProgressRepository from container', { error: error.message });
        throw error;
    }
}

/**
 * Publish an event when a user's progress is updated
 * @param {DIContainer} container - The DI container instance.
 * @param {string} userEmail - Email of the user
 * @param {string} area - Area of progress (e.g., challenge, focusArea)
 * @param {number} value - Progress value
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<void>}
 */
async function publishProgressUpdated(container, userEmail, area, value, metadata = {}, progressId) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(progressId);
    if (entity) {
      entity.addDomainEvent(EventTypes.PROGRESS_UPDATED, {
        userEmail,
        area,
        value,
        metadata
      });
      await repo.save(entity);
    } else {
      logger.warn(`[progressEvents] Entity ${progressId} not found for PROGRESS_UPDATED. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.PROGRESS_UPDATED,
        data: { entityId: progressId, entityType: 'Progress', userEmail, area, value, metadata },
        metadata: { timestamp: new Date().toISOString() }
      });
    }
    logger.debug('Published progress updated event', { userEmail, area });
  } catch (error) {
    logger.error('Error publishing progress updated event', { error: error.message, userEmail, area });
  }
}

/**
 * Publish an event when a user unlocks an achievement
 * @param {DIContainer} container - The DI container instance.
 * @param {string} userEmail - Email of the user
 * @param {string} achievementId - ID of the achievement
 * @param {string} achievementName - Name of the achievement
 * @param {string} description - Description of the achievement
 * @returns {Promise<void>}
 */
async function publishAchievementUnlocked(container, userEmail, achievementId, achievementName, description, progressId) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(progressId);
    if (entity) {
      entity.addDomainEvent(EventTypes.ACHIEVEMENT_UNLOCKED, {
        userEmail,
        achievement: {
          id: achievementId,
          name: achievementName,
          description
        }
      });
      await repo.save(entity);
    } else {
      logger.warn(`[progressEvents] Entity ${progressId} not found for ACHIEVEMENT_UNLOCKED. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.ACHIEVEMENT_UNLOCKED,
        data: { entityId: progressId, entityType: 'Progress', userEmail, achievement: { id: achievementId, name: achievementName, description } },
        metadata: { timestamp: new Date().toISOString() }
      });
    }
    logger.debug('Published achievement unlocked event', { userEmail, achievementId });
  } catch (error) {
    logger.error('Error publishing achievement unlocked event', { error: error.message, userEmail, achievementId });
  }
}

/**
 * Set up progress event subscriptions
 * @param {DIContainer} container - The DI container instance.
 */
export function registerProgressEventHandlers(container) {
    if (!container) {
        throw new Error('Container is required to register progress event handlers');
    }

    const eventBus = container.get('eventBus');
    if (!eventBus) {
        throw new Error('EventBus not found in container');
    }

    // Register event handlers here...
    // Example:
    eventBus.on(EventTypes.PROGRESS_UPDATED, async (event) => {
        try {
            const repo = getRepo(container);
            // Handle progress updated event...
            logger.info('Progress updated event handled', { eventId: event.id });
        } catch (error) {
            logger.error('Error handling progress updated event', { error: error.message });
        }
    });

    // Add more event handlers as needed...
}

export default {
  publishProgressUpdated,
  publishAchievementUnlocked,
  registerProgressEventHandlers
};