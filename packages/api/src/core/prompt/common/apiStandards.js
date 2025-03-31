'use strict';
/**
 * API Standards Module
 * Provides standardized instructions and references for API usage
 * to ensure consistency across all prompt builders
 *
 * CRITICAL: This project EXCLUSIVELY uses OpenAI Responses API.
 * NEVER use Chat Completions API under any circumstances.
 */
/**
 * Standard instruction for using OpenAI Responses API exclusively
 * @returns {string} Standardized API instruction
 */
const getResponsesApiInstruction = () => {
    return 'CRITICAL: This implementation MUST EXCLUSIVELY use OpenAI Responses API. NEVER use Chat Completions API under any circumstances. All interactions must utilize thread-based conversations through the Responses API for stateful interactions, structured outputs, and function calling capabilities.';
};
/**
 * Adds standard API instructions to a prompt
 * @param {string} prompt - The prompt to append instructions to
 * @returns {string} Prompt with standardized API instructions
 */
const appendApiStandards = prompt => {
    if (!prompt) {
        return getResponsesApiInstruction();
    }
    // Add a newline if the prompt doesn't end with one
    const separator = prompt.endsWith('\n') ? '' : '\n\n';
    return `${prompt}${separator}${getResponsesApiInstruction()}`;
};
/**
 * Structured output format instructions
 * @param {Object} schema - JSON schema for the expected output
 * @returns {string} Formatted instructions for structured output
 */
const getStructuredOutputInstructions = schema => {
    if (!schema) {
        throw new Error('Schema is required for structured output instructions');
    }
    let instructions = 'Return your response in the following JSON format:\n\n';
    instructions += '```json\n';
    instructions += JSON.stringify(schema, null, 2);
    instructions += '\n```\n\n';
    instructions += 'Ensure your response is valid JSON that matches this schema exactly.\n';
    instructions += 'Do not include any explanations or markdown formatting outside the JSON.\n';
    instructions += getResponsesApiInstruction();
    return instructions;
};
/**
 * Get error handling instructions that emphasize throwing errors rather than fallbacks
 * @returns {string} Standardized error handling instructions
 */
const getErrorHandlingInstructions = () => {
    return 'When encountering exceptional conditions, throw specific, descriptive errors with context about the failure. NEVER implement fallback mechanisms or silent failure modes.';
};
/**
 * Adds error handling instructions to a prompt
 * @param {string} prompt - The prompt to append instructions to
 * @returns {string} Prompt with error handling instructions
 */
const appendErrorHandlingInstructions = prompt => {
    if (!prompt) {
        return getErrorHandlingInstructions();
    }
    // Add a newline if the prompt doesn't end with one
    const separator = prompt.endsWith('\n') ? '' : '\n\n';
    return `${prompt}${separator}${getErrorHandlingInstructions()}`;
};
export { getResponsesApiInstruction };
export { appendApiStandards };
export { getStructuredOutputInstructions };
export { getErrorHandlingInstructions };
export { appendErrorHandlingInstructions };
export default {
    getResponsesApiInstruction,
    appendApiStandards,
    getStructuredOutputInstructions,
    getErrorHandlingInstructions,
    appendErrorHandlingInstructions
};
