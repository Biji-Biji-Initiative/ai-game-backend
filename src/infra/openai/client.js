/**
 * OpenAI API Client
 * 
 * A client for interacting with OpenAI's Responses API
 * for stateful conversation management via previous_response_id.
 */
const { apiLogger } = require('../../core/infra/logging/domainLogger');
const { ResponseFormat } = require('./types');
const { 
  OpenAIRequestError, 
  OpenAIResponseError 
} = require('./errors');
const { formatForResponsesApi } = require('./messageFormatter');

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
   * @param {Object} messages - Message object to send
   * @param {Object} options - Request options
   * @returns {Promise<Object>} OpenAI API response
   */
  async sendMessage(messages, options = {}) {
    const model = options.model || this.config?.defaults?.model || 'gpt-4o';
    const temperature = options.temperature ?? this.config?.defaults?.temperature ?? 0.7;
    const maxTokens = options.maxTokens || this.config?.defaults?.maxTokens;
    const responseFormat = options.responseFormat || ResponseFormat.TEXT;
    
    try {
      this.logger.debug('Sending message to OpenAI Responses API', { 
        model, 
        hasPreviousResponseId: !!options.previousResponseId,
        useMock: this.useMock
      });
      
      // If in mock mode, return a mock response
      if (this.useMock) {
        const mockResponseId = `mock-${Date.now()}`;
        const mockContent = "This is a mock response from OpenAI Responses API. The API key is missing so the actual API can't be called.";
        
        const mockResponse = {
          id: mockResponseId,
          responseId: mockResponseId,
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
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          }
        };
        
        this.logger.info('Returning mock response due to missing API key', {
          responseId: mockResponse.responseId
        });
        
        return mockResponse;
      }
      
      // Ensure messages are in Responses API format
      const formattedMessages = formatForResponsesApi(messages.input, messages.instructions);
      
      // Create the payload for the Responses API
      const payload = {
        model,
        input: formattedMessages.input,
        ...(messages.instructions && { instructions: formattedMessages.instructions }),
        temperature,
        ...(maxTokens && { max_output_tokens: maxTokens }),
        ...(options.previousResponseId && { 
          previous_response_id: options.previousResponseId 
        })
      };
      
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
        
        const responseObj = {
          id: response.id,
          responseId: response.id,
          output: response.output,
          usage: response.usage
        };
        
        this.logger.debug('Received response from OpenAI', {
          responseId: responseObj.responseId,
          contentLength: responseObj.output[0].content[0].text?.length || 0
        });
        
        return responseObj;
      } else {
        // Use fetch API if SDK not available
        const response = await fetch(`${this.baseURL}`, {
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
        
        const responseObj = {
          id: data.id,
          responseId: data.id,
          output: data.output,
          usage: data.usage
        };
        
        this.logger.debug('Received response from OpenAI', {
          responseId: responseObj.responseId,
          contentLength: responseObj.output[0].content[0].text?.length || 0
        });
        
        return responseObj;
      }
    } catch (error) {
      this.logger.error('Error processing OpenAI request', {
        error: error.message,
        stack: error.stack,
        context: {
          model,
          input: messages.input?.slice(0, 50) + '...', // Log truncated input for debugging
          hasPreviousResponseId: !!options.previousResponseId
        }
      });
      throw error;
    }
  }
  
  /**
   * Send a message and get a JSON response
   * @param {Object} messages - Message object to send
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
      
      const response = await this.sendMessage(messages, combinedOptions);
      
      // Parse JSON response using the responseHandler
      try {
        // Import the responseHandler helper
        const { formatJson } = require('./responseHandler');
        
        // Use the handler to properly format and clean the JSON response
        const jsonData = formatJson(response.output[0].content[0].text);
        
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
          content: response.output[0].content[0].text
        });
        throw new OpenAIResponseError('Failed to parse JSON response from OpenAI', {
          cause: parseError,
          context: { responseContent: response.output[0].content[0].text }
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
   * @param {Object} messages - Message object
   * @param {Object} options - Request options
   * @returns {Promise<ReadableStream>} Stream of response chunks
   */
  async streamMessage(messages, options = {}) {
    const model = options.model || this.config?.defaults?.model || 'gpt-4o';
    const temperature = options.temperature ?? this.config?.defaults?.temperature ?? 0.7;
    
    try {
      this.logger.debug('Starting streaming request to OpenAI', { 
        model, 
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
                    type: "message.end",
                    message: { role: "assistant" }
                  }
                });
              }, 300);
              
              setTimeout(() => {
                callback({
                  event: "response.done",
                  data: {
                    id: `mock-${Date.now()}`
                  }
                });
              }, 400);
            }
          }
        };
        
        return mockResponse;
      }
      
      // Ensure messages are in Responses API format
      const formattedMessages = formatForResponsesApi(messages.input, messages.instructions);
      
      // Create the payload for the Responses API
      const payload = {
        model,
        input: formattedMessages.input,
        ...(messages.instructions && { instructions: formattedMessages.instructions }),
        temperature,
        stream: true,
        ...(options.previousResponseId && { 
          previous_response_id: options.previousResponseId 
        })
      };
      
      // Use SDK if available, otherwise use fetch API
      if (this.sdk) {
        const response = await this.sdk.responses.create(payload);
        
        return response;
      } else {
        const response = await fetch(`${this.baseURL}`, {
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
          input: messages.input?.slice(0, 50) + '...', // Log truncated input for debugging
          hasPreviousResponseId: !!options.previousResponseId
        }
      });
      throw error;
    }
  }
}

module.exports = OpenAIClient;