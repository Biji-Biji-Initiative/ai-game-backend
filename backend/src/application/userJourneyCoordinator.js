'use strict';

/**
 * User Journey Coordinator
 * 
 * Application-level coordinator that orchestrates tracking and analysis 
 * of user progression through the platform.
 * This coordinator follows DDD principles by coordinating across multiple domains.
 */
import BaseCoordinator from "#app/application/BaseCoordinator.js";
import { UserJourneyValidationError } from "#app/core/userJourney/errors/userJourneyErrors.js";
import { UserNotFoundError } from "#app/core/user/errors/userErrors.js";

/**
 * Class representing the User Journey Coordinator
 * Follows DDD principles and proper dependency injection
 * Extends BaseCoordinator for standardized error handling and operation execution
 */
class UserJourneyCoordinator extends BaseCoordinator {
  /**
   * Create a new UserJourneyCoordinator
   * @param {Object} options - Options for the coordinator
   */
  constructor({
    userJourneyRepository,
    userRepository, 
    // Add other dependencies like progressService, challengeService if needed
    logger
  }) {
    super('UserJourneyCoordinator', { userJourneyRepository, userRepository, logger });
    // Store specific dependencies
    this.userJourneyRepository = userJourneyRepository;
    this.userRepository = userRepository;
  }

  /**
   * Record a user event
   * @param {string} userEmail - User's email
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Additional data
   * @param {string} challengeId - Optional challenge ID
   * @returns {Promise<UserJourneyEvent>} Recorded event
   */
  async recordUserEvent(userEmail, eventType, eventData = {}, challengeId = null) {
    // Basic validation (already done in controller with schema)
    if (!userEmail || !eventType) {
      // Should ideally not be reached if controller validation is working
      throw new UserJourneyValidationError('User email and event type are required'); 
    }

    // User existence check (already done in controller)
    // const user = await this.userRepository.findByEmail(userEmail);
    // if (!user) {
    //     throw new UserNotFoundError(`User not found: ${userEmail}`);
    // }

    // Record the event using the repository
    const event = await this.userJourneyRepository.recordEvent(
      userEmail,
      eventType,
      eventData,
      challengeId
    );

    return event;
  }

  /**
   * Update user journey metrics and save to database
   * @param {String} userEmail - User's email
   * @param {Object} journeyMeta - Current journey metadata
   * @param {Array} recentEvents - Recent user events
   * @returns {Promise<Object>} Updated user
   */
  updateUserJourneyMetrics(userEmail, journeyMeta, recentEvents) {
    return this.executeOperation(async () => {
      // Get completed challenges count using challengeService
      const challengeHistory = await this.challengeService.getUserChallengeHistory(userEmail);
      const completedChallenges = challengeHistory.filter(c => c.status === 'completed').length;
      
      // Get user data using userService
      const user = await this.userService.getUserByEmail(userEmail);
      
      // Use domain service to determine user phase
      journeyMeta.currentPhase = this.userJourneyService.determineUserPhase(user, completedChallenges);
      
      // Update session data using the domain service with config
      journeyMeta = this.userJourneyService.updateSessionData(journeyMeta, new Date(), this.config);
      
      // Use domain service to calculate engagement level
      journeyMeta.engagementLevel = this.userJourneyService.calculateEngagementLevel(journeyMeta, recentEvents);
      
      // Save updated journey metadata using userService
      return await this.userService.updateUser(userEmail, { journeyMeta });
    }, 'updateUserJourneyMetrics', { userEmail, journeyPhase: journeyMeta?.currentPhase, eventsCount: recentEvents?.length });
  }

  /**
   * Get user journey insights
   * @param {String} userEmail - User's email
   * @returns {Promise<Object>} Journey insights and recommendations
   */
  getUserJourneyInsights(userEmail) {
    return this.executeOperation(async () => {
      // Get user data using userService
      const user = await this.userService.getUserByEmail(userEmail);
      if (!user) {
        throw new Error(`User not found: ${userEmail}`);
      }
      
      // Get user journey events through the service
      const events = await this.userJourneyService.getUserEvents(userEmail, 100);
      
      // Get journey metadata or use defaults if not available
      const journeyMeta = user.journeyMeta || {
        currentPhase: 'onboarding',
        engagementLevel: 'new'
      };
      
      const phase = journeyMeta.currentPhase;
      const engagement = journeyMeta.engagementLevel;
      
      // Use domain service to generate insights and recommendations
      const { insights, recommendations } = this.userJourneyService.generateInsightsAndRecommendations(
        phase, 
        engagement
      );
      
      return {
        phase,
        engagement,
        sessionCount: journeyMeta.sessionCount,
        insights,
        recommendations,
        eventsCount: events.length
      };
    }, 'getUserJourneyInsights', { userEmail }, (error) => {
      // Custom error handler for this operation only
      this.logger.error('Error generating user journey insights', { error: error.message });
      
      return {
        phase: 'unknown',
        insights: ['Unable to generate journey insights'],
        recommendations: ['Try a new challenge to continue your journey']
      };
    });
  }

  /**
   * Get user activity summary
   * @param {String} userEmail - User's email
   * @returns {Promise<Object>} Activity summary
   */
  getUserActivitySummary(userEmail) {
    return this.executeOperation(async () => {
      // Get event data through the service
      const eventCounts = await this.userJourneyService.getUserEventCountsByType(userEmail);
      const challengeEvents = await this.userJourneyService.getUserEventsByType(userEmail, 'challenge_completed');
      
      // Use domain service to calculate activity metrics
      const activityMetrics = this.userJourneyService.calculateActivityMetrics(challengeEvents);
      
      return {
        totalEvents: Object.values(eventCounts).reduce((sum, count) => sum + count, 0),
        eventCounts,
        ...activityMetrics
      };
    }, 'getUserActivitySummary', { userEmail });
  }

  /**
   * Get user events
   * @param {string} userEmail - User's email
   * @param {number} limit - Max events to return
   * @returns {Promise<Array>} List of events
   */
  async getUserEvents(userEmail, { startDate, endDate, eventType, limit }) {
    // Validate parameters
    if (!userEmail) {
      throw new UserJourneyValidationError('User email is required');
    }

    // Check if user exists - This check belongs here or in repository?
    // For now, keeping it here as coordinator logic
    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      throw new UserNotFoundError(`User not found: ${userEmail}`);
    }
    // ... rest of method ...
  }

  /**
   * Get activity summary for a user
   * @param {string} userEmail - User's email
   * @param {string} timeframe - Timeframe (day, week, month)
   * @returns {Promise<Object>} Summary data
   */
  async getUserActivitySummary(userEmail, timeframe = 'week') {
    if (!userEmail) {
      throw new UserJourneyValidationError('User email is required');
    }
    // Check if user exists
    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      throw new UserNotFoundError(`User not found: ${userEmail}`);
    }
    // ... rest of method ...
  }

  /**
   * Get engagement metrics for a user
   * @param {string} userEmail - User's email
   * @returns {Promise<Object>} Engagement metrics
   */
  async getUserEngagementMetrics(userEmail) {
    if (!userEmail) {
      throw new UserJourneyValidationError('User email is required');
    }
    // Check if user exists
    const user = await this.userRepository.findByEmail(userEmail);
    if (!user) {
      throw new UserNotFoundError(`User not found: ${userEmail}`);
    }
    // ... rest of method ...
  }

  /**
   * Get a specific journey by ID for a user
   * @param {string} journeyId - Journey ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Journey object or null
   */
  async getJourneyById(journeyId, userId) {
    if (!journeyId || !userId) {
      throw new UserJourneyValidationError('Journey ID and User ID are required');
    }
    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
       throw new UserNotFoundError(`User not found: ${userId}`);
    }
    
    // Placeholder: Replace with actual repository call
    this.logger.debug('[UserJourneyCoordinator] getJourneyById (Placeholder)', { journeyId, userId });
    // Example: const journey = await this.userJourneyRepository.findJourneyByIdAndUser(journeyId, userId);
    return null; // Placeholder return
  }

  /**
   * Get a specific event by ID for a user
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Event object or null
   */
  async getEventById(eventId, userId) {
    if (!eventId || !userId) {
      throw new UserJourneyValidationError('Event ID and User ID are required');
    }
    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
       throw new UserNotFoundError(`User not found: ${userId}`);
    }
    
    // Placeholder: Replace with actual repository call
    this.logger.debug('[UserJourneyCoordinator] getEventById (Placeholder)', { eventId, userId });
    // Example: const event = await this.userJourneyRepository.findEventByIdAndUser(eventId, userId);
    return null; // Placeholder return
  }
}

export default UserJourneyCoordinator; 