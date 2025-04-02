import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { logger } from "#app/core/infra/logging/logger.js";

/**
 * Challenge Domain Events
 *
 * Events that occur within the Challenge domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */

/**
 * Get the ChallengeRepository instance from the container.
 * @param {DIContainer} container - The DI container instance.
 * @returns {ChallengeRepository}
 */
function getRepo(container) {
    if (!container) {
        logger.error('[challengeEvents] Container not provided to getRepo!');
        throw new Error('DI container is required to get ChallengeRepository');
    }
    try {
        return container.get('challengeRepository');
    } catch (error) {
        logger.error('[challengeEvents] Failed to get ChallengeRepository from container', { error: error.message });
        throw error;
    }
}

/**
 * Publish an event when a challenge is created
 * @param {DIContainer} container - The DI container instance.
 * @param {string} challengeId - ID of the challenge
 * @param {string} userEmail - Email of the user who created the challenge
 * @param {string} focusArea - Focus area of the challenge
 * @returns {Promise<void>}
 */
async function publishChallengeCreated(container, challengeId, userEmail, focusArea) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(challengeId);
    if (entity) {
      entity.addDomainEvent(EventTypes.CHALLENGE_CREATED, {
        challengeId,
        userEmail,
        focusArea
      });
      
      await repo.save(entity);
    } else {
      logger.warn(`[challengeEvents] Entity ${challengeId} not found for CHALLENGE_CREATED. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.CHALLENGE_CREATED,
        data: { entityId: challengeId, entityType: 'Challenge', userEmail, focusArea },
        metadata: { timestamp: new Date().toISOString() }
      });
    }
    
    logger.debug('Published challenge created event', {
      challengeId,
      userEmail
    });
  } catch (error) {
    logger.error('Error publishing challenge created event', {
      error: error.message,
      challengeId,
      userEmail
    });
  }
}

/**
 * Publish an event when a challenge is updated
 * @param {DIContainer} container - The DI container instance.
 * @param {string} challengeId - ID of the challenge
 * @param {string} userEmail - Email of the user who updated the challenge
 * @param {Object} changes - Changes made to the challenge
 * @returns {Promise<void>}
 */
async function publishChallengeUpdated(container, challengeId, userEmail, changes) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(challengeId);
    if (entity) {
      entity.addDomainEvent(EventTypes.CHALLENGE_UPDATED, {
        challengeId,
        userEmail,
        changes
      });
      
      await repo.save(entity);
    } else {
      logger.warn(`[challengeEvents] Entity ${challengeId} not found for CHALLENGE_UPDATED. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.CHALLENGE_UPDATED,
        data: { entityId: challengeId, entityType: 'Challenge', userEmail, changes },
        metadata: { timestamp: new Date().toISOString() }
      });
    }
    
    logger.debug('Published challenge updated event', {
      challengeId,
      userEmail
    });
  } catch (error) {
    logger.error('Error publishing challenge updated event', {
      error: error.message,
      challengeId,
      userEmail
    });
  }
}

/**
 * Publish an event when a challenge response is submitted
 * @param {DIContainer} container - The DI container instance.
 * @param {string} challengeId - ID of the challenge
 * @param {string} userEmail - Email of the user who submitted the response
 * @param {Object} response - The challenge response
 * @returns {Promise<void>}
 */
async function publishChallengeResponseSubmitted(container, challengeId, userEmail, response) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(challengeId);
    if (entity) {
      entity.addDomainEvent(EventTypes.CHALLENGE_RESPONSE_SUBMITTED, {
        challengeId,
        userEmail,
        response
      });
      
      await repo.save(entity);
    } else {
      logger.warn(`[challengeEvents] Entity ${challengeId} not found for CHALLENGE_RESPONSE_SUBMITTED. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.CHALLENGE_RESPONSE_SUBMITTED,
        data: { entityId: challengeId, entityType: 'Challenge', userEmail, response },
        metadata: { timestamp: new Date().toISOString() }
      });
    }
    
    logger.debug('Published challenge response submitted event', {
      challengeId,
      userEmail
    });
  } catch (error) {
    logger.error('Error publishing challenge response submitted event', {
      error: error.message,
      challengeId,
      userEmail
    });
  }
}

/**
 * Publish an event when a challenge is evaluated
 * @param {DIContainer} container - The DI container instance.
 * @param {string} challengeId - ID of the challenge
 * @param {string} userEmail - Email of the user
 * @param {Object} evaluation - Challenge evaluation result
 * @returns {Promise<void>}
 */
async function publishChallengeEvaluated(container, challengeId, userEmail, evaluation) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(challengeId);
    if (entity) {
      entity.addDomainEvent(EventTypes.CHALLENGE_EVALUATED, {
        challengeId,
        userEmail,
        evaluation
      });
      
      await repo.save(entity);
    } else {
      logger.warn(`[challengeEvents] Entity ${challengeId} not found for CHALLENGE_EVALUATED. Direct publish.`);
      await eventBus.publish({
        type: EventTypes.CHALLENGE_EVALUATED,
        data: { entityId: challengeId, entityType: 'Challenge', userEmail, evaluation },
        metadata: { timestamp: new Date().toISOString() }
      });
    }
    
    logger.debug('Published challenge evaluated event', {
      challengeId,
      userEmail
    });
  } catch (error) {
    logger.error('Error publishing challenge evaluated event', {
      error: error.message,
      challengeId,
      userEmail
    });
  }
}

/**
 * Set up challenge event subscriptions
 * @param {DIContainer} container - The DI container instance.
 */
export function registerChallengeEventHandlers(container) {
    if (!container) {
        throw new Error('Container is required to register challenge event handlers');
    }

    const eventBus = container.get('eventBus');
    if (!eventBus) {
        throw new Error('EventBus not found in container');
    }

    // Register event handlers here...
    // Example:
    eventBus.on(EventTypes.CHALLENGE_CREATED, async (event) => {
        try {
            const repo = getRepo(container);
            // Handle challenge created event...
            logger.info('Challenge created event handled', { eventId: event.id });
        } catch (error) {
            logger.error('Error handling challenge created event', { error: error.message });
        }
    });

    // Add more event handlers as needed...
}

export default {
  publishChallengeCreated,
  publishChallengeUpdated,
  publishChallengeResponseSubmitted,
  publishChallengeEvaluated,
  registerChallengeEventHandlers
};