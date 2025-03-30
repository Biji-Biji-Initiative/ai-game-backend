import domainEvents from "../../common/events/domainEvents.js";
import { logger } from "../../infra/logging/logger.js";
'use strict';
/**
 * User Domain Events
 *
 * Events that occur within the User domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */
const {
  EventTypes,
  eventBus
} = domainEvents;
/**
 * Publish an event when a user is created
 * @param {string} userId - ID of the user
 * @param {string} email - Email of the user
 * @returns {Promise<void>}
 */
async function publishUserCreated(userId, email) {
  try {
    await eventBus.publishEvent(EventTypes.USER_CREATED, {
      userId,
      email
    });
    logger.debug('Published user created event', {
      userId,
      email
    });
  } catch (error) {
    logger.error('Error publishing user created event', {
      error: error.message,
      userId,
      email
    });
  }
}
/**
 * Publish an event when a user is updated
 * @param {string} userId - ID of the user
 * @param {Object} changes - Changes made to the user
 * @returns {Promise<void>}
 */
async function publishUserUpdated(userId, changes) {
  try {
    await eventBus.publishEvent(EventTypes.USER_UPDATED, {
      userId,
      changes
    });
    logger.debug('Published user updated event', {
      userId
    });
  } catch (error) {
    logger.error('Error publishing user updated event', {
      error: error.message,
      userId
    });
  }
}
/**
 * Publish an event when a user profile is completed
 * @param {string} userId - ID of the user
 * @param {string} email - Email of the user
 * @returns {Promise<void>}
 */
async function publishUserProfileCompleted(userId, email) {
  try {
    await eventBus.publishEvent(EventTypes.USER_PROFILE_COMPLETED, {
      userId,
      email
    });
    logger.debug('Published user profile completed event', {
      userId,
      email
    });
  } catch (error) {
    logger.error('Error publishing user profile completed event', {
      error: error.message,
      userId,
      email
    });
  }
}
/**
 * Set up user event subscriptions
 */
function registerUserEventHandlers() {
  // Skip if event bus is not available or we're in development mode
  if (!eventBus || typeof eventBus.subscribe !== 'function' || process.env.NODE_ENV === 'development') {
    logger.debug('Skipping user event handler registration (dev mode or unavailable event bus)');
    return;
  }

  // When personality insights are generated, update user profile
  eventBus.subscribe(EventTypes.PERSONALITY_TRAIT_IDENTIFIED, async event => {
    try {
      logger.debug('Handling personality trait identified event', {
        userId: event.payload.userId
      });
      // In a real implementation, we would update the user profile with the new traits
      logger.info('User profile would be updated with personality traits', {
        userId: event.payload.userId
      });
    } catch (error) {
      logger.error('Error handling personality trait identified event', {
        error: error.message,
        userId: event.payload?.userId
      });
    }
  });
  // When focus area is set, update user profile
  eventBus.subscribe(EventTypes.USER_FOCUS_AREA_SET, async event => {
    try {
      logger.debug('Handling user focus area set event', {
        userId: event.payload.userId,
        focusArea: event.payload.focusArea
      });
      // In a real implementation, we would update the user profile with the new focus area
      logger.info('User profile would be updated with focus area', {
        userId: event.payload.userId,
        focusArea: event.payload.focusArea
      });
    } catch (error) {
      logger.error('Error handling user focus area set event', {
        error: error.message,
        userId: event.payload?.userId,
        focusArea: event.payload?.focusArea
      });
    }
  });
}
export { publishUserCreated };
export { publishUserUpdated };
export { publishUserProfileCompleted };
export { registerUserEventHandlers };
export default {
  publishUserCreated,
  publishUserUpdated,
  publishUserProfileCompleted,
  registerUserEventHandlers
};