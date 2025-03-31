import { z } from "zod";
"../../../infra/openai/errors.js25;
""../../../infra/logging/domainLogger.js104;
'use strict';
/**
 * Schema for validating Responses API response structure
 */
const responsesApiResponseSchema = z.object({
  id: z.string(),
  object: z.string().optional(),
  created_at: z.number().optional(),
  status: z.enum(['completed', 'failed', 'in_progress', 'incomplete']).optional(),
  output: z.array(z.object({
    type: z.string(),
    // Can be 'message' or 'tool_call' depending on the output
    id: z.string().optional(),
    status: z.enum(['completed', 'in_progress']).optional(),
    role: z.literal('assistant').optional(),
    // Only present for message type
    content: z.array(z.object({
      type: z.string(),
      // Can be 'output_text' or other types
      text: z.string().optional(),
      annotations: z.array(z.any()).optional()
    })).optional(),
    // content array only present for message type
    tool_call: z.object({
      id: z.string(),
      type: z.literal('function'),
      function: z.object({
        name: z.string(),
        arguments: z.string()
      })
    }).optional() // tool_call object only present for tool_call type
  })),
  usage: z.object({
    input_tokens: z.number(),
    output_tokens: z.number(),
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
  /**
   * Method constructor
   */
  constructor(options = {}) {
    this.options = options;
    this.logger = options.logger || apiLogger;
  }
  /**
   * Process a response from OpenAI Responses API
   * @param {Object} response - Raw response from OpenAI
   * @returns {Object} Processed response with extracted content
   * @throws {OpenAIResponseHandlingError} If response is invalid
   */
  /**
   * Method process
   */
  process(response) {
    if (!response) {
      throw new OpenAIResponseHandlingError('No response received');
    }
    try {
      // Validate response structure
      const validatedResponse = responsesApiResponseSchema.parse(response);
      // Extract the message content from the response
      const assistantMessage = validatedResponse.output.find(item => item.type === 'message' && item.role === 'assistant');
      if (!assistantMessage || !assistantMessage.content) {
        throw new OpenAIResponseHandlingError('No assistant message found in the response');
      }
      // Get the text content from the output
      const textOutput = assistantMessage.content.find(item => item.type === 'output_text');
      if (!textOutput) {
        throw new OpenAIResponseHandlingError('No output_text found in the response');
      }
      return {
        id: validatedResponse.id,
        responseId: validatedResponse.id,
        content: textOutput.text,
        annotations: textOutput.annotations || [],
        status: validatedResponse.status || 'completed',
        usage: validatedResponse.usage,
        rawOutput: validatedResponse.output
      };
    } catch (error) {
      this.logger.error('Error processing OpenAI response', {
        error: error.message,
        stack: error.stack,
        response: typeof response === 'object' ? JSON.stringify(response).substring(0, 500) : 'Invalid response'
      });
      throw new OpenAIResponseHandlingError('Failed to process OpenAI response', {
        cause: error,
        context: {
          responseType: typeof response
        }
      });
    }
  }
  /**
   * Extract text content from a response
   * @param {Object} response - OpenAI Responses API response
   * @returns {string} Extracted text
   * @throws {OpenAIResponseHandlingError} If content cannot be extracted
   */
  /**
   * Method extractText
   */
  extractText(response) {
    const processed = this.process(response);
    return processed.content;
  }
  /**
   * Format a response as JSON
   * @param {Object|string} response - OpenAI Responses API response or text content
   * @param {Object} [options] - Formatting options
   * @param {Object} [options.schema] - Zod schema to validate against
   * @param {boolean} [options.strictMode] - Whether to use strict validation
   * @returns {Object} The formatted and validated JSON
   * @throws {OpenAIResponseHandlingError} If parsing or validation fails
   */
  /**
   * Method formatJson
   */
  formatJson(response, options = {}) {
    // If response is a full API response object, extract text first
    const text = typeof response === 'object' ? this.extractText(response) : response;
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
        context: {
          responseContentLength: text.length
        }
      });
    }
  }
  /**
   * Process a tool call response
   * @param {Object} response - OpenAI Responses API response
   * @returns {Object} The processed tool calls with extracted information
   * @throws {OpenAIResponseHandlingError} If processing fails
   */
  /**
   * Method processToolCall
   */
  processToolCall(response) {
    if (!response) {
      throw new OpenAIResponseHandlingError('No response received for tool call');
    }
    try {
      // Validate response structure
      const validatedResponse = responsesApiResponseSchema.parse(response);
      // Extract all tool calls from the response
      const toolCalls = extractToolCalls(validatedResponse);
      if (toolCalls.length === 0) {
        this.logger.warn('No tool calls found in the response', {
          responseId: validatedResponse.id
        });
      }
      return {
        id: validatedResponse.id,
        responseId: validatedResponse.id,
        toolCalls: toolCalls,
        hasToolCalls: toolCalls.length > 0,
        usage: validatedResponse.usage,
        // Include the original response for additional context if needed
        rawResponse: validatedResponse
      };
    } catch (error) {
      this.logger.error('Error processing tool call response', {
        error: error.message,
        stack: error.stack,
        responseId: response?.id
      });
      throw new OpenAIResponseHandlingError('Failed to process tool call response', {
        cause: error,
        context: {
          responseId: response?.id
        }
      });
    }
  }
}
/**
 * Extract tool calls from an OpenAI Responses API response
 * @param {Object} response - OpenAI Responses API response object
 * @returns {Array<Object>} Extracted tool calls with parsed information
 * @throws {OpenAIResponseHandlingError} If format is invalid
 */
const extractToolCalls = response => {
  try {
    if (!response || !response.output || !Array.isArray(response.output)) {
      throw new OpenAIResponseHandlingError('Invalid response structure: missing output array');
    }
    // Find tool_call items in the output array
    const toolCallItems = response.output.filter(item => item.type === 'tool_call');
    if (!toolCallItems || toolCallItems.length === 0) {
      return [];
    }
    // Extract and parse each tool call
    return toolCallItems.map(item => {
      if (!item.tool_call) {
        throw new OpenAIResponseHandlingError('Missing tool_call object in tool_call item', {
          itemId: item.id
        });
      }
      const toolCall = item.tool_call;
      // Validate required fields
      if (!toolCall.id || !toolCall.function || !toolCall.function.name) {
        throw new OpenAIResponseHandlingError('Incomplete tool call data', {
          toolCallId: toolCall.id
        });
      }
      // Return standardized tool call object
      return {
        id: toolCall.id,
        type: toolCall.type,
        functionName: toolCall.function.name,
        arguments: toolCall.function.arguments || '{}',
        parsedArguments: parseToolArguments(toolCall)
      };
    });
  } catch (error) {
    if (error instanceof OpenAIResponseHandlingError) {
      throw error;
    }
    throw new OpenAIResponseHandlingError('Failed to extract tool calls', {
      cause: error
    });
  }
};
/**
 * Parse function arguments from a tool call
 * @param {Object} toolCall - Tool call object
 * @returns {Object} Parsed arguments
 * @throws {OpenAIResponseHandlingError} If parsing fails
 */
const parseToolArguments = toolCall => {
  if (!toolCall || !toolCall.function || !toolCall.function.arguments) {
    return {};
  }
  try {
    return JSON.parse(toolCall.function.arguments);
  } catch (error) {
    throw new OpenAIResponseHandlingError('Failed to parse tool call arguments JSON', {
      cause: error,
      toolCallId: toolCall.id,
      arguments: toolCall.function.arguments
    });
  }
};
/**
 * Extracts the message content from an OpenAI Responses API response
 * @param {Object} response - OpenAI Responses API response object
 * @returns {string|null} Extracted content as string, or null if not found
 * @throws {OpenAIResponseHandlingError} If response format is invalid
 */
const extractMessageContent = response => {
  try {
    if (!response || !response.output || !Array.isArray(response.output)) {
      throw new OpenAIResponseHandlingError('Invalid response structure: missing output array');
    }
    const assistantMessage = response.output.find(item => item.type === 'message' && item.role === 'assistant');
    if (!assistantMessage || !assistantMessage.content) {
      return null;
    }
    const textOutput = assistantMessage.content.find(item => item.type === 'output_text');
    return textOutput ? textOutput.text : null;
  } catch (error) {
    throw new OpenAIResponseHandlingError('Invalid response format', {
      cause: error
    });
  }
};
/**
 * Clean a JSON string by removing markdown formatting and other non-JSON elements
 * @param {string} jsonString - The JSON string to clean
 * @returns {string} The cleaned JSON string
 * @private
 */
const cleanJsonString = jsonString => {
  if (!jsonString || typeof jsonString !== 'string') {
    return '{}';
  }
  // Remove markdown formatting
  let cleaned = jsonString.replace(/```(?:json)?([\s\S]*?)```/g, '$1') // Extract JSON from code blocks
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
 * Format JSON response data from the Responses API
 * @param {string|Object} response - Response content to format
 * @returns {Object} Formatted JSON object
 * @throws {OpenAIResponseHandlingError} If JSON parsing fails
 */
const formatJson = response => {
  if (!response) {
    return null;
  }
  // Handle different response types
  if (typeof response === 'object') {
    // If the input is a full API response with output array
    if (response.output && Array.isArray(response.output)) {
      const content = extractMessageContent(response);
      if (content) {
        const cleaned = cleanJsonString(content);
        try {
          return JSON.parse(cleaned);
        } catch (error) {
          throw new OpenAIResponseHandlingError('Failed to parse JSON in response object', {
            cause: error
          });
        }
      }
      return null;
    }
    // If it's already a parsed JSON object, return it directly
    return response;
  }
  // If it's a string, try to parse it as JSON
  try {
    const cleaned = cleanJsonString(response);
    return JSON.parse(cleaned);
  } catch (error) {
    throw new OpenAIResponseHandlingError('Failed to parse JSON from string response', {
      cause: error,
      context: {
        content: response.substring(0, 100)
      }
    });
  }
};
/**
 * Extract included data from a response
 * @param {Object} response - OpenAI Responses API response object
 * @param {string} includeType - Type of included data to extract (e.g., 'file_search_call.results')
 * @returns {Object|Array|null} The included data if found, null otherwise
 * @throws {OpenAIResponseHandlingError} If format is invalid
 */
const extractIncludedData = (response, includeType) => {
  if (!response || !includeType) {
    return null;
  }
  try {
    // Ensure the include type is valid
    const validIncludeTypes = ['file_search_call.results', 'message.input_image.image_url', 'computer_call_output.output.image_url'];
    if (!validIncludeTypes.includes(includeType)) {
      throw new OpenAIResponseHandlingError(`Invalid include type: ${includeType}`);
    }
    // Check if the response has included data
    if (!response.included || typeof response.included !== 'object') {
      return null;
    }
    // Extract the requested data type
    if (includeType === 'file_search_call.results') {
      return response.included.file_search_call?.results || null;
    }
    if (includeType === 'message.input_image.image_url') {
      return response.included.message?.input_image?.image_url || null;
    }
    if (includeType === 'computer_call_output.output.image_url') {
      return response.included.computer_call_output?.output?.image_url || null;
    }
    return null;
  } catch (error) {
    if (error instanceof OpenAIResponseHandlingError) {
      throw error;
    }
    throw new OpenAIResponseHandlingError('Failed to extract included data', {
      includeType,
      cause: error
    });
  }
};
export { OpenAIResponseHandler };
export { extractMessageContent };
export { extractToolCalls };
export { parseToolArguments };
export { cleanJsonString };
export { formatJson };
export { extractIncludedData };
export default {
  OpenAIResponseHandler,
  extractMessageContent,
  extractToolCalls,
  parseToolArguments,
  cleanJsonString,
  formatJson,
  extractIncludedData
};"