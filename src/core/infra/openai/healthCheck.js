import { apiLogger } from "../../infra/logging/domainLogger.js";
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
  
  try {
    // Use the client's built-in health check which includes circuit breaker status
    const healthResult = await openAIClient.checkHealth();
    
    // Handle mock mode
    if (healthResult.status === 'mock') {
      return {
        status: 'warning',
        message: 'OpenAI API is in mock mode (no API key)',
        circuitBreaker: healthResult.circuitBreaker
      };
    }
    
    // Handle unhealthy status
    if (healthResult.status === 'unhealthy') {
      return {
        status: 'error',
        message: `OpenAI API connection error: ${healthResult.error}`,
        error: healthResult.error,
        code: healthResult.code,
        circuitBreaker: healthResult.circuitBreaker
      };
    }
    
    // Return healthy status with circuit breaker info
    return {
      status: 'healthy',
      message: 'OpenAI API connection is healthy',
      models: healthResult.details?.modelsAvailable || 'unknown',
      circuitBreaker: healthResult.circuitBreaker
    };
  } catch (error) {
    logger.warn('OpenAI health check failed', {
      error: error.message,
      isCircuitBreakerError: error.isCircuitBreakerError || false
    });
    
    // Special handling for circuit breaker errors
    if (error.isCircuitBreakerError || error.code === 'circuit_open') {
      return {
        status: 'error',
        message: 'OpenAI API circuit breaker is open - API is temporarily unavailable',
        error: error.message,
        circuitBreaker: {
          status: 'open',
          reason: error.message
        }
      };
    }
    
    return {
      status: 'error',
      message: `OpenAI API connection error: ${error.message}`,
      error: error.message,
      circuitBreaker: {
        status: 'unknown'
      }
    };
  }
}

export { checkOpenAIStatus };
export default {
  checkOpenAIStatus
};