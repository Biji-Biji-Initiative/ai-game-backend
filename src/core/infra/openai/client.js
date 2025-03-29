'use strict';

/**
 * OpenAI API Client
 * 
 * A client for interacting with OpenAI's Responses API
 * for stateful conversation management via previous_response_id.
 */
const { apiLogger, logger } = require('../logging/domainLogger');
const { 
  ResponseFormat, 
  StreamEventType,
  TruncationStrategy,
  ToolChoice
} = require('./types');
const { 
  OpenAIRequestError, 
  OpenAIResponseError,
  OpenAIResponseHandlingError,
  createOpenAIError
} = require('./errors');
const { formatForResponsesApi } = require('./messageFormatter');
const { createStreamController } = require('./streamProcessor');

/**
 * Class for making requests to the OpenAI API
 */
class OpenAIClient {
  /**
   * Create a new OpenAIClient
   * @param {Object} options - Client configuration options
   * @param {Object} options.config - OpenAI API configuration
   * @param {string} options.apiKey - OpenAI API key
   * @param {Object} options.logger - Logger instance
   */
  /**
   * Method constructor
   */
  constructor({ config, apiKey, logger }) {
    // Set up required dependencies
    this.config = config;
    this.apiKey = apiKey || config?.apiConfig?.apiKey;
    this.logger = logger || apiLogger.child('openai:client');
    
    if (!this.apiKey) {
      this.logger.warn('No OpenAI API key provided. Using mock responses for development.');
      this.useMock = true;
    } else {
      this.useMock = false;
    }
    
    // Set up fetch options
    this.baseURL = config?.apiConfig?.baseURL || 'https://api.openai.com/v1/responses';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      ...(config?.apiConfig?.defaultHeaders || {})
    };
    
    // Optional: configure client libraries like OpenAI SDK
    if (!this.useMock) {
      this.setupClient();
    }
  }
  
  /**
   * Set up the OpenAI SDK client
   * @private
   */
  /**
   * Method setupClient
   */
  setupClient() {
    try {
      const { OpenAI } = require('openai');
      
      // IMPORTANT: The OpenAI SDK v4+ expects a base URL WITHOUT the specific endpoints
      // The SDK automatically appends paths like /chat/completions or /responses based on 
      // the method called (e.g., sdk.chat.completions.create() or sdk.responses.create())
      this.sdk = new OpenAI({
        apiKey: this.apiKey,
        baseURL: 'https://api.openai.com/v1', // SDK will append /responses when using responses.create()
        timeout: this.config?.apiConfig?.timeoutMs || 30000,
        maxRetries: 2
      });

      // Verify SDK has the responses API method
      if (!this.sdk.responses || typeof this.sdk.responses.create !== 'function') {
        this.logger.warn('OpenAI SDK does not have responses.create method. Ensure you are using a recent SDK version (v4+)');
      }
    } catch (error) {
      this.logger.warn('OpenAI SDK not available, using fetch API instead', { 
        error: error.message 
      });
    }
  }
  
  /**
   * Validates the response structure from OpenAI Responses API
   * @param {Object} response - Response from OpenAI
   * @returns {Object} Normalized response object
   * @throws {OpenAIResponseError} If response format is invalid
   * @private
   */
  /**
   * Method validateResponseStructure
   */
  validateResponseStructure(response) {
    if (!response || typeof response !== 'object') {
      throw new OpenAIResponseError('Response must be an object');
    }
    
    if (!response.id) {
      throw new OpenAIResponseError('Response missing required id field');
    }
    
    if (!response.output || !Array.isArray(response.output) || response.output.length === 0) {
      throw new OpenAIResponseError('Response missing valid output array');
    }
    
    // Check for error in response
    if (response.status === 'failed' && response.error) {
      throw new OpenAIResponseError(`API responded with error: ${response.error.message}`, {
        code: response.error.code,
        context: { responseId: response.id }
      });
    }
    
    // If there are no errors, return the validated response
    return response;
  }
  
  /**
   * Validates the message format
   * @param {Object} messages - Message object to validate
   * @throws {OpenAIRequestError} If format is invalid
   * @private
   */
  /**
   * Method validateMessageFormat
   */
  validateMessageFormat(messages) {
    if (!messages) {
      throw new OpenAIRequestError('Messages object is required');
    }
    
    // Check if this is a tool result submission
    if (messages.tool_outputs) {
      if (!Array.isArray(messages.tool_outputs)) {
        throw new OpenAIRequestError('tool_outputs must be an array');
      }
      // Further validation handled by the API
      return;
    }
    
    // Otherwise, it should have input at minimum
    if (!messages.input && typeof messages.input !== 'string' && !Array.isArray(messages.input)) {
      throw new OpenAIRequestError('Input is required in the messages object');
    }
  }
  
  /**
   * Validates metadata for the OpenAI API
   * @param {Object} metadata - Metadata object to validate
   * @returns {Object} Validated metadata object
   * @throws {OpenAIRequestError} If metadata is invalid
   * @private
   */
  /**
   * Method validateMetadata
   */
  validateMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      throw new OpenAIRequestError('Metadata must be an object');
    }
    
    const validatedMetadata = {};
    const MAX_KEY_LENGTH = 64;
    const MAX_VALUE_LENGTH = 512;
    
    // Validate each key-value pair
    for (const [key, value] of Object.entries(metadata)) {
      // Validate key
      if (typeof key !== 'string') {
        throw new OpenAIRequestError('Metadata keys must be strings');
      }
      
      if (key.length === 0) {
        throw new OpenAIRequestError('Metadata keys cannot be empty');
      }
      
      if (key.length > MAX_KEY_LENGTH) {
        throw new OpenAIRequestError(`Metadata key exceeds maximum length of ${MAX_KEY_LENGTH} characters: ${key}`);
      }
      
      // Only allow alphanumeric keys with underscores
      if (!/^[a-zA-Z0-9_]+$/.test(key)) {
        throw new OpenAIRequestError(`Metadata key contains invalid characters: ${key}. Only alphanumeric characters and underscores are allowed.`);
      }
      
      // Validate value
      if (typeof value !== 'string') {
        throw new OpenAIRequestError(`Metadata value for key '${key}' must be a string`);
      }
      
      if (value.length > MAX_VALUE_LENGTH) {
        throw new OpenAIRequestError(`Metadata value for key '${key}' exceeds maximum length of ${MAX_VALUE_LENGTH} characters`);
      }
      
      validatedMetadata[key] = value;
    }
    
    return validatedMetadata;
  }
  
  /**
   * Validates user identifier for tracking and abuse prevention
   * @param {string} userIdentifier - The user identifier to validate
   * @returns {string} Validated user identifier
   * @throws {OpenAIRequestError} If the identifier is invalid
   * @private
   */
  /**
   * Method validateUserIdentifier
   */
  validateUserIdentifier(userIdentifier) {
    if (!userIdentifier || typeof userIdentifier !== 'string') {
      throw new OpenAIRequestError('User identifier must be a non-empty string');
    }
    
    // OpenAI recommends using opaque identifiers that can't be mapped to user info
    // Check for max length (100 chars is a reasonable limit)
    const MAX_USER_ID_LENGTH = 100;
    
    if (userIdentifier.length > MAX_USER_ID_LENGTH) {
      throw new OpenAIRequestError(`User identifier exceeds maximum length of ${MAX_USER_ID_LENGTH} characters`);
    }
    
    // Ensure no PII or sensitive data in the ID (basic check for email patterns)
    if (userIdentifier.includes('@') || /^\d{9,}$/.test(userIdentifier)) {
      throw new OpenAIRequestError('User identifier should not contain personally identifiable information');
    }
    
    return userIdentifier;
  }
  
  /**
   * Creates a mock response for development/testing
   * @param {Object} payload - The request payload
   * @returns {Object} A mock OpenAI response
   * @private
   */
  /**
   * Method createMockResponse
   */
  createMockResponse(payload) {
    const mockResponseId = `mock-${Date.now()}`;
    const mockContent = 'This is a mock response from OpenAI Responses API. The API key is missing or invalid.';
    
    // If tools are provided and tool_choice is forcing a function, create a mock tool call
    if (payload.tools && payload.tools.length > 0 && 
        payload.tool_choice && payload.tool_choice.type === 'function') {
      
      const functionName = payload.tool_choice.function.name;
      const mockToolCall = {
        id: mockResponseId,
        object: 'response',
        created_at: Math.floor(Date.now() / 1000),
        status: 'completed',
        model: payload.model,
        output: [
          {
            type: 'tool_call',
            id: `tc-${Date.now()}`,
            status: 'completed',
            tool_call: {
              id: `call-${Date.now()}`,
              type: 'function',
              function: {
                name: functionName,
                arguments: '{}'
              }
            }
          }
        ],
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0
        }
      };
      
      this.logger.info('Returning mock tool call response due to missing API key', {
        responseId: mockToolCall.id, 
        functionName
      });
      
      return mockToolCall;
    }
    
    // Standard text mock response
    const mockResponse = {
      id: mockResponseId,
      object: 'response',
      created_at: Math.floor(Date.now() / 1000),
      status: 'completed',
      model: payload.model,
      output: [
        {
          type: 'message',
          id: `msg-${Date.now()}`,
          status: 'completed',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: mockContent,
              annotations: []
            }
          ]
        }
      ],
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0
      }
    };
    
    this.logger.info('Returning mock response due to missing API key', {
      responseId: mockResponse.id
    });
    
    return mockResponse;
  }
  
  /**
   * Process an API response
   * @param {Object} response - Raw API response
   * @param {Object} options - Original request options
   * @returns {Object} Processed response
   * @private
   */
  /**
   * Method processResponse
   */
  processResponse(response, options) {
    // Validate and normalize the response structure
    const validatedResponse = this.validateResponseStructure(response);
    
    // Log appropriate information based on response content
    const hasTool = validatedResponse.output.some(item => item.type === 'tool_call');
    
    this.logger.debug('Received response from OpenAI Responses API', {
      responseId: validatedResponse.id,
      status: validatedResponse.status,
      outputTypes: validatedResponse.output.map(item => item.type),
      containsToolCall: hasTool
    });
    
    return validatedResponse;
  }
  
  /**
   * Handle request errors
   * @param {Error} error - The error that occurred
   * @throws {OpenAIRequestError|OpenAIResponseError} Rethrows with better context
   * @private
   */
  /**
   * Method handleRequestError
   */
  handleRequestError(error) {
    this.logger.error('Error processing OpenAI request', {
      error: error.message,
      stack: error.stack,
    });
    
    // If it's already an OpenAI error, just rethrow it
    if (error instanceof OpenAIRequestError || error instanceof OpenAIResponseHandlingError) {
      throw error;
    }
    
    // Check for OpenAI-specific error structure
    if (error.response?.data?.error || error.error) {
      const apiError = error.response?.data?.error || error.error;
      throw createOpenAIError(apiError, {
        statusCode: error.response?.status || error.status,
        cause: error
      });
    }
    
    // For other errors, wrap them with our custom error type
    throw createOpenAIError(error.message || 'Unknown API error', {
      statusCode: error.status || error.statusCode || 500,
      cause: error
    });
  }
  
  /**
   * Send a message to OpenAI's Responses API
   * @param {Object} messages - Message object with input and optional instructions
   * @param {Object} options - Request options
   * @returns {Promise<Object>} OpenAI API response
   */
  /**
   * Method sendMessage
   */
  sendMessage(messages, options = {}) {
    const model = options.model || this.config?.defaults?.model || 'gpt-4o';
    const temperature = options.temperature ?? this.config?.defaults?.temperature ?? 0.7;
    
    try {
      this.validateMessageFormat(messages);
      
      // Extract input and instructions from messages
      let input, instructions;
      
      // If messages has tool_outputs, it means we're submitting tool results
      if (messages.tool_outputs && Array.isArray(messages.tool_outputs)) {
        input = messages.input;
        // tool_outputs will be included directly in the payload
      } 
      // Otherwise, expect standard message object with input/instructions
      else {
        // Ensure messages are in Responses API format if they aren't already
        const formattedMessages = formatForResponsesApi(messages.input, messages.instructions);
        input = formattedMessages.input;
        instructions = formattedMessages.instructions;
      }
      
      // Build the API payload
      const payload = {
        model,
        input,
        ...(instructions && { instructions }),
        ...(messages.tool_outputs && { tool_outputs: messages.tool_outputs }),
        temperature,
        // Include tools if provided
        ...(options.tools && options.tools.length > 0 && { tools: options.tools }),
        // Include tool_choice if provided
        ...(options.toolChoice && { tool_choice: options.toolChoice }),
        // Include response format if provided
        ...(options.responseFormat && { response_format: { type: options.responseFormat } }),
        // Link to a previous response if provided
        ...(options.previousResponseId && { previous_response_id: options.previousResponseId }),
        // Apply truncation strategy if specified
        ...(options.truncation && { truncation: options.truncation }),
        // Include metadata if provided
        ...(options.metadata && { metadata: this.validateMetadata(options.metadata) }),
        // Include user identifier if provided
        ...(options.userIdentifier && { user: this.validateUserIdentifier(options.userIdentifier) }),
        // Include extra fields to retrieve in the response if needed
        ...(options.include && Array.isArray(options.include) && { include: options.include })
      };
      
      // Log the request (exclude sensitive information)
      this.logger.debug('Sending request to OpenAI', {
        model: payload.model,
        hasTools: !!(payload.tools && payload.tools.length > 0),
        hasPreviousResponse: !!payload.previous_response_id,
        hasToolOutputs: !!(payload.tool_outputs && payload.tool_outputs.length > 0),
        responseFormat: options.responseFormat,
        truncation: options.truncation
      });
      
      // For mock mode, return a predefined response
      if (this.useMock) {
        return this.createMockResponse(payload);
      }
      
      // Make actual API request
      const response = await this.sdk.responses.create(payload);
      
      // Process the response
      return this.processResponse(response, options);
    } catch (error) {
      return this.handleRequestError(error);
    }
  }
  
  /**
   * Send a message to OpenAI and get a JSON response
   * @param {Object} messages - Message object (will be formatted with formatForResponsesApi internally)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} OpenAI API response with parsed JSON
   */
  /**
   * Method sendJsonMessage
   */
  sendJsonMessage(messages, options = {}) {
    try {
      // Add JSON format to options
      const jsonOptions = {
        ...options,
        responseFormat: ResponseFormat.JSON,
        // Validate metadata if provided
        ...(options.metadata && { metadata: this.validateMetadata(options.metadata) }),
        // Use ToolChoice enum if tool_choice is provided
        ...(options.toolChoice && { 
          toolChoice: typeof options.toolChoice === 'string' && options.toolChoice === 'auto' 
            ? ToolChoice.AUTO 
            : options.toolChoice
        })
      };
      
      // Send the message
      const response = await this.sendMessage(messages, jsonOptions);
      
      // Extract the JSON content
      const content = this.responseHandler.extractMessageContent(response);
      
      if (!content) {
        throw new OpenAIResponseError('No content found in JSON response');
      }
      
      // Parse the JSON content
      const jsonData = this.responseHandler.formatJson(content);
      
      // Return both the raw response and the parsed JSON data
      return {
        responseId: response.id,
        status: response.status,
        model: response.model,
        data: jsonData,
        usage: response.usage,
        rawResponse: response
      };
    } catch (error) {
      return this.handleRequestError(error);
    }
  }
  
  /**
   * Send a message with tool definitions, allowing function calling
   * @param {Object} messages - Message object to send
   * @param {Array} tools - Array of tool definitions (from functionTools.js)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} OpenAI API response
   */
  /**
   * Method sendMessageWithTools
   */
  sendMessageWithTools(messages, tools, options = {}) {
    if (!Array.isArray(tools) || tools.length === 0) {
      throw new OpenAIRequestError('Tools must be a non-empty array');
    }
    
    // Merge tools with options
    const combinedOptions = {
      ...options,
      tools: tools,
      toolChoice: options.toolChoice || 'auto'
    };
    
    return this.sendMessage(messages, combinedOptions);
  }
  
  /**
   * Submit tool results and continue the conversation
   * @param {Object} toolOutputs - Tool outputs formatted using formatToolResult
   * @param {string|null} userInput - Optional user input to include
   * @param {Object} options - Request options
   * @returns {Promise<Object>} OpenAI API response
   */
  /**
   * Method submitToolResults
   */
  submitToolResults(toolOutputs, userInput = null, options = {}) {
    if (!toolOutputs || !toolOutputs.tool_outputs || !Array.isArray(toolOutputs.tool_outputs)) {
      throw new OpenAIRequestError('Tool outputs must be a valid object with tool_outputs array');
    }
    
    if (!options.previousResponseId) {
      throw new OpenAIRequestError('Previous response ID is required when submitting tool results');
    }
    
    // Create message object with tool outputs and optional user input
    const message = {
      ...(userInput && { input: userInput }),
      tool_outputs: toolOutputs.tool_outputs
    };
    
    return this.sendMessage(message, options);
  }
  
  /**
   * Stream a message response from OpenAI
   * @param {Object} messages - Message object
   * @param {Object} options - Request options
   * @returns {Promise<ReadableStream>} Stream of response chunks
   */
  /**
   * Method streamMessage
   */
  streamMessage(messages, options = {}) {
    const model = options.model || this.config?.defaults?.model || 'gpt-4o';
    const temperature = options.temperature ?? this.config?.defaults?.temperature ?? 0.7;
    
    try {
      this.logger.debug('Starting streaming request to OpenAI', { 
        model, 
        hasPreviousResponseId: !!options.previousResponseId,
        hasTools: !!(options.tools && options.tools.length > 0),
        useMock: this.useMock
      });
      
      // If in mock mode, return a mock stream response
      if (this.useMock) {
        this.logger.info('Returning mock stream due to missing API key');
        
        // Create consistent IDs for the mock stream
        const mockResponseId = `mock-resp-${Date.now()}`;
        const mockItemId = `mock-item-${Date.now()}`;
        
        // Create a mock response that simulates a stream with proper SSE event types
        const mockResponse = {
          on: (event, callback) => {
            if (event === 'data' && callback) {
              // Simulate proper Responses API stream events
              setTimeout(() => {
                callback({
                  type: StreamEventType.CREATED,
                  response: {
                    id: mockResponseId,
                    object: 'response',
                    created_at: Math.floor(Date.now() / 1000),
                    status: 'in_progress',
                    model: model,
                    output: []
                  }
                });
              }, 50);
              
              // Add text item
              setTimeout(() => {
                callback({
                  type: StreamEventType.ITEM_ADDED,
                  output_index: 0,
                  item: {
                    id: mockItemId,
                    status: 'in_progress',
                    type: 'message',
                    role: 'assistant',
                    content: []
                  }
                });
              }, 100);
              
              // Add content part
              setTimeout(() => {
                callback({
                  type: StreamEventType.CONTENT_ADDED,
                  item_id: mockItemId,
                  output_index: 0,
                  content_index: 0,
                  part: {
                    type: 'output_text',
                    text: '',
                    annotations: []
                  }
                });
              }, 150);
              
              // Send text deltas
              setTimeout(() => {
                callback({
                  type: StreamEventType.TEXT_DELTA,
                  item_id: mockItemId,
                  output_index: 0,
                  content_index: 0,
                  delta: 'This is a mock streamed '
                });
              }, 200);
              
              setTimeout(() => {
                callback({
                  type: StreamEventType.TEXT_DELTA,
                  item_id: mockItemId,
                  output_index: 0,
                  content_index: 0,
                  delta: 'response from OpenAI API. '
                });
              }, 250);
              
              // Finish text content
              setTimeout(() => {
                callback({
                  type: StreamEventType.TEXT_DONE,
                  item_id: mockItemId,
                  output_index: 0,
                  content_index: 0,
                  text: 'This is a mock streamed response from OpenAI API.'
                });
              }, 300);
              
              // If tools were provided in the options, add a tool call example
              if (options.tools && options.tools.length > 0) {
                const toolCallId = `mock-tool-${Date.now()}`;
                const toolCallItemId = `mock-item-tool-${Date.now()}`;
                
                // Add tool call item
                setTimeout(() => {
                  callback({
                    type: StreamEventType.ITEM_ADDED,
                    output_index: 1,
                    item: {
                      id: toolCallItemId,
                      status: 'in_progress',
                      type: 'tool_call',
                      tool_call: {
                        id: toolCallId,
                        type: 'function',
                        function: {
                          name: 'get_weather',
                          arguments: '{}'
                        }
                      }
                    }
                  });
                }, 350);
                
                // Add function argument deltas
                setTimeout(() => {
                  callback({
                    type: StreamEventType.FUNCTION_ARGS_DELTA,
                    item_id: toolCallItemId,
                    delta: '{'location':'
                  });
                }, 380);
                
                setTimeout(() => {
                  callback({
                    type: StreamEventType.FUNCTION_ARGS_DELTA,
                    item_id: toolCallItemId,
                    delta: ' 'San Francisco''
                  });
                }, 410);
                
                setTimeout(() => {
                  callback({
                    type: StreamEventType.FUNCTION_ARGS_DELTA,
                    item_id: toolCallItemId,
                    delta: ', 'unit': 'celsius'}'
                  });
                }, 440);
                
                // Complete function arguments
                setTimeout(() => {
                  callback({
                    type: StreamEventType.FUNCTION_ARGS_DONE,
                    item_id: toolCallItemId,
                    arguments: '{'location': 'San Francisco', 'unit': 'celsius'}'
                  });
                }, 470);
                
                // Complete tool call item
                setTimeout(() => {
                  callback({
                    type: StreamEventType.ITEM_DONE,
                    output_index: 1,
                    item: {
                      id: toolCallItemId,
                      status: 'completed',
                      type: 'tool_call',
                      tool_call: {
                        id: toolCallId,
                        type: 'function',
                        function: {
                          name: 'get_weather',
                          arguments: '{'location': 'San Francisco', 'unit': 'celsius'}'
                        }
                      }
                    }
                  });
                }, 500);
              }
              
              // Complete the message item
              setTimeout(() => {
                callback({
                  type: StreamEventType.ITEM_DONE,
                  output_index: 0,
                  item: {
                    id: mockItemId,
                    status: 'completed',
                    type: 'message',
                    role: 'assistant',
                    content: [
                      {
                        type: 'output_text',
                        text: 'This is a mock streamed response from OpenAI API.',
                        annotations: []
                      }
                    ]
                  }
                });
              }, options.tools && options.tools.length > 0 ? 550 : 350);
              
              // Complete the entire response
              setTimeout(() => {
                const finalResponse = {
                  type: StreamEventType.COMPLETED,
                  response: {
                    id: mockResponseId,
                    object: 'response',
                    created_at: Math.floor(Date.now() / 1000),
                    status: 'completed',
                    model: model,
                    output: [
                      {
                        id: mockItemId,
                        type: 'message',
                        role: 'assistant',
                        content: [
                          {
                            type: 'output_text',
                            text: 'This is a mock streamed response from OpenAI API.',
                            annotations: []
                          }
                        ]
                      }
                    ]
                  }
                };
                
                // Add tool call to final response if tools were provided
                if (options.tools && options.tools.length > 0) {
                  const toolCallId = `mock-tool-${Date.now()}`;
                  const toolCallItemId = `mock-item-tool-${Date.now()}`;
                  
                  finalResponse.response.output.push({
                    id: toolCallItemId,
                    type: 'tool_call',
                    tool_call: {
                      id: toolCallId,
                      type: 'function',
                      function: {
                        name: 'get_weather',
                        arguments: '{'location': 'San Francisco', 'unit': 'celsius'}'
                      }
                    }
                  });
                }
                
                callback(finalResponse);
              }, options.tools && options.tools.length > 0 ? 600 : 400);
            }
            
            // Return an object that simulates event listeners
            return {
              on: (nextEvent, nextCallback) => {
                // Handle 'end' or other events
                if (nextEvent === 'end' && nextCallback) {
                  setTimeout(nextCallback, options.tools && options.tools.length > 0 ? 650 : 450);
                }
                // Return object for chaining
                return { 
                  on: () => ({ cancel: () => {} })
                };
              }
            };
          }
        };
        
        return mockResponse;
      }
      
      // Handle different input formats for streaming
      let inputContent;
      let instructionsContent = null;
      
      // If messages has tool_outputs, it means we're submitting tool results
      if (messages.tool_outputs && Array.isArray(messages.tool_outputs)) {
        inputContent = messages.input || '';
        // tool_outputs will be included directly in the payload
      } 
      // Standard message format
      else {
        // Ensure messages are in Responses API format
        const formattedMessages = formatForResponsesApi(messages.input, messages.instructions);
        inputContent = formattedMessages.input;
        instructionsContent = formattedMessages.instructions;
      }
      
      // Create the payload for the Responses API
      const payload = {
        model,
        input: inputContent,
        ...(instructionsContent && { instructions: instructionsContent }),
        temperature,
        stream: true,
        ...(options.previousResponseId && { previous_response_id: options.previousResponseId }),
        ...(options.tools && options.tools.length > 0 && { tools: options.tools }),
        ...(options.toolChoice && { tool_choice: options.toolChoice }),
        ...(messages.tool_outputs && { tool_outputs: messages.tool_outputs }),
        ...(options.user && { user: options.user })
      };
      
      // Use SDK if available, otherwise use fetch API
      if (this.sdk) {
        const response = await this.sdk.responses.create(payload);
        
        return response;
      } else {
        const response = await fetch(this.baseURL, {
          method: 'POST',
          headers: {
            ...this.defaultHeaders,
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new OpenAIRequestError(`OpenAI API request failed: ${response.status}`, {
            statusCode: response.status,
            context: errorData
          });
        }
        
        return response.body;
      }
    } catch (error) {
      this.logger.error('Error processing OpenAI streaming request', {
        error: error.message,
        stack: error.stack,
        context: {
          model,
          input: typeof messages.input === 'string' ? messages.input?.slice(0, 50) + '...' : 'non-string input',
          hasPreviousResponseId: !!options.previousResponseId,
          hasTools: !!(options.tools && options.tools.length > 0)
        }
      });
      throw error;
    }
  }
  
  /**
   * Create a stream controller for handling server-sent events from OpenAI
   * @param {Object} messages - Message object to stream
   * @param {Object} options - Stream options
   * @param {Object} callbacks - Callback functions for stream events
   * @param {Function} [callbacks.onText] - Called when text is received (fullText, delta)
   * @param {Function} [callbacks.onComplete] - Called when stream completes (result)
   * @param {Function} [callbacks.onToolCall] - Called when tool call detected (toolCall)
   * @param {Function} [callbacks.onError] - Called on error (error)
   * @returns {Promise<Object>} Stream controller with methods and properties
   */
  /**
   * Method createStreamController
   */
  createStreamController(messages, options = {}, callbacks = {}) {
    const stream = await this.streamMessage(messages, options);
    
    // Create controller with callbacks and our logger
    return createStreamController(stream, {
      ...callbacks,
      logger: this.logger
    });
  }
  
  /**
   * Parse a stream response from OpenAI Responses API
   * This method is DEPRECATED - use createStreamController instead
   * @param {ReadableStream} stream - Stream from streamMessage
   * @param {Function} onEvent - Callback for each event
   * @returns {Promise<Object>} Resolves when stream ends
   * @deprecated Since 1.5.0 - Use createStreamController instead
   */
  /**
   * Method parseStream
   */
  parseStream(stream, onEvent) {
    this.logger.warn('parseStream is deprecated, use createStreamController instead');
    
    // Use our new stream processor but with backward compatibility
    const controller = createStreamController(stream, {
      onText: (fullText, delta) => {
        if (typeof onEvent === 'function' && delta) {
          onEvent({
            type: 'text',
            text: fullText,
            delta: delta
          });
        }
      },
      logger: this.logger
    });
    
    // Still allow direct event processing for backward compatibility
    if (typeof onEvent === 'function') {
      stream.on('data', onEvent);
    }
    
    return controller.done;
  }
  
  /**
   * Check the health of the OpenAI API connection
   * @returns {Promise<Object>} Health check result
   */
  checkHealth() {
    try {
      // Start timing
      const startTime = Date.now();
      
      // Don't make actual API calls if in mock mode
      if (this.useMock) {
        return {
          status: 'mock',
          message: 'OpenAI API client is in mock mode',
          responseTime: 0
        };
      }

      // Create a minimal message to test the API
      const testMessage = {
        input: 'Hello'
      };
      
      // Use minimal configuration for the test
      const options = {
        temperature: 0.0,
        maxTokens: 5,
        model: this.config?.defaults?.model || 'gpt-3.5-turbo'
      };
      
      // Attempt a simple API call
      await this.sendMessage(testMessage, options);
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'OpenAI API connection is healthy',
        responseTime: responseTime
      };
    } catch (error) {
      this.logger.error('OpenAI API health check failed', { error: error.message });
      
      return {
        status: 'error',
        message: `Failed to connect to OpenAI API: ${error.message}`,
        error: error.message
      };
    }
  }
}

module.exports = OpenAIClient;