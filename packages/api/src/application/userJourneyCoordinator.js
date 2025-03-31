'use strict';

/**
 * User Journey Coordinator
 * 
 * Application-level coordinator that orchestrates tracking and analysis 
 * of user progression through the platform.
 * This coordinator follows DDD principles by coordinating across multiple domains.
 */
import BaseCoordinator from './BaseCoordinator.js';
import { 
  UserJourneyError, 
  UserJourneyNotFoundError, 
  UserJourneyValidationError,
  UserJourneyProcessingError
} from '../core/userJourney/errors/userJourneyErrors.js';
import {
  Email,
  ChallengeId,
  createEmail,
  createChallengeId
} from '../core/common/valueObjects/index.js';

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
   * @param {Email} emailVO - User's email as a Value Object
   * @param {String} eventType - Type of event (e.g., 'challenge_started', 'challenge_completed')
   * @param {Object} eventData - Additional data about the event
   * @param {ChallengeId|null} challengeIdVO - Optional associated challenge ID as a Value Object
   * @returns {Promise<Object>} The recorded event
   * @throws {UserJourneyValidationError} If required parameters are missing or invalid
   * @throws {UserJourneyNotFoundError} If the user is not found
   * @throws {UserJourneyProcessingError} If an error occurs during event recording
   * @throws {UserJourneyError} If any other journey-related error occurs
   */
  recordUserEvent(emailVO, eventType, eventData = {}, challengeIdVO = null) {
    return this.executeOperation(async () => {
      // Validate Value Objects
      if (!(emailVO instanceof Email)) {
        throw new UserJourneyValidationError('Valid Email Value Object is required');
      }
      
      if (!eventType) {
        throw new UserJourneyValidationError('Event type is required');
      }
      
      if (challengeIdVO !== null && !(challengeIdVO instanceof ChallengeId)) {
        throw new UserJourneyValidationError('Challenge ID must be a valid ChallengeId Value Object');
      }
      
      // Record event using the domain service
      const recordedEvent = await this.userJourneyService.recordEvent(
        emailVO.value, 
        eventType, 
        eventData, 
        challengeIdVO ? challengeIdVO.value : null
      );
      
      // Get user profile using userService
      const user = await this.userService.getUserByEmail(emailVO);
      if (!user) {
        this.logger.warn(`User not found for event recording: ${emailVO.value}`);
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
      const recentEvents = await this.userJourneyService.getUserEvents(emailVO.value, 100);
      
      // Update user's phase, session data, and engagement level based on events
      await this.updateUserJourneyMetrics(emailVO, journeyMeta, recentEvents);
      
      return recordedEvent;
    }, 'recordUserEvent', { 
      userEmail: emailVO.value, 
      eventType, 
      hasEventData: !!Object.keys(eventData).length, 
      challengeId: challengeIdVO?.value 
    }, UserJourneyError);
  }

  /**
   * Update user journey metrics and save to database
   * @param {Email} emailVO - User's email as a Value Object
   * @param {Object} journeyMeta - Current journey metadata
   * @param {Array} recentEvents - Recent user events
   * @returns {Promise<Object>} Updated user
   * @throws {UserJourneyValidationError} If required parameters are missing or invalid
   * @throws {UserJourneyNotFoundError} If the user is not found
   * @throws {UserJourneyProcessingError} If an error occurs during metrics calculation
   * @throws {UserJourneyError} If any other journey-related error occurs
   */
  updateUserJourneyMetrics(emailVO, journeyMeta, recentEvents) {
    return this.executeOperation(async () => {
      // Validate Value Objects
      if (!(emailVO instanceof Email)) {
        throw new UserJourneyValidationError('Valid Email Value Object is required');
      }
      
      if (!journeyMeta || typeof journeyMeta !== 'object') {
        journeyMeta = {
          lastActivity: null,
          engagementLevel: 'new',
          sessionCount: 0,
          currentSessionStarted: null,
          currentPhase: 'onboarding'
        };
      }

      // Get completed challenges count using challengeService
      const challengeHistory = await this.challengeService.getUserChallengeHistory(emailVO.value);
      const completedChallenges = challengeHistory.filter(c => c.status === 'completed').length;
      
      // Get user data using userService
      const user = await this.userService.getUserByEmail(emailVO);
      if (!user) {
        throw new UserJourneyNotFoundError(`User not found: ${emailVO.value}`);
      }
      
      // Use domain service to determine user phase
      journeyMeta.currentPhase = this.userJourneyService.determineUserPhase(user, completedChallenges);
      
      // Update session data using the domain service with config
      journeyMeta = this.userJourneyService.updateSessionData(journeyMeta, new Date(), this.config);
      
      // Use domain service to calculate engagement level
      journeyMeta.engagementLevel = this.userJourneyService.calculateEngagementLevel(journeyMeta, recentEvents);
      
      // Save updated journey metadata using userService
      return await this.userService.updateUser(emailVO, { journeyMeta });
    }, 'updateUserJourneyMetrics', { 
      userEmail: emailVO.value, 
      journeyPhase: journeyMeta?.currentPhase, 
      eventsCount: recentEvents?.length 
    }, UserJourneyError);
  }

  /**
   * Get user journey insights
   * @param {Email} emailVO - User's email as a Value Object
   * @returns {Promise<Object>} Journey insights and recommendations
   * @throws {UserJourneyValidationError} If input parameters are invalid or missing
   * @throws {UserJourneyNotFoundError} If the user is not found
   * @throws {UserJourneyProcessingError} If an error occurs during insights generation
   * @throws {UserJourneyError} If any other journey-related error occurs
   */
  getUserJourneyInsights(emailVO) {
    return this.executeOperation(async () => {
      // Validate Value Objects
      if (!(emailVO instanceof Email)) {
        throw new UserJourneyValidationError('Valid Email Value Object is required');
      }
      
      // Get user data using userService
      const user = await this.userService.getUserByEmail(emailVO);
      if (!user) {
        throw new UserJourneyNotFoundError(`User not found: ${emailVO.value}`);
      }
      
      // Get user journey events through the service
      const events = await this.userJourneyService.getUserEvents(emailVO.value, 100);
      
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
    }, 'getUserJourneyInsights', { userEmail: emailVO.value }, UserJourneyError);
  }

  /**
   * Get user activity summary
   * @param {Email} emailVO - User's email as a Value Object
   * @returns {Promise<Object>} Activity summary
   * @throws {UserJourneyValidationError} If required parameters are missing or invalid
   * @throws {UserJourneyNotFoundError} If the user is not found
   * @throws {UserJourneyProcessingError} If an error occurs during metrics calculation
   * @throws {UserJourneyError} If any other journey-related error occurs
   */
  getUserActivitySummary(emailVO) {
    return this.executeOperation(async () => {
      // Validate Value Objects
      if (!(emailVO instanceof Email)) {
        throw new UserJourneyValidationError('Valid Email Value Object is required');
      }
      
      // Check if user exists
      const userExists = await this.userService.userExists(emailVO);
      if (!userExists) {
        throw new UserJourneyNotFoundError(`User not found: ${emailVO.value}`);
      }
      
      // Get event data through the service
      const eventCounts = await this.userJourneyService.getUserEventCountsByType(emailVO.value);
      const challengeEvents = await this.userJourneyService.getUserEventsByType(emailVO.value, 'challenge_completed');
      
      // Use domain service to calculate activity metrics
      const activityMetrics = this.userJourneyService.calculateActivityMetrics(challengeEvents);
      
      return {
        totalEvents: Object.values(eventCounts).reduce((sum, count) => sum + count, 0),
        eventCounts,
        ...activityMetrics
      };
    }, 'getUserActivitySummary', { userEmail: emailVO.value }, UserJourneyError);
  }
}

export default UserJourneyCoordinator; 