/**
 * Response Parser for OpenAI Responses API
 * 
 * Provides utilities for parsing and processing responses from the OpenAI Responses API.
 * This module handles structured outputs, function calls, and content extraction.
 * 
 * IMPORTANT: This implementation EXCLUSIVELY uses OpenAI Responses API, NEVER
 * Chat Completions API or Assistants API.
 * 
 * @module responseParser
 * @requires logger
 */

const { logger } = require('../logger');
const { ApiIntegrationError } = require('../errors/promptGenerationErrors');

/**
 * Extracts text content from a Responses API response
 * @param {Object} response - Response object from the Responses API
 * @returns {string} Extracted text content
 * @throws {ApiIntegrationError} If the response format is invalid
 */
const extractTextContent = (response) => {
  try {
    if (!response || !response.content) {
      throw new Error('Invalid response format: missing content');
    }
    
    // Find text content in the response
    const textContent = response.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');
    
    if (!textContent) {
      logger.warn('No text content found in response', { responseId: response.id });
      return '';
    }
    
    return textContent;
  } catch (error) {
    logger.error('Error extracting text content from response', {
      error: error.message,
      responseId: response?.id
    });
    
    throw new ApiIntegrationError('responseParser', error, {
      responseId: response?.id
    });
  }
};

/**
 * Parses JSON content from a Responses API response
 * @param {Object} response - Response object from the Responses API
 * @param {Object} [options] - Options for parsing
 * @param {Object} [options.schema] - JSON Schema for validation
 * @returns {Object} Parsed JSON data
 * @throws {ApiIntegrationError} If the response cannot be parsed as JSON
 */
const parseJsonResponse = (response, options = {}) => {
  try {
    const textContent = extractTextContent(response);
    
    if (!textContent) {
      throw new Error('No content to parse as JSON');
    }
    
    // Parse the JSON content
    let parsedJson;
    try {
      parsedJson = JSON.parse(textContent);
    } catch (parseError) {
      logger.error('Failed to parse JSON response', {
        error: parseError.message,
        content: textContent.substring(0, 100) + '...'
      });
      
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }
    
    // Validate against schema if provided
    if (options.schema) {
      // Schema validation would go here
      // For now, just log that we would validate
      logger.debug('JSON schema validation would be performed here', {
        schema: options.schema
      });
    }
    
    return parsedJson;
  } catch (error) {
    logger.error('Error parsing JSON response', {
      error: error.message,
      responseId: response?.id
    });
    
    throw new ApiIntegrationError('jsonParser', error, {
      responseId: response?.id
    });
  }
};

/**
 * Extracts tool calls from a Responses API response
 * @param {Object} response - Response object from the Responses API
 * @returns {Array} Array of tool calls
 */
const extractToolCalls = (response) => {
  try {
    if (!response || !response.content) {
      throw new Error('Invalid response format: missing content');
    }
    
    const toolCalls = [];
    
    // Find tool call content in the response
    for (const item of response.content) {
      if (item.type === 'tool_call') {
        toolCalls.push(item.tool_call);
      }
    }
    
    return toolCalls;
  } catch (error) {
    logger.error('Error extracting tool calls from response', {
      error: error.message,
      responseId: response?.id
    });
    
    throw new ApiIntegrationError('toolCallExtractor', error, {
      responseId: response?.id
    });
  }
};

/**
 * Creates a structured result object from a Responses API response
 * @param {Object} response - Response object from the Responses API
 * @returns {Object} Structured result with content, tool calls, and metadata
 */
const createStructuredResult = (response) => {
  try {
    if (!response) {
      throw new Error('Response is required');
    }
    
    // Extract different components from the response
    const textContent = extractTextContent(response);
    const toolCalls = extractToolCalls(response);
    
    // Create structured result
    return {
      responseId: response.id,
      content: textContent,
      toolCalls,
      metadata: {
        model: response.model,
        created: response.created,
        usage: response.usage
      }
    };
  } catch (error) {
    logger.error('Error creating structured result', {
      error: error.message,
      responseId: response?.id
    });
    
    throw new ApiIntegrationError('structuredResult', error, {
      responseId: response?.id
    });
  }
};

module.exports = {
  extractTextContent,
  parseJsonResponse,
  extractToolCalls,
  createStructuredResult
};
