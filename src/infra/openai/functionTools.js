/**
 * OpenAI Responses API Function Tool Utilities
 * Defines and formats tools (functions) for the Responses API.
 */
const { OpenAIResponseHandlingError } = require('./errors');

/**
 * Creates a function definition object for use in the `tools` array.
 * @param {string} name - Function name.
 * @param {string} description - Function description.
 * @param {object} parameters - JSON Schema object describing the function's parameters.
 * @returns {object} Tool definition object for a function.
 */
const defineFunctionTool = (name, description, parameters) => {
  if (!name || !description || !parameters) {
    throw new Error('Function name, description, and parameters schema are required');
  }

  return {
    type: 'function',
    function: {
      name,
      description,
      parameters, // Should be a valid JSON Schema object
    },
  };
};

/**
 * Creates the `tools` array parameter from a list of function tool definitions.
 * @param {Array<object>} functionTools - Array of objects returned by `defineFunctionTool`.
 * @returns {Array<object>} The `tools` array for the API request.
 */
const formatToolsForApi = (functionTools) => {
  if (!Array.isArray(functionTools)) {
    throw new Error('Input must be an array of function tool definitions');
  }
  // The structure matches defineFunctionTool output directly
  return functionTools;
};

/**
 * Creates a `tool_choice` parameter to force the model to call a specific function.
 * @param {string} functionName - The name of the function to force call.
 * @returns {object} The `tool_choice` parameter object.
 */
const forceFunctionCall = (functionName) => {
  if (!functionName) {
    throw new Error('Function name is required to force a function call');
  }
  return {
    type: 'function',
    function: {
      name: functionName,
    },
  };
};

/**
 * Parses the arguments string from a tool call object.
 * @param {object} toolCall - The tool_call object from the API response.
 * @returns {object} The parsed arguments object.
 * @throws {OpenAIResponseHandlingError} If arguments are missing or fail to parse.
 */
const parseToolArguments = (toolCall) => {
  if (toolCall?.type !== 'function' || !toolCall.function?.arguments) {
    throw new OpenAIResponseHandlingError('Invalid or missing function arguments in tool call', { toolCallId: toolCall?.id });
  }

  try {
    return JSON.parse(toolCall.function.arguments);
  } catch (error) {
    throw new OpenAIResponseHandlingError(`Failed to parse tool arguments JSON: ${error.message}`, { toolCallId: toolCall.id }, error);
  }
};

/**
 * Formats the result of a tool execution to be sent back to the API.
 * @param {string} toolCallId - The ID of the tool call being responded to.
 * @param {any} output - The result of the tool execution (will be JSON stringified).
 * @returns {object} A message object with role 'tool'.
 */
const formatToolResult = (toolCallId, output) => {
  if (!toolCallId) {
    throw new Error('Tool Call ID is required to format tool result');
  }
  return {
    role: 'tool',
    content: [
      {
        type: 'tool_result',
        tool_call_id: toolCallId,
        result: typeof output === 'string' ? output : JSON.stringify(output),
      },
    ],
  };
};

module.exports = {
  defineFunctionTool,
  formatToolsForApi,
  forceFunctionCall,
  parseToolArguments,
  formatToolResult,
}; 