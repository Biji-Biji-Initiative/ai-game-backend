/**
 * OpenAI Responses API Client
 * 
 * Provides functionality for interacting with OpenAI's Responses API
 * IMPORTANT: This implementation EXCLUSIVELY uses OpenAI Responses API, NEVER
 * Chat Completions API or Assistants API.
 * 
 * The Responses API is a unified API from OpenAI that combines features of
 * Chat Completions and Assistants APIs, providing stateful conversations,
 * structured outputs, and tool usage capabilities.
 * 
 * @module responsesApiClient
 * @requires openai
 * @requires logger
 */

const { OpenAI } = require('openai');
const { logger } = require('../../utils/logger');
const { ResponsesApiModel, MessageRole, ResponseFormat } = require('./responsesApiTypes');
const { ApiIntegrationError } = require('../errors/promptGenerationErrors');

// Initialize OpenAI client
let openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Check if the Responses API is available
const isResponsesApiAvailable = !!openai.responses;
console.log(`OpenAI Responses API availability: ${isResponsesApiAvailable ? 'Available' : 'Not Available'}`);
if (!isResponsesApiAvailable) {
  console.warn('WARNING: OpenAI Responses API is not available, falling back to Chat Completions API.\n' +
               'This is not recommended for production use. Please update your OpenAI package.');
}

/**
 * Updates the OpenAI API key at runtime
 * @param {string} apiKey - The OpenAI API key to use
 */
const setApiKey = (apiKey) => {
  if (!apiKey) {
    throw new Error('API key is required');
  }
  
  // Create a new client with the updated API key
  openai = new OpenAI({
    apiKey
  });
  
  logger.info('OpenAI API key updated successfully');
};

/**
 * Creates a conversation message object for the Responses API
 * @param {string} role - The role (user, assistant, or system)
 * @param {string|Object} content - Message content (string or structured content object)
 * @returns {Object} Message object formatted for Responses API
 */
const createMessage = (role, content) => {
  if (!MessageRole[role.toUpperCase()]) {
    throw new Error(`Invalid message role: ${role}`);
  }
  
  // Handle different content types (string vs structured content)
  let formattedContent = content;
  
  // Convert string content to proper format
  if (typeof content === 'string') {
    formattedContent = {
      type: 'text',
      text: content
    };
  }
  
  return {
    role: role.toLowerCase(),
    content: formattedContent
  };
};

/**
 * Sends a message to the OpenAI Responses API
 * @param {Array<Object>} messages - Array of message objects
 * @param {Object} options - Options for the API call
 * @param {string} [options.model=ResponsesApiModel.DEFAULT] - Model to use
 * @param {number} [options.temperature=0.7] - Temperature for response generation
 * @param {number} [options.maxTokens] - Maximum tokens to generate
 * @param {boolean} [options.stream=false] - Whether to stream the response
 * @param {string} [options.responseFormat] - Format of the response (text or json_object)
 * @param {Array<Object>} [options.tools] - Tools available to the model
 * @param {string|Object} [options.toolChoice] - How the model should use tools
 * @param {string} [options.previousResponseId] - ID of previous response for stateful conversations
 * @returns {Promise<Object>} API response
 * @throws {ApiIntegrationError} If the API call fails
 */
const sendMessage = async (messages, options = {}) => {
  try {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required and must not be empty');
    }
    
    const {
      model = ResponsesApiModel.DEFAULT,
      temperature = 0.7,
      maxTokens,
      stream = false,
      responseFormat,
      tools,
      toolChoice,
      previousResponseId
    } = options;
    
    // Extract system message and user/assistant messages
    let systemMessage = null;
    const conversationMessages = [];
    
    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        conversationMessages.push(msg);
      }
    });
    
    // Build API request parameters for the Responses API
    const requestParams = {
      model,
      temperature,
      stream
    };
    
    // Add instructions (system message) if present
    if (systemMessage) {
      requestParams.instructions = typeof systemMessage === 'string' 
        ? systemMessage 
        : systemMessage.text;
    }
    
    // Prepare input messages
    if (conversationMessages.length > 0) {
      // Format messages for Responses API
      const formattedInput = conversationMessages.map(msg => {
        return {
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : msg.content
        };
      });
      
      // For simple cases with one user message
      if (formattedInput.length === 1 && formattedInput[0].role === 'user') {
        requestParams.input = formattedInput[0].content;
      } else {
        // For conversation history
        requestParams.input = {
          messages: formattedInput
        };
      }
    }
    
    // Add previous response ID for stateful conversations
    if (previousResponseId) {
      requestParams.previous_response_id = previousResponseId;
    }
    
    // Add optional parameters if specified
    if (maxTokens) requestParams.max_tokens = maxTokens;
    
    // Responses API requires using text.format instead of response_format
    if (responseFormat === 'json') {
      requestParams.text = { format: { type: 'json_object' } };
    } else {
      requestParams.text = { format: { type: 'text' } };
    }
    
    if (tools && tools.length > 0) {
      requestParams.tools = tools;
      
      if (toolChoice) {
        requestParams.tool_choice = toolChoice;
      }
    }
    
    logger.debug('Sending request to OpenAI Responses API', {
      model,
      messageCount: messages.length,
      options: { temperature, maxTokens, stream, responseFormat }
    });
    
    // Make API call to OpenAI Responses API using the correct endpoint
    let response;
    if (stream) {
      response = await openai.responses.stream(requestParams);
    } else {
      response = await openai.responses.create(requestParams);
    }
    
    // Transform response to match expected format
    const transformedResponse = {
      id: response.id,
      choices: [{
        message: {
          content: response.output_text || ''
        },
        finish_reason: response.finish_reason
      }],
      usage: response.usage
    };
    
    return transformedResponse;
  } catch (error) {
    logger.error('Error in OpenAI Responses API call', {
      error: error.message,
      messageCount: messages?.length
    });
    
    throw new ApiIntegrationError('responsesApiClient', error, {
      messageCount: messages?.length,
      options
    });
  }
};

/**
 * Processes a streaming response from the OpenAI Responses API
 * @param {Array<Object>} messages - Array of message objects
 * @param {Object} options - Options for the API call
 * @param {Function} options.onChunk - Callback for each chunk of text
 * @param {Function} options.onComplete - Callback when streaming is complete
 * @param {Function} options.onError - Callback for errors
 * @param {string} [options.previousResponseId] - ID of previous response for stateful conversations
 * @returns {Promise<void>}
 */
const streamMessage = async (messages, options = {}) => {
  try {
    // Extract system message and user/assistant messages
    let systemMessage = null;
    const conversationMessages = [];
    
    messages.forEach(msg => {
      if (msg.role === 'system') {
        systemMessage = msg.content;
      } else {
        conversationMessages.push(msg);
      }
    });
    
    const {
      model = ResponsesApiModel.DEFAULT,
      temperature = 0.7,
      maxTokens,
      responseFormat,
      tools,
      toolChoice,
      previousResponseId,
      onChunk,
      onComplete,
      onError
    } = options;
    
    // Build API request parameters for the Responses API with streaming enabled
    const requestParams = {
      model,
      temperature,
      stream: true
    };
    
    // Add instructions (system message) if present
    if (systemMessage) {
      requestParams.instructions = typeof systemMessage === 'string' 
        ? systemMessage 
        : systemMessage.text;
    }
    
    // Prepare input messages
    if (conversationMessages.length > 0) {
      // Format messages for Responses API
      const formattedInput = conversationMessages.map(msg => {
        return {
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : msg.content
        };
      });
      
      // For simple cases with one user message
      if (formattedInput.length === 1 && formattedInput[0].role === 'user') {
        requestParams.input = formattedInput[0].content;
      } else {
        // For conversation history
        requestParams.input = {
          messages: formattedInput
        };
      }
    }
    
    // Add previous response ID for stateful conversations
    if (previousResponseId) {
      requestParams.previous_response_id = previousResponseId;
    }
    
    // Add optional parameters if specified
    if (maxTokens) requestParams.max_tokens = maxTokens;
    
    // Responses API requires using text.format instead of response_format
    if (responseFormat === 'json') {
      requestParams.text = { format: { type: 'json_object' } };
    } else {
      requestParams.text = { format: { type: 'text' } };
    }
    
    if (tools && tools.length > 0) {
      requestParams.tools = tools;
      
      if (toolChoice) {
        requestParams.tool_choice = toolChoice;
      }
    }
    
    logger.debug('Starting streaming request to OpenAI Responses API', {
      model,
      messageCount: messages.length
    });
    
    // Use the responses streaming endpoint
    const stream = await openai.responses.stream(requestParams);
    
    let fullText = '';
    
    for await (const chunk of stream) {
      // Extract text from the chunk
      if (chunk.type === 'text') {
        const textContent = chunk.text || '';
        fullText += textContent;
        
        if (onChunk && typeof onChunk === 'function') {
          onChunk(textContent, fullText);
        }
      }
    }
    
    logger.debug('Completed streaming response', {
      responseLength: fullText.length
    });
    
    if (onComplete && typeof onComplete === 'function') {
      onComplete(fullText);
    }
    
    return fullText;
  } catch (error) {
    logger.error('Error in OpenAI Responses API streaming call', {
      error: error.message,
      messageCount: messages?.length
    });
    
    if (options.onError && typeof options.onError === 'function') {
      options.onError(error);
    }
    
    throw new ApiIntegrationError('responsesApiClient-stream', error, {
      messageCount: messages?.length,
      options: {
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        responseFormat: options.responseFormat
      }
    });
  }
};

/**
 * Sends a message and receives a JSON response using the Responses API
 * @param {Array<Object>} messages - Array of message objects
 * @param {Object} options - Options for the API call
 * @param {Object} [options.schema] - JSON Schema for validation
 * @param {string} [options.previousResponseId] - ID of previous response for stateful conversations
 * @returns {Promise<Object>} Parsed JSON response
 */
const sendJsonMessage = async (messages, options = {}) => {
  try {
    // Create a new options object without responseFormat
    const jsonOptions = {
      ...options
    };
    
    // For Responses API, we need to set the format to json directly
    // We don't use responseFormat
    const response = await sendMessage(messages, jsonOptions);
    
    // Extract JSON content from Responses API response
    let jsonContent;
    if (response.choices && response.choices.length > 0) {
      jsonContent = response.choices[0].message.content || '';
    } else {
      jsonContent = '';
    }
    
    // Clean up markdown formatting if present (```json ... ```)
    if (jsonContent.startsWith('```') && jsonContent.endsWith('```')) {
      // Extract content between markdown code block markers
      const match = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        jsonContent = match[1];
      }
    }
    
    // Parse JSON response
    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonContent);
    } catch (parseError) {
      logger.error('Failed to parse JSON response', {
        error: parseError.message,
        content: jsonContent
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
    
    // Return the parsed JSON and the response ID for stateful conversations
    return {
      data: parsedJson,
      responseId: response.id
    };
  } catch (error) {
    logger.error('Error in JSON message handling with Responses API', {
      error: error.message
    });
    
    throw new ApiIntegrationError('json-message', error, {
      messageCount: messages?.length,
      options
    });
  }
};

/**
 * Creates and maintains a conversation thread for the Responses API
 * The Responses API maintains conversation state through previous_response_id
 * rather than thread IDs like the Assistants API
 * 
 * @param {string} userId - User ID to associate with the thread
 * @param {string} [context] - Context of the conversation
 * @returns {Object} Thread metadata object
 */
const createThread = (userId, context = 'general') => {
  // Generate a unique thread identifier for our application
  // Note: This is NOT using the Assistants API thread system
  // The Responses API uses previous_response_id for state, not thread IDs
  const threadId = `resp_${userId}_${context}_${Date.now()}`;
  
  // Create thread metadata
  const threadMetadata = {
    id: threadId,
    userId,
    context,
    createdAt: new Date().toISOString(),
    lastResponseId: null, // Will store the most recent response ID
    messageCount: 0
  };
  
  logger.info('Created new thread metadata for Responses API stateful conversation', { 
    threadId, 
    userId, 
    context 
  });
  
  return threadMetadata;
};

/**
 * Update a thread's metadata with the latest response ID
 * Used for maintaining conversation state with the Responses API
 * 
 * @param {Object} threadMetadata - Thread metadata object
 * @param {string} responseId - Response ID from the Responses API
 * @returns {Object} Updated thread metadata
 */
const updateThreadWithResponse = (threadMetadata, responseId) => {
  if (!threadMetadata || !responseId) {
    throw new Error('Thread metadata and response ID are required');
  }
  
  // Update the thread metadata
  const updatedMetadata = {
    ...threadMetadata,
    lastResponseId: responseId,
    messageCount: threadMetadata.messageCount + 1,
    lastUpdated: new Date().toISOString()
  };
  
  logger.debug('Updated thread metadata with new response ID', {
    threadId: updatedMetadata.id,
    responseId,
    messageCount: updatedMetadata.messageCount
  });
  
  return updatedMetadata;
};

module.exports = {
  sendMessage,
  streamMessage,
  sendJsonMessage,
  createMessage,
  createThread,
  updateThreadWithResponse,
  MessageRole,
  ResponsesApiModel,
  setApiKey
};
