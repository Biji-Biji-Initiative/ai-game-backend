/**
 * JSON Formatter
 * 
 * Formats and validates JSON responses from AI models
 * 
 * @module jsonFormatter
 * @requires zod
 */

const { z } = require('zod');
const { logger } = require('../../../core/infra/logging/logger');

/**
 * Helper function for logging if logger exists
 */
function log(level, message, meta = {}) {
  if (logger && typeof logger[level] === 'function') {
    logger[level](message, meta);
  } else {
    console[level === 'error' ? 'error' : 'log'](message, meta);
  }
}

/**
 * Format a response as JSON
 * @param {string|Object} response - The response to format
 * @param {Object} [options] - Formatting options
 * @param {Object} [options.schema] - Zod schema to validate against
 * @returns {Object} The formatted and validated JSON
 * @throws {Error} If parsing or validation fails
 */
function formatJson(response, options = {}) {
  try {
    // If response is already an object, use it directly
    let jsonObject;
    if (typeof response === 'object' && response !== null) {
      jsonObject = response;
    } else if (typeof response === 'string') {
      // Clean up the response string
      const cleanedResponse = cleanJsonString(response);
      
      // Parse the JSON
      try {
        jsonObject = JSON.parse(cleanedResponse);
      } catch (parseError) {
        log('error', 'Failed to parse JSON response', {
          error: parseError.message,
          response: response.substring(0, 200) + '...' // Log truncated response
        });
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }
    } else {
      throw new Error(`Invalid response type: ${typeof response}`);
    }
    
    // Validate against schema if provided
    if (options.schema) {
      try {
        const validatedJson = options.schema.parse(jsonObject);
        return validatedJson;
      } catch (validationError) {
        log('error', 'JSON validation failed', {
          error: validationError.message
        });
        throw new Error(`JSON validation failed: ${validationError.message}`);
      }
    }
    
    return jsonObject;
  } catch (error) {
    log('error', 'Error formatting JSON', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Clean a JSON string by removing markdown formatting and other non-JSON elements
 * @param {string} jsonString - The JSON string to clean
 * @returns {string} The cleaned JSON string
 * @private
 */
function cleanJsonString(jsonString) {
  if (!jsonString) {
    return '{}';
  }
  
  let cleaned = jsonString;
  
  // Remove markdown code blocks
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1];
  }
  
  // Remove leading/trailing non-JSON content
  const jsonStartMatch = cleaned.match(/\s*(\{|\[)/);
  if (jsonStartMatch) {
    const startIndex = jsonStartMatch.index;
    cleaned = cleaned.substring(startIndex);
    
    // Find matching closing bracket/brace
    let openCount = 0;
    let closeIndex = cleaned.length - 1;
    
    const firstChar = cleaned.charAt(0);
    const matchingChar = firstChar === '{' ? '}' : ']';
    
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned.charAt(i);
      if (char === firstChar) {
        openCount++;
      } else if (char === matchingChar) {
        openCount--;
        if (openCount === 0) {
          closeIndex = i;
          break;
        }
      }
    }
    
    cleaned = cleaned.substring(0, closeIndex + 1);
  }
  
  return cleaned;
}

module.exports = {
  formatJson
}; 