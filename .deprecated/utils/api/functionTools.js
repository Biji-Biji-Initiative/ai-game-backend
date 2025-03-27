/**
 * Function Tools for OpenAI Responses API
 * 
 * Provides utilities for defining and managing functions/tools for the Responses API.
 * This module helps ensure consistent function definitions and proper tool usage.
 * 
 * IMPORTANT: This implementation EXCLUSIVELY uses OpenAI Responses API, NEVER
 * Chat Completions API or Assistants API.
 * 
 * @module functionTools
 * @requires logger
 */

const { logger } = require('../logger');

/**
 * Creates a function definition object for use with the Responses API
 * @param {string} name - Function name
 * @param {string} description - Function description
 * @param {Object} parameters - JSON Schema for the function parameters
 * @param {boolean} [required=false] - Whether the function is required
 * @returns {Object} Function definition object
 */
const createFunctionDefinition = (name, description, parameters, required = false) => {
  if (!name || !description || !parameters) {
    throw new Error('Function name, description, and parameters are required');
  }
  
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters,
      required
    }
  };
};

/**
 * Creates a set of tool objects for the Responses API
 * @param {Array<Object>} functionDefinitions - Array of function definition objects
 * @returns {Array<Object>} Array of tool objects
 */
const createTools = (functionDefinitions) => {
  if (!Array.isArray(functionDefinitions)) {
    throw new Error('Function definitions must be an array');
  }
  
  return functionDefinitions.map(funcDef => ({
    type: 'function',
    function: funcDef.function
  }));
};

/**
 * Creates a tool_choice parameter for the Responses API
 * @param {string|null} functionName - Function name to use, or null for 'auto'
 * @returns {Object|string} Tool choice parameter
 */
const createToolChoice = (functionName = null) => {
  if (!functionName) {
    return 'auto';
  }
  
  return {
    type: 'function',
    function: {
      name: functionName
    }
  };
};

/**
 * Processes function call results to be sent back to the Responses API
 * @param {Object} toolCall - Tool call from the Responses API
 * @param {any} result - Result of executing the function
 * @returns {Object} Formatted tool result object
 */
const formatToolResult = (toolCall, result) => {
  if (!toolCall || !toolCall.id) {
    throw new Error('Tool call with ID is required');
  }
  
  return {
    tool_call_id: toolCall.id,
    output: typeof result === 'string' ? result : JSON.stringify(result)
  };
};

/**
 * Validates that a tool call has the expected function name
 * @param {Object} toolCall - Tool call from the Responses API
 * @param {string} expectedName - Expected function name
 * @returns {boolean} Whether the function name matches
 */
const validateFunctionName = (toolCall, expectedName) => {
  if (!toolCall || !toolCall.function || !toolCall.function.name) {
    throw new Error('Invalid tool call: missing function name');
  }
  
  return toolCall.function.name === expectedName;
};

/**
 * Parses function arguments from a tool call
 * @param {Object} toolCall - Tool call from the Responses API
 * @returns {Object} Parsed arguments
 */
const parseFunctionArguments = (toolCall) => {
  if (!toolCall || !toolCall.function || !toolCall.function.arguments) {
    throw new Error('Invalid tool call: missing function arguments');
  }
  
  try {
    return JSON.parse(toolCall.function.arguments);
  } catch (error) {
    logger.error('Failed to parse function arguments', {
      error: error.message,
      arguments: toolCall.function.arguments
    });
    
    throw new Error(`Failed to parse function arguments: ${error.message}`);
  }
};

module.exports = {
  createFunctionDefinition,
  createTools,
  createToolChoice,
  formatToolResult,
  validateFunctionName,
  parseFunctionArguments
};
