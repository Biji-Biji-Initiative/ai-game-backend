/**
 * Register User Command
 * Handles user registration functionality
 * Refactored to use the unified service approach
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
const config = require('../../config/config');

/**
 * Register a new user
 * @returns {Promise<Object|null>} - The registered user or null if registration failed
 */
async function registerUser() {
  logger.info(formatHeader('User Registration'));
  
  try {
    // Ensure connections are initialized
    logger.info('Starting user registration process');
    
    // Prompt for user details
    logger.info(formatHeader('Collecting user details...'));
    const email = await prompt('Email: ');
    const fullName = await prompt('Full Name: ');
    const professionalTitle = await prompt('Professional Title: ');
    const location = await prompt('Location: ');
    const country = await prompt('Country: ');

    logger.info('Collected basic user details', { email });

    logger.info(formatHeader('Personality Traits (Rate 0-100)'));
    const personalityTraits = {
      analyticalThinking: parseInt(await prompt('Analytical Thinking: ')),
      creativity: parseInt(await prompt('Creativity: ')),
      empathy: parseInt(await prompt('Empathy: ')),
      adaptability: parseInt(await prompt('Adaptability: ')),
      assertiveness: parseInt(await prompt('Assertiveness: '))
    };

    logger.info('Collected personality traits', { 
      email, 
      personalityTraits: JSON.stringify(personalityTraits) 
    });

    logger.info(formatHeader('AI Attitudes (Rate 0-100)'));
    const aiAttitudes = {
      trust: parseInt(await prompt('Trust in AI: ')),
      jobConcerns: parseInt(await prompt('Job Displacement Concerns: ')),
      impact: parseInt(await prompt('Perceived Positive Impact: ')),
      interest: parseInt(await prompt('Interest in AI: ')),
      interaction: parseInt(await prompt('AI Interaction Frequency: '))
    };

    logger.info('Collected AI attitudes', { 
      email, 
      aiAttitudes: JSON.stringify(aiAttitudes) 
    });

    const userData = {
      email,
      fullName,
      professionalTitle,
      location,
      country,
      personalityTraits,
      aiAttitudes
    };

    logger.info(formatHeader('Processing registration with the following data'));
    logger.info(formatOutput(userData, true));

    try {
      // Use the unified service method instead of createUser directly
      logger.info('Calling userService.registerAndProcessUser', { email });
      const user = await userService.registerAndProcessUser(userData);
      logger.info('User registered successfully', { userId: user.id, email });
      
      logger.info(formatSuccess('\nUser registered successfully!'));
      logger.info(formatOutput(user, true));
      
      return user;
    } catch (serviceError) {
      logger.error('Failed to register user', { 
        error: serviceError.message, 
        stack: serviceError.stack, 
        email 
      });
      
      logger.info(formatError(`\nRegistration failed: ${serviceError.message}`));
      return null;
    }
  } catch (error) {
    logger.error('Unexpected error during registration', { 
      error: error.message, 
      stack: error.stack 
    });
    
    logger.info(formatError(`\nUnexpected error during registration: ${error.message}`));
    logger.info(formatError(error.stack));
    return null;
  }
}

module.exports = {
  registerUser
};
