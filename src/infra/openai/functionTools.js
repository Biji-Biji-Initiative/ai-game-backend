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
 * @throws {OpenAIResponseHandlingError} If required parameters are missing
 */
const defineFunctionTool = (name, description, parameters) => {
  if (!name || !description || !parameters) {
    throw new OpenAIResponseHandlingError('Function name, description, and parameters schema are required');
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
 * @throws {OpenAIResponseHandlingError} If input is invalid
 */
const formatToolsForApi = (functionTools) => {
  if (!Array.isArray(functionTools)) {
    throw new OpenAIResponseHandlingError('Input must be an array of function tool definitions');
  }

  if (functionTools.some(tool => !tool.type || tool.type !== 'function')) {
    throw new OpenAIResponseHandlingError('All tools must be function type');
  }

  return functionTools;
};

/**
 * Creates a `tool_choice` parameter to force the model to call a specific function.
 * @param {string} functionName - The name of the function to force call.
 * @returns {object} The `tool_choice` parameter object.
 * @throws {OpenAIResponseHandlingError} If function name is invalid
 */
const forceFunctionCall = (functionName) => {
  if (!functionName || typeof functionName !== 'string') {
    throw new OpenAIResponseHandlingError('Function name must be a non-empty string');
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
 * @throws {OpenAIResponseHandlingError} If arguments are missing or fail to parse
 */
const parseToolArguments = (toolCall) => {
  if (!toolCall || !toolCall.function) {
    throw new OpenAIResponseHandlingError('Invalid tool call object');
  }

  if (toolCall.type !== 'function' || !toolCall.function.arguments) {
    throw new OpenAIResponseHandlingError('Invalid or missing function arguments in tool call', { toolCallId: toolCall.id });
  }

  try {
    const parsedArgs = JSON.parse(toolCall.function.arguments);
    if (typeof parsedArgs !== 'object') {
      throw new OpenAIResponseHandlingError('Parsed arguments must be an object', { toolCallId: toolCall.id });
    }
    return parsedArgs;
  } catch (error) {
    throw new OpenAIResponseHandlingError(`Failed to parse tool arguments JSON: ${error.message}`, { toolCallId: toolCall.id }, error);
  }
};

/**
 * Formats the result of a tool execution to be sent back to the API.
 * @param {string} toolCallId - The ID of the tool call being responded to.
 * @param {any} output - The result of the tool execution (will be JSON stringified).
 * @returns {object} A message object with role 'tool'.
 * @throws {OpenAIResponseHandlingError} If tool call ID is invalid or output is too large
 */
const formatToolResult = (toolCallId, output) => {
  if (!toolCallId || typeof toolCallId !== 'string') {
    throw new OpenAIResponseHandlingError('Tool Call ID must be a non-empty string');
  }

  // Convert output to string if it's not already
  const outputStr = typeof output === 'string' ? output : JSON.stringify(output);

  // Validate output size (OpenAI has limits)
  if (outputStr.length > 10000) { // Example limit, adjust as needed
    throw new OpenAIResponseHandlingError('Tool result output is too large');
  }

  return {
    type: 'message',
    role: 'tool',
    content: [
      {
        type: 'text',
        text: outputStr
      }
    ]
  };
};

module.exports = {
  defineFunctionTool,
  formatToolsForApi,
  forceFunctionCall,
  parseToolArguments,
  formatToolResult
};