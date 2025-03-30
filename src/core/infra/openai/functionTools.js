import { OpenAIResponseHandlingError } from "../../infra/openai/errors.js";
'use strict';
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
const formatToolsForApi = functionTools => {
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
const forceFunctionCall = functionName => {
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
const parseToolArguments = toolCall => {
    if (!toolCall || !toolCall.function) {
        throw new OpenAIResponseHandlingError('Invalid tool call object');
    }
    if (toolCall.type !== 'function' || !toolCall.function.arguments) {
        throw new OpenAIResponseHandlingError('Invalid or missing function arguments in tool call', {
            toolCallId: toolCall.id,
        });
    }
    try {
        const parsedArgs = JSON.parse(toolCall.function.arguments);
        if (typeof parsedArgs !== 'object') {
            throw new OpenAIResponseHandlingError('Parsed arguments must be an object', {
                toolCallId: toolCall.id,
            });
        }
        return parsedArgs;
    }
    catch (error) {
        throw new OpenAIResponseHandlingError(`Failed to parse tool arguments JSON: ${error.message}`, { toolCallId: toolCall.id }, error);
    }
};
/**
 * Formats the tool result for the Responses API tool_outputs parameter
 * @param {string} toolCallId - The ID of the tool call being responded to
 * @param {any} output - The result of the tool execution (will be stringified if not a string)
 * @returns {object} The tool_outputs object for the Responses API
 * @throws {OpenAIResponseHandlingError} If parameters are invalid
 */
const formatToolResult = (toolCallId, output) => {
    if (!toolCallId || typeof toolCallId !== 'string') {
        throw new OpenAIResponseHandlingError('Tool Call ID must be a non-empty string');
    }
    // Convert output to string if it's not already
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output);
    // Validate output size (OpenAI has limits)
    if (outputStr.length > 20000) {
        // Updated limit based on API documentation
        throw new OpenAIResponseHandlingError('Tool result output is too large, must be under 20,000 characters');
    }
    return {
        tool_outputs: [
            {
                tool_call_id: toolCallId,
                output: outputStr,
            },
        ],
    };
};
/**
 * Formats multiple tool results for the Responses API
 * @param {Array<{id: string, output: any}>} toolResults - Array of tool results with IDs and outputs
 * @returns {object} The tool_outputs object for the Responses API
 * @throws {OpenAIResponseHandlingError} If parameters are invalid
 */
const formatMultipleToolResults = toolResults => {
    if (!Array.isArray(toolResults) || toolResults.length === 0) {
        throw new OpenAIResponseHandlingError('Tool results must be a non-empty array');
    }
    const formattedOutputs = toolResults.map(result => {
        if (!result.id || typeof result.id !== 'string') {
            throw new OpenAIResponseHandlingError('Each tool result must have a valid string ID');
        }
        // Convert output to string if it's not already
        const outputStr = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
        if (outputStr.length > 20000) {
            throw new OpenAIResponseHandlingError(`Tool result output for ID ${result.id} is too large`);
        }
        return {
            tool_call_id: result.id,
            output: outputStr,
        };
    });
    return {
        tool_outputs: formattedOutputs,
    };
};
/**
 * Creates a complete input parameter with tool outputs to submit to the Responses API
 * @param {string|Array} userInput - The new user message/input
 * @param {object} toolOutputs - The tool outputs object from formatToolResult or formatMultipleToolResults
 * @returns {object} Complete input parameter for Responses API
 * @throws {OpenAIResponseHandlingError} If parameters are invalid
 */
const createToolResultInput = (userInput, toolOutputs) => {
    // Validate required parameters
    if (!toolOutputs || !toolOutputs.tool_outputs || !Array.isArray(toolOutputs.tool_outputs)) {
        throw new OpenAIResponseHandlingError('Tool outputs must be provided and contain a tool_outputs array');
    }
    let finalInput;
    // If the input is a string, we need to submit it as part of the input parameters
    if (typeof userInput === 'string') {
        finalInput = userInput.trim().length > 0 ? userInput : null;
    }
    // If it's already an array (e.g., multimodal content), use it directly
    else if (Array.isArray(userInput)) {
        finalInput = userInput;
    }
    // Otherwise user input is invalid
    else if (userInput !== null && userInput !== undefined) {
        throw new OpenAIResponseHandlingError('User input must be a string, array, or null/undefined');
    }
    // Return the complete input object
    return {
        ...(finalInput !== null && finalInput !== undefined && { input: finalInput }),
        tool_outputs: toolOutputs.tool_outputs,
    };
};
/**
 * Creates a request configuration for a built-in tool (e.g., web_search, file_search)
 * @param {string} toolType - The type of built-in tool (e.g., 'web_search', 'file_search')
 * @param {object} [toolConfig] - Optional configuration for the tool
 * @returns {object} Tool configuration for the Responses API
 * @throws {OpenAIResponseHandlingError} If tool type is invalid
 */
const defineBuiltInTool = (toolType, toolConfig = {}) => {
    const supportedTools = ['web_search', 'file_search', 'code_interpreter'];
    if (!toolType || typeof toolType !== 'string') {
        throw new OpenAIResponseHandlingError('Tool type must be a non-empty string');
    }
    if (!supportedTools.includes(toolType)) {
        throw new OpenAIResponseHandlingError(`Unsupported built-in tool type: ${toolType}. Supported types: ${supportedTools.join(', ')}`);
    }
    return {
        type: toolType,
        ...toolConfig,
    };
};
export { defineFunctionTool };
export { formatToolsForApi };
export { forceFunctionCall };
export { parseToolArguments };
export { formatToolResult };
export { formatMultipleToolResults };
export { createToolResultInput };
export { defineBuiltInTool };
export default {
    defineFunctionTool,
    formatToolsForApi,
    forceFunctionCall,
    parseToolArguments,
    formatToolResult,
    formatMultipleToolResults,
    createToolResultInput,
    defineBuiltInTool
};
