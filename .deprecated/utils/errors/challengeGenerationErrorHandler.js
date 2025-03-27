/**
 * Challenge Generation Error Handler
 * Handles errors when challenge generation fails
 */
const { logger } = require('../logger');

/**
 * Throws an error when challenge generation fails
 * @param {string} challengeType - Type of challenge
 * @param {string} difficulty - Difficulty level
 * @param {Error} originalError - The original error that caused the failure
 * @throws {Error} Always throws an error with detailed information
 */
const handleChallengeGenerationError = (challengeType = 'unknown-type', difficulty = 'unknown', originalError = null) => {
  const errorContext = { challengeType, difficulty };
  
  if (originalError) {
    errorContext.originalError = originalError.message;
    errorContext.stack = originalError.stack;
  }
  
  logger.error('Challenge generation failed', errorContext);
  
  // Throw specific error with context information
  throw new Error(`Failed to generate a ${challengeType} challenge for ${difficulty} difficulty. The OpenAI Responses API could not process the request.`);
};

module.exports = {
  handleChallengeGenerationError
};
