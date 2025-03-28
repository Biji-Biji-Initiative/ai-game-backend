/**
 * Stream Processor for OpenAI Responses API
 * 
 * Provides utilities for processing Server-Sent Events (SSE) from the OpenAI Responses API
 * streaming endpoint. Handles various event types and provides callbacks for specific events.
 * 
 * @module streamProcessor
 */

const { StreamEventType } = require('./types');
const { OpenAIResponseHandlingError } = require('./errors');
const { apiLogger } = require('../logging/domainLogger');

/**
 * Creates a new StreamProcessor for handling Responses API streaming events
 */
class StreamProcessor {
  /**
   * Create a new StreamProcessor
   * @param {Object} options - Options for the processor
   * @param {Object} [options.logger] - Optional logger
   * @param {Function} [options.onText] - Callback for accumulated text (called on each delta)
   * @param {Function} [options.onComplete] - Callback when stream completes
   * @param {Function} [options.onToolCall] - Callback when a tool call is detected
   * @param {Function} [options.onError] - Callback for errors
   */
  constructor(options = {}) {
    this.options = options;
    this.logger = options.logger || apiLogger.child({ service: 'StreamProcessor' });
    
    // Accumulated state
    this.reset();
    
    // Callbacks
    this.onText = options.onText;
    this.onComplete = options.onComplete;
    this.onToolCall = options.onToolCall;
    this.onError = options.onError;
  }
  
  /**
   * Reset the processor state
   */
  reset() {
    this.responseId = null;
    this.status = 'in_progress';
    this.textBuffer = '';
    this.currentItems = new Map();
    this.outputItems = [];
    this.toolCalls = [];
    this.completed = false;
    this.error = null;
  }
  
  /**
   * Process an SSE event from the Responses API stream
   * @param {Object} event - The SSE event from the stream
   */
  processEvent(event) {
    try {
      if (!event || !event.type) {
        return; // Skip invalid events
      }
      
      // Handle different event types based on StreamEventType enum
      switch (event.type) {
        case StreamEventType.CREATED:
          this._handleCreated(event);
          break;
          
        case StreamEventType.IN_PROGRESS:
          this.status = 'in_progress';
          break;
          
        case StreamEventType.COMPLETED:
          this._handleCompleted(event);
          break;
          
        case StreamEventType.FAILED:
          this._handleFailed(event);
          break;
          
        case StreamEventType.INCOMPLETE:
          this._handleIncomplete(event);
          break;
          
        case StreamEventType.ITEM_ADDED:
          this._handleItemAdded(event);
          break;
          
        case StreamEventType.ITEM_DONE:
          this._handleItemDone(event);
          break;
          
        case StreamEventType.TEXT_DELTA:
          this._handleTextDelta(event);
          break;
          
        case StreamEventType.TEXT_DONE:
          this._handleTextDone(event);
          break;
          
        case StreamEventType.FUNCTION_ARGS_DELTA:
          this._handleFunctionArgsDelta(event);
          break;
          
        case StreamEventType.FUNCTION_ARGS_DONE:
          this._handleFunctionArgsDone(event);
          break;
          
        case StreamEventType.ERROR:
          this._handleError(event);
          break;
          
        default:
          // Log but don't fail on unknown event types
          this.logger.debug('Received unknown event type', { eventType: event.type });
      }
    } catch (error) {
      this.logger.error('Error processing stream event', { 
        error: error.message, 
        eventType: event?.type 
      });
      
      if (typeof this.onError === 'function') {
        this.onError(error);
      }
    }
  }
  
  /**
   * Process a stream of SSE events
   * @param {ReadableStream} stream - The stream from OpenAI
   * @returns {Promise<Object>} The final result after processing all events
   */
  async processStream(stream) {
    if (!stream || typeof stream.on !== 'function') {
      throw new OpenAIResponseHandlingError('Invalid stream provided');
    }
    
    // Reset state for new stream
    this.reset();
    
    return new Promise((resolve, reject) => {
      stream.on('data', (event) => {
        try {
          this.processEvent(event);
        } catch (error) {
          this.logger.error('Error in stream event processing', {
            error: error.message,
            eventType: event?.type
          });
        }
      });
      
      stream.on('end', () => {
        // If we haven't gotten a completion event, but the stream ended
        if (!this.completed && !this.error) {
          // Mark as completed with current state
          this.completed = true;
          
          if (typeof this.onComplete === 'function') {
            this.onComplete(this.getResult());
          }
        }
        
        resolve(this.getResult());
      });
      
      stream.on('error', (error) => {
        this.logger.error('Stream error', { error: error.message });
        this.error = error;
        
        if (typeof this.onError === 'function') {
          this.onError(error);
        }
        
        reject(error);
      });
    });
  }
  
  /**
   * Get the current accumulated result
   * @returns {Object} The current result state
   */
  getResult() {
    return {
      responseId: this.responseId,
      status: this.status,
      completed: this.completed,
      text: this.textBuffer,
      items: this.outputItems,
      toolCalls: this.toolCalls,
      error: this.error
    };
  }
  
  /**
   * Handle response.created event
   * @param {Object} event - The event object
   * @private
   */
  _handleCreated(event) {
    if (event.response && event.response.id) {
      this.responseId = event.response.id;
      this.logger.debug('Stream started', { responseId: this.responseId });
    }
  }
  
  /**
   * Handle response.completed event
   * @param {Object} event - The event object
   * @private
   */
  _handleCompleted(event) {
    this.completed = true;
    this.status = 'completed';
    
    // Process any final response data
    if (event.response) {
      this.responseId = event.response.id || this.responseId;
      
      // If there's a full response with output in the completed event, use it
      if (event.response.output && Array.isArray(event.response.output)) {
        this.outputItems = event.response.output;
      }
    }
    
    this.logger.debug('Stream completed', { 
      responseId: this.responseId,
      textLength: this.textBuffer.length,
      itemCount: this.outputItems.length,
      toolCallCount: this.toolCalls.length
    });
    
    if (typeof this.onComplete === 'function') {
      this.onComplete(this.getResult());
    }
  }
  
  /**
   * Handle response.failed event
   * @param {Object} event - The event object
   * @private
   */
  _handleFailed(event) {
    this.status = 'failed';
    this.completed = true;
    
    if (event.response && event.response.error) {
      this.error = new OpenAIResponseHandlingError(
        event.response.error.message || 'API response failed',
        { code: event.response.error.code }
      );
    } else {
      this.error = new OpenAIResponseHandlingError('API response failed without details');
    }
    
    this.logger.error('Stream failed', {
      responseId: this.responseId,
      error: this.error.message
    });
    
    if (typeof this.onError === 'function') {
      this.onError(this.error);
    }
  }
  
  /**
   * Handle response.incomplete event
   * @param {Object} event - The event object
   * @private
   */
  _handleIncomplete(event) {
    this.status = 'incomplete';
    this.completed = true;
    
    let reason = 'unknown';
    if (event.response && event.response.incomplete_details) {
      reason = event.response.incomplete_details.reason || 'unknown';
    }
    
    this.logger.warn('Stream incomplete', {
      responseId: this.responseId,
      reason
    });
    
    if (typeof this.onComplete === 'function') {
      this.onComplete(this.getResult());
    }
  }
  
  /**
   * Handle response.output_item.added event
   * @param {Object} event - The event object
   * @private
   */
  _handleItemAdded(event) {
    if (!event.item || !event.item.id) {
      this.logger.warn('Invalid item added event missing item or id', {
        eventData: JSON.stringify(event).substring(0, 100)
      });
      return;
    }
    
    // Track the item in our map
    this.currentItems.set(event.item.id, {
      ...event.item,
      contentParts: [], // Store content parts explicitly
      toolCallParts: {} // For tool call arguments
    });
    
    // If this is a tool call item, prepare to track it
    if (event.item.type === 'tool_call') {
      this.logger.debug('Tool call item added', { itemId: event.item.id });
    }
  }
  
  /**
   * Handle response.output_item.done event
   * @param {Object} event - The event object
   * @private
   */
  _handleItemDone(event) {
    if (!event.item || !event.item.id) {
      return;
    }
    
    const itemId = event.item.id;
    
    // Get and remove item from tracking map
    const trackedItem = this.currentItems.get(itemId);
    this.currentItems.delete(itemId);
    
    // Add completed item to our output items array
    this.outputItems.push(event.item);
    
    // For tool call items, extract and save the tool call information
    if (event.item.type === 'tool_call' && event.item.tool_call) {
      const toolCall = event.item.tool_call;
      
      this.toolCalls.push({
        id: toolCall.id,
        type: toolCall.type,
        functionName: toolCall.function?.name,
        arguments: toolCall.function?.arguments || '{}',
      });
      
      this.logger.debug('Tool call item completed', { 
        functionName: toolCall.function?.name 
      });
      
      // If we have a tool call callback, notify it
      if (typeof this.onToolCall === 'function') {
        this.onToolCall({
          id: toolCall.id,
          type: toolCall.type,
          functionName: toolCall.function?.name,
          arguments: toolCall.function?.arguments,
          parsedArguments: this._parseToolArguments(toolCall)
        });
      }
    }
  }
  
  /**
   * Handle response.output_text.delta event
   * @param {Object} event - The event object
   * @private
   */
  _handleTextDelta(event) {
    if (event.delta) {
      this.textBuffer += event.delta;
      
      if (typeof this.onText === 'function') {
        this.onText(this.textBuffer, event.delta);
      }
    }
  }
  
  /**
   * Handle response.output_text.done event
   * @param {Object} event - The event object
   * @private
   */
  _handleTextDone(event) {
    // If the full text is provided, use it to verify/correct our accumulated buffer
    if (event.text && event.text !== this.textBuffer) {
      this.logger.debug('Correcting text buffer with final text', {
        bufferLength: this.textBuffer.length,
        finalTextLength: event.text.length
      });
      
      this.textBuffer = event.text;
      
      if (typeof this.onText === 'function') {
        this.onText(this.textBuffer, null, true);
      }
    }
  }
  
  /**
   * Handle response.function_call_arguments.delta event
   * @param {Object} event - The event object
   * @private
   */
  _handleFunctionArgsDelta(event) {
    if (!event.item_id || !event.delta) {
      return;
    }
    
    // Get the tracked item
    const item = this.currentItems.get(event.item_id);
    if (!item) {
      return;
    }
    
    // Append to the function arguments
    if (!item.toolCallParts.args) {
      item.toolCallParts.args = '';
    }
    
    item.toolCallParts.args += event.delta;
  }
  
  /**
   * Handle response.function_call_arguments.done event
   * @param {Object} event - The event object
   * @private
   */
  _handleFunctionArgsDone(event) {
    if (!event.item_id || !event.arguments) {
      return;
    }
    
    // Get the tracked item
    const item = this.currentItems.get(event.item_id);
    if (!item) {
      return;
    }
    
    // Set the final arguments
    item.toolCallParts.args = event.arguments;
  }
  
  /**
   * Handle error event
   * @param {Object} event - The event object
   * @private
   */
  _handleError(event) {
    this.status = 'failed';
    
    const error = new OpenAIResponseHandlingError(
      event.message || 'Unknown streaming error',
      { code: event.code, context: event }
    );
    
    this.error = error;
    
    this.logger.error('Stream error event', {
      message: error.message,
      code: event.code
    });
    
    if (typeof this.onError === 'function') {
      this.onError(error);
    }
  }
  
  /**
   * Parse tool call arguments to an object
   * @param {Object} toolCall - The tool call to parse
   * @returns {Object} The parsed arguments object
   * @private
   */
  _parseToolArguments(toolCall) {
    if (!toolCall || !toolCall.function || !toolCall.function.arguments) {
      return {};
    }
    
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch (error) {
      this.logger.warn('Failed to parse tool arguments', {
        error: error.message,
        arguments: toolCall.function.arguments
      });
      return {};
    }
  }
}

/**
 * Create a client-friendly streaming interface for Responses API
 * @param {ReadableStream} stream - The raw stream from OpenAI API
 * @param {Object} options - Options for the processor
 * @returns {Object} A controller object with utility methods
 */
function createStreamController(stream, options = {}) {
  const processor = new StreamProcessor(options);
  
  // Start processing in the background
  const processingPromise = processor.processStream(stream);
  
  // Return a controller interface that exposes useful methods and properties
  return {
    // Properties
    get text() {
      return processor.textBuffer;
    },
    
    get completed() {
      return processor.completed;
    },
    
    get status() {
      return processor.status;
    },
    
    get toolCalls() {
      return [...processor.toolCalls];
    },
    
    get error() {
      return processor.error;
    },
    
    // Methods
    getResult: () => processor.getResult(),
    
    // Promise that resolves when stream is fully processed
    done: processingPromise
  };
}

module.exports = {
  StreamProcessor,
  createStreamController
}; 