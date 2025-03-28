/**
 * User Domain Events
 * 
 * Events that occur within the User domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */
const { EventTypes, eventBus } = require('../../common/events/domainEvents');
const { logger } = require('../../../core/infra/logging/logger');

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
    logger.debug('Published user created event', { userId, email });
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
    logger.debug('Published user updated event', { userId });
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
    logger.debug('Published user profile completed event', { userId, email });
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
  // When personality insights are generated, update user profile
  eventBus.subscribe(EventTypes.PERSONALITY_TRAIT_IDENTIFIED, async (event) => {
    logger.debug('Handling personality trait identified event', { 
      userId: event.payload.userId 
    });
    
    // In a real implementation, we would update the user profile with the new traits
    logger.info('User profile would be updated with personality traits', { 
      userId: event.payload.userId
    });
  });
  
  // When focus area is set, update user profile
  eventBus.subscribe(EventTypes.USER_FOCUS_AREA_SET, async (event) => {
    logger.debug('Handling user focus area set event', { 
      userId: event.payload.userId,
      focusArea: event.payload.focusArea 
    });
    
    // In a real implementation, we would update the user profile with the new focus area
    logger.info('User profile would be updated with focus area', { 
      userId: event.payload.userId,
      focusArea: event.payload.focusArea
    });
  });
}

module.exports = {
  publishUserCreated,
  publishUserUpdated,
  publishUserProfileCompleted,
  registerUserEventHandlers
}; 