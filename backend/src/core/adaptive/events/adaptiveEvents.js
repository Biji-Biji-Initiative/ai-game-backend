'use strict';

import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { logger } from "#app/core/infra/logging/logger.js";
// REMOVED: Direct import of repository class is unnecessary if resolved via container later
// import { AdaptiveRepository } from '#app/core/adaptive/repositories/AdaptiveRepository.js';

/**
 * Adaptive Domain Events
 *
 * Events that occur within the Adaptive domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */

/**
 * Get the AdaptiveRepository instance from the container.
 * @param {DIContainer} container - The DI container instance.
 * @returns {AdaptiveRepository}
 */
function getRepo(container) {
    if (!container) {
        logger.error('[adaptiveEvents] Container not provided to getRepo!');
        throw new Error('DI container is required to get AdaptiveRepository');
    }
    try {
        return container.get('adaptiveRepository');
    } catch (error) {
        logger.error('[adaptiveEvents] Failed to get AdaptiveRepository from container', { error: error.message });
        throw error;
    }
}

/**
 * Publish an event when an adaptive recommendation is generated
 * @param {string} userEmail - Email of the user
 * @param {Array} recommendations - Array of recommendations
 * @param {string} source - Source of the recommendations (e.g., performance, traits)
 * @returns {Promise<void>}
 */
// REMOVED: This function's logic should be moved to the service layer
// async function publishRecommendationGenerated(userEmail, recommendations, source, adaptiveId) { ... }

/**
 * Set up adaptive event subscriptions.
 * Handlers should resolve dependencies from the container when the event occurs.
 * @param {DIContainer} container - The DI container instance.
 */
export function registerAdaptiveEventHandlers(container) {
    if (!container) {
        throw new Error('Container is required to register adaptive event handlers');
    }

    const eventBus = container.get('eventBus');
    if (!eventBus) {
        throw new Error('EventBus not found in container');
    }

    // Subscribe to personality profile updated events
    eventBus.on(EventTypes.PERSONALITY_PROFILE_UPDATED, async event => {
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
    eventBus.on(EventTypes.PROGRESS_UPDATED, async event => {
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
    eventBus.on(EventTypes.ACHIEVEMENT_UNLOCKED, async event => {
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

export default {
  registerAdaptiveEventHandlers
};