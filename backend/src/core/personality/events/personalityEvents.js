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

export default {
  // publishTraitIdentified,
  // publishProfileUpdated,
  registerPersonalityEventHandlers
};