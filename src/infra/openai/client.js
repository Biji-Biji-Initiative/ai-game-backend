/**
 * OpenAI API Client
 * 
 * A client for interacting with OpenAI's APIs, specifically the Responses API
 * for stateful conversation management via previous_response_id.
 */
const { apiLogger } = require('../../core/infra/logging/domainLogger');
const { ResponseFormat } = require('./types');
const { 
  OpenAIRequestError, 
  OpenAIResponseError 
} = require('./errors');

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
    this.baseURL = config?.apiConfig?.baseURL || 'https://api.openai.com/v1';
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
  setupClient() {
    try {
      const { OpenAI } = require('openai');
      
      this.sdk = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseURL,
        timeout: this.config?.apiConfig?.timeoutMs || 30000,
        maxRetries: 2
      });
    } catch (error) {
      this.logger.warn('OpenAI SDK not available, using fetch API instead', { 
        error: error.message 
      });
    }
  }
  
  /**
   * Send a message to the OpenAI Responses API
   * @param {Array} messages - Message array to send
   * @param {Object} options - Request options
   * @returns {Promise<Object>} OpenAI API response
   */
  async sendMessage(messages, options = {}) {
    const model = options.model || this.config?.defaults?.model || 'gpt-4o';
    const temperature = options.temperature ?? this.config?.defaults?.temperature ?? 0.7;
    const maxTokens = options.maxTokens || this.config?.defaults?.maxTokens;
    const responseFormat = options.responseFormat || ResponseFormat.TEXT;
    
    try {
      this.logger.debug('Sending message to OpenAI', { 
        model, 
        messagesCount: messages.length,
        hasPreviousResponseId: !!options.previousResponseId,
        useMock: this.useMock
      });
      
      // If in mock mode, return a mock response
      if (this.useMock) {
        const mockResponseId = `mock-${Date.now()}`;
        const mockContent = "This is a mock response from OpenAI API. The API key is missing so the actual API can't be called.";
        
        const mockResponse = {
          id: mockResponseId,
          responseId: mockResponseId,
          content: mockContent, // For backward compatibility
          output: [
            {
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: mockContent
                }
              ]
            }
          ],
          data: mockContent
        };
        
        this.logger.info('Returning mock response due to missing API key', {
          responseId: mockResponse.responseId
        });
        
        return mockResponse;
      }
      
      // Extract input and instructions from messages for Responses API
      // If messages already has input/instructions fields, use those directly
      let input, instructions;
      
      if (messages.input !== undefined) {
        input = messages.input;
        instructions = messages.instructions;
      } else {
        // Extract from message array (legacy format)
        // Get the last user message as the input
        const userMessages = messages.filter(m => m.role === 'user');
        if (userMessages.length === 0) {
          throw new Error('At least one user message is required');
        }
        
        input = userMessages[userMessages.length - 1].content;
        
        // Get system message as instructions
        const systemMessage = messages.find(m => m.role === 'system');
        instructions = systemMessage ? systemMessage.content : null;
      }
      
      // Create the payload for the Responses API
      const payload = {
        model,
        input,
        temperature,
        ...(maxTokens && { max_output_tokens: maxTokens }),
        ...(options.previousResponseId && { 
          previous_response_id: options.previousResponseId 
        })
      };
      
      // Add instructions if present
      if (instructions) {
        payload.instructions = instructions;
      }
      
      // Set the structured output format if needed
      if (responseFormat === ResponseFormat.JSON) {
        payload.text = { 
          format: { 
            type: 'json_object' 
          } 
        };
      }
      
      // Use SDK if available, otherwise use fetch API
      if (this.sdk) {
        const response = await this.sdk.responses.create(payload);
        
        // Validate response
        if (!response || !response.output || response.output.length === 0) {
          throw new OpenAIResponseError('Invalid response from OpenAI API');
        }
        
        // Extract the message content from the response
        const assistantMessage = response.output.find(item => 
          item.type === 'message' && item.role === 'assistant'
        );
        
        if (!assistantMessage || !assistantMessage.content) {
          throw new OpenAIResponseError('No assistant message found in the response');
        }
        
        // Get the text content from the output
        const textOutput = assistantMessage.content.find(item => 
          item.type === 'text'
        );
        
        if (!textOutput) {
          throw new OpenAIResponseError('No text output found in the response');
        }
        
        const responseObj = {
          content: textOutput.text,
          responseId: response.id,
          data: textOutput.text
        };
        
        this.logger.debug('Received response from OpenAI', {
          responseId: responseObj.responseId,
          contentLength: responseObj.content?.length || 0
        });
        
        return responseObj;
      } else {
        // Use fetch API if SDK not available
        const response = await fetch(`${this.baseURL}/responses`, {
          method: 'POST',
          headers: this.defaultHeaders,
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new OpenAIRequestError(`OpenAI API request failed: ${response.status}`, {
            statusCode: response.status,
            context: errorData
          });
        }
        
        const data = await response.json();
        
        // Validate the response format for the Responses API
        if (!data || !data.output || data.output.length === 0) {
          throw new OpenAIResponseError('Invalid response format from OpenAI API');
        }
        
        // Extract the message content from the response
        const assistantMessage = data.output.find(item => 
          item.type === 'message' && item.role === 'assistant'
        );
        
        if (!assistantMessage || !assistantMessage.content) {
          throw new OpenAIResponseError('No assistant message found in the response');
        }
        
        // Get the text content from the output
        const textOutput = assistantMessage.content.find(item => 
          item.type === 'text'
        );
        
        if (!textOutput) {
          throw new OpenAIResponseError('No text output found in the response');
        }
        
        const responseObj = {
          content: textOutput.text,
          responseId: data.id,
          data: textOutput.text
        };
        
        this.logger.debug('Received response from OpenAI', {
          responseId: responseObj.responseId,
          contentLength: responseObj.content?.length || 0
        });
        
        return responseObj;
      }
    } catch (error) {
      this.logger.error('Error sending message to OpenAI', { 
        error: error.message,
        stack: error.stack
      });
      
      if (error instanceof OpenAIRequestError || error instanceof OpenAIResponseError) {
        throw error;
      }
      
      throw new OpenAIRequestError(`OpenAI API request failed: ${error.message}`, {
        cause: error
      });
    }
  }
  
  /**
   * Send a message and get a JSON response
   * @param {Array} messages - Message array to send
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Message response with parsed JSON data
   */
  async sendJsonMessage(messages, options = {}) {
    try {
      // Set response format to JSON in the options
      const combinedOptions = {
        ...options,
        responseFormat: ResponseFormat.JSON
      };
      
      // Extract input and instructions if present to ensure format compatibility
      if (messages.input !== undefined) {
        // If already in Responses API format, ensure text.format is set correctly
        messages = {
          ...messages,
          text: {
            format: {
              type: 'json_object'
            }
          }
        };
      }
      
      const response = await this.sendMessage(messages, combinedOptions);
      
      // Parse JSON response using the responseHandler
      try {
        // Import the responseHandler helper
        const { formatJson } = require('./responseHandler');
        
        // Use the handler to properly format and clean the JSON response
        const jsonData = formatJson(response.content);
        
        this.logger.debug('Successfully parsed JSON response from OpenAI', {
          dataKeys: Object.keys(jsonData)
        });
        
        return {
          ...response,
          data: jsonData
        };
      } catch (parseError) {
        this.logger.error('Error parsing JSON response', { 
          error: parseError.message,
          content: response.content
        });
        throw new OpenAIResponseError('Failed to parse JSON response from OpenAI', {
          cause: parseError,
          context: { responseContent: response.content }
        });
      }
    } catch (error) {
      if (error instanceof OpenAIResponseError) {
        throw error;
      }
      throw new OpenAIRequestError(`JSON request to OpenAI failed: ${error.message}`, {
        cause: error
      });
    }
  }
  
  /**
   * Stream a message response from OpenAI
   * @param {Array|Object} messages - Message array or Responses API object
   * @param {Object} options - Request options
   * @returns {Promise<ReadableStream>} Stream of response chunks
   */
  async streamMessage(messages, options = {}) {
    const model = options.model || this.config?.defaults?.model || 'gpt-4o';
    const temperature = options.temperature ?? this.config?.defaults?.temperature ?? 0.7;
    
    try {
      this.logger.debug('Starting streaming request to OpenAI', { 
        model, 
        messagesCount: Array.isArray(messages) ? messages.length : 'using input/instructions format',
        hasPreviousResponseId: !!options.previousResponseId,
        useMock: this.useMock
      });
      
      // If in mock mode, return a mock stream response
      if (this.useMock) {
        this.logger.info('Returning mock stream due to missing API key');
        
        // Create a mock response that simulates a stream with proper SSE event types
        const mockResponse = {
          on: (event, callback) => {
            if (event === 'data' && callback) {
              // Simulate proper Responses API stream events
              setTimeout(() => {
                callback({
                  id: `mock-${Date.now()}`,
                  event: "response.data",
                  data: {
                    type: "message.start",
                    message: { role: "assistant" }
                  }
                });
              }, 50);
              
              setTimeout(() => {
                callback({
                  event: "response.data",
                  data: {
                    type: "message.delta",
                    delta: {
                      type: "text",
                      text: "This is a mock streamed "
                    }
                  }
                });
              }, 100);
              
              setTimeout(() => {
                callback({
                  event: "response.data",
                  data: {
                    type: "message.delta",
                    delta: {
                      type: "text",
                      text: "response from OpenAI API. "
                    }
                  }
                });
              }, 200);
              
              setTimeout(() => {
                callback({
                  event: "response.data",
                  data: {
                    type: "message.delta",
                    delta: {
                      type: "text",
                      text: "The API key is missing."
                    }
                  }
                });
              }, 300);
              
              setTimeout(() => {
                callback({
                  event: "response.data",
                  data: {
                    type: "message.end"
                  }
                });
              }, 350);
              
              setTimeout(() => {
                callback({
                  event: "response.done",
                  data: {}
                });
              }, 400);
            }
            
            if (event === 'end' && callback) {
              setTimeout(() => callback(), 450);
            }
            
            return mockResponse;
          }
        };
        
        return mockResponse;
      }
      
      // Extract input and instructions from messages for Responses API
      let input, instructions;
      
      if (typeof messages === 'object' && !Array.isArray(messages) && messages.input !== undefined) {
        // Direct Responses API format
        input = messages.input;
        instructions = messages.instructions;
      } else if (Array.isArray(messages)) {
        // Extract from message array (legacy format)
        // Get the last user message as the input
        const userMessages = messages.filter(m => m.role === 'user');
        if (userMessages.length === 0) {
          throw new Error('At least one user message is required');
        }
        
        input = userMessages[userMessages.length - 1].content;
        
        // Get system message as instructions
        const systemMessage = messages.find(m => m.role === 'system');
        instructions = systemMessage ? systemMessage.content : null;
      } else {
        throw new Error('Invalid messages format. Must be an array of messages or an object with input/instructions');
      }
      
      // Create the payload for the Responses API
      const payload = {
        model,
        input,
        temperature,
        stream: true,
        ...(options.previousResponseId && { 
          previous_response_id: options.previousResponseId 
        })
      };
      
      // Add instructions if present
      if (instructions) {
        payload.instructions = instructions;
      }
      
      // Use SDK if available, otherwise use fetch API
      if (this.sdk) {
        const stream = await this.sdk.responses.create({
          ...payload,
          stream: true
        });
        
        return stream;
      } else {
        // Use fetch API if SDK not available
        const response = await fetch(`${this.baseURL}/responses`, {
          method: 'POST',
          headers: this.defaultHeaders,
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new OpenAIRequestError(`OpenAI API streaming request failed: ${response.status}`, {
            statusCode: response.status,
            context: errorData
          });
        }
        
        return response.body;
      }
    } catch (error) {
      this.logger.error('Error streaming message from OpenAI', { 
        error: error.message,
        stack: error.stack
      });
      
      if (error instanceof OpenAIRequestError) {
        throw error;
      }
      
      throw new OpenAIRequestError(`OpenAI streaming request failed: ${error.message}`, {
        cause: error
      });
    }
  }
}

module.exports = OpenAIClient; 