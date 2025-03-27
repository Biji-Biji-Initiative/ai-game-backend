/**
 * Evaluation Domain Events
 * 
 * Events that occur within the Evaluation domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */
const { EventTypes, eventBus, DomainEvent } = require('../../shared/domainEvents');
const { logger } = require('../../../core/infra/logging/logger');

/**
 * Publish an event when an evaluation is started
 * @param {string} evaluationId - ID of the evaluation
 * @param {string} challengeId - ID of the challenge being evaluated
 * @param {string} userEmail - Email of the user whose response is being evaluated
 * @returns {Promise<void>}
 */
async function publishEvaluationStarted(evaluationId, challengeId, userEmail) {
  try {
    await eventBus.publishEvent(EventTypes.EVALUATION_STARTED, {
      evaluationId,
      challengeId,
      userEmail
    });
    logger.debug('Published evaluation started event', { evaluationId, challengeId });
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
    logger.debug('Published evaluation completed event', { evaluationId, challengeId });
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
function registerEvaluationEventHandlers() {
  // Subscribe to relevant events from other domains
  
  // For example, when a challenge response is submitted, we want to start an evaluation
  eventBus.subscribe(EventTypes.CHALLENGE_RESPONSE_SUBMITTED, async (event) => {
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

module.exports = {
  publishEvaluationStarted,
  publishEvaluationCompleted,
  registerEvaluationEventHandlers
}; 