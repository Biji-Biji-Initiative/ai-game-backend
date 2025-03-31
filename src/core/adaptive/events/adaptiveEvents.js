import domainEvents from "../../common/events/domainEvents.js";
import { logger } from "../../infra/logging/logger.js";

import { AdaptiveRepository } from '../repositories/adaptiveRepository.js';'use strict';

import { AdaptiveRepository } from '../repositories/adaptiveRepository.js';/**
 * Adaptive Domain Events
 *
 * Events that occur within the Adaptive domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */
const {
  EventTypes,
  eventBus,
  DomainEvent
} = domainEvents;
/**
 * Publish an event when an adaptive recommendation is generated
 * @param {string} userEmail - Email of the user
 * @param {Array} recommendations - Array of recommendations
 * @param {string} source - Source of the recommendations (e.g., performance, traits)
 * @returns {Promise<void>}
 */
async function publishRecommendationGenerated(userEmail, recommendations, source) {
  try {
    
  // Get entity to add domain event
  const entity = await adaptiveRepository.findById(adaptiveId);
  if (entity) {
    // Add domain event to entity
    entity.addDomainEvent(EventTypes.ADAPTIVE_RECOMMENDATION_GENERATED, {
      userEmail,
      recommendations,
      source
    });
    
    // Save entity which will publish the event
    await adaptiveRepository.save(entity);
  } else {
    // Fallback to direct event publishing if entity not found
    console.warn(`Entity with ID ${adaptiveId} not found for event ADAPTIVE_RECOMMENDATION_GENERATED. Using direct event publishing.`);
    
  // Get entity to add domain event
  const entity = await adaptiveRepository.findById(adaptiveId);
  if (entity) {
    // Add domain event to entity
    entity.addDomainEvent(EventTypes.ADAPTIVE_RECOMMENDATION_GENERATED, {
      userEmail,
      recommendations,
      source
    });
    
    // Save entity which will publish the event
    await adaptiveRepository.save(entity);
  } else {
    // Fallback to direct event publishing if entity not found
    console.warn(`Entity with ID ${adaptiveId} not found for event ADAPTIVE_RECOMMENDATION_GENERATED. Using direct event publishing.`);
    await eventBus.publishEvent(EventTypes.ADAPTIVE_RECOMMENDATION_GENERATED, {
      userEmail,
      recommendations,
      source
    });
  }
  }
    logger.debug('Published adaptive recommendation generated event', {
      userEmail,
      recommendationCount: recommendations.length
    });
  } catch (error) {
    logger.error('Error publishing adaptive recommendation generated event', {
      error: error.message,
      userEmail
    });
  }
}
/**
 * Set up adaptive event subscriptions
 */
async function registerAdaptiveEventHandlers() {
  // Subscribe to personality profile updated events
  eventBus.subscribe(EventTypes.PERSONALITY_PROFILE_UPDATED, async event => {
    logger.debug('Handling personality profile updated event for adaptive recommendations', {
      userEmail: event.payload.userEmail
    });
    // In a real implementation, we would generate personalized recommendations based on the profile
    // For now, we just log the event
    const userId = event.payload.userId;
    const updateType = event.payload.updateType;
    // Handle different update types safely
    if (updateType === 'traits' && event.payload.traits) {
      logger.info('Would generate adaptive recommendations based on personality traits', {
        userId,
        traits: event.payload.traits
      });
    } else if (updateType === 'attitudes' && event.payload.aiAttitudes) {
      logger.info('Would generate adaptive recommendations based on AI attitudes', {
        userId,
        aiAttitudes: event.payload.aiAttitudes
      });
    } else if (updateType === 'insights' && event.payload.insights) {
      logger.info('Would generate adaptive recommendations based on personality insights', {
        userId,
        hasInsights: !!event.payload.insights
      });
    } else {
      logger.info('Received personality update with unknown or incomplete data', {
        userId,
        updateType
      });
    }
  });
  // Subscribe to progress updated events
  eventBus.subscribe(EventTypes.PROGRESS_UPDATED, async event => {
    logger.debug('Handling progress updated event for adaptive recommendations', {
      userEmail: event.payload.userEmail
    });
    // In a real implementation, we would adjust recommendations based on progress
    // For now, we just log the event
    logger.info('Would adjust adaptive recommendations based on progress', {
      userEmail: event.payload.userEmail,
      area: event.payload.area,
      value: event.payload.value
    });
  });
  // Subscribe to achievement unlocked events
  eventBus.subscribe(EventTypes.ACHIEVEMENT_UNLOCKED, async event => {
    logger.debug('Handling achievement unlocked event for adaptive recommendations', {
      userEmail: event.payload.userEmail
    });
    // In a real implementation, we might generate new challenges based on achievements
    // For now, we just log the event
    logger.info('Would generate new challenge recommendations based on achievement', {
      userEmail: event.payload.userEmail,
      achievementName: event.payload.achievement.name
    });
  });
}
export { publishRecommendationGenerated };
export { registerAdaptiveEventHandlers };
export default {
  publishRecommendationGenerated,
  registerAdaptiveEventHandlers
};