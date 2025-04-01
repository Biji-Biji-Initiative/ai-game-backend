import { apiLogger } from "#app/core/infra/logging/domainLogger.js";
'use strict';
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
  
  const logger = apiLogger.child({
    service: 'openai-health-check'
  });
  
  logger.debug('Starting OpenAI health check', { 
    clientType: typeof openAIClient,
    hasCheckHealth: typeof openAIClient.checkHealth === 'function' 
  });
  
  try {
    // If our custom client has a checkHealth method, use it directly
    if (typeof openAIClient.checkHealth === 'function') {
      logger.debug('Using client\'s built-in checkHealth method');
      return await openAIClient.checkHealth();
    }
    
    // Fall back to our implementation
    const startTime = Date.now();
    let isHealthy = false;
    let responseTime = 0;
    
    // Try to use the standard OpenAI SDK client
    if (openAIClient.chat && openAIClient.chat.completions && openAIClient.chat.completions.create) {
      logger.debug('Using standard OpenAI SDK client for health check');
      
      // Use a lower-cost model for the health check
      const response = await openAIClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: 'System check. Please respond with the word "healthy".' }],
        temperature: 0,
        max_tokens: 5
      });
      
      responseTime = Date.now() - startTime;
      isHealthy = !!response;
      logger.debug('Standard OpenAI health check succeeded', { responseTime });
    } 
    // Try to use our custom client adapter
    else if (openAIClient.sendMessage || openAIClient.generateResponse || openAIClient.generateChatCompletion) {
      logger.debug('Using custom OpenAI client for health check');
      
      // Try various methods that might be available
      if (openAIClient.sendMessage) {
        const response = await openAIClient.sendMessage({
          input: 'System check. Please respond with the word "healthy".'
        }, { model: 'gpt-3.5-turbo', temperature: 0, max_tokens: 5 });
        isHealthy = !!response;
      } 
      else if (openAIClient.generateChatCompletion) {
        const response = await openAIClient.generateChatCompletion(
          [{ role: 'system', content: 'System check. Please respond with the word "healthy".' }], 
          { temperature: 0, max_tokens: 5 }
        );
        isHealthy = !!response;
      }
      else if (openAIClient.generateResponse) {
        const response = await openAIClient.generateResponse(
          'System check. Please respond with the word "healthy".',
          { temperature: 0, max_tokens: 5 }
        );
        isHealthy = !!response;
      }
      
      responseTime = Date.now() - startTime;
      logger.debug('Custom OpenAI client health check succeeded', { responseTime });
    }
    // If we couldn't identify the client type
    else {
      logger.warn('Unknown OpenAI client type', { 
        properties: Object.keys(openAIClient),
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(openAIClient)),
        hasChat: !!openAIClient.chat,
        hasCompletions: openAIClient.chat ? !!openAIClient.chat.completions : false
      });
      
      // In development, return a mock "healthy" status
      if (process.env.NODE_ENV === 'development') {
        logger.info('Returning mock healthy status in development mode');
        return {
          status: 'healthy',
          message: 'OpenAI API mock connection (development mode)',
          responseTime: 0
        };
      }
      
      return {
        status: 'unknown',
        message: 'Could not determine OpenAI client type',
        clientInfo: {
          type: typeof openAIClient,
          properties: Object.keys(openAIClient)
        }
      };
    }
    
    // If we get here with isHealthy flag, the API is responsive
    return {
      status: isHealthy ? 'healthy' : 'unknown',
      message: isHealthy ? 'OpenAI API connection is healthy' : 'OpenAI health check inconclusive',
      responseTime: responseTime
    };
  } catch (error) {
    logger.warn('OpenAI health check failed', {
      error: error.message,
      stack: error.stack
    });
    
    // In development mode, return a mock "healthy" response
    if (process.env.NODE_ENV === 'development') {
      logger.info('Returning mock healthy status in development mode despite error');
      return {
        status: 'healthy',
        message: 'OpenAI API mock connection (development mode)',
        responseTime: 0
      };
    }
    
    return {
      status: 'error',
      message: `OpenAI API connection error: ${error.message}`,
      error: error.message
    };
  }
}

export { checkOpenAIStatus };
export default {
  checkOpenAIStatus
};