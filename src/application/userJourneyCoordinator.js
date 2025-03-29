'use strict';

/**
 * User Journey Coordinator
 * 
 * Application-level coordinator that orchestrates tracking and analysis 
 * of user progression through the platform.
 * This coordinator follows DDD principles by coordinating across multiple domains.
 */

/**
 * Class representing the User Journey Coordinator
 * Follows DDD principles and proper dependency injection
 */
class UserJourneyCoordinator {
  /**
   * Create a new UserJourneyCoordinator
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.userService - Service for user operations
   * @param {Object} dependencies.challengeService - Service for challenge operations
   * @param {Object} dependencies.userJourneyRepository - Repository for user journey operations
   * @param {Object} dependencies.userJourneyService - Service for user journey logic
   * @param {Object} dependencies.config - Application configuration
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({ 
    userService, 
    challengeService, 
    userJourneyRepository, 
    userJourneyService,
    config,
    logger 
  }) {
    this.userService = userService;
    this.challengeService = challengeService;
    // We still need direct access to userJourneyRepository as there's no comprehensive service API for it yet
    this.userJourneyRepository = userJourneyRepository;
    this.userJourneyService = userJourneyService;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Record a user interaction event
   * @param {String} userEmail - User's email identifier
   * @param {String} eventType - Type of event (e.g., 'challenge_started', 'challenge_completed')
   * @param {Object} eventData - Additional data about the event
   * @param {String} challengeId - Optional associated challenge ID
   * @returns {Promise<Object>} The recorded event
   */
  async recordUserEvent(userEmail, eventType, eventData = {}, challengeId = null) {
    try {
      if (!userEmail || !eventType) {
        this.logger.warn('Missing required parameters for recording user event');
        throw new Error('Missing required parameters');
      }
      
      // Record event in the database using repository
      // Note: This operation is specific to user journey tracking and doesn't have a service equivalent yet
      const recordedEvent = await this.userJourneyRepository.recordEvent(
        userEmail, 
        eventType, 
        eventData, 
        challengeId
      );
      
      // Get user profile using userService
      const user = await this.userService.getUserByEmail(userEmail);
      if (!user) {
        this.logger.warn(`User not found for event recording: ${userEmail}`);
        return recordedEvent;
      }
      
      // Get current journey metadata
      const journeyMeta = user.journeyMeta || {
        lastActivity: null,
        engagementLevel: 'new',
        sessionCount: 0,
        currentSessionStarted: null,
        currentPhase: 'onboarding'
      };
      
      // Get recent events to calculate metrics
      // Note: This operation is specific to user journey tracking and doesn't have a service equivalent yet
      const recentEvents = await this.userJourneyRepository.getUserEvents(userEmail, 100);
      
      // Update user's phase, session data, and engagement level based on events
      await this.updateUserJourneyMetrics(userEmail, journeyMeta, recentEvents);
      
      this.logger.info(`Recorded user event: ${eventType}`, { 
        userEmail, 
        currentPhase: journeyMeta.currentPhase 
      });
      
      return recordedEvent;
    } catch (error) {
      this.logger.error('Error recording user event', { error: error.message });
      throw error;
    }
  }

  /**
   * Update user journey metrics and save to database
   * @param {String} userEmail - User's email
   * @param {Object} journeyMeta - Current journey metadata
   * @param {Array} recentEvents - Recent user events
   * @returns {Promise<Object>} Updated user
   */
  async updateUserJourneyMetrics(userEmail, journeyMeta, recentEvents) {
    try {
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
    } catch (error) {
      this.logger.error('Error updating user journey metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user journey insights
   * @param {String} userEmail - User's email
   * @returns {Promise<Object>} Journey insights and recommendations
   */
  async getUserJourneyInsights(userEmail) {
    try {
      // Get user data using userService
      const user = await this.userService.getUserByEmail(userEmail);
      if (!user) {
        throw new Error(`User not found: ${userEmail}`);
      }
      
      // Get user journey events - this operation remains repository-specific
      // as there's no service equivalent yet
      const events = await this.userJourneyRepository.getUserEvents(userEmail, 100);
      
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
    } catch (error) {
      this.logger.error('Error generating user journey insights', { error: error.message });
      
      return {
        phase: 'unknown',
        insights: ['Unable to generate journey insights'],
        recommendations: ['Try a new challenge to continue your journey']
      };
    }
  }

  /**
   * Get user activity summary
   * @param {String} userEmail - User's email
   * @returns {Promise<Object>} Activity summary
   */
  async getUserActivitySummary(userEmail) {
    try {
      // The following operations remain repository-specific as there's no service equivalent yet
      // Note: In a future refactoring, these could be moved to the UserJourneyService
      const eventCounts = await this.userJourneyRepository.getUserEventCountsByType(userEmail);
      const challengeEvents = await this.userJourneyRepository.getUserEventsByType(userEmail, 'challenge_completed');
      
      // Use domain service to calculate activity metrics
      const activityMetrics = this.userJourneyService.calculateActivityMetrics(challengeEvents);
      
      return {
        totalEvents: Object.values(eventCounts).reduce((sum, count) => sum + count, 0),
        eventCounts,
        ...activityMetrics
      };
    } catch (error) {
      this.logger.error('Error getting user activity summary', { error: error.message });
      throw error;
    }
  }
}

module.exports = UserJourneyCoordinator;
