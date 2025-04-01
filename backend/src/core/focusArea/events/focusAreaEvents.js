'use strict';

import domainEvents from "#app/core/common/events/domainEvents.js";
import { logger } from "#app/core/infra/logging/logger.js";
import { FocusAreaRepository } from "#app/core/focusArea/repositories/focusAreaRepository.js";

/**
 * Focus Area Domain Events
 *
 * Events that occur within the Focus Area domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */
const {
  EventTypes,
  eventBus
} = domainEvents;

// Create repository instance
const focusAreaRepository = new FocusAreaRepository();

/**
 * Publish an event when a focus area is created
 * @param {string} focusAreaId - ID of the focus area
 * @param {string} name - Name of the focus area
 * @returns {Promise<void>}
 */
async function publishFocusAreaCreated(focusAreaId, name) {
  try {
    // Get entity to add domain event
    const entity = await focusAreaRepository.findById(focusAreaId);
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(EventTypes.FOCUS_AREA_CREATED, {
        focusAreaId,
        name
      });
      
      // Save entity which will publish the event
      await focusAreaRepository.save(entity);
    } else {
      // Fallback to direct event publishing if entity not found
      console.warn(`Entity with ID ${focusAreaId} not found for event FOCUS_AREA_CREATED. Using direct event publishing.`);
      await eventBus.publishEvent(EventTypes.FOCUS_AREA_CREATED, {
        focusAreaId,
        name
      });
    }
    
    logger.debug('Published focus area created event', {
      focusAreaId,
      name
    });
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
    // Get entity to add domain event
    const entity = await focusAreaRepository.findById(focusAreaId);
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(EventTypes.FOCUS_AREA_UPDATED, {
        focusAreaId,
        changes
      });
      
      // Save entity which will publish the event
      await focusAreaRepository.save(entity);
    } else {
      // Fallback to direct event publishing if entity not found
      console.warn(`Entity with ID ${focusAreaId} not found for event FOCUS_AREA_UPDATED. Using direct event publishing.`);
      await eventBus.publishEvent(EventTypes.FOCUS_AREA_UPDATED, {
        focusAreaId,
        changes
      });
    }
    
    logger.debug('Published focus area updated event', {
      focusAreaId
    });
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
    // Get entity to add domain event
    const entity = await focusAreaRepository.findById(userId);
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(EventTypes.USER_FOCUS_AREA_SET, {
        userId,
        focusArea
      });
      
      // Save entity which will publish the event
      await focusAreaRepository.save(entity);
    } else {
      // Fallback to direct event publishing if entity not found
      console.warn(`Entity with ID ${userId} not found for event USER_FOCUS_AREA_SET. Using direct event publishing.`);
      await eventBus.publishEvent(EventTypes.USER_FOCUS_AREA_SET, {
        userId,
        focusArea
      });
    }
    
    logger.debug('Published user focus area set event', {
      userId,
      focusArea
    });
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
async function registerFocusAreaEventHandlers() {
  // When a user is created, suggest initial focus areas
  eventBus.subscribe(EventTypes.USER_CREATED, async event => {
    logger.debug('Handling user created event', {
      userId: event.payload.userId
    });
    // In a real implementation, we would suggest initial focus areas
    logger.info('Initial focus areas would be suggested for new user', {
      userId: event.payload.userId
    });
  });
  
  // When personality traits are updated, adjust focus area recommendations
  eventBus.subscribe(EventTypes.PERSONALITY_PROFILE_UPDATED, async event => {
    logger.debug('Handling personality profile updated event', {
      userId: event.payload.userId
    });
    // In a real implementation, we would adjust focus area recommendations
    logger.info('Focus area recommendations would be adjusted based on personality', {
      userId: event.payload.userId
    });
  });
  
  // When multiple challenges are completed, adjust focus area recommendations
  eventBus.subscribe(EventTypes.ACHIEVEMENT_UNLOCKED, async event => {
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

export { publishFocusAreaCreated };
export { publishFocusAreaUpdated };
export { publishUserFocusAreaSet };
export { registerFocusAreaEventHandlers };

export default {
  publishFocusAreaCreated,
  publishFocusAreaUpdated,
  publishUserFocusAreaSet,
  registerFocusAreaEventHandlers
};