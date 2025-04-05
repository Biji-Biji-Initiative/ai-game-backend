import { v4 as uuidv4 } from 'uuid';
'use strict';

/**
 * State manager for OpenAI Responses API
 * Handles thread state persistence and retrieval
 */
class OpenAIStateManager {
  /**
   * Create a new OpenAIStateManager
   * @param {Object} config - Configuration for the state manager
   * @param {Object} config.repository - Repository for state persistence
   * @param {Object} config.logger - Logger instance
   */
  constructor(config) {
    this.repository = config.repository;
    this.logger = config.logger || console;
  }

  /**
   * Create a new thread state
   * @param {Object} params - Parameters for thread state creation
   * @param {string} params.userId - ID of the user
   * @param {string} params.threadId - ID of the thread
   * @param {string} [params.assistantId] - ID of the assistant
   * @param {string} [params.contextType] - Type of context (e.g., 'challenge', 'rival')
   * @param {string} [params.contextId] - ID of the context object
   * @param {Object} [params.metadata] - Additional metadata
   * @returns {Promise<Object>} Created thread state
   */
  async createThreadState(params) {
    try {
      const threadState = {
        id: uuidv4(),
        userId: params.userId,
        threadId: params.threadId,
        assistantId: params.assistantId,
        contextType: params.contextType,
        contextId: params.contextId,
        metadata: params.metadata || {},
        status: 'active',
        messageCount: 0,
        runCount: 0,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const savedState = await this.repository.saveThreadState(threadState);
      this.logger.info('Thread state created', { 
        userId: params.userId, 
        threadId: params.threadId 
      });
      return savedState;
    } catch (error) {
      this.logger.error('Error creating thread state', { 
        userId: params.userId, 
        threadId: params.threadId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get thread state by thread ID
   * @param {string} threadId - ID of the thread
   * @returns {Promise<Object>} Thread state
   */
  async getThreadStateByThreadId(threadId) {
    try {
      const threadState = await this.repository.getThreadStateByThreadId(threadId);
      if (!threadState) {
        throw new Error(`Thread state not found for thread ID: ${threadId}`);
      }
      return threadState;
    } catch (error) {
      this.logger.error('Error getting thread state by thread ID', { 
        threadId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get thread state by user ID and context
   * @param {Object} params - Parameters for thread state retrieval
   * @param {string} params.userId - ID of the user
   * @param {string} params.contextType - Type of context
   * @param {string} params.contextId - ID of the context object
   * @returns {Promise<Object>} Thread state
   */
  async getThreadStateByContext(params) {
    try {
      const threadState = await this.repository.getThreadStateByContext(
        params.userId,
        params.contextType,
        params.contextId
      );
      if (!threadState) {
        return null;
      }
      return threadState;
    } catch (error) {
      this.logger.error('Error getting thread state by context', { 
        userId: params.userId, 
        contextType: params.contextType, 
        contextId: params.contextId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update thread state
   * @param {string} threadId - ID of the thread
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated thread state
   */
  async updateThreadState(threadId, updates) {
    try {
      const threadState = await this.getThreadStateByThreadId(threadId);
      
      const updatedState = {
        ...threadState,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      const savedState = await this.repository.saveThreadState(updatedState);
      this.logger.info('Thread state updated', { threadId });
      return savedState;
    } catch (error) {
      this.logger.error('Error updating thread state', { 
        threadId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Increment message count for a thread
   * @param {string} threadId - ID of the thread
   * @returns {Promise<Object>} Updated thread state
   */
  async incrementMessageCount(threadId) {
    try {
      const threadState = await this.getThreadStateByThreadId(threadId);
      
      const updatedState = {
        ...threadState,
        messageCount: threadState.messageCount + 1,
        lastActivity: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const savedState = await this.repository.saveThreadState(updatedState);
      return savedState;
    } catch (error) {
      this.logger.error('Error incrementing message count', { 
        threadId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Increment run count for a thread
   * @param {string} threadId - ID of the thread
   * @returns {Promise<Object>} Updated thread state
   */
  async incrementRunCount(threadId) {
    try {
      const threadState = await this.getThreadStateByThreadId(threadId);
      
      const updatedState = {
        ...threadState,
        runCount: threadState.runCount + 1,
        lastActivity: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const savedState = await this.repository.saveThreadState(updatedState);
      return savedState;
    } catch (error) {
      this.logger.error('Error incrementing run count', { 
        threadId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Archive a thread state
   * @param {string} threadId - ID of the thread
   * @returns {Promise<Object>} Archived thread state
   */
  async archiveThreadState(threadId) {
    try {
      const threadState = await this.getThreadStateByThreadId(threadId);
      
      const updatedState = {
        ...threadState,
        status: 'archived',
        updatedAt: new Date().toISOString(),
      };
      
      const savedState = await this.repository.saveThreadState(updatedState);
      this.logger.info('Thread state archived', { threadId });
      return savedState;
    } catch (error) {
      this.logger.error('Error archiving thread state', { 
        threadId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get all thread states for a user
   * @param {string} userId - ID of the user
   * @returns {Promise<Array<Object>>} Thread states
   */
  async getThreadStatesByUserId(userId) {
    try {
      const threadStates = await this.repository.getThreadStatesByUserId(userId);
      return threadStates;
    } catch (error) {
      this.logger.error('Error getting thread states by user ID', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get or create thread state for a context
   * @param {Object} params - Parameters for thread state
   * @param {string} params.userId - ID of the user
   * @param {string} params.contextType - Type of context
   * @param {string} params.contextId - ID of the context object
   * @param {string} [params.assistantId] - ID of the assistant
   * @param {Object} [params.metadata] - Additional metadata
   * @returns {Promise<Object>} Thread state
   */
  async getOrCreateThreadStateForContext(params) {
    try {
      // Try to get existing thread state
      const existingState = await this.getThreadStateByContext({
        userId: params.userId,
        contextType: params.contextType,
        contextId: params.contextId,
      });
      
      if (existingState && existingState.status === 'active') {
        return existingState;
      }
      
      // Create new thread state
      return this.createThreadState(params);
    } catch (error) {
      this.logger.error('Error getting or creating thread state', { 
        userId: params.userId, 
        contextType: params.contextType, 
        contextId: params.contextId, 
        error: error.message 
      });
      throw error;
    }
  }
}

export default OpenAIStateManager;
