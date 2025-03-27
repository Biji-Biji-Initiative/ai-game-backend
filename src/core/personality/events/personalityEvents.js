/**
 * Personality Domain Events
 * 
 * Events that occur within the Personality domain.
 * Following DDD principles, these events are used to communicate changes
 * in the domain to other domains.
 */
const { EventTypes, eventBus, DomainEvent } = require('../../shared/domainEvents');
const { logger } = require('../../../core/infra/logging/logger');

/**
 * Publish an event when a personality trait is identified
 * @param {string} userEmail - Email of the user
 * @param {string} traitName - Name of the trait
 * @param {number} traitScore - Score for the trait (0-1)
 * @param {string} source - Source of the trait identification (e.g., evaluation, assessment)
 * @returns {Promise<void>}
 */
async function publishTraitIdentified(userEmail, traitName, traitScore, source) {
  try {
    await eventBus.publishEvent(EventTypes.PERSONALITY_TRAIT_IDENTIFIED, {
      userEmail,
      trait: {
        name: traitName,
        score: traitScore
      },
      source
    });
    logger.debug('Published personality trait identified event', { userEmail, traitName });
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
async function publishProfileUpdated(userEmail, profile) {
  try {
    await eventBus.publishEvent(EventTypes.PERSONALITY_PROFILE_UPDATED, {
      userEmail,
      profile: {
        dominantTraits: profile.dominantTraits || [],
        traitScores: profile.traitScores || {}
      }
    });
    logger.debug('Published personality profile updated event', { userEmail });
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
function registerPersonalityEventHandlers() {
  // Subscribe to evaluation completed events to extract personality traits
  eventBus.subscribe(EventTypes.EVALUATION_COMPLETED, async (event) => {
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

module.exports = {
  publishTraitIdentified,
  publishProfileUpdated,
  registerPersonalityEventHandlers
}; 