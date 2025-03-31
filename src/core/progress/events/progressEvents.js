import domainEvents from "../../common/events/domainEvents.js";
import { logger } from "../../infra/logging/logger.js";

import { ProgressRepository } from '../repositories/progressRepository.js';'use strict';

import { ProgressRepository } from '../repositories/progressRepository.js';/**
 * Progress Domain Events
 *
 * Events that occur within the Progress domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */
const {
  EventTypes,
  eventBus,
  DomainEvent
} = domainEvents;
/**
 * Publish an event when a user's progress is updated
 * @param {string} userEmail - Email of the user
 * @param {string} area - Area of progress (e.g., challenge, focusArea)
 * @param {number} value - Progress value
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<void>}
 */
async function publishProgressUpdated(userEmail, area, value, metadata = {}) {
  try {
    
  // Get entity to add domain event
  const entity = await progressRepository.findById(progressId);
  if (entity) {
    // Add domain event to entity
    entity.addDomainEvent(EventTypes.PROGRESS_UPDATED, {
      userEmail,
      area,
      value,
      metadata
    });
    
    // Save entity which will publish the event
    await progressRepository.save(entity);
  } else {
    // Fallback to direct event publishing if entity not found
    console.warn(`Entity with ID ${progressId} not found for event PROGRESS_UPDATED. Using direct event publishing.`);
    
  // Get entity to add domain event
  const entity = await progressRepository.findById(progressId);
  if (entity) {
    // Add domain event to entity
    entity.addDomainEvent(EventTypes.PROGRESS_UPDATED, {
      userEmail,
      area,
      value,
      metadata
    });
    
    // Save entity which will publish the event
    await progressRepository.save(entity);
  } else {
    // Fallback to direct event publishing if entity not found
    console.warn(`Entity with ID ${progressId} not found for event PROGRESS_UPDATED. Using direct event publishing.`);
    await eventBus.publishEvent(EventTypes.PROGRESS_UPDATED, {
      userEmail,
      area,
      value,
      metadata
    });
  }
  }
    logger.debug('Published progress updated event', {
      userEmail,
      area
    });
  } catch (error) {
    logger.error('Error publishing progress updated event', {
      error: error.message,
      userEmail,
      area
    });
  }
}
/**
 * Publish an event when a user unlocks an achievement
 * @param {string} userEmail - Email of the user
 * @param {string} achievementId - ID of the achievement
 * @param {string} achievementName - Name of the achievement
 * @param {string} description - Description of the achievement
 * @returns {Promise<void>}
 */
async function publishAchievementUnlocked(userEmail, achievementId, achievementName, description) {
  try {
    
  // Get entity to add domain event
  const entity = await progressRepository.findById(progressId);
  if (entity) {
    // Add domain event to entity
    entity.addDomainEvent(EventTypes.ACHIEVEMENT_UNLOCKED, {
      userEmail,
      achievement: {
        id: achievementId,
        name: achievementName,
        description
      }
    });
    
    // Save entity which will publish the event
    await progressRepository.save(entity);
  } else {
    // Fallback to direct event publishing if entity not found
    console.warn(`Entity with ID ${progressId} not found for event ACHIEVEMENT_UNLOCKED. Using direct event publishing.`);
    
  // Get entity to add domain event
  const entity = await progressRepository.findById(progressId);
  if (entity) {
    // Add domain event to entity
    entity.addDomainEvent(EventTypes.ACHIEVEMENT_UNLOCKED, {
      userEmail,
      achievement: {
        id: achievementId,
        name: achievementName,
        description
      }
    });
    
    // Save entity which will publish the event
    await progressRepository.save(entity);
  } else {
    // Fallback to direct event publishing if entity not found
    console.warn(`Entity with ID ${progressId} not found for event ACHIEVEMENT_UNLOCKED. Using direct event publishing.`);
    await eventBus.publishEvent(EventTypes.ACHIEVEMENT_UNLOCKED, {
      userEmail,
      achievement: {
        id: achievementId,
        name: achievementName,
        description
      }
    });
  }
  }
    logger.debug('Published achievement unlocked event', {
      userEmail,
      achievementId
    });
  } catch (error) {
    logger.error('Error publishing achievement unlocked event', {
      error: error.message,
      userEmail,
      achievementId
    });
  }
}
/**
 * Set up progress event subscriptions
 */
async function registerProgressEventHandlers() {
  // Subscribe to evaluation completed events to update progress
  eventBus.subscribe(EventTypes.EVALUATION_COMPLETED, async event => {
    logger.debug('Handling evaluation completed event for progress tracking', {
      evaluationId: event.payload.evaluationId
    });
    const {
      userEmail,
      result
    } = event.payload;
    const score = result.score;
    if (typeof score === 'number') {
      logger.info('Updating progress based on evaluation score', {
        userEmail,
        score
      });
      // In a real implementation, we would update the user's progress here
      // For now, we just log the progress update
      logger.debug('Progress would be updated', {
        userEmail,
        area: 'challenge-completion',
        value: score
      });
      // If score is high, we might also trigger an achievement
      if (score >= 90) {
        logger.debug('Achievement would be unlocked', {
          userEmail,
          achievementName: 'High Scorer',
          description: 'Achieved a score of 90 or higher on a challenge'
        });
      }
    }
  });
  // Subscribe to user journey events to update progress
  eventBus.subscribe(EventTypes.USER_JOURNEY_EVENT_RECORDED, async event => {
    logger.debug('Handling user journey event for progress tracking', {
      eventType: event.payload.eventType
    });
    // In a real implementation, we would analyze the event to determine if progress should be updated
    // For now, we just log the event
    logger.debug('User journey event might affect progress', {
      userEmail: event.payload.userEmail,
      eventType: event.payload.eventType
    });
  });
}
export { publishProgressUpdated };
export { publishAchievementUnlocked };
export { registerProgressEventHandlers };
export default {
  publishProgressUpdated,
  publishAchievementUnlocked,
  registerProgressEventHandlers
};