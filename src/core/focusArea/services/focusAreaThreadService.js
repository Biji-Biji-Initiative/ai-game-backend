/**
 * Focus Area Thread Service
 * 
 * Manages conversation threads for focus area generation
 * Uses persistent storage for thread state via OpenAIStateManager
 * 
 * @module focusAreaThreadService
 * @requires OpenAIStateManager
 * @requires logger
 */

const { v4: uuidv4 } = require('uuid');
const { focusAreaLogger } = require('../../../core/infra/logging/domainLogger');

// Define a constant for the context prefix
const FOCUS_AREA_CONTEXT_PREFIX = 'focus_area_';

/**
 * Service that manages conversation threads for focus area generation
 */
class FocusAreaThreadService {
  /**
   * Create a new FocusAreaThreadService
   * @param {Object} dependencies - Service dependencies
   * @param {OpenAIStateManager} dependencies.openAIStateManager - State manager for OpenAI conversations
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({ openAIStateManager, logger }) {
    if (!openAIStateManager) {
      throw new Error('FocusAreaThreadService requires openAIStateManager dependency');
    }

    this.openAIStateManager = openAIStateManager;
    this.logger = logger || focusAreaLogger.child('threadService');
  }

  /**
   * Generate a unique context identifier for a focus area thread
   * @param {string} userId User ID
   * @returns {string} Unique context identifier
   */
  generateContextId(userId) {
    return `${FOCUS_AREA_CONTEXT_PREFIX}${userId}`;
  }

  /**
   * Create a new thread for focus area generation
   * @param {string} userId User ID
   * @param {Object} metadata Additional metadata for the thread
   * @returns {Promise<string>} Thread/State ID
   */
  async createThread(userId, metadata = {}) {
    if (!userId) {
      throw new Error('User ID is required to create a focus area thread');
    }

    this.logger.info('Creating new focus area conversation state', { userId });

    try {
      // Create a unique context identifier
      const context = this.generateContextId(userId);
      
      // Create thread metadata for storage
      const threadMetadata = {
        type: 'focus-area',
        purpose: 'Generate personalized focus areas for user',
        ...metadata
      };
      
      // Create persistent conversation state
      const state = await this.openAIStateManager.createConversationState(userId, context, threadMetadata);
      
      const stateId = state.id;
      
      if (!stateId) {
        throw new Error('Failed to create conversation state for focus area generation');
      }

      this.logger.info('Successfully created focus area conversation state', { 
        userId, 
        stateId,
        context
      });
      
      return stateId;
    } catch (error) {
      this.logger.error('Error creating focus area conversation state', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get an existing thread for a user or create a new one
   * @param {string} userId User ID
   * @param {Object} metadata Additional metadata for the thread
   * @returns {Promise<string>} Thread/State ID
   */
  async findOrCreateThread(userId, metadata = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    this.logger.info('Finding or creating focus area conversation state', { userId });

    try {
      // Generate context from userId
      const context = this.generateContextId(userId);
      
      // Create thread metadata for storage
      const threadMetadata = {
        type: 'focus-area',
        purpose: 'Generate personalized focus areas for user',
        ...metadata
      };
      
      // Find or create persistent conversation state
      const state = await this.openAIStateManager.findOrCreateConversationState(userId, context, threadMetadata);
      
      return state.id;
    } catch (error) {
      this.logger.error('Error finding or creating focus area conversation state', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get the last response ID from a thread
   * @param {string} stateId State/Thread ID
   * @returns {Promise<string|null>} Last response ID or null
   */
  async getLastResponseId(stateId) {
    if (!stateId) {
      throw new Error('State ID is required');
    }

    try {
      return await this.openAIStateManager.getLastResponseId(stateId);
    } catch (error) {
      this.logger.warn('Error retrieving last response ID', {
        error: error.message,
        stateId
      });
      return null;
    }
  }

  /**
   * Update thread with new response ID
   * @param {string} stateId State/Thread ID
   * @param {string} responseId Response ID
   * @returns {Promise<boolean>} Success status
   */
  async updateWithResponseId(stateId, responseId) {
    if (!stateId || !responseId) {
      return false;
    }

    try {
      await this.openAIStateManager.updateLastResponseId(stateId, responseId);
      
      this.logger.debug('Updated conversation state with response ID', { 
        stateId, 
        responseId 
      });
      
      return true;
    } catch (error) {
      this.logger.warn('Error updating conversation state with response ID', {
        error: error.message,
        stateId
      });
      return false;
    }
  }
}

module.exports = FocusAreaThreadService; 