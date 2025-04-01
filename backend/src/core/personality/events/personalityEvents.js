'use strict';

import domainEvents from "#app/core/common/events/domainEvents.js";
import { logger } from "#app/core/infra/logging/logger.js";
import { PersonalityRepository } from "#app/core/personality/repositories/PersonalityRepository.js";

/**
 * Personality Domain Events
 *
 * Events that occur within the Personality domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */

const {
  EventTypes,
  eventBus,
  DomainEvent
} = domainEvents;

// Create repository instance
const personalityRepository = new PersonalityRepository();

/**
 * Publish an event when a personality trait is identified
 * @param {string} userEmail - Email of the user
 * @param {string} traitName - Name of the trait
 * @param {number} traitScore - Score for the trait (0-1)
 * @param {string} source - Source of the trait identification (e.g., evaluation, assessment)
 * @returns {Promise<void>}
 */
async function publishTraitIdentified(userEmail, traitName, traitScore, source, personalityId) {
  try {
    // Get entity to add domain event
    const entity = await personalityRepository.findById(personalityId);
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(EventTypes.PERSONALITY_TRAIT_IDENTIFIED, {
        userEmail,
        trait: {
          name: traitName,
          score: traitScore
        },
        source
      });
      
      // Save entity which will publish the event
      await personalityRepository.save(entity);
    } else {
      // Fallback to direct event publishing if entity not found
      console.warn(`Entity with ID ${personalityId} not found for event PERSONALITY_TRAIT_IDENTIFIED. Using direct event publishing.`);
      await eventBus.publishEvent(EventTypes.PERSONALITY_TRAIT_IDENTIFIED, {
        userEmail,
        trait: {
          name: traitName,
          score: traitScore
        },
        source
      });
    }
    
    logger.debug('Published personality trait identified event', {
      userEmail,
      traitName
    });
  } catch (error) {
    logger.error('Error publishing personality trait identified event', {
      error: error.message,
      userEmail,
      traitName
    });
  }
}

/**
 * Publish an event when a personality profile is updated
 * @param {string} userEmail - Email of the user
 * @param {Object} profile - Updated personality profile
 * @returns {Promise<void>}
 */
async function publishProfileUpdated(userEmail, profile, personalityId) {
  try {
    // Get entity to add domain event
    const entity = await personalityRepository.findById(personalityId);
    if (entity) {
      // Add domain event to entity
      entity.addDomainEvent(EventTypes.PERSONALITY_PROFILE_UPDATED, {
        userEmail,
        profile: {
          dominantTraits: profile.dominantTraits || [],
          traitScores: profile.traitScores || {}
        }
      });
      
      // Save entity which will publish the event
      await personalityRepository.save(entity);
    } else {
      // Fallback to direct event publishing if entity not found
      console.warn(`Entity with ID ${personalityId} not found for event PERSONALITY_PROFILE_UPDATED. Using direct event publishing.`);
      await eventBus.publishEvent(EventTypes.PERSONALITY_PROFILE_UPDATED, {
        userEmail,
        profile: {
          dominantTraits: profile.dominantTraits || [],
          traitScores: profile.traitScores || {}
        }
      });
    }
    
    logger.debug('Published personality profile updated event', {
      userEmail
    });
  } catch (error) {
    logger.error('Error publishing personality profile updated event', {
      error: error.message,
      userEmail
    });
  }
}

/**
 * Set up personality event subscriptions
 */
async function registerPersonalityEventHandlers() {
  // Subscribe to evaluation completed events to extract personality traits
  eventBus.subscribe(EventTypes.EVALUATION_COMPLETED, async event => {
    logger.debug('Handling evaluation completed event for personality analysis', {
      evaluationId: event.payload.evaluationId
    });
    // Extract traits from evaluation result if available
    const traits = event.payload.result.traits;
    if (traits && Object.keys(traits).length > 0) {
      logger.info('Processing personality traits from evaluation', {
        userEmail: event.payload.userEmail,
        traitCount: Object.keys(traits).length
      });
      // In a real implementation, we would update the user's personality profile here
      // For now, we just log the traits
      for (const [traitName, traitScore] of Object.entries(traits)) {
        logger.debug('Identified trait from evaluation', {
          userEmail: event.payload.userEmail,
          traitName,
          traitScore
        });
      }
    }
  });
}

export { publishTraitIdentified };
export { publishProfileUpdated };
export { registerPersonalityEventHandlers };

export default {
  publishTraitIdentified,
  publishProfileUpdated,
  registerPersonalityEventHandlers
};