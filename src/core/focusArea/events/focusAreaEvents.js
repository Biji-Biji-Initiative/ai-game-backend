/**
 * Focus Area Domain Events
 * 
 * Events that occur within the Focus Area domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */
const { EventTypes, eventBus } = require('../../common/events/domainEvents');
const { logger } = require('../../../core/infra/logging/logger');

/**
 * Publish an event when a focus area is created
 * @param {string} focusAreaId - ID of the focus area
 * @param {string} name - Name of the focus area
 * @returns {Promise<void>}
 */
async function publishFocusAreaCreated(focusAreaId, name) {
  try {
    await eventBus.publishEvent(EventTypes.FOCUS_AREA_CREATED, {
      focusAreaId,
      name
    });
    logger.debug('Published focus area created event', { focusAreaId, name });
  } catch (error) {
    logger.error('Error publishing focus area created event', { 
      error: error.message,
      focusAreaId,
      name
    });
  }
}

/**
 * Publish an event when a focus area is updated
 * @param {string} focusAreaId - ID of the focus area
 * @param {Object} changes - Changes made to the focus area
 * @returns {Promise<void>}
 */
async function publishFocusAreaUpdated(focusAreaId, changes) {
  try {
    await eventBus.publishEvent(EventTypes.FOCUS_AREA_UPDATED, {
      focusAreaId,
      changes
    });
    logger.debug('Published focus area updated event', { focusAreaId });
  } catch (error) {
    logger.error('Error publishing focus area updated event', { 
      error: error.message,
      focusAreaId
    });
  }
}

/**
 * Publish an event when a user's focus area is set
 * @param {string} userId - ID of the user
 * @param {string} focusArea - Focus area name
 * @returns {Promise<void>}
 */
async function publishUserFocusAreaSet(userId, focusArea) {
  try {
    await eventBus.publishEvent(EventTypes.USER_FOCUS_AREA_SET, {
      userId,
      focusArea
    });
    logger.debug('Published user focus area set event', { userId, focusArea });
  } catch (error) {
    logger.error('Error publishing user focus area set event', { 
      error: error.message,
      userId,
      focusArea
    });
  }
}

/**
 * Set up focus area event subscriptions
 */
function registerFocusAreaEventHandlers() {
  // When a user is created, suggest initial focus areas
  eventBus.subscribe(EventTypes.USER_CREATED, async (event) => {
    logger.debug('Handling user created event', { 
      userId: event.payload.userId 
    });
    
    // In a real implementation, we would suggest initial focus areas
    logger.info('Initial focus areas would be suggested for new user', { 
      userId: event.payload.userId
    });
  });
  
  // When personality traits are updated, adjust focus area recommendations
  eventBus.subscribe(EventTypes.PERSONALITY_PROFILE_UPDATED, async (event) => {
    logger.debug('Handling personality profile updated event', { 
      userId: event.payload.userId 
    });
    
    // In a real implementation, we would adjust focus area recommendations
    logger.info('Focus area recommendations would be adjusted based on personality', { 
      userId: event.payload.userId
    });
  });
  
  // When multiple challenges are completed, adjust focus area recommendations
  eventBus.subscribe(EventTypes.ACHIEVEMENT_UNLOCKED, async (event) => {
    logger.debug('Handling achievement unlocked event', { 
      userId: event.payload.userId,
      achievement: event.payload.achievement
    });
    
    // In a real implementation, we would update focus area recommendations
    logger.info('Focus area recommendations would be adjusted based on achievements', { 
      userId: event.payload.userId
    });
  });
}

module.exports = {
  publishFocusAreaCreated,
  publishFocusAreaUpdated,
  publishUserFocusAreaSet,
  registerFocusAreaEventHandlers
}; 