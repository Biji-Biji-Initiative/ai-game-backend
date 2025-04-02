'use strict';

import { createErrorMapper, withServiceErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { UserJourney, ENGAGEMENT_LEVELS } from "#app/core/userJourney/models/UserJourney.js"; // Import Aggregate and constants
import UserJourneyEvent from "#app/core/userJourney/models/UserJourneyEvent.js";
import { UserJourneyError, UserJourneyNotFoundError, UserJourneyValidationError, UserJourneyProcessingError } from "#app/core/userJourney/errors/userJourneyErrors.js";
import { logger as appLogger } from "#app/core/infra/logging/logger.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";

// Create an error mapper for services
const userJourneyErrorMapper = createErrorMapper({
  UserJourneyNotFoundError: UserJourneyNotFoundError,
  UserJourneyValidationError: UserJourneyValidationError,
  UserJourneyProcessingError: UserJourneyProcessingError,
  Error: UserJourneyError
}, UserJourneyError);

/**
 * UserJourneyService class
 *
 * Provides business logic for tracking and managing user journeys through the application.
 * Orchestrates interactions between the UserJourney aggregate and repository.
 */
class UserJourneyService {
  /**
   * Create a new UserJourneyService
   *
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.userJourneyRepository - Repository for storing user journey events & aggregates
   * @param {Object} dependencies.userService - Service for user data (needed for phase calculation)
   * @param {Object} dependencies.config - Application config (for session timeout)
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({
    userJourneyRepository,
    userService, // Added userService dependency
    config,      // Added config dependency
    logger: loggerInstance
  }) {
    if (!userJourneyRepository) throw new UserJourneyValidationError('userJourneyRepository is required');
    if (!userService) throw new UserJourneyValidationError('userService is required');
    if (!config) throw new UserJourneyValidationError('config is required');
    
    this.userJourneyRepository = userJourneyRepository;
    this.userService = userService;
    this.config = config;
    this.logger = loggerInstance || appLogger.child({ service: 'UserJourneyService' });
    
    // Apply error handling wrappers
    this.recordEvent = withServiceErrorHandling(this.recordEvent.bind(this), { methodName: 'recordEvent', domainName: 'userJourney', logger: this.logger, errorMapper: userJourneyErrorMapper });
    this.getUserEvents = withServiceErrorHandling(this.getUserEvents.bind(this), { methodName: 'getUserEvents', domainName: 'userJourney', logger: this.logger, errorMapper: userJourneyErrorMapper });
    this.getUserEventsByType = withServiceErrorHandling(this.getUserEventsByType.bind(this), { methodName: 'getUserEventsByType', domainName: 'userJourney', logger: this.logger, errorMapper: userJourneyErrorMapper });
    this.getUserEventCountsByType = withServiceErrorHandling(this.getUserEventCountsByType.bind(this), { methodName: 'getUserEventCountsByType', domainName: 'userJourney', logger: this.logger, errorMapper: userJourneyErrorMapper });
    this.getUserJourneyState = withServiceErrorHandling(this.getUserJourneyState.bind(this), { methodName: 'getUserJourneyState', domainName: 'userJourney', logger: this.logger, errorMapper: userJourneyErrorMapper });
    this.getUserActivitySummary = withServiceErrorHandling(this.getUserActivitySummary.bind(this), { methodName: 'getUserActivitySummary', domainName: 'userJourney', logger: this.logger, errorMapper: userJourneyErrorMapper });
    this.getUserEngagementMetrics = withServiceErrorHandling(this.getUserEngagementMetrics.bind(this), { methodName: 'getUserEngagementMetrics', domainName: 'userJourney', logger: this.logger, errorMapper: userJourneyErrorMapper });
    this.getInsightsAndRecommendations = withServiceErrorHandling(this.getInsightsAndRecommendations.bind(this), { methodName: 'getInsightsAndRecommendations', domainName: 'userJourney', logger: this.logger, errorMapper: userJourneyErrorMapper });
  }

  /**
   * Helper to get or create the UserJourney aggregate.
   * @param {string} userId - User ID.
   * @returns {Promise<UserJourney>}
   * @private
   */
  async _getOrCreateJourney(userId) {
      // Use the repository method which should handle find or create logic now
      // This assumes findJourneyByUserId doesn't create, so we handle creation here.
      let journey = await this.userJourneyRepository.findJourneyByUserId(userId);
      if (!journey) {
          this.logger.info('No journey found, creating new one', { userId });
          journey = new UserJourney({ userId }, { EventTypes });
          // Save the newly created journey state (initial state)
          journey = await this.userJourneyRepository.saveJourney(journey);
      }
      return journey;
  }

  /**
   * Record a user interaction event and update the journey aggregate.
   * @param {string} userId - User ID.
   * @param {string} eventType - Type of event.
   * @param {Object} [eventData={}] - Additional data about the event.
   * @param {string} [challengeId=null] - Optional associated challenge ID.
   * @returns {Promise<{event: UserJourneyEvent, journey: UserJourney}>} Recorded event and updated journey aggregate.
   */
  async recordEvent(userId, eventType, eventData = {}, challengeId = null) {
    if (!userId || !eventType) {
      throw new UserJourneyValidationError('User ID and Event type are required');
    }
    this.logger.debug('Recording user journey event', { userId, eventType, challengeId });

    // 1. Get or create the UserJourney aggregate
    const journey = await this._getOrCreateJourney(userId);

    // 2. Create the new UserJourneyEvent domain object
    // Note: ID generation and timestamp happen within the Event constructor
    const newEvent = new UserJourneyEvent({
      userId: userId,
      eventType: eventType,
      eventData: eventData,
      challengeId: challengeId,
    }, { EventTypes: this.config?.EventTypes || EventTypes }); // Pass EventTypes if configured

    // 3. Add the event to the aggregate instance
    // This updates the aggregate's internal state (lastActivity, metrics, etc.)
    // Pass config for session timeout calculation
    journey.addEvent(newEvent, { config: this.config });

    // 4. Save the updated aggregate state
    // The repository's saveJourney method handles persistence and publishing aggregate-related domain events.
    const savedJourney = await this.userJourneyRepository.saveJourney(journey);

    // 5. Save the individual event record
    // The repository's recordEvent method now only persists the event itself.
    const savedEvent = await this.userJourneyRepository.recordEvent(newEvent);

    // 6. Return the saved event and the latest state of the journey aggregate
    return { event: savedEvent, journey: savedJourney };
  }

  /**
   * Get user journey events (fetches individual event records).
   * @param {string} userId - User ID.
   * @param {Object} [filters={}] - Filtering options.
   * @returns {Promise<Array<UserJourneyEvent>>} List of user journey events.
   */
  async getUserEvents(userId, filters = {}) {
    if (!userId) {
      throw new UserJourneyValidationError('User ID is required');
    }
    this.logger.debug('Retrieving user journey events', { userId, filters });
    // No longer need to fetch user just for email
    // const user = await this.userService.getUserById(userId);
    // if (!user) {
    //     throw new UserJourneyNotFoundError(`User not found: ${userId}`);
    // }
    // Delegate to repository using userId
    return this.userJourneyRepository.getUserEvents(userId, filters); 
  }

  /**
   * Get user events of a specific type.
   * @param {string} userId - User ID.
   * @param {string} eventType - Type of events to retrieve.
   * @param {number} [limit=null] - Maximum number of events to retrieve.
   * @returns {Promise<Array<UserJourneyEvent>>} List of events.
   */
  async getUserEventsByType(userId, eventType, limit = null) {
     if (!userId || !eventType) {
      throw new UserJourneyValidationError('User ID and Event type are required');
    }
    this.logger.debug('Retrieving user events by type', { userId, eventType, limit });
    // No longer need to fetch user just for email
    // const user = await this.userService.getUserById(userId);
    // if (!user) {
    //     throw new UserJourneyNotFoundError(`User not found: ${userId}`);
    // }
    // Delegate to repository using userId
    return this.userJourneyRepository.getUserEventsByType(userId, eventType, limit);
  }

  /**
   * Get count of events by type for a user.
   * @param {string} userId - User ID.
   * @returns {Promise<Object>} Counts indexed by event type.
   */
  async getUserEventCountsByType(userId) {
    if (!userId) {
      throw new UserJourneyValidationError('User ID is required');
    }
    this.logger.debug('Retrieving user event counts by type', { userId });
    // No longer need to fetch user just for email
    // const user = await this.userService.getUserById(userId);
    // if (!user) {
    //     throw new UserJourneyNotFoundError(`User not found: ${userId}`);
    // }
    // Delegate to repository using userId
    return this.userJourneyRepository.getUserEventCountsByType(userId);
  }
  
  /**
   * Get the current state of a user's journey (phase, engagement, metrics).
   * @param {string} userId - User ID.
   * @returns {Promise<Object>} Object containing phase, engagement, and metrics.
   */
  async getUserJourneyState(userId) {
      if (!userId) {
            throw new UserJourneyValidationError('User ID is required');
      }
      // Get the aggregate - it should have calculated state in constructor or via addEvent
      const journey = await this._getOrCreateJourney(userId);
      
      // Phase calculation might need external user data, get it and update the journey model
      const user = await this.userService.getUserById(userId);
      if (!user) {
          // Should not happen if journey exists, but handle defensively
          throw new UserJourneyNotFoundError(`User data not found for journey state calculation: ${userId}`);
      }
      journey._determineUserPhase(journey.metrics?.totalChallenges || 0, user.onboardingCompleted || false);
      
      return {
            phase: journey.getCurrentPhase(),
            engagement: journey.getEngagementLevel(),
            metrics: journey.getActivityMetrics()
      };
  }

  /**
   * Get activity summary (uses journey state).
   * @param {string} userId - User ID.
   * @param {string} [timeframe] - Optional timeframe (currently ignored by aggregate calculation).
   * @returns {Promise<Object>} Summary data including metrics and engagement.
   */
  async getUserActivitySummary(userId, timeframe = 'week') { 
    this.logger.debug('Getting user activity summary', { userId, timeframe });
    const state = await this.getUserJourneyState(userId); // Gets calculated state
    return {
        ...state.metrics,
        engagementLevel: state.engagement
        // Add timeframe-specific calculations here later if needed by querying events directly
    };
  }

  /**
   * Get engagement metrics (uses journey state).
   * @param {string} userId - User ID.
   * @returns {Promise<Object>} Engagement metrics including level and last activity.
   */
  async getUserEngagementMetrics(userId) {
     this.logger.debug('Getting user engagement metrics', { userId });
     const journey = await this._getOrCreateJourney(userId);
     // The journey aggregate calculates/holds this state
     return {
         engagementLevel: journey.getEngagementLevel(),
         lastActivity: journey.lastActivity,
         sessionCount: journey.sessionCount,
         currentSessionStarted: journey.currentSessionStarted
     };
  }

  /**
   * Get insights and recommendations based on the user's journey state.
   * @param {string} userId - User ID.
   * @returns {Promise<{insights: Array<string>, recommendations: Array<string>}>}
   */
  async getInsightsAndRecommendations(userId) {
      this.logger.debug('Getting journey insights and recommendations', { userId });
      const journey = await this._getOrCreateJourney(userId);
      
      // Ensure phase is calculated using potentially fresh user data
      const user = await this.userService.getUserById(userId);
       if (!user) {
          throw new UserJourneyNotFoundError(`User data not found for insights: ${userId}`);
      }
      journey._determineUserPhase(journey.metrics?.totalChallenges || 0, user.onboardingCompleted || false);
      
      // Delegate to the aggregate method
      return journey.generateInsightsAndRecommendations();
  }
}
export default UserJourneyService;