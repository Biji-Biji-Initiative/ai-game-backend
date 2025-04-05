import OpenAI from 'openai';
'use strict';

/**
 * Adapter for OpenAI Responses API
 * Handles thread-based interactions with OpenAI
 */
class OpenAIResponsesAdapter {
  /**
   * Create a new OpenAIResponsesAdapter
   * @param {Object} config - Configuration for the adapter
   * @param {string} config.apiKey - OpenAI API key
   * @param {string} [config.organization] - OpenAI organization ID
   * @param {Object} [config.logger] - Logger instance
   */
  constructor(config) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
    });
    this.logger = config.logger || console;
  }

  /**
   * Create a new thread
   * @param {Object} [options] - Options for thread creation
   * @param {Object} [options.metadata] - Metadata for the thread
   * @returns {Promise<Object>} Created thread
   */
  async createThread(options = {}) {
    try {
      const thread = await this.client.beta.threads.create({
        metadata: options.metadata,
      });
      this.logger.info('Thread created', { threadId: thread.id });
      return thread;
    } catch (error) {
      this.logger.error('Error creating thread', { error: error.message });
      throw error;
    }
  }

  /**
   * Add a message to a thread
   * @param {Object} params - Parameters for message creation
   * @param {string} params.threadId - ID of the thread
   * @param {string} params.role - Role of the message sender (user or assistant)
   * @param {string} params.content - Content of the message
   * @param {Array<string>} [params.fileIds] - IDs of files to attach
   * @param {Object} [params.metadata] - Metadata for the message
   * @returns {Promise<Object>} Created message
   */
  async createMessage(params) {
    try {
      const message = await this.client.beta.threads.messages.create(
        params.threadId,
        {
          role: params.role,
          content: params.content,
          file_ids: params.fileIds,
          metadata: params.metadata,
        }
      );
      this.logger.info('Message created', { 
        threadId: params.threadId, 
        messageId: message.id 
      });
      return message;
    } catch (error) {
      this.logger.error('Error creating message', { 
        threadId: params.threadId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Create and run a thread with an assistant
   * @param {Object} params - Parameters for run creation
   * @param {string} params.assistantId - ID of the assistant
   * @param {Object} [params.thread] - Thread to create
   * @param {string} [params.model] - Model to use
   * @param {string} [params.instructions] - Override instructions
   * @param {Array<Object>} [params.tools] - Tools for the assistant
   * @param {Object} [params.metadata] - Metadata for the run
   * @returns {Promise<Object>} Created run
   */
  async createThreadAndRun(params) {
    try {
      const run = await this.client.beta.threads.createAndRun({
        assistant_id: params.assistantId,
        thread: params.thread,
        model: params.model,
        instructions: params.instructions,
        tools: params.tools,
        metadata: params.metadata,
      });
      this.logger.info('Thread and run created', { 
        threadId: run.thread_id, 
        runId: run.id 
      });
      return run;
    } catch (error) {
      this.logger.error('Error creating thread and run', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Create a run in an existing thread
   * @param {Object} params - Parameters for run creation
   * @param {string} params.threadId - ID of the thread
   * @param {string} params.assistantId - ID of the assistant
   * @param {string} [params.model] - Model to use
   * @param {string} [params.instructions] - Override instructions
   * @param {Array<Object>} [params.tools] - Tools for the assistant
   * @param {Object} [params.metadata] - Metadata for the run
   * @returns {Promise<Object>} Created run
   */
  async createRun(params) {
    try {
      const run = await this.client.beta.threads.runs.create(
        params.threadId,
        {
          assistant_id: params.assistantId,
          model: params.model,
          instructions: params.instructions,
          tools: params.tools,
          metadata: params.metadata,
        }
      );
      this.logger.info('Run created', { 
        threadId: params.threadId, 
        runId: run.id 
      });
      return run;
    } catch (error) {
      this.logger.error('Error creating run', { 
        threadId: params.threadId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Retrieve a thread
   * @param {string} threadId - ID of the thread to retrieve
   * @returns {Promise<Object>} Retrieved thread
   */
  async getThread(threadId) {
    try {
      const thread = await this.client.beta.threads.retrieve(threadId);
      return thread;
    } catch (error) {
      this.logger.error('Error retrieving thread', { 
        threadId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Retrieve messages from a thread
   * @param {Object} params - Parameters for message retrieval
   * @param {string} params.threadId - ID of the thread
   * @param {number} [params.limit] - Maximum number of messages
   * @param {string} [params.order] - Order of messages (asc or desc)
   * @param {string} [params.after] - Cursor for pagination
   * @param {string} [params.before] - Cursor for pagination
   * @returns {Promise<Object>} Retrieved messages
   */
  async getMessages(params) {
    try {
      const messages = await this.client.beta.threads.messages.list(
        params.threadId,
        {
          limit: params.limit,
          order: params.order,
          after: params.after,
          before: params.before,
        }
      );
      return messages;
    } catch (error) {
      this.logger.error('Error retrieving messages', { 
        threadId: params.threadId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Retrieve a run
   * @param {string} threadId - ID of the thread
   * @param {string} runId - ID of the run to retrieve
   * @returns {Promise<Object>} Retrieved run
   */
  async getRun(threadId, runId) {
    try {
      const run = await this.client.beta.threads.runs.retrieve(
        threadId,
        runId
      );
      return run;
    } catch (error) {
      this.logger.error('Error retrieving run', { 
        threadId, 
        runId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Submit tool outputs to a run
   * @param {Object} params - Parameters for tool output submission
   * @param {string} params.threadId - ID of the thread
   * @param {string} params.runId - ID of the run
   * @param {Array<Object>} params.toolOutputs - Tool outputs
   * @returns {Promise<Object>} Updated run
   */
  async submitToolOutputs(params) {
    try {
      const run = await this.client.beta.threads.runs.submitToolOutputs(
        params.threadId,
        params.runId,
        {
          tool_outputs: params.toolOutputs,
        }
      );
      this.logger.info('Tool outputs submitted', { 
        threadId: params.threadId, 
        runId: params.runId 
      });
      return run;
    } catch (error) {
      this.logger.error('Error submitting tool outputs', { 
        threadId: params.threadId, 
        runId: params.runId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Cancel a run
   * @param {string} threadId - ID of the thread
   * @param {string} runId - ID of the run to cancel
   * @returns {Promise<Object>} Canceled run
   */
  async cancelRun(threadId, runId) {
    try {
      const run = await this.client.beta.threads.runs.cancel(
        threadId,
        runId
      );
      this.logger.info('Run canceled', { threadId, runId });
      return run;
    } catch (error) {
      this.logger.error('Error canceling run', { 
        threadId, 
        runId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Poll a run until it completes or fails
   * @param {string} threadId - ID of the thread
   * @param {string} runId - ID of the run to poll
   * @param {Object} [options] - Options for polling
   * @param {number} [options.interval=1000] - Polling interval in ms
   * @param {number} [options.timeout=60000] - Timeout in ms
   * @returns {Promise<Object>} Completed run
   */
  async pollRunUntilCompletion(threadId, runId, options = {}) {
    const interval = options.interval || 1000;
    const timeout = options.timeout || 60000;
    const startTime = Date.now();
    
    const checkRun = async () => {
      const run = await this.getRun(threadId, runId);
      
      if (['completed', 'failed', 'cancelled', 'expired'].includes(run.status)) {
        return run;
      }
      
      if (Date.now() - startTime > timeout) {
        throw new Error('Run polling timed out');
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
      return checkRun();
    };
    
    return checkRun();
  }

  /**
   * Get the latest message from a thread
   * @param {string} threadId - ID of the thread
   * @returns {Promise<Object>} Latest message
   */
  async getLatestMessage(threadId) {
    const messages = await this.getMessages({
      threadId,
      limit: 1,
      order: 'desc',
    });
    
    if (messages.data.length === 0) {
      throw new Error('No messages found in thread');
    }
    
    return messages.data[0];
  }
}

export default OpenAIResponsesAdapter;
