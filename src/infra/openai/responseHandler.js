/**
 * Response Handler for OpenAI Responses API
 * 
 * Processes responses from the OpenAI Responses API, handling various formats,
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
 * Schema for validating Responses API response structure
 */
const responsesApiResponseSchema = z.object({
  id: z.string(),
  responseId: z.string().optional(),
  output: z.array(z.object({
    type: z.literal('message'),
    role: z.literal('assistant'),
    content: z.array(z.object({
      type: z.literal('text'),
      text: z.string()
    }))
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number()
  }).optional()
});

/**
 * Schema for validating JSON structure in the response
 * This is a flexible schema that allows for different data structures
 */
const jsonResponseSchema = z.object({
  // Challenge data schema
  title: z.string().optional(),
  description: z.string().optional(),
  content: z.object({
    context: z.string().optional(),
    scenario: z.string().optional(),
    instructions: z.array(z.string()).or(z.string()).optional()
  }).optional(),
  questions: z.array(z.object({
    id: z.string().optional(),
    text: z.string(),
    type: z.string().optional(),
    options: z.array(z.string()).optional()
  })).optional(),
  data: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  evaluationCriteria: z.record(z.any()).or(z.array(z.any())).optional(),
  recommendations: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    url: z.string().optional(),
    type: z.string().optional()
  })).optional()
}).or(z.record(z.any()));

/**
 * Handles responses from OpenAI Responses API
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
   * Process a response from OpenAI Responses API
   * @param {Object} response - Raw response from OpenAI
   * @returns {Object} Processed response
   * @throws {OpenAIResponseHandlingError} If response is invalid
   */
  process(response) {
    if (!response) {
      throw new OpenAIResponseHandlingError('No response received');
    }

    try {
      // Validate response structure
      const validatedResponse = responsesApiResponseSchema.parse(response);
      
      // Extract the message content from the response
      const assistantMessage = validatedResponse.output.find(item => 
        item.type === 'message' && item.role === 'assistant'
      );
      
      if (!assistantMessage || !assistantMessage.content) {
        throw new OpenAIResponseHandlingError('No assistant message found in the response');
      }
      
      // Get the text content from the output
      const textOutput = assistantMessage.content.find(item => 
        item.type === 'text'
      );
      
      if (!textOutput) {
        throw new OpenAIResponseHandlingError('No text output found in the response');
      }
      
      return {
        id: validatedResponse.id,
        responseId: validatedResponse.responseId || validatedResponse.id,
        content: textOutput.text,
        usage: validatedResponse.usage
      };
    } catch (error) {
      this.logger.error('Error processing OpenAI response', {
        error: error.message,
        stack: error.stack,
        response: typeof response === 'object' ? JSON.stringify(response).substring(0, 500) : 'Invalid response'
      });
      
      throw new OpenAIResponseHandlingError('Failed to process OpenAI response', {
        cause: error,
        context: { responseType: typeof response }
      });
    }
  }

  /**
   * Extract text content from a response
   * @param {Object} response - OpenAI Responses API response
   * @returns {string} Extracted text
   * @throws {OpenAIResponseHandlingError} If content cannot be extracted
   */
  extractText(response) {
    const processed = this.process(response);
    return processed.content;
  }

  /**
   * Format a response as JSON
   * @param {Object} response - OpenAI Responses API response
   * @param {Object} [options] - Formatting options
   * @param {Object} [options.schema] - Zod schema to validate against
   * @param {boolean} [options.strictMode] - Whether to use strict validation
   * @returns {Object} The formatted and validated JSON
   * @throws {OpenAIResponseHandlingError} If parsing or validation fails
   */
  formatJson(response, options = {}) {
    const text = this.extractText(response);
    
    try {
      // Clean the JSON string to remove any markdown formatting
      const cleanedJson = cleanJsonString(text);
      
      // Parse the JSON
      let parsed;
      try {
        parsed = JSON.parse(cleanedJson);
      } catch (parseError) {
        // Try to extract JSON from text by finding the first { and last }
        const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (innerError) {
            throw parseError; // If the extracted JSON is also invalid, throw the original error
          }
        } else {
          throw parseError;
        }
      }
      
      // Apply schema validation
      if (options.schema) {
        // Custom schema validation
        options.schema.parse(parsed);
      } else if (options.strictMode !== false) {
        // Default schema validation
        jsonResponseSchema.parse(parsed);
      }
      
      return parsed;
    } catch (error) {
      this.logger.error('Error parsing JSON response', {
        error: error.message,
        stack: error.stack,
        responseContent: text.substring(0, 500) + (text.length > 500 ? '...' : '')
      });
      
      throw new OpenAIResponseHandlingError('Failed to parse JSON response', {
        cause: error,
        context: { responseContentLength: text.length }
      });
    }
  }

  /**
   * Process a tool call response
   * @param {Object} response - OpenAI Responses API response 
   * @returns {Object} The processed tool call
   * @throws {OpenAIResponseHandlingError} If processing fails
   */
  processToolCall(response) {
    if (!response) {
      throw new OpenAIResponseHandlingError('No response received for tool call');
    }

    try {
      // Validate response structure
      const validatedResponse = responsesApiResponseSchema.parse(response);
      
      // Find the tool call message if it exists
      const toolCallMessage = validatedResponse.output.find(item => 
        item.type === 'message' && item.role === 'assistant'
      );
      
      if (!toolCallMessage) {
        throw new OpenAIResponseHandlingError('No assistant message found in the tool call response');
      }

      // Process tool calls
      return {
        id: validatedResponse.id,
        responseId: validatedResponse.responseId || validatedResponse.id,
        toolCall: toolCallMessage,
        usage: validatedResponse.usage
      };
    } catch (error) {
      this.logger.error('Error processing tool call response', {
        error: error.message,
        stack: error.stack
      });
      
      throw new OpenAIResponseHandlingError('Failed to process tool call response', {
        cause: error
      });
    }
  }
}

/**
 * Extracts the message content from an OpenAI Responses API response
 * @param {Object} response - OpenAI Responses API response object
 * @returns {string|null} Extracted content as string, or null if not found
 * @throws {OpenAIResponseHandlingError} If response format is invalid
 */
const extractMessageContent = (response) => {
  try {
    if (!response || !response.output || !Array.isArray(response.output)) {
      throw new OpenAIResponseHandlingError('Invalid response structure');
    }

    const assistantMessage = response.output.find(item => 
      item.type === 'message' && item.role === 'assistant'
    );
    
    if (!assistantMessage || !assistantMessage.content) {
      return null;
    }
    
    const textOutput = assistantMessage.content.find(item => 
      item.type === 'text'
    );
    
    return textOutput ? textOutput.text : null;
  } catch (error) {
    throw new OpenAIResponseHandlingError('Invalid response format', { cause: error });
  }
};

/**
 * Clean a JSON string by removing markdown formatting and other non-JSON elements
 * @param {string} jsonString - The JSON string to clean
 * @returns {string} The cleaned JSON string
 * @private
 */
const cleanJsonString = (jsonString) => {
  if (!jsonString || typeof jsonString !== 'string') {
    return '{}';
  }

  // Remove markdown formatting
  let cleaned = jsonString
    .replace(/```(?:json)?([\s\S]*?)```/g, '$1') // Extract JSON from code blocks
    .replace(/`([^`]*)`/g, '$1') // Extract content from inline code
    .replace(/\*\*([^*]*)\*\*/g, '$1') // Extract content from bold
    .replace(/\*([^*]*)\*/g, '$1') // Extract content from italic
    .replace(/\[[^\]]*\]\([^\)]*\)/g, '') // Remove links
    .replace(/^\s*(?:```)?\s*json/i, '') // Remove json tag if present
    .replace(/\n/g, ' '); // Replace newlines with spaces
  
  // Try to extract just the JSON object if there's text around it
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned.trim();
};

/**
 * Format JSON response data for the Responses API
 * @param {string|Object} response - Response content to format
 * @returns {Object} Formatted JSON object
 */
const formatJson = (response) => {
  if (!response) {
    return null;
  }

  if (typeof response === 'object') {
    // If it's already an object, extract the text content
    if (response.output && Array.isArray(response.output)) {
      const content = extractMessageContent(response);
      if (content) {
        const cleaned = cleanJsonString(content);
        try {
          return JSON.parse(cleaned);
        } catch (error) {
          throw new OpenAIResponseHandlingError('Failed to parse JSON in response object');
        }
      }
      return null;
    }
    return response; // It's already a parsed object
  }

  // If it's a string, try to parse it as JSON
  try {
    const cleaned = cleanJsonString(response);
    return JSON.parse(cleaned);
  } catch (error) {
    throw new OpenAIResponseHandlingError('Failed to parse JSON from string response');
  }
};

module.exports = {
  OpenAIResponseHandler,
  extractMessageContent,
  cleanJsonString,
  formatJson
};