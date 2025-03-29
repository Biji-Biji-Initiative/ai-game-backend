'use strict';

/**
 * Challenge Domain Events
 *
 * Events that occur within the Challenge domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */
const { EventTypes, eventBus } = require('../../common/events/domainEvents');
const { logger } = require('../../../core/infra/logging/logger');

/**
 * Publish an event when a challenge is created
 * @param {string} challengeId - ID of the challenge
 * @param {string} userEmail - Email of the user who created the challenge
 * @param {string} focusArea - Focus area of the challenge
 * @returns {Promise<void>}
 */
async function publishChallengeCreated(challengeId, userEmail, focusArea) {
  try {
    await eventBus.publishEvent(EventTypes.CHALLENGE_CREATED, {
      challengeId,
      userEmail,
      focusArea,
    });
    logger.debug('Published challenge created event', { challengeId, userEmail });
  } catch (error) {
    logger.error('Error publishing challenge created event', {
      error: error.message,
      challengeId,
      userEmail,
    });
  }
}

/**
 * Publish an event when a challenge is updated
 * @param {string} challengeId - ID of the challenge
 * @param {string} userEmail - Email of the user who updated the challenge
 * @param {Object} changes - Changes made to the challenge
 * @returns {Promise<void>}
 */
async function publishChallengeUpdated(challengeId, userEmail, changes) {
  try {
    await eventBus.publishEvent(EventTypes.CHALLENGE_UPDATED, {
      challengeId,
      userEmail,
      changes,
    });
    logger.debug('Published challenge updated event', { challengeId, userEmail });
  } catch (error) {
    logger.error('Error publishing challenge updated event', {
      error: error.message,
      challengeId,
      userEmail,
    });
  }
}

/**
 * Publish an event when a challenge response is submitted
 * @param {string} challengeId - ID of the challenge
 * @param {string} userEmail - Email of the user who submitted the response
 * @param {Object} response - The challenge response
 * @returns {Promise<void>}
 */
async function publishChallengeResponseSubmitted(challengeId, userEmail, response) {
  try {
    await eventBus.publishEvent(EventTypes.CHALLENGE_RESPONSE_SUBMITTED, {
      challengeId,
      userEmail,
      response,
    });
    logger.debug('Published challenge response submitted event', { challengeId, userEmail });
  } catch (error) {
    logger.error('Error publishing challenge response submitted event', {
      error: error.message,
      challengeId,
      userEmail,
    });
  }
}

/**
 * Publish an event when a challenge is evaluated
 * @param {string} challengeId - ID of the challenge
 * @param {string} userEmail - Email of the user
 * @param {Object} evaluation - Challenge evaluation result
 * @returns {Promise<void>}
 */
async function publishChallengeEvaluated(challengeId, userEmail, evaluation) {
  try {
    await eventBus.publishEvent(EventTypes.CHALLENGE_EVALUATED, {
      challengeId,
      userEmail,
      evaluation,
    });
    logger.debug('Published challenge evaluated event', { challengeId, userEmail });
  } catch (error) {
    logger.error('Error publishing challenge evaluated event', {
      error: error.message,
      challengeId,
      userEmail,
    });
  }
}

/**
 * Set up challenge event subscriptions
 */
async function registerChallengeEventHandlers() {
  // When user focus area is set, generate new challenges
  eventBus.subscribe(EventTypes.USER_FOCUS_AREA_SET, async event => {
    logger.debug('Handling user focus area set event', {
      userId: event.payload.userId,
      focusArea: event.payload.focusArea,
    });

    // In a real implementation, we would generate new challenges for the user
    logger.info('New challenges would be generated for user focus area', {
      userId: event.payload.userId,
      focusArea: event.payload.focusArea,
    });
  });

  // When progress is updated, adjust challenge difficulty
  eventBus.subscribe(EventTypes.PROGRESS_UPDATED, async event => {
    logger.debug('Handling progress updated event', {
      userId: event.payload.userId,
    });

    // In a real implementation, we would adjust challenge difficulty
    logger.info('Challenge difficulty would be adjusted based on progress', {
      userId: event.payload.userId,
    });
  });

  // When evaluation is completed, update challenge status
  eventBus.subscribe(EventTypes.EVALUATION_COMPLETED, async event => {
    logger.debug('Handling evaluation completed event', {
      challengeId: event.payload.challengeId,
    });

    // In a real implementation, we would update the challenge status
    logger.info('Challenge status would be updated based on evaluation', {
      challengeId: event.payload.challengeId,
      userEmail: event.payload.userEmail,
    });
  });
}

module.exports = {
  publishChallengeCreated,
  publishChallengeUpdated,
  publishChallengeResponseSubmitted,
  publishChallengeEvaluated,
  registerChallengeEventHandlers,
};
