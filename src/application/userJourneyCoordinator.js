/**
 * User Journey Coordinator
 * 
 * Application-level coordinator that orchestrates tracking and analysis 
 * of user progression through the platform.
 * This coordinator follows DDD principles by coordinating across multiple domains.
 */
const { logger } = require('../core/infra/logging/logger');
const config = require('../config/config');
const userJourneyRepository = require('../core/userJourney/repositories/UserJourneyRepository');
const userJourneyService = require('../core/userJourney/services/UserJourneyService');
const container = require('../config/container');

// No longer getting repositories at module load time
// This fixes the circular dependency issue

/**
 * Record a user interaction event
 * @param {String} userEmail - User's email identifier
 * @param {String} eventType - Type of event (e.g., 'challenge_started', 'challenge_completed')
 * @param {Object} eventData - Additional data about the event
 * @param {String} challengeId - Optional associated challenge ID
 * @returns {Promise<Object>} The recorded event
 */
const recordUserEvent = async (userEmail, eventType, eventData = {}, challengeId = null) => {
  // Get repositories at runtime
  const userRepository = container.get('userRepository');
  
  try {
    if (!userEmail || !eventType) {
      logger.warn('Missing required parameters for recording user event');
      throw new Error('Missing required parameters');
    }
    
    // Use domain service to format the event
    const userEvent = userJourneyService.formatUserEvent(
      userEmail, 
      eventType, 
      eventData, 
      challengeId
    );
    
    // Record event in the database using repository
    const recordedEvent = await userJourneyRepository.recordEvent(
      userEmail, 
      eventType, 
      eventData, 
      challengeId
    );
    
    // Get user profile
    const user = await userRepository.getUserByEmail(userEmail);
    if (!user) {
      logger.warn(`User not found for event recording: ${userEmail}`);
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
    
    // Update journey metadata
    const timestamp = new Date().toISOString();
    journeyMeta.lastActivity = timestamp;
    
    // Get recent events to calculate metrics
    const recentEvents = await userJourneyRepository.getUserEvents(userEmail, 100);
    
    // Update user's phase, session data, and engagement level based on events
    await updateUserJourneyMetrics(userEmail, journeyMeta, recentEvents);
    
    logger.info(`Recorded user event: ${eventType}`, { 
      userEmail, 
      currentPhase: journeyMeta.currentPhase 
    });
    
    return recordedEvent;
  } catch (error) {
    logger.error('Error recording user event', { error: error.message });
    throw error;
  }
};

/**
 * Update user journey metrics and save to database
 * @param {String} userEmail - User's email
 * @param {Object} journeyMeta - Current journey metadata
 * @param {Array} recentEvents - Recent user events
 * @returns {Promise<Object>} Updated user
 */
const updateUserJourneyMetrics = async (userEmail, journeyMeta, recentEvents) => {
  // Get repositories at runtime
  const userRepository = container.get('userRepository');
  const challengeRepository = container.get('challengeRepository');
  
  try {
    // Get completed challenges count
    const challengeHistory = await challengeRepository.getUserChallengeHistory(userEmail);
    const completedChallenges = challengeHistory.filter(c => c.status === 'completed').length;
    
    // Get user data
    const user = await userRepository.getUserByEmail(userEmail);
    
    // Use domain service to determine user phase
    journeyMeta.currentPhase = userJourneyService.determineUserPhase(user, completedChallenges);
    
    // Update session data
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    const timestamp = new Date().toISOString();
    
    if (!journeyMeta.currentSessionStarted || 
        (new Date(timestamp) - new Date(journeyMeta.lastActivity) > SESSION_TIMEOUT_MS)) {
      journeyMeta.sessionCount = (journeyMeta.sessionCount || 0) + 1;
      journeyMeta.currentSessionStarted = timestamp;
    }
    
    // Use domain service to calculate engagement level
    journeyMeta.engagementLevel = userJourneyService.calculateEngagementLevel(journeyMeta, recentEvents);
    
    // Save updated journey metadata
    return await userRepository.updateUser(userEmail, { journeyMeta });
  } catch (error) {
    logger.error('Error updating user journey metrics', { error: error.message });
    throw error;
  }
};

/**
 * Get user journey insights
 * @param {String} userEmail - User's email
 * @returns {Promise<Object>} Journey insights and recommendations
 */
const getUserJourneyInsights = async (userEmail) => {
  // Get repositories at runtime
  const userRepository = container.get('userRepository');
  
  try {
    // Get user data
    const user = await userRepository.getUserByEmail(userEmail);
    if (!user) {
      throw new Error(`User not found: ${userEmail}`);
    }
    
    // Get user journey events
    const events = await userJourneyRepository.getUserEvents(userEmail, 100);
    
    // Get journey metadata or use defaults if not available
    const journeyMeta = user.journeyMeta || {
      currentPhase: 'onboarding',
      engagementLevel: 'new'
    };
    
    const phase = journeyMeta.currentPhase;
    const engagement = journeyMeta.engagementLevel;
    
    // Use domain service to generate insights and recommendations
    const { insights, recommendations } = userJourneyService.generateInsightsAndRecommendations(
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
    logger.error('Error generating user journey insights', { error: error.message });
    
    return {
      phase: 'unknown',
      insights: ['Unable to generate journey insights'],
      recommendations: ['Try a new challenge to continue your journey']
    };
  }
};

/**
 * Get user activity summary
 * @param {String} userEmail - User's email
 * @returns {Promise<Object>} Activity summary
 */
const getUserActivitySummary = async (userEmail) => {
  try {
    // Get event counts by type
    const eventCounts = await userJourneyRepository.getUserEventCountsByType(userEmail);
    
    // Get challenge events
    const challengeEvents = await userJourneyRepository.getUserEventsByType(userEmail, 'challenge_completed');
    
    // Use domain service to calculate activity metrics
    const activityMetrics = userJourneyService.calculateActivityMetrics(challengeEvents);
    
    return {
      totalEvents: Object.values(eventCounts).reduce((sum, count) => sum + count, 0),
      eventCounts,
      ...activityMetrics
    };
  } catch (error) {
    logger.error('Error getting user activity summary', { error: error.message });
    throw error;
  }
};

module.exports = {
  recordUserEvent,
  getUserJourneyInsights,
  getUserActivitySummary,
  updateUserJourneyMetrics
}; 