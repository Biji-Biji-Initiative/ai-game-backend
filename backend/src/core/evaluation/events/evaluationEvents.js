'use strict';

import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { logger } from "#app/core/infra/logging/logger.js";
// REMOVED: Do not import the class directly if we resolve via container
// import { EvaluationRepository } from '#app/core/evaluation/repositories/evaluationRepository.js';

/**
 * Evaluation Domain Events
 *
 * Events that occur within the Evaluation domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */

// REMOVED: Top-level instantiation causing the crash
// const evaluationRepository = new EvaluationRepository();

/**
 * Get the EvaluationRepository instance from the container.
 * Encapsulates the container access.
 * @param {DIContainer} container - The DI container instance.
 * @returns {EvaluationRepository}
 */
function getRepo(container) {
    if (!container) {
        logger.error('[evaluationEvents] Container not provided to getRepo!');
        throw new Error('DI container is required to get EvaluationRepository');
    }
    try {
        return container.get('evaluationRepository');
    } catch (error) {
        logger.error('[evaluationEvents] Failed to get EvaluationRepository from container', { error: error.message });
        throw error;
    }
}

/**
 * Publish an event when an evaluation is started
 * @param {DIContainer} container - The DI container instance.
 * @param {string} evaluationId - ID of the evaluation
 * @param {string} challengeId - ID of the challenge being evaluated
 * @param {string} userEmail - Email of the user whose response is being evaluated
 * @returns {Promise<void>}
 */
async function publishEvaluationStarted(container, evaluationId, challengeId, userEmail) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(evaluationId);
    if (entity) {
      entity.addDomainEvent(EventTypes.EVALUATION_STARTED, {
        evaluationId,
        challengeId,
        userEmail
      });
      await repo.save(entity);
    } else {
      logger.warn(`[evaluationEvents] Entity ${evaluationId} not found for EVALUATION_STARTED. Using direct publish.`);
      await container.get('eventBus').publish({
        type: EventTypes.EVALUATION_STARTED,
        data: { entityId: evaluationId, entityType: 'Evaluation', challengeId, userEmail },
        metadata: { timestamp: new Date().toISOString() }
      }); // Use the standardized publish method
    }
    logger.debug('Published evaluation started event', { evaluationId, challengeId });
  } catch (error) {
    logger.error('Error publishing evaluation started event', { error: error.message, evaluationId, challengeId });
  }
}

/**
 * Publish an event when an evaluation is completed
 * @param {DIContainer} container - The DI container instance.
 * @param {string} evaluationId - ID of the evaluation
 * @param {string} challengeId - ID of the challenge that was evaluated
 * @param {string} userEmail - Email of the user whose response was evaluated
 * @param {Object} result - Evaluation result
 * @returns {Promise<void>}
 */
async function publishEvaluationCompleted(container, evaluationId, challengeId, userEmail, result) {
  try {
    const repo = getRepo(container);
    const entity = await repo.findById(evaluationId);
    if (entity) {
      entity.addDomainEvent(EventTypes.EVALUATION_COMPLETED, {
        evaluationId,
        challengeId,
        userEmail,
        result: {
          score: result.score,
          feedback: result.feedback,
          strengths: result.strengths || [],
          weaknesses: result.weaknesses || [],
          traits: result.traits || {}
        }
      });
      await repo.save(entity);
    } else {
      logger.warn(`[evaluationEvents] Entity ${evaluationId} not found for EVALUATION_COMPLETED. Using direct publish.`);
      await container.get('eventBus').publish({
        type: EventTypes.EVALUATION_COMPLETED,
        data: {
          entityId: evaluationId,
          entityType: 'Evaluation',
          challengeId,
          userEmail,
          result: {
            score: result.score,
            feedback: result.feedback,
            strengths: result.strengths || [],
            weaknesses: result.weaknesses || [],
            traits: result.traits || {}
          }
        },
        metadata: { timestamp: new Date().toISOString() }
      }); // Use the standardized publish method
    }
    logger.debug('Published evaluation completed event', { evaluationId, challengeId });
  } catch (error) {
    logger.error('Error publishing evaluation completed event', { error: error.message, evaluationId, challengeId });
  }
}

/**
 * Set up evaluation event subscriptions
 * @param {DIContainer} container - The DI container instance.
 */
export function registerEvaluationEventHandlers(container) {
    if (!container) {
        throw new Error('Container is required to register evaluation event handlers');
    }

    const eventBus = container.get('eventBus');
    if (!eventBus) {
        throw new Error('EventBus not found in container');
    }

    // Register event handlers here...
    eventBus.on(EventTypes.EVALUATION_STARTED, async (event) => {
        try {
            const repo = getRepo(container);
            // Handle evaluation started event...
            logger.info('Evaluation started event handled', { eventId: event.id });
        } catch (error) {
            logger.error('Error handling evaluation started event', { error: error.message });
        }
    });

    eventBus.on(EventTypes.EVALUATION_COMPLETED, async (event) => {
        try {
            const repo = getRepo(container);
            // Handle evaluation completed event...
            logger.info('Evaluation completed event handled', { eventId: event.id });
        } catch (error) {
            logger.error('Error handling evaluation completed event', { error: error.message });
        }
    });

    // Add more event handlers as needed...
}

// Export functions that now require the container
export { publishEvaluationStarted };
export { publishEvaluationCompleted };

export default {
  publishEvaluationStarted,
  publishEvaluationCompleted,
  registerEvaluationEventHandlers
};