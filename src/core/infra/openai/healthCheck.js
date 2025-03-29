'use strict';

/**
 * OpenAI API Health Check
 * 
 * Utility function to check the health of the OpenAI API connection
 * Performs a lightweight health check by making a minimal API call
 */

const { apiLogger } = require('../logging/domainLogger');

/**
 * Check the health of the OpenAI API connection
 * @param {Object} openAIClient - Instance of OpenAIClient
 * @returns {Promise<Object>} Health check results with status and response time
 */
async function checkOpenAIStatus(openAIClient) {
  if (!openAIClient) {
    return {
      status: 'error',
      message: 'OpenAI client not provided',
      responseTime: 0
    };
  }

  const logger = apiLogger.child({ service: 'openai-health-check' });
  
  try {
    // Start timing
    const startTime = Date.now();
    
    // Simple test message using the model's echo capability
    // This is the lightest possible call we can make to verify API connectivity
    const testMessage = {
      input: 'System check. Please respond with the word \'healthy\' and nothing else.'
    };
    
    const options = {
      model: 'gpt-3.5-turbo', // Use the fastest/cheapest model for health checks
      temperature: 0,         // Use 0 temperature for deterministic responses
      max_tokens: 10          // Limit the tokens to keep the check lightweight
    };

    // Send the message and await response
    const _response = await openAIClient.sendMessage(testMessage, options);
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // If we get here without errors, the API is responsive
    return {
      status: 'healthy',
      message: 'OpenAI API connection is healthy',
      responseTime: responseTime,
      model: options.model
    };
  } catch (error) {
    logger.warn('OpenAI health check failed', { error: error.message });
    
    return {
      status: 'error',
      message: `OpenAI API connection error: ${error.message}`,
      error: error.message
    };
  }
}

module.exports = { 
  checkOpenAIStatus 
}; 