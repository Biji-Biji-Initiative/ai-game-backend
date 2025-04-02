'use strict';

import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { logger } from "#app/core/infra/logging/logger.js";

/**
 * Focus Area Domain Events
 *
 * Events that occur within the Focus Area domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */

/**
 * Get the FocusAreaRepository instance from the container.
 * @param {DIContainer} container - The DI container instance.
 * @returns {FocusAreaRepository}
 */
function getRepo(container) {
    if (!container) {
        logger.error('[focusAreaEvents] Container not provided to getRepo!');
        throw new Error('DI container is required to get FocusAreaRepository');
    }
    try {
        return container.get('focusAreaRepository');
    } catch (error) {
        logger.error('[focusAreaEvents] Failed to get FocusAreaRepository from container', { error: error.message });
        throw error;
    }
}

/**
 * Publish an event when a focus area is created
 * @param {DIContainer} container - The DI container instance.
 * @param {string} focusAreaId - ID of the focus area
 * @param {string} name - Name of the focus area
 * @returns {Promise<void>}
 */
async function publishFocusAreaCreated(container, focusAreaId, name) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(focusAreaId);
    if (entity) {
      entity.addDomainEvent(EventTypes.FOCUS_AREA_CREATED, {
        focusAreaId,
        name
      });
      await repo.save(entity);
    } else {
      logger.warn(`[focusAreaEvents] Entity ${focusAreaId} not found for FOCUS_AREA_CREATED. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.FOCUS_AREA_CREATED,
        data: { entityId: focusAreaId, entityType: 'FocusArea', name },
        metadata: { timestamp: new Date().toISOString() }
      });
    }
    logger.debug('Published focus area created event', { focusAreaId, name });
  } catch (error) {
    logger.error('Error publishing focus area created event', { error: error.message, focusAreaId, name });
  }
}

/**
 * Publish an event when a focus area is updated
 * @param {DIContainer} container - The DI container instance.
 * @param {string} focusAreaId - ID of the focus area
 * @param {Object} changes - Changes made to the focus area
 * @returns {Promise<void>}
 */
async function publishFocusAreaUpdated(container, focusAreaId, changes) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(focusAreaId);
    if (entity) {
      entity.addDomainEvent(EventTypes.FOCUS_AREA_UPDATED, {
        focusAreaId,
        changes
      });
      await repo.save(entity);
    } else {
      logger.warn(`[focusAreaEvents] Entity ${focusAreaId} not found for FOCUS_AREA_UPDATED. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.FOCUS_AREA_UPDATED,
        data: { entityId: focusAreaId, entityType: 'FocusArea', changes },
        metadata: { timestamp: new Date().toISOString() }
      });
    }
    logger.debug('Published focus area updated event', { focusAreaId });
  } catch (error) {
    logger.error('Error publishing focus area updated event', { error: error.message, focusAreaId });
  }
}

/**
 * Publish an event when a user's focus area is set
 * @param {DIContainer} container - The DI container instance.
 * @param {string} userId - ID of the user
 * @param {string} focusArea - Focus area name
 * @returns {Promise<void>}
 */
async function publishUserFocusAreaSet(container, userId, focusArea) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(userId);
    if (entity) {
      entity.addDomainEvent(EventTypes.USER_FOCUS_AREA_SET, {
        userId,
        focusArea
      });
      await repo.save(entity);
    } else {
      logger.warn(`[focusAreaEvents] Entity with userId ${userId} not found for USER_FOCUS_AREA_SET. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.USER_FOCUS_AREA_SET,
        data: { entityId: userId, entityType: 'UserFocusArea', userId, focusArea },
        metadata: { timestamp: new Date().toISOString() }
      });
    }
    logger.debug('Published user focus area set event', { userId, focusArea });
  } catch (error) {
    logger.error('Error publishing user focus area set event', { error: error.message, userId, focusArea });
  }
}

/**
 * Set up focus area event subscriptions
 * @param {DIContainer} container - The DI container instance.
 */
export function registerFocusAreaEventHandlers(container) {
    if (!container) {
        throw new Error('Container is required to register focus area event handlers');
    }

    const eventBus = container.get('eventBus');
    if (!eventBus) {
        throw new Error('EventBus not found in container');
    }

    // Register event handlers here...
    // Example:
    eventBus.on(EventTypes.FOCUS_AREA_CREATED, async (event) => {
        try {
            const repo = getRepo(container);
            // Handle focus area created event...
            logger.info('Focus area created event handled', { eventId: event.id });
        } catch (error) {
            logger.error('Error handling focus area created event', { error: error.message });
        }
    });

    // Add more event handlers as needed...
}

export default {
  publishFocusAreaCreated,
  publishFocusAreaUpdated,
  publishUserFocusAreaSet,
  registerFocusAreaEventHandlers
};