import { focusAreaLogger } from "../../infra/logging/domainLogger.js";
import { FocusAreaError } from "../../focusArea/errors/focusAreaErrors.js";
import { withServiceErrorHandling, createErrorMapper } from "../../infra/errors/errorStandardization.js";
'use strict';
// Create an error mapper for the focus area thread service
const focusAreaThreadErrorMapper = createErrorMapper({
  'Error': FocusAreaError
}, FocusAreaError);
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
  /**
   * Method constructor
   */
  constructor({
    openAIStateManager,
    logger
  }) {
    if (!openAIStateManager) {
      throw new Error('FocusAreaThreadService requires openAIStateManager dependency');
    }
    this.openAIStateManager = openAIStateManager;
    this.logger = logger || focusAreaLogger.child('threadService');
    // Apply standardized error handling to methods
    this.createThread = withServiceErrorHandling(this.createThread.bind(this), {
      methodName: 'createThread',
      domainName: 'focusArea',
      logger: this.logger,
      errorMapper: focusAreaThreadErrorMapper
    });
    this.findOrCreateThread = withServiceErrorHandling(this.findOrCreateThread.bind(this), {
      methodName: 'findOrCreateThread',
      domainName: 'focusArea',
      logger: this.logger,
      errorMapper: focusAreaThreadErrorMapper
    });
    this.getLastResponseId = withServiceErrorHandling(this.getLastResponseId.bind(this), {
      methodName: 'getLastResponseId',
      domainName: 'focusArea',
      logger: this.logger,
      errorMapper: focusAreaThreadErrorMapper
    });
    this.updateWithResponseId = withServiceErrorHandling(this.updateWithResponseId.bind(this), {
      methodName: 'updateWithResponseId',
      domainName: 'focusArea',
      logger: this.logger,
      errorMapper: focusAreaThreadErrorMapper
    });
  }
  /**
   * Generate a unique context identifier for a focus area thread
   * @param {string} userId - User ID to generate context for
   * @returns {string} Unique context identifier
   */
  /**
   * Method generateContextId
   * @param {string} userId - User ID to generate context for
   * @returns {string} Unique context identifier
   */
  generateContextId(userId) {
    return `${FOCUS_AREA_CONTEXT_PREFIX}${userId}`;
  }
  /**
   * Create a new thread for focus area generation
   * @param {string} userId - User ID for whom to create the thread
   * @param {Object} metadata - Additional metadata for the thread
   * @returns {Promise<string>} Thread/State ID
   */
  /**
   * Method createThread
   * @param {string} userId - User ID for whom to create the thread
   * @param {Object} metadata - Additional metadata for the thread
   * @returns {Promise<string>} Thread/State ID
   */
  async createThread(userId, metadata = {}) {
    if (!userId) {
      throw new Error('User ID is required to create a focus area thread');
    }
    this.logger.info('Creating new focus area conversation state', {
      userId
    });
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
  }
  /**
   * Get an existing thread for a user or create a new one
   * @param {string} userId - User ID for whom to find or create a thread
   * @param {Object} metadata - Additional metadata for the thread
   * @returns {Promise<string>} Thread/State ID
   */
  /**
   * Method findOrCreateThread
   * @param {string} userId - User ID for whom to find or create a thread
   * @param {Object} metadata - Additional metadata for the thread
   * @returns {Promise<string>} Thread/State ID
   */
  async findOrCreateThread(userId, metadata = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    this.logger.info('Finding or creating focus area conversation state', {
      userId
    });
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
  }
  /**
   * Get the last response ID from a thread
   * @param {string} stateId - State/Thread ID to get last response from
   * @returns {Promise<string|null>} Last response ID or null
   */
  /**
   * Method getLastResponseId
   * @param {string} stateId - State/Thread ID to get last response from
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
   * @param {string} stateId - State/Thread ID to update
   * @param {string} responseId - Response ID to associate with the thread
   * @returns {Promise<boolean>} Success status
   */
  /**
   * Method updateWithResponseId
   * @param {string} stateId - State/Thread ID to update
   * @param {string} responseId - Response ID to associate with the thread
   * @returns {Promise<boolean>} Success status
   */
  async updateWithResponseId(stateId, responseId) {
    if (!stateId || !responseId) {
      return false;
    }
    await this.openAIStateManager.updateLastResponseId(stateId, responseId);
    this.logger.debug('Updated conversation state with response ID', {
      stateId,
      responseId
    });
    return true;
  }
}
export default FocusAreaThreadService;