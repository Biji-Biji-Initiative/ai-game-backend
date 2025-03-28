/**
 * User Journey Service
 * 
 * Domain service that handles the core business logic for tracking and analyzing
 * user journey events. This service follows DDD principles with domain logic
 * isolated from infrastructure concerns.
 */
const { logger } = require('../../infrastructure/logging/logger');
const UserJourneyEvent = require('../models/UserJourneyEvent');
const { v4: uuidv4 } = require('uuid');

/**
 * Format a user event for storage
 * @param {string} userEmail - User's email
 * @param {string} eventType - Type of event
 * @param {Object} eventData - Event data
 * @param {string|null} challengeId - Optional challenge ID
 * @returns {UserJourneyEvent} Formatted event
 */
const formatUserEvent = (userEmail, eventType, eventData = {}, challengeId = null) => {
  return new UserJourneyEvent({
    id: uuidv4(),
    userEmail,
    eventType,
    eventData,
    challengeId,
    timestamp: new Date().toISOString()
  });
};

/**
 * Calculate user engagement level from session data and recent events
 * @param {Object} journeyMeta - Journey metadata
 * @param {Array} recentEvents - Recent events
 * @returns {string} Engagement level
 */
const calculateEngagementLevel = (journeyMeta, recentEvents) => {
  // Get recent event count (within last 2 weeks)
  const now = new Date();
  const twoWeeksAgo = new Date(now.setDate(now.getDate() - 14));
  const recentEventCount = recentEvents.filter(
    e => new Date(e.timestamp) > twoWeeksAgo
  ).length;
  
  // Determine engagement level based on session count and recent activity
  if (journeyMeta.sessionCount <= 1) {
    return 'new';
  } else if (recentEventCount === 0) {
    return 'inactive';
  } else if (recentEventCount < 3) {
    return 'casual';
  } else if (recentEventCount < 10) {
    return 'regular';
  } else {
    return 'power_user';
  }
};

/**
 * Determine user phase based on onboarding status and completed challenges
 * @param {Object} user - User data
 * @param {number} completedChallenges - Count of completed challenges
 * @returns {string} User phase
 */
const determineUserPhase = (user, completedChallenges) => {
  if (!user.onboardingCompleted) {
    return 'onboarding';
  } else if (completedChallenges === 0) {
    return 'exploration';
  } else if (completedChallenges < 3) {
    return 'development';
  } else if (completedChallenges < 10) {
    return 'growth';
  } else {
    return 'mastery';
  }
};

/**
 * Generate insights and recommendations based on user's phase and engagement
 * @param {string} phase - User's current phase
 * @param {string} engagement - User's engagement level
 * @returns {Object} Insights and recommendations
 */
const generateInsightsAndRecommendations = (phase, engagement) => {
  let insights = [];
  let recommendations = [];
  
  // Generate phase-specific insights and recommendations
  switch (phase) {
    case 'onboarding':
      insights = ['User is starting their AI Fight Club journey'];
      recommendations = [
        'Complete personality assessment',
        'Explore AI attitude survey',
        'Try an initial challenge to get started'
      ];
      break;
      
    case 'exploration':
      insights = ['User is exploring the platform capabilities'];
      recommendations = [
        'Complete at least one challenge in each category',
        'Explore different focus areas to find your interests'
      ];
      break;
      
    case 'development':
      insights = [
        'User is developing their AI understanding',
        'Building foundation in cognitive skills'
      ];
      recommendations = [
        'Complete challenges in your weaker areas',
        'Try increasing difficulty level for more depth'
      ];
      break;
      
    case 'growth':
      insights = [
        'User shows consistent engagement',
        'Developing a balanced skill set'
      ];
      recommendations = [
        'Focus on advanced challenges',
        'Explore new focus areas to expand knowledge'
      ];
      break;
      
    case 'mastery':
      insights = [
        'User demonstrates strong understanding and engagement',
        'Regular participant with diverse challenge experience'
      ];
      recommendations = [
        'Engage with the most complex challenges',
        'Revisit areas with lower performance scores'
      ];
      break;
  }
  
  // Add engagement-based recommendations
  if (engagement === 'inactive') {
    recommendations.unshift('Welcome back! Try a new challenge to get back into it');
  } else if (engagement === 'power_user') {
    insights.push('Highly engaged platform user');
  }
  
  return { insights, recommendations };
};

/**
 * Calculate activity metrics from challenge events
 * @param {Array} challengeEvents - Challenge completion events
 * @returns {Object} Activity metrics
 */
const calculateActivityMetrics = (challengeEvents) => {
  const now = new Date();
  const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
  const oneMonthAgo = new Date(now.setDate(now.getDate() - 30));
  
  const weeklyActivity = challengeEvents.filter(e => new Date(e.timestamp) > oneWeekAgo).length;
  const monthlyActivity = challengeEvents.filter(e => new Date(e.timestamp) > oneMonthAgo).length;
  
  return {
    weeklyActivity,
    monthlyActivity,
    lastActive: challengeEvents.length > 0 ? challengeEvents[0].timestamp : null
  };
};

module.exports = {
  formatUserEvent,
  calculateEngagementLevel,
  determineUserPhase,
  generateInsightsAndRecommendations,
  calculateActivityMetrics
}; 