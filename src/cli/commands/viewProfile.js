/**
 * View Profile Command
 * Handles viewing user profile functionality
 */
const { prompt } = require('../utils/cliPrompt');
const { 
  formatOutput, 
  formatSuccess, 
  formatError, 
  formatHeader 
} = require('../utils/formatter');

// Import container to access dependencies
const container = require('../../config/container');
const userService = container.get('userService');
const { logger } = require('../../core/infra/logging/logger');

/**
 * View a user's profile
 * @returns {Promise<Object|null>} - The user profile or null if retrieval failed
 */
async function viewProfile() {
  logger.info(formatHeader('User Profile'));
  
  try {
    const email = await prompt('Email: ');
    
    logger.info('Retrieving user profile', { email });
    
    try {
      // Use the unified service method instead of getUserByEmail directly
      const user = await userService.retrieveUserProfile(email);
      
      logger.info('User profile retrieved successfully', { email, userId: user.id });
      
      logger.info(formatSuccess('\nUser profile retrieved successfully!'));
      
      // Display basic info
      logger.info(formatHeader('Basic Information'));
      logger.info(`Email: ${user.email}`);
      logger.info(`Name: ${user.fullName}`);
      logger.info(`Professional Title: ${user.professionalTitle}`);
      logger.info(`Location: ${user.location}, ${user.country}`);
      logger.info(`Created: ${new Date(user.createdAt).toLocaleDateString()}`);
      logger.info(`Last Active: ${new Date(user.lastActive).toLocaleDateString()}`);
      
      // Display personality traits
      logger.info(formatHeader('Personality Traits'));
      if (user.personalityTraits) {
        Object.entries(user.personalityTraits).forEach(([trait, value]) => {
          logger.info(`${trait}: ${value}`);
        });
      } else {
        logger.info('No personality traits data available');
      }
      
      // Display AI attitudes
      logger.info(formatHeader('AI Attitudes'));
      if (user.aiAttitudes) {
        Object.entries(user.aiAttitudes).forEach(([attitude, value]) => {
          logger.info(`${attitude}: ${value}`);
        });
      } else {
        logger.info('No AI attitudes data available');
      }
      
      // Display dominant traits
      logger.info(formatHeader('Dominant Traits'));
      if (user.dominantTraits && user.dominantTraits.length > 0) {
        user.dominantTraits.forEach(trait => logger.info(`- ${trait}`));
      } else {
        logger.info('No dominant traits data available');
      }
      
      // Display insights if available
      if (user.insights) {
        logger.info(formatHeader('Personality Insights'));
        logger.info(user.insights.summary || 'No summary available');
        
        if (user.insights.suggestedFocusAreas && user.insights.suggestedFocusAreas.length > 0) {
          logger.info('\nSuggested Focus Areas:');
          user.insights.suggestedFocusAreas.forEach(area => logger.info(`- ${area}`));
        }
      }
      
      // Display performance if available
      if (user.performance) {
        logger.info(formatHeader('Performance'));
        logger.info(`Completed Challenges: ${user.performance.completedChallenges}`);
        logger.info(`Average Score: ${user.performance.averageScore}`);
        
        if (user.performance.strengthAreas && user.performance.strengthAreas.length > 0) {
          logger.info('\nStrength Areas:');
          user.performance.strengthAreas.forEach(area => logger.info(`- ${area}`));
        }
        
        if (user.performance.improvementAreas && user.performance.improvementAreas.length > 0) {
          logger.info('\nImprovement Areas:');
          user.performance.improvementAreas.forEach(area => logger.info(`- ${area}`));
        }
        
        if (user.performance.streaks) {
          logger.info(`\nCurrent Streak: ${user.performance.streaks.current}`);
          logger.info(`Longest Streak: ${user.performance.streaks.longest}`);
        }
      }
      
      // Optionally show full data for debugging
      const showRaw = await prompt('\nShow raw data? (y/n): ');
      if (showRaw.toLowerCase() === 'y') {
        logger.info(formatHeader('Raw User Data'));
        logger.info(formatOutput(user, true));
      }
      
      return user;
    } catch (serviceError) {
      logger.error('Error retrieving user profile', { 
        error: serviceError.message, 
        stack: serviceError.stack,
        email 
      });
      
      logger.info(formatError(`\nFailed to retrieve user profile: ${serviceError.message}`));
      return null;
    }
  } catch (error) {
    logger.error('Unexpected error viewing profile', { 
      error: error.message, 
      stack: error.stack 
    });
    
    logger.info(formatError(`\nUnexpected error: ${error.message}`));
    return null;
  }
}

module.exports = {
  viewProfile
};
