/**
 * Response Handler for OpenAI API
 * 
 * Processes responses from the OpenAI API, handling various formats,
 * extracting content, and providing utilities for specific response types.
 * 
 * @module responseHandler
 * @requires logger
 * @requires zod
 */

const { z } = require('zod');
const { OpenAIResponseHandlingError } = require('./errors');
const { logger } = require('../../core/infra/logging/logger');

/**
 * Handles responses from OpenAI API, providing methods to extract and parse content
 */
class OpenAIResponseHandler {
  /**
   * Creates a new response handler instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
    this.logger = options.logger || logger;
  }

  /**
   * Process a response from OpenAI
   * @param {Object} response - Raw response from OpenAI
   * @returns {Object} Processed response
   */
  process(response) {
    if (!response) {
      throw new OpenAIResponseHandlingError('No response received');
    }

    return response;
  }

  /**
   * Extract text content from a response
   * @param {Object} response - OpenAI response
   * @returns {string} Extracted text
   */
  extractText(response) {
    return extractMessageContent(response);
  }

  /**
   * Extract and parse JSON from a response
   * @param {Object} response - OpenAI response
   * @param {Object} schema - Optional Zod schema to validate against
   * @returns {Object} Parsed JSON
   */
  extractJson(response, schema) {
    return extractJsonFromResponse(response, { schema });
  }
}

/**
 * Extracts the message content from an OpenAI API response
 * @param {Object} response - OpenAI API response object
 * @returns {string|null} Extracted content as string, or null if not found
 */
function extractMessageContent(response) {
  if (!response) return null;
  
  try {
    // Handle Responses API format
    if (response.output) {
      // If output is an array (standard Responses API format)
      if (Array.isArray(response.output)) {
        // First look for content in output items of type output_text
        const outputText = response.output
          .filter(item => item.type === 'output_text')
          .map(item => item.text || '')
          .join('\n');
        
        if (outputText) return outputText;
        
        // Then look for text content in assistant messages
        const assistantMessages = response.output
          .filter(item => item.type === 'message' && item.role === 'assistant');
        
        if (assistantMessages.length > 0) {
          // Process content array in assistant messages
          for (const message of assistantMessages) {
            if (Array.isArray(message.content)) {
              const textContents = message.content
                .filter(item => item.type === 'text' || item.type === 'output_text')
                .map(item => item.text || '')
                .join('\n');
              
              if (textContents) return textContents;
            } else if (typeof message.content === 'string') {
              return message.content;
            }
          }
        }
      } 
      // If output is an object with content field
      else if (response.output.content) {
        if (Array.isArray(response.output.content)) {
          // Handle content array
          const textContents = response.output.content
            .filter(item => item.type === 'text' || item.type === 'output_text')
            .map(item => item.text || '')
            .join('\n');
          
          return textContents || null;
        }
        
        // Handle string content
        if (typeof response.output.content === 'string') {
          return response.output.content;
        }
      }
      
      // Fall back to output_text if it exists directly on the response
      if (response.output_text) {
        return response.output_text;
      }
    }
    
    // Handle Chat Completions API format (fallback)
    if (response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
      const message = response.choices[0].message;
      
      if (message && message.content) {
        return message.content;
      }
    }
    
    // Direct content access (last resort)
    if (response.content) {
      return response.content;
    }
    
    logger.warn('Could not extract message content from response', { 
      responseStructure: JSON.stringify(Object.keys(response))
    });
    
    return null;
  } catch (error) {
    logger.error('Error extracting message content', { error: error.message });
    return null;
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
  
  try {
    // Remove markdown code blocks
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const codeBlockMatch = cleaned.match(codeBlockRegex);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleaned = codeBlockMatch[1];
      // Log successful code block extraction
      logger.debug('Extracted JSON from code block', {
        before: jsonString.substring(0, 50),
        after: cleaned.substring(0, 50)
      });
    }
    
    // If the response still contains backticks, try a more aggressive approach
    if (cleaned.includes('```')) {
      logger.debug('JSON still contains backticks, attempting secondary cleanup');
      // Using a split approach as a fallback
      const parts = cleaned.split('```');
      // Find the part that looks most like JSON (has { or [ at the start)
      for (const part of parts) {
        const trimmed = part.trim();
        if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && 
            (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
          cleaned = trimmed;
          logger.debug('Found JSON-like part after split', { part: trimmed.substring(0, 50) });
          break;
        }
      }
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
    
    // Final validation - try to parse it to make sure it's valid JSON
    JSON.parse(cleaned);
    
    return cleaned;
  } catch (error) {
    logger.warn('Error cleaning JSON string', { 
      error: error.message, 
      jsonString: jsonString.substring(0, 200) 
    });
    // If our advanced cleaning fails, return the original string
    // The main JSON parser will handle the error appropriately
    return jsonString;
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
      // Log original response for debugging
      logger.debug('Attempting to parse JSON response', {
        responsePreview: response.substring(0, 100) + (response.length > 100 ? '...' : '')
      });
      
      // Clean up the response string
      const cleanedResponse = cleanJsonString(response);
      
      // Parse the JSON
      try {
        jsonObject = JSON.parse(cleanedResponse);
      } catch (parseError) {
        logger.error('Failed to parse JSON response', {
          error: parseError.message,
          content: response
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
        logger.error('JSON validation failed', {
          error: validationError.message
        });
        throw new Error(`JSON validation failed: ${validationError.message}`);
      }
    }
    
    return jsonObject;
  } catch (error) {
    logger.error('Error formatting JSON', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Extracts a JSON object from the response
 * @param {Object} response - OpenAI API response object
 * @param {Object} [options] - Options for JSON extraction
 * @param {Object} [options.schema] - Zod schema to validate against
 * @returns {Object|null} Extracted JSON object or null if not found/invalid
 */
function extractJsonFromResponse(response, options = {}) {
  const content = extractMessageContent(response);
  
  if (!content) return null;
  
  try {
    return formatJson(content, options);
  } catch (error) {
    logger.error('Error extracting JSON from response', { error: error.message });
    return null;
  }
}

// Export both the class and utility functions
module.exports = {
  OpenAIResponseHandler,
  extractMessageContent,
  extractJsonFromResponse,
  formatJson,
  cleanJsonString
}; 