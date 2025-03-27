/**
 * Generate Challenge Command
 * Handles challenge generation functionality
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
const challengeCoordinator = container.get('challengeCoordinator');
const { logger } = require('../../core/infra/logging/logger');
const config = require('../../config/config');

/**
 * Generate a challenge for a user
 * @returns {Promise<Object|null>} - The generated challenge or null if generation failed
 */
async function generateChallenge() {
  logger.info(formatHeader('Challenge Generation'));
  
  try {
    // Prompt for challenge details
    const email = await prompt('Email: ');
    
    // Get focus areas from config
    const focusAreas = config.game.focusAreas;
    logger.info(formatHeader('Available Focus Areas'));
    focusAreas.forEach((area, index) => {
      logger.info(`${index + 1}. ${area}`);
    });
    
    const focusAreaIndex = parseInt(await prompt('Select a focus area (number): ')) - 1;
    const focusArea = focusAreas[focusAreaIndex] || focusAreas[0];
    
    // Get challenge types from config
    const challengeTypes = config.game.challengeTypes.map(ct => ct.id);
    logger.info(formatHeader('Available Challenge Types'));
    challengeTypes.forEach((type, index) => {
      logger.info(`${index + 1}. ${type}`);
    });
    
    const challengeTypeIndex = parseInt(await prompt('Select a challenge type (number): ')) - 1;
    const challengeType = challengeTypes[challengeTypeIndex] || challengeTypes[0];
    
    // Get format types for the selected challenge type
    const selectedChallengeType = config.game.challengeTypes.find(ct => ct.id === challengeType);
    const formatTypes = selectedChallengeType ? selectedChallengeType.formatTypes : ['scenario'];
    
    logger.info(formatHeader('Available Format Types'));
    formatTypes.forEach((format, index) => {
      logger.info(`${index + 1}. ${format}`);
    });
    
    const formatTypeIndex = parseInt(await prompt('Select a format type (number): ')) - 1;
    const formatType = formatTypes[formatTypeIndex] || formatTypes[0];
    
    logger.info(formatHeader('Select Difficulty'));
    logger.info('1. Easy');
    logger.info('2. Medium');
    logger.info('3. Hard');
    
    const difficultyChoice = await prompt('Select difficulty (number): ');
    const difficultyMap = { '1': 'easy', '2': 'medium', '3': 'hard' };
    const difficulty = difficultyMap[difficultyChoice] || 'medium';
    
    // Prepare parameters for the unified service method
    const params = {
      email,
      focusArea,
      challengeType,
      formatType,
      difficulty,
      config  // Pass config for validation
    };
    
    logger.info(formatHeader('Generating challenge with the following parameters'));
    logger.info(formatOutput(params, true));
    
    try {
      // Call the unified service method
      const challenge = await challengeCoordinator.generateAndPersistChallenge(params);
      
      logger.info(formatSuccess('\nChallenge generated successfully!'));
      logger.info(formatOutput(challenge, true));
      
      return challenge;
    } catch (serviceError) {
      logger.error('Error generating challenge', { 
        error: serviceError.message,
        stack: serviceError.stack,
        email,
        params: JSON.stringify(params)
      });
      
      logger.info(formatError(`\nFailed to generate challenge: ${serviceError.message}`));
      return null;
    }
  } catch (error) {
    logger.error('Unexpected error generating challenge', { 
      error: error.message,
      stack: error.stack
    });
    
    logger.info(formatError(`\nUnexpected error: ${error.message}`));
    return null;
  }
}

module.exports = {
  generateChallenge
};
