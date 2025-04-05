'use strict';

/**
 * AI Module for integrating all AI-related functionality
 * Provides a unified interface for AI services
 */
class AIModule {
  /**
   * Create a new AIModule
   * @param {Object} config - Configuration for the module
   * @param {Object} config.openAIService - OpenAI service for AI responses
   * @param {Object} config.logger - Logger instance
   */
  constructor(config) {
    this.openAIService = config.openAIService;
    this.logger = config.logger || console;
  }

  /**
   * Process a prompt and get an AI response
   * @param {Object} params - Parameters for the prompt
   * @param {string} params.userId - ID of the user
   * @param {string} params.contextType - Type of context for the prompt
   * @param {string} params.contextId - ID of the context
   * @param {string} params.prompt - Prompt to process
   * @returns {Promise<Object>} AI response
   */
  async processPrompt(params) {
    try {
      return await this.openAIService.processPrompt(params);
    } catch (error) {
      this.logger.error('Error processing prompt', {
        userId: params.userId,
        contextType: params.contextType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get messages from a thread
   * @param {string} threadId - ID of the thread
   * @returns {Promise<Array<Object>>} Thread messages
   */
  async getThreadMessages(threadId) {
    try {
      return await this.openAIService.getThreadMessages(threadId);
    } catch (error) {
      this.logger.error('Error getting thread messages', {
        threadId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add a message to a thread
   * @param {Object} params - Parameters for the message
   * @param {string} params.threadId - ID of the thread
   * @param {string} params.role - Role of the message sender
   * @param {string} params.content - Content of the message
   * @returns {Promise<Object>} Added message
   */
  async addThreadMessage(params) {
    try {
      return await this.openAIService.addThreadMessage(params);
    } catch (error) {
      this.logger.error('Error adding thread message', {
        threadId: params.threadId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Register routes for AI endpoints
   * @param {Object} router - Express router
   * @param {Object} auth - Authentication middleware
   */
  registerRoutes(router, auth) {
    router.post('/ai/responses', auth, async (req, res) => {
      try {
        const result = await this.processPrompt({
          userId: req.user.id,
          contextType: req.body.contextType,
          contextId: req.body.contextId,
          prompt: req.body.prompt
        });
        
        res.status(200).json(result);
      } catch (error) {
        this.logger.error('Error in AI responses endpoint', {
          userId: req.user?.id,
          error: error.message
        });
        
        res.status(error.status || 500).json({
          error: error.message || 'Internal server error'
        });
      }
    });

    router.get('/ai/threads/:threadId/messages', auth, async (req, res) => {
      try {
        const result = await this.getThreadMessages(req.params.threadId);
        
        res.status(200).json(result);
      } catch (error) {
        this.logger.error('Error in thread messages endpoint', {
          threadId: req.params.threadId,
          error: error.message
        });
        
        res.status(error.status || 500).json({
          error: error.message || 'Internal server error'
        });
      }
    });

    router.post('/ai/threads/:threadId/messages', auth, async (req, res) => {
      try {
        const result = await this.addThreadMessage({
          threadId: req.params.threadId,
          role: req.body.role || 'user',
          content: req.body.content
        });
        
        res.status(201).json(result);
      } catch (error) {
        this.logger.error('Error in add thread message endpoint', {
          threadId: req.params.threadId,
          error: error.message
        });
        
        res.status(error.status || 500).json({
          error: error.message || 'Internal server error'
        });
      }
    });
  }
}

export default AIModule;
