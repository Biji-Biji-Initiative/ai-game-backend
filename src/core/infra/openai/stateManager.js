'use strict';

/**
 * OpenAI Responses API State Manager
 *
 * Handles PERSISTENT storage and retrieval of the `previous_response_id`
 * required for stateful conversations with the Responses API.
 *
 * IMPORTANT: This does NOT interact with OpenAI's Assistants API Threads.
 *            It manages state specifically for the Responses API flow.
 */
const { v4: uuidv4 } = require('uuid');
const { OpenAIStateManagementError } = require('./errors');

/**
 * Class for managing state persistence for OpenAI Responses API
 */
class OpenAIStateManager {
  /**
   * Create a new OpenAIStateManager
   * @param {object} options - OpenAIStateManager options
   * @param {object} options.conversationStateRepository - Repository for saving/loading state
   * @param {object} options.logger - Logger instance
   */
  /**
   * Method constructor
   */
  constructor({ conversationStateRepository, logger }) {
    if (!conversationStateRepository) {
      throw new OpenAIStateManagementError(
        'ConversationStateRepository is required for OpenAIStateManager'
      );
    }
    if (!logger) {
      throw new OpenAIStateManagementError('Logger is required for OpenAIStateManager');
    }
    this.repo = conversationStateRepository;
    this.logger = logger.child({ service: 'OpenAIStateManager' });
  }

  /**
   * Creates a new state record for a conversation.
   * @param {string} userId - The user associated with the conversation.
   * @param {string} context - A string identifying the conversation's purpose (e.g., 'challenge_eval_123', 'focus_area_gen').
   * @param {object} [initialMetadata={}] - Any additional metadata to store.
   * @returns {Promise<object>} The created state record (including its ID).
   */
  /**
   * Method createConversationState
   */
  createConversationState(userId, context, initialMetadata = {}) {
    if (!userId || !context) {
      throw new OpenAIStateManagementError('UserId and context are required to create conversation state');
    }
    const state = {
      id: uuidv4(), // Or generate ID based on userId/context if preferred & unique
      userId,
      context,
      lastResponseId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: initialMetadata,
    };
    try {
      const createdState = await this.repo.createState(state);
      this.logger.info('Created new conversation state', { stateId: createdState.id, userId, context });
      return createdState;
    } catch (dbError) {
      this.logger.error('Failed to create conversation state in repository', {
        error: dbError.message, userId, context,
      });
      throw new OpenAIStateManagementError(`Database error creating state: ${dbError.message}`, { userId, context });
    }
  }

  /**
   * Finds an existing conversation state or creates a new one.
   * @param {string} userId - The user associated with the conversation.
   * @param {string} context - A string identifying the conversation's purpose.
   * @param {object} [initialMetadata={}] - Metadata if creating a new state.
   * @returns {Promise<object>} The found or created state record.
   */
  /**
   * Method findOrCreateConversationState
   */
  findOrCreateConversationState(userId, context, initialMetadata = {}) {
    if (!userId || !context) {
      throw new OpenAIStateManagementError('UserId and context are required');
    }
    try {
      // Attempt to find by userId and context
      let state = await this.repo.findStateByContext(userId, context);
      if (state) {
        this.logger.debug('Found existing conversation state', { stateId: state.id, userId, context });
        return state;
      } else {
        this.logger.info('No existing state found, creating new one', { userId, context });
        return await this.createConversationState(userId, context, initialMetadata);
      }
    } catch (dbError) {
      this.logger.error('Database error finding/creating conversation state', {
        error: dbError.message, userId, context,
      });
      throw new OpenAIStateManagementError(`Database error finding/creating state: ${dbError.message}`, { userId, context });
    }
  }

  /**
   * Retrieves the last response ID for a given conversation state.
   * @param {string} stateId - The unique ID of the conversation state record.
   * @returns {Promise<string|null>} The last response ID, or null if none.
   */
  /**
   * Method getLastResponseId
   */
  getLastResponseId(stateId) {
    if (!stateId) {
      this.logger.warn('getLastResponseId called without stateId');
      return null; // Or throw? Depends on desired strictness.
    }
    try {
      const state = await this.repo.findStateById(stateId);
      if (!state) {
        this.logger.warn('Conversation state not found for getLastResponseId', { stateId });
        return null;
      }
      return state.lastResponseId;
    } catch (dbError) {
      this.logger.error('Failed to get last response ID from repository', {
        error: dbError.message, stateId,
      });
      throw new OpenAIStateManagementError(`Database error getting state: ${dbError.message}`, { stateId });
    }
  }

  /**
   * Updates the conversation state with the latest response ID.
   * @param {string} stateId - The unique ID of the conversation state record.
   * @param {string} newResponseId - The ID of the latest response from OpenAI.
   * @returns {Promise<void>}
   */
  /**
   * Method updateLastResponseId
   */
  updateLastResponseId(stateId, newResponseId) {
    if (!stateId || !newResponseId) {
      throw new OpenAIStateManagementError('StateId and newResponseId are required for update');
    }
    try {
      const updates = {
        lastResponseId: newResponseId,
        updatedAt: new Date().toISOString(),
      };
      const success = await this.repo.updateState(stateId, updates);
      if (!success) {
        throw new OpenAIStateManagementError('Failed to update conversation state (not found or DB error)', { stateId });
      }
      this.logger.debug('Updated conversation state with new response ID', { stateId, newResponseId });
    } catch (dbError) {
      this.logger.error('Failed to update last response ID in repository', {
        error: dbError.message, stateId, newResponseId,
      });
      throw new OpenAIStateManagementError(`Database error updating state: ${dbError.message}`, { stateId });
    }
  }

  /**
   * Deletes a conversation state record.
   * @param {string} stateId - The unique ID of the conversation state record.
   * @returns {Promise<boolean>} True if deleted, false otherwise.
   */
  /**
   * Method deleteConversationState
   */
  deleteConversationState(stateId) {
    if (!stateId) {
      throw new OpenAIStateManagementError('StateId is required for deletion');
    }
    try {
      const success = await this.repo.deleteState(stateId);
      if (success) {
        this.logger.info('Deleted conversation state', { stateId });
      } else {
        this.logger.warn('Could not delete conversation state (not found)', { stateId });
      }
      return success;
    } catch (dbError) {
      this.logger.error('Database error deleting conversation state', {
        error: dbError.message, stateId,
      });
      throw new OpenAIStateManagementError(`Database error deleting state: ${dbError.message}`, { stateId });
    }
  }
}

// Export as an object for consistency
module.exports = { OpenAIStateManager }; 