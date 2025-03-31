"../../../infra/errors/errorStandardization.js;
""../../../userJourney/errors/userJourneyErrors.js109;
""../../../infra/logging/logger.js276;
""../../../infra/logging/domainLogger.js335;
'use strict';
// Create an error mapper for services
const userJourneyErrorMapper = createErrorMapper({
  UserJourneyNotFoundError: UserJourneyNotFoundError,
  UserJourneyValidationError: UserJourneyValidationError,
  UserJourneyProcessingError: UserJourneyProcessingError,
  Error: UserJourneyError
}, UserJourneyError);

/**
 * User journey phases and constants
 */
const USER_JOURNEY_PHASES = {
  ONBOARDING: 'onboarding',
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert'
};
/**
 * UserJourneyService class
 *
 * Provides business logic for tracking and managing user journeys through the application.
 * Implements domain operations for user engagement, progress tracking, and activity insights.
 */
class UserJourneyService {
  /**
   * Create a new UserJourneyService
   *
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.userJourneyRepository - Repository for storing user journey events
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({
    userJourneyRepository,
    logger: loggerInstance
  }) {
    this.userJourneyRepository = userJourneyRepository;
    this.logger = loggerInstance || logger.child({
      service: 'UserJourneyService'
    });
    // Apply error handling to methods using the withServiceErrorHandling wrapper
    this.recordEvent = withServiceErrorHandling(
      this.recordEvent.bind(this), 
      {
        methodName: 'recordEvent',
        domainName: 'userJourney',
        logger: this.logger,
        errorMapper: userJourneyErrorMapper
      }
    );
    this.getUserEvents = withServiceErrorHandling(
      this.getUserEvents.bind(this), 
      {
        methodName: 'getUserEvents',
        domainName: 'userJourney',
        logger: this.logger,
        errorMapper: userJourneyErrorMapper
      }
    );
    this.getUserEventsByType = withServiceErrorHandling(
      this.getUserEventsByType.bind(this), 
      {
        methodName: 'getUserEventsByType',
        domainName: 'userJourney',
        logger: this.logger,
        errorMapper: userJourneyErrorMapper
      }
    );
    this.getUserEventCountsByType = withServiceErrorHandling(
      this.getUserEventCountsByType.bind(this), 
      {
        methodName: 'getUserEventCountsByType',
        domainName: 'userJourney',
        logger: this.logger,
        errorMapper: userJourneyErrorMapper
      }
    );
  }
  /**
   * Record a user interaction event
   *
   * @param {string} userEmail - User's email identifier
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Additional data about the event
   * @param {string} challengeId - Optional associated challenge ID
   * @returns {Promise<Object>} The recorded event
   */
  async recordEvent(userEmail, eventType, eventData = {}, challengeId = null) {
    if (!userEmail) {
      throw new UserJourneyValidationError('User email is required');
    }
    if (!eventType) {
      throw new UserJourneyValidationError('Event type is required');
    }
    
    this.logger.debug('Recording user journey event', { userEmail, eventType, challengeId });
    return this.userJourneyRepository.recordEvent(userEmail, eventType, eventData, challengeId);
  }
  /**
   * Get user journey events
   *
   * @param {string} userEmail - User's email identifier
   * @param {number} limit - Maximum number of events to retrieve
   * @returns {Promise<Array>} List of user journey events
   */
  async getUserEvents(userEmail, limit = null) {
    if (!userEmail) {
      throw new UserJourneyValidationError('User email is required');
    }
    
    this.logger.debug('Retrieving user journey events', { userEmail, limit });
    return this.userJourneyRepository.getUserEvents(userEmail, limit);
  }
  /**
   * Get user events of a specific type
   *
   * @param {string} userEmail - User's email identifier
   * @param {string} eventType - Type of events to retrieve
   * @param {number} limit - Maximum number of events to retrieve
   * @returns {Promise<Array>} List of events of the specified type
   */
  async getUserEventsByType(userEmail, eventType, limit = null) {
    if (!userEmail) {
      throw new UserJourneyValidationError('User email is required');
    }
    if (!eventType) {
      throw new UserJourneyValidationError('Event type is required');
    }
    
    this.logger.debug('Retrieving user events by type', { userEmail, eventType, limit });
    return this.userJourneyRepository.getUserEventsByType(userEmail, eventType, limit);
  }
  /**
   * Get count of events by type for a user
   *
   * @param {string} userEmail - User's email identifier
   * @returns {Promise<Object>} Counts indexed by event type
   */
  async getUserEventCountsByType(userEmail) {
    if (!userEmail) {
      throw new UserJourneyValidationError('User email is required');
    }
    
    this.logger.debug('Retrieving user event counts by type', { userEmail });
    return this.userJourneyRepository.getUserEventCountsByType(userEmail);
  }
  /**
   * Calculate user engagement level based on activity patterns
   *
   * @param {Object} journeyMeta - User's journey metadata
   * @param {Array} recentEvents - Recent user events
   * @returns {string} Engagement level classification
   */
  calculateEngagementLevel(journeyMeta, recentEvents) {
    if (!journeyMeta || !recentEvents) {
      return 'new';
    }
    const now = new Date();
    const lastActivity = journeyMeta.lastActivity ? new Date(journeyMeta.lastActivity) : null;
    // No previous activity
    if (!lastActivity) {
      return 'new';
    }
    // Check recency of last activity
    const daysSinceLastActivity = (now - lastActivity) / (1000 * 60 * 60 * 24);
    if (daysSinceLastActivity < 2) {
      return 'active';
    } else if (daysSinceLastActivity < 7) {
      return 'engaged';
    } else if (daysSinceLastActivity < 30) {
      return 'casual';
    } else {
      return 'inactive';
    }
  }
  /**
   * Determine user's journey phase based on progress
   *
   * @param {Object} user - User data
   * @param {number} completedChallenges - Number of completed challenges
   * @returns {string} Current journey phase
   */
  determineUserPhase(user, completedChallenges) {
    if (!user || !user.profile) {
      return USER_JOURNEY_PHASES.ONBOARDING;
    }
    // Check if user has completed profile
    const hasCompletedProfile = Boolean(user.profile.personalityTraits);
    if (!hasCompletedProfile) {
      return USER_JOURNEY_PHASES.ONBOARDING;
    }
    // Determine phase based on completed challenges
    if (completedChallenges < 5) {
      return USER_JOURNEY_PHASES.BEGINNER;
    } else if (completedChallenges < 15) {
      return USER_JOURNEY_PHASES.INTERMEDIATE;
    } else if (completedChallenges < 30) {
      return USER_JOURNEY_PHASES.ADVANCED;
    } else {
      return USER_JOURNEY_PHASES.EXPERT;
    }
  }
  /**
   * Generate insights and recommendations for user's journey
   *
   * @param {string} phase - User's current phase
   * @param {string} engagement - User's engagement level
   * @returns {Object} Insights and personalized recommendations
   */
  generateInsightsAndRecommendations(phase, engagement) {
    const insights = [];
    const recommendations = [];
    // Add phase-based insights
    switch (phase) {
      case USER_JOURNEY_PHASES.ONBOARDING:
        insights.push('You are just getting started on your learning journey');
        recommendations.push('Complete your profile to get personalized challenges');
        break;
      case USER_JOURNEY_PHASES.BEGINNER:
        insights.push('You are building foundational skills');
        recommendations.push('Try different challenge types to discover your strengths');
        break;
      case USER_JOURNEY_PHASES.INTERMEDIATE:
        insights.push('You are developing deeper understanding');
        recommendations.push('Focus on your weaker areas to build a well-rounded profile');
        break;
      case USER_JOURNEY_PHASES.ADVANCED:
        insights.push('You are demonstrating advanced skills');
        recommendations.push('Challenge yourself with more difficult challenges');
        break;
      case USER_JOURNEY_PHASES.EXPERT:
        insights.push('You are operating at an expert level');
        recommendations.push('Try creating your own challenges to test your mastery');
        break;
    }
    // Add engagement-based insights
    switch (engagement) {
      case 'active':
        insights.push('You are regularly engaged with learning');
        recommendations.push('Keep up the momentum with daily challenges');
        break;
      case 'engaged':
        insights.push('You are maintaining consistent engagement');
        recommendations.push('Consider setting a schedule for more regular practice');
        break;
      case 'casual':
        insights.push('Your engagement is occasional');
        recommendations.push('Try to establish a more consistent learning routine');
        break;
      case 'inactive':
        insights.push('It has been a while since your last activity');
        recommendations.push('Start with a simple challenge to get back into practice');
        break;
    }
    return {
      insights,
      recommendations
    };
  }
  /**
   * Calculate activity metrics from challenge events
   *
   * @param {Array} challengeEvents - Challenge completion events
   * @returns {Object} Calculated activity metrics
   */
  calculateActivityMetrics(challengeEvents) {
    if (!challengeEvents || challengeEvents.length === 0) {
      return {
        totalChallenges: 0,
        averageScore: 0,
        streakDays: 0,
        lastChallenge: null
      };
    }
    // Sort events by date
    const sortedEvents = [...challengeEvents].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    // Calculate metrics
    const lastChallenge = sortedEvents[0].timestamp;
    const scores = sortedEvents.map(event => event.data?.score).filter(Boolean);
    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    // Calculate streak days
    // Sort by date ascending for streak calculation
    const datesSorted = [...challengeEvents].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map(event => {
      const date = new Date(event.timestamp);
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    });
    // Count consecutive days
    let currentStreak = 1;
    let maxStreak = 1;
    for (let i = 1; i < datesSorted.length; i++) {
      if (datesSorted[i] === datesSorted[i - 1]) {
        continue; // Same day, skip
      }
      const prevDate = new Date(datesSorted[i - 1]);
      const currDate = new Date(datesSorted[i]);
      // Check if dates are consecutive
      const diffTime = Math.abs(currDate - prevDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    return {
      totalChallenges: challengeEvents.length,
      averageScore: Math.round(averageScore * 100) / 100,
      streakDays: maxStreak,
      lastChallenge
    };
  }
  /**
   * Get session timeout in milliseconds from config
   *
   * @param {Object} config - Application configuration object
   * @returns {number} Session timeout in milliseconds
   */
  getSessionTimeoutMs(config) {
    // Default to 30 minutes if config is not provided
    const timeoutMinutes = config?.userJourney?.sessionTimeoutMinutes || 30;
    return timeoutMinutes * 60 * 1000; // Convert minutes to milliseconds
  }
  /**
   * Update user session data and handle timeouts
   *
   * @param {Object} journeyMeta - Current journey metadata
   * @param {Date|string} currentTime - Current timestamp
   * @param {Object} config - Application configuration
   * @returns {Object} Updated journey metadata
   */
  updateSessionData(journeyMeta, currentTime = new Date(), config = null) {
    if (!journeyMeta) {
      journeyMeta = {
        lastActivity: null,
        engagementLevel: 'new',
        sessionCount: 0,
        currentSessionStarted: null,
        currentPhase: 'onboarding'
      };
    }
    const timestamp = currentTime instanceof Date ? currentTime.toISOString() : currentTime;
    const currentDate = currentTime instanceof Date ? currentTime : new Date(currentTime);
    const lastActivityDate = journeyMeta.lastActivity ? new Date(journeyMeta.lastActivity) : null;
    // Get the session timeout value from config
    const sessionTimeoutMs = this.getSessionTimeoutMs(config);
    // Update session data
    // If no previous session or session timeout has occurred, start a new session
    if (!journeyMeta.currentSessionStarted || !lastActivityDate || currentDate - lastActivityDate > sessionTimeoutMs) {
      journeyMeta.sessionCount = (journeyMeta.sessionCount || 0) + 1;
      journeyMeta.currentSessionStarted = timestamp;
    }
    // Always update the last activity time
    journeyMeta.lastActivity = timestamp;
    return journeyMeta;
  }
}
export default UserJourneyService;"