'use strict';

import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { logger } from "#app/core/infra/logging/logger.js";
// REMOVED: Direct import
// import { UserRepository } from "#app/core/user/repositories/UserRepository.js";

/**
 * User Domain Events
 *
 * Events that occur within the User domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 * 
 * NOTE: This direct event publishing approach is deprecated.
 * Prefer using the entity-based event collection pattern instead:
 * - Use User.addDomainEvent() to collect events in the entity
 * - Let repositories publish events after successful persistence
 * See docs/event-handling-standard.md for details on the recommended approach.
 */

// REMOVED: Top-level instantiation
// const userRepository = new UserRepository();

/**
 * Get the UserRepository instance from the container.
 * @param {DIContainer} container - The DI container instance.
 * @returns {UserRepository}
 */
function getRepo(container) {
    if (!container) {
        logger.error('[userEvents] Container not provided to getRepo!');
        throw new Error('DI container is required to get UserRepository');
    }
    try {
        return container.get('userRepository');
    } catch (error) {
        logger.error('[userEvents] Failed to get UserRepository from container', { error: error.message });
        throw error;
    }
}

/**
 * Publish an event when a user is created
 * @param {DIContainer} container - The DI container instance.
 * @param {string} userId - ID of the user
 * @param {string} email - Email of the user
 * @returns {Promise<void>}
 * @deprecated Use User entity's addDomainEvent method and let repository handle publishing
 */
async function publishUserCreated(container, userId, email) {
  logger.warn('DEPRECATED: Direct event publishing via publishUserCreated. Use entity-based event collection instead.');
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(userId);
    if (entity) {
      entity.addDomainEvent(EventTypes.USER_CREATED, { userId, email });
      await repo.save(entity);
    } else {
      logger.warn(`[userEvents] Entity ${userId} not found for USER_CREATED. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.USER_CREATED,
        data: { entityId: userId, entityType: 'User', userId, email },
        metadata: { timestamp: new Date().toISOString() }
      });
    }
    logger.debug('Published user created event', { userId, email });
  } catch (error) {
    logger.error('Error publishing user created event', { error: error.message, userId, email });
  }
}

/**
 * Publish an event when a user is updated
 * @param {DIContainer} container - The DI container instance.
 * @param {string} userId - ID of the user
 * @param {Object} changes - Changes made to the user
 * @returns {Promise<void>}
 * @deprecated Use User entity's addDomainEvent method and let repository handle publishing
 */
async function publishUserUpdated(container, userId, changes) {
  logger.warn('DEPRECATED: Direct event publishing via publishUserUpdated. Use entity-based event collection instead.');
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(userId);
    if (entity) {
      entity.addDomainEvent(EventTypes.USER_UPDATED, { userId, changes });
      await repo.save(entity);
    } else {
        logger.warn(`[userEvents] Entity ${userId} not found for USER_UPDATED. Direct publish.`);
        await eventBus.publish({
            type: EventTypes.USER_UPDATED,
            data: { entityId: userId, entityType: 'User', userId, changes },
            metadata: { timestamp: new Date().toISOString() }
        });
    }
    logger.debug('Published user updated event', { userId });
  } catch (error) {
    logger.error('Error publishing user updated event', { error: error.message, userId });
  }
}

/**
 * Publish an event when a user profile is completed
 * @param {DIContainer} container - The DI container instance.
 * @param {string} userId - ID of the user
 * @param {string} email - Email of the user
 * @returns {Promise<void>}
 * @deprecated Use User entity's addDomainEvent method and let repository handle publishing
 */
async function publishUserProfileCompleted(container, userId, email) {
  logger.warn('DEPRECATED: Direct event publishing via publishUserProfileCompleted. Use entity-based event collection instead.');
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(userId);
    if (entity) {
      entity.addDomainEvent(EventTypes.USER_PROFILE_COMPLETED, { userId, email });
      await repo.save(entity);
    } else {
        logger.warn(`[userEvents] Entity ${userId} not found for USER_PROFILE_COMPLETED. Direct publish.`);
        await eventBus.publish({
            type: EventTypes.USER_PROFILE_COMPLETED,
            data: { entityId: userId, entityType: 'User', userId, email },
            metadata: { timestamp: new Date().toISOString() }
        });
    }
    logger.debug('Published user profile completed event', { userId, email });
  } catch (error) {
    logger.error('Error publishing user profile completed event', { error: error.message, userId, email });
  }
}

/**
 * Set up user event subscriptions
 * @param {DIContainer} container - The DI container instance.
 */
export function registerUserEventHandlers(container) {
    if (!container) {
        throw new Error('Container is required to register user event handlers');
    }

    const eventBus = container.get('eventBus');
    if (!eventBus) {
        throw new Error('EventBus not found in container');
    }

    // Register event handlers here...
    // Example:
    eventBus.on(EventTypes.USER_CREATED, async (event) => {
        try {
            const repo = getRepo(container);
            // Handle user created event...
            logger.info('User created event handled', { eventId: event.id });
        } catch (error) {
            logger.error('Error handling user created event', { error: error.message });
        }
    });

    // Add more event handlers as needed...
}

export default {
  publishUserCreated,
  publishUserUpdated,
  publishUserProfileCompleted,
  registerUserEventHandlers
};