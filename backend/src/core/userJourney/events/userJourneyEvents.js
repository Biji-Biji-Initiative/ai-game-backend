'use strict';

import domainEvents from "#app/core/common/events/domainEvents.js";
import { logger } from "#app/core/infra/logging/logger.js";
import { UserJourneyRepository } from "#app/core/userJourney/repositories/UserJourneyRepository.js";

/**
 * User Journey Domain Events
 *
 * Events that occur within the User Journey domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */
const {
  EventTypes,
  eventBus
} = domainEvents;

// Create repository instance
const userJourneyRepository = new UserJourneyRepository();

/**
 * Publish an event when a user journey event is recorded
 * @param {string} userId - ID of the user
 * @param {string} eventType - Type of journey event
 * @param {Object} eventData - Event data
 * @returns {Promise<void>}
 */
async function publishUserJourneyEventRecorded(userId, eventType, eventData) {
  try {
    // Get entity to add domain event
    const entity = await userJourneyRepository.findById(userId);
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(EventTypes.USER_JOURNEY_EVENT_RECORDED, {
        userId,
        eventType,
        eventData
      });
      
      // Save entity which will publish the event
      await userJourneyRepository.save(entity);
    } else {
      // Fallback to direct event publishing if entity not found
      console.warn(`Entity with ID ${userId} not found for event USER_JOURNEY_EVENT_RECORDED. Using direct event publishing.`);
      await eventBus.publishEvent(EventTypes.USER_JOURNEY_EVENT_RECORDED, {
        userId,
        eventType,
        eventData
      });
    }
    
    logger.debug('Published user journey event recorded', {
      userId,
      eventType
    });
  } catch (error) {
    logger.error('Error publishing user journey event recorded', {
      error: error.message,
      userId,
      eventType
    });
  }
}

/**
 * Publish an event when a user milestone is reached
 * @param {string} userId - ID of the user
 * @param {string} milestone - Milestone that was reached
 * @param {Object} milestoneData - Data related to the milestone
 * @returns {Promise<void>}
 */
async function publishUserMilestoneReached(userId, milestone, milestoneData = {}) {
  try {
    // Get entity to add domain event
    const entity = await userJourneyRepository.findById(userId);
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(EventTypes.USER_MILESTONE_REACHED, {
        userId,
        milestone,
        milestoneData
      });
      
      // Save entity which will publish the event
      await userJourneyRepository.save(entity);
    } else {
      // Fallback to direct event publishing if entity not found
      console.warn(`Entity with ID ${userId} not found for event USER_MILESTONE_REACHED. Using direct event publishing.`);
      await eventBus.publishEvent(EventTypes.USER_MILESTONE_REACHED, {
        userId,
        milestone,
        milestoneData
      });
    }
    
    logger.debug('Published user milestone reached event', {
      userId,
      milestone
    });
  } catch (error) {
    logger.error('Error publishing user milestone reached event', {
      error: error.message,
      userId,
      milestone
    });
  }
}

/**
 * Set up user journey event subscriptions
 */
async function registerUserJourneyEventHandlers() {
  // When challenge is completed, record a journey event
  eventBus.subscribe(EventTypes.CHALLENGE_EVALUATED, async event => {
    logger.debug('Handling challenge evaluated event', {
      challengeId: event.payload.challengeId,
      userEmail: event.payload.userEmail
    });
    // In a real implementation, we would record a journey event
    logger.info('User journey event would be recorded for challenge completion', {
      userEmail: event.payload.userEmail,
      challengeId: event.payload.challengeId
    });
    // Check if this is a milestone
    if (event.payload.evaluation && event.payload.evaluation.score > 90) {
      logger.info('User milestone would be checked for high score', {
        userEmail: event.payload.userEmail,
        score: event.payload.evaluation.score
      });
    }
  });
  
  // When user profile is completed, record a journey milestone
  eventBus.subscribe(EventTypes.USER_PROFILE_COMPLETED, async event => {
    logger.debug('Handling user profile completed event', {
      userId: event.payload.userId
    });
    // In a real implementation, we would record a journey milestone
    logger.info('User journey milestone would be recorded for profile completion', {
      userId: event.payload.userId
    });
  });
  
  // When progress is updated, check for milestones
  eventBus.subscribe(EventTypes.PROGRESS_UPDATED, async event => {
    logger.debug('Handling progress updated event', {
      userId: event.payload.userId
    });
    // In a real implementation, we would check for journey milestones
    logger.info('User journey milestones would be checked based on progress', {
      userId: event.payload.userId
    });
  });
}

export { publishUserJourneyEventRecorded };
export { publishUserMilestoneReached };
export { registerUserJourneyEventHandlers };

export default {
  publishUserJourneyEventRecorded,
  publishUserMilestoneReached,
  registerUserJourneyEventHandlers
};