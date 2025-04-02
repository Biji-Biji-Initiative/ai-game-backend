'use strict';

import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { logger } from "#app/core/infra/logging/logger.js";
import { UserJourneyRepository } from "#app/core/userJourney/repositories/UserJourneyRepository.js";

/**
 * User Journey Domain Events
 *
 * Events that occur within the User Journey domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */

/**
 * Get the UserJourneyRepository instance from the container.
 * @param {DIContainer} container - The DI container instance.
 * @returns {UserJourneyRepository}
 */
function getRepo(container) {
    if (!container) {
        logger.error('[userJourneyEvents] Container not provided to getRepo!');
        throw new Error('DI container is required to get UserJourneyRepository');
    }
    try {
        return container.get('userJourneyRepository');
    } catch (error) {
        logger.error('[userJourneyEvents] Failed to get UserJourneyRepository from container', { error: error.message });
        throw error;
    }
}

/**
 * Publish an event when a user journey event is recorded
 * @param {string} userId - ID of the user
 * @param {string} eventType - Type of journey event
 * @param {Object} eventData - Event data
 * @param {DIContainer} container - The DI container instance
 * @returns {Promise<void>}
 */
async function publishUserJourneyEventRecorded(userId, eventType, eventData, container) {
  try {
    if (!container) {
      throw new Error('Container is required to publish user journey events');
    }
    
    const userJourneyRepository = getRepo(container);
    const eventBus = container.get('eventBus');
    
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
 * @param {DIContainer} container - The DI container instance
 * @returns {Promise<void>}
 */
async function publishUserMilestoneReached(userId, milestone, milestoneData = {}, container) {
  try {
    if (!container) {
      throw new Error('Container is required to publish user journey events');
    }
    
    const userJourneyRepository = getRepo(container);
    const eventBus = container.get('eventBus');
    
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

// Export event registration function
export function registerUserJourneyEventHandlers(container) {
    if (!container) {
        throw new Error('Container is required to register user journey event handlers');
    }

    const eventBus = container.get('eventBus');
    if (!eventBus) {
        throw new Error('EventBus not found in container');
    }

    // Register event handlers here...
    // Example:
    eventBus.on(EventTypes.USER_JOURNEY_EVENT_RECORDED, async (event) => {
        try {
            const repo = getRepo(container);
            // Handle user journey event...
            logger.info('User journey event handled', { eventId: event.id });
        } catch (error) {
            logger.error('Error handling user journey event', { error: error.message });
        }
    });

    // Add more event handlers as needed...
}

export { publishUserJourneyEventRecorded };
export { publishUserMilestoneReached };

export default {
  publishUserJourneyEventRecorded,
  publishUserMilestoneReached,
  registerUserJourneyEventHandlers
};