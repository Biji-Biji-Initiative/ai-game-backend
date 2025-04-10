import { OpenAIRequestError } from "#app/core/infra/openai/errors.js";
'use strict';
/**
 * Formats a prompt and system message into the Responses API format
 * @param {string} prompt - The user prompt/input
 * @param {string|null} systemMessage - Optional system message as instructions
 * @returns {Object} Object with input and instructions fields for Responses API
 * @throws {OpenAIRequestError} If prompt is empty or null
 */
const formatForResponsesApi = (prompt, systemMessage = null) => {
    if (!prompt || typeof prompt !== 'string') {
        throw new OpenAIRequestError('Prompt must be a non-empty string');
    }
    if (systemMessage && typeof systemMessage !== 'string') {
        throw new OpenAIRequestError('System message must be a string if provided');
    }
    return {
        input: prompt,
        instructions: systemMessage || null,
    };
};
/**
 * Formats multimodal content (text + images) for the Responses API
 * @param {string} prompt - The text prompt
 * @param {Array<string>} imageUrls - Array of image URLs to include
 * @param {string|null} systemMessage - Optional system message
 * @returns {Object} Object with input and instructions fields for Responses API
 * @throws {OpenAIRequestError} If parameters are invalid
 */
const formatMultimodalContent = (prompt, imageUrls = [], systemMessage = null) => {
    if (!prompt || typeof prompt !== 'string') {
        throw new OpenAIRequestError('Prompt must be a non-empty string');
    }
    if (!Array.isArray(imageUrls)) {
        throw new OpenAIRequestError('Image URLs must be an array');
    }
    // Create multimodal content array
    const contentItems = [{ type: 'input_text', text: prompt }];
    // Add images
    for (const imageUrl of imageUrls) {
        if (typeof imageUrl === 'string' && imageUrl.trim()) {
            contentItems.push({
                type: 'image_url',
                url: imageUrl,
            });
        }
    }
    return {
        input: contentItems,
        instructions: systemMessage,
    };
};
/**
 * Formats content with file references for the Responses API
 * @param {string} prompt - The text prompt
 * @param {Array<string>} fileIds - Array of file IDs to include
 * @param {string|null} systemMessage - Optional system message
 * @returns {Object} Object with input and instructions fields for Responses API
 * @throws {OpenAIRequestError} If parameters are invalid
 */
const formatContentWithFiles = (prompt, fileIds = [], systemMessage = null) => {
    if (!prompt || typeof prompt !== 'string') {
        throw new OpenAIRequestError('Prompt must be a non-empty string');
    }
    if (!Array.isArray(fileIds)) {
        throw new OpenAIRequestError('File IDs must be an array');
    }
    if (fileIds.length === 0) {
        throw new OpenAIRequestError('At least one file ID must be provided');
    }
    // Create content array with text and files
    const contentItems = [{ type: 'input_text', text: prompt }];
    // Add file references
    for (const fileId of fileIds) {
        if (typeof fileId === 'string' && fileId.trim()) {
            contentItems.push({
                type: 'file',
                file_id: fileId.trim(),
            });
        }
        else {
            throw new OpenAIRequestError('Each file ID must be a non-empty string');
        }
    }
    return {
        input: contentItems,
        instructions: systemMessage,
    };
};
/**
 * Creates a comprehensive multimodal input with text, images, and files
 * @param {string} prompt - The text prompt
 * @param {Object} media - Media objects to include
 * @param {Array<string>} [media.imageUrls] - Image URLs to include
 * @param {Array<string>} [media.fileIds] - File IDs to include
 * @param {string|null} systemMessage - Optional system message
 * @returns {Object} Object with input and instructions fields for Responses API
 * @throws {OpenAIRequestError} If parameters are invalid
 */
const formatMultimodalWithFiles = (prompt, media = {}, systemMessage = null) => {
    if (!prompt || typeof prompt !== 'string') {
        throw new OpenAIRequestError('Prompt must be a non-empty string');
    }
    const imageUrls = media.imageUrls || [];
    const fileIds = media.fileIds || [];
    if (!Array.isArray(imageUrls)) {
        throw new OpenAIRequestError('Image URLs must be an array');
    }
    if (!Array.isArray(fileIds)) {
        throw new OpenAIRequestError('File IDs must be an array');
    }
    if (imageUrls.length === 0 && fileIds.length === 0) {
        throw new OpenAIRequestError('At least one image URL or file ID must be provided');
    }
    // Create content array with text
    const contentItems = [{ type: 'input_text', text: prompt }];
    // Add images
    for (const imageUrl of imageUrls) {
        if (typeof imageUrl === 'string' && imageUrl.trim()) {
            contentItems.push({
                type: 'image_url',
                url: imageUrl.trim(),
            });
        }
    }
    // Add file references
    for (const fileId of fileIds) {
        if (typeof fileId === 'string' && fileId.trim()) {
            contentItems.push({
                type: 'file',
                file_id: fileId.trim(),
            });
        }
    }
    return {
        input: contentItems,
        instructions: systemMessage,
    };
};
/**
 * Creates a JSON response configuration for structured output
 * @param {Object} payload - Base request payload
 * @returns {Object} Updated payload with JSON format configuration
 */
const configureJsonResponse = payload => {
    return {
        ...payload,
        text: {
            format: {
                type: 'json_object',
            },
        },
    };
};
export { formatForResponsesApi };
export { formatMultimodalContent };
export { formatContentWithFiles };
export { formatMultimodalWithFiles };
export { configureJsonResponse };
export default {
    formatForResponsesApi,
    formatMultimodalContent,
    formatContentWithFiles,
    formatMultimodalWithFiles,
    configureJsonResponse
};
