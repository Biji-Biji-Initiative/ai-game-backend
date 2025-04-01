'use strict';

/**
 * User Journey Coordinator
 * 
 * Application-level coordinator that orchestrates tracking and analysis 
 * of user progression through the platform.
 * This coordinator follows DDD principles by coordinating across multiple domains.
 */
import BaseCoordinator from "#app/application/BaseCoordinator.js";

/**
 * Class representing the User Journey Coordinator
 * Follows DDD principles and proper dependency injection
 * Extends BaseCoordinator for standardized error handling and operation execution
 */
class UserJourneyCoordinator extends BaseCoordinator {
  /**
   * Create a new UserJourneyCoordinator
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.userService - Service for user operations
   * @param {Object} dependencies.challengeService - Service for challenge operations
   * @param {Object} dependencies.userJourneyService - Service for user journey logic
   * @param {Object} dependencies.config - Application configuration
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({ 
    userService, 
    challengeService, 
    userJourneyService,
    config,
    logger 
  }) {
    // Call super with name and logger
    super({
      name: 'UserJourneyCoordinator',
      logger
    });

    // Validate required dependencies
    const requiredDependencies = [
      'userService',
      'challengeService',
      'userJourneyService',
      'config'
    ];
    
    this.validateDependencies({
      userService,
      challengeService,
      userJourneyService,
      config
    }, requiredDependencies);

    // Initialize services
    this.userService = userService;
    this.challengeService = challengeService;
    this.userJourneyService = userJourneyService;
    this.config = config;
  }

  /**
   * Record a user interaction event
   * @param {String} userEmail - User's email identifier
   * @param {String} eventType - Type of event (e.g., 'challenge_started', 'challenge_completed')
   * @param {Object} eventData - Additional data about the event
   * @param {String} challengeId - Optional associated challenge ID
   * @returns {Promise<Object>} The recorded event
   */
  recordUserEvent(userEmail, eventType, eventData = {}, challengeId = null) {
    return this.executeOperation(async () => {
      if (!userEmail || !eventType) {
        throw new Error('Missing required parameters');
      }
      
      // Record event using the domain service
      const recordedEvent = await this.userJourneyService.recordEvent(
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
      
      // Get recent events to calculate metrics through the service
      const recentEvents = await this.userJourneyService.getUserEvents(userEmail, 100);
      
      // Update user's phase, session data, and engagement level based on events
      await this.updateUserJourneyMetrics(userEmail, journeyMeta, recentEvents);
      
      return recordedEvent;
    }, 'recordUserEvent', { userEmail, eventType, hasEventData: !!Object.keys(eventData).length, challengeId });
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
}

export default UserJourneyCoordinator; 