'use strict';

import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { logger } from "#app/core/infra/logging/logger.js";
// REMOVED: Direct import
// import { PersonalityRepository } from "#app/core/personality/repositories/PersonalityRepository.js";

/**
 * Personality Domain Events
 *
 * Events that occur within the Personality domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */

// REMOVED: Top-level instantiation
// const personalityRepository = new PersonalityRepository();

/**
 * Get the PersonalityRepository instance from the container.
 * @param {DIContainer} container - The DI container instance.
 * @returns {PersonalityRepository}
 */
function getRepo(container) {
    if (!container) {
        logger.error('[personalityEvents] Container not provided to getRepo!');
        throw new Error('DI container is required to get PersonalityRepository');
    }
    try {
        // Assuming it's registered as 'personalityRepository'
        return container.get('personalityRepository');
    } catch (error) {
        logger.error('[personalityEvents] Failed to get PersonalityRepository from container', { error: error.message });
        throw error;
    }
}

/**
 * Publish an event when a personality trait is identified
 * @param {DIContainer} container - The DI container instance.
 * @param {string} userEmail - Email of the user
 * @param {string} traitName - Name of the trait
 * @param {number} traitScore - Score for the trait (0-1)
 * @param {string} source - Source of the trait identification (e.g., evaluation, assessment)
 * @returns {Promise<void>}
 */
async function publishTraitIdentified(container, userEmail, traitName, traitScore, source, personalityId) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(personalityId);
    if (entity) {
      entity.addDomainEvent(EventTypes.PERSONALITY_TRAIT_IDENTIFIED, {
        userEmail,
        trait: {
          name: traitName,
          score: traitScore
        },
        source
      });
      
      await repo.save(entity);
    } else {
      logger.warn(`[personalityEvents] Entity ${personalityId} not found for PERSONALITY_TRAIT_IDENTIFIED. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.PERSONALITY_TRAIT_IDENTIFIED,
        data: { entityId: personalityId, entityType: 'Personality', userEmail, trait: { name: traitName, score: traitScore }, source },
        metadata: { timestamp: new Date().toISOString() }
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
 * @param {DIContainer} container - The DI container instance.
 * @param {string} userEmail - Email of the user
 * @param {Object} profile - Updated personality profile
 * @returns {Promise<void>}
 */
async function publishProfileUpdated(container, userEmail, profile, personalityId) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(personalityId);
    if (entity) {
      entity.addDomainEvent(EventTypes.PERSONALITY_PROFILE_UPDATED, {
        userEmail,
        profile: {
          dominantTraits: profile.dominantTraits || [],
          traitScores: profile.traitScores || {}
        }
      });
      
      await repo.save(entity);
    } else {
      logger.warn(`[personalityEvents] Entity ${personalityId} not found for PERSONALITY_PROFILE_UPDATED. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.PERSONALITY_PROFILE_UPDATED,
        data: { entityId: personalityId, entityType: 'Personality', userEmail, profile: { /* ... profile data ... */ } },
        metadata: { timestamp: new Date().toISOString() }
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
 * @param {DIContainer} container - The DI container instance.
 */
export function registerPersonalityEventHandlers(container) {
    if (!container) {
        throw new Error('Container is required to register personality event handlers');
    }

    const eventBus = container.get('eventBus');
    if (!eventBus) {
        throw new Error('EventBus not found in container');
    }

    // Register event handlers here...
    // Example:
    eventBus.on(EventTypes.PERSONALITY_TRAIT_IDENTIFIED, async (event) => {
        try {
            const repo = getRepo(container);
            // Handle personality trait identified event...
            logger.info('Personality trait identified event handled', { eventId: event.id });
        } catch (error) {
            logger.error('Error handling personality trait identified event', { error: error.message });
        }
    });

    // Add more event handlers as needed...
}

export { publishTraitIdentified };
export { publishProfileUpdated };

export default {
  publishTraitIdentified,
  publishProfileUpdated,
  registerPersonalityEventHandlers
};