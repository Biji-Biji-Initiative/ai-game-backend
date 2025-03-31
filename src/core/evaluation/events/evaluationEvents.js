import domainEvents from "../../common/events/domainEvents.js";
import { logger } from "../../infra/logging/logger.js";

import { EvaluationRepository } from '../repositories/evaluationRepository.js';'use strict';

import { EvaluationRepository } from '../repositories/evaluationRepository.js';/**
 * Evaluation Domain Events
 *
 * Events that occur within the Evaluation domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */
const {
  EventTypes,
  eventBus,
  DomainEvent
} = domainEvents;
/**
 * Publish an event when an evaluation is started
 * @param {string} evaluationId - ID of the evaluation
 * @param {string} challengeId - ID of the challenge being evaluated
 * @param {string} userEmail - Email of the user whose response is being evaluated
 * @returns {Promise<void>}
 */
async function publishEvaluationStarted(evaluationId, challengeId, userEmail) {
  try {
    
  // Get entity to add domain event
  const entity = await evaluationRepository.findById(evaluationId);
  if (entity) {
    // Add domain event to entity
    entity.addDomainEvent(EventTypes.EVALUATION_STARTED, {
      evaluationId,
      challengeId,
      userEmail
    });
    
    // Save entity which will publish the event
    await evaluationRepository.save(entity);
  } else {
    // Fallback to direct event publishing if entity not found
    console.warn(`Entity with ID ${evaluationId} not found for event EVALUATION_STARTED. Using direct event publishing.`);
    
  // Get entity to add domain event
  const entity = await evaluationRepository.findById(evaluationId);
  if (entity) {
    // Add domain event to entity
    entity.addDomainEvent(EventTypes.EVALUATION_STARTED, {
      evaluationId,
      challengeId,
      userEmail
    });
    
    // Save entity which will publish the event
    await evaluationRepository.save(entity);
  } else {
    // Fallback to direct event publishing if entity not found
    console.warn(`Entity with ID ${evaluationId} not found for event EVALUATION_STARTED. Using direct event publishing.`);
    await eventBus.publishEvent(EventTypes.EVALUATION_STARTED, {
      evaluationId,
      challengeId,
      userEmail
    });
  }
  }
    logger.debug('Published evaluation started event', {
      evaluationId,
      challengeId
    });
  } catch (error) {
    logger.error('Error publishing evaluation started event', {
      error: error.message,
      evaluationId,
      challengeId
    });
  }
}
/**
 * Publish an event when an evaluation is completed
 * @param {string} evaluationId - ID of the evaluation
 * @param {string} challengeId - ID of the challenge that was evaluated
 * @param {string} userEmail - Email of the user whose response was evaluated
 * @param {Object} result - Evaluation result
 * @returns {Promise<void>}
 */
async function publishEvaluationCompleted(evaluationId, challengeId, userEmail, result) {
  try {
    
  // Get entity to add domain event
  const entity = await evaluationRepository.findById(evaluationId);
  if (entity) {
    // Add domain event to entity
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
    
    // Save entity which will publish the event
    await evaluationRepository.save(entity);
  } else {
    // Fallback to direct event publishing if entity not found
    console.warn(`Entity with ID ${evaluationId} not found for event EVALUATION_COMPLETED. Using direct event publishing.`);
    
  // Get entity to add domain event
  const entity = await evaluationRepository.findById(evaluationId);
  if (entity) {
    // Add domain event to entity
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
    
    // Save entity which will publish the event
    await evaluationRepository.save(entity);
  } else {
    // Fallback to direct event publishing if entity not found
    console.warn(`Entity with ID ${evaluationId} not found for event EVALUATION_COMPLETED. Using direct event publishing.`);
    await eventBus.publishEvent(EventTypes.EVALUATION_COMPLETED, {
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
  }
  }
    logger.debug('Published evaluation completed event', {
      evaluationId,
      challengeId
    });
  } catch (error) {
    logger.error('Error publishing evaluation completed event', {
      error: error.message,
      evaluationId,
      challengeId
    });
  }
}
/**
 * Set up evaluation event subscriptions
 */
async function registerEvaluationEventHandlers() {
  // Subscribe to relevant events from other domains
  // For example, when a challenge response is submitted, we want to start an evaluation
  eventBus.subscribe(EventTypes.CHALLENGE_RESPONSE_SUBMITTED, async event => {
    logger.debug('Handling challenge response submitted event', {
      challengeId: event.payload.challengeId
    });
    // In a real implementation, we would trigger the evaluation process here
    // But for now we just log it
    logger.info('Evaluation would be triggered for response', {
      challengeId: event.payload.challengeId,
      userEmail: event.payload.userEmail
    });
  });
}
export { publishEvaluationStarted };
export { publishEvaluationCompleted };
export { registerEvaluationEventHandlers };
export default {
  publishEvaluationStarted,
  publishEvaluationCompleted,
  registerEvaluationEventHandlers
};