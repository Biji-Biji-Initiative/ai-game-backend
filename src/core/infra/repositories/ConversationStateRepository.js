import { logger } from "../../infra/logging/logger.js";
import { supabaseClient } from "../../infra/db/supabaseClient.js";
'use strict';
/**
 * Conversation State Repository
 *
 * Persists conversation state for stateful interactions with the Responses API.
 * This repository stores the previous_response_id needed for maintaining context.
 */
const {
  dbLogger
} = logger;
/**
 * Repository for managing conversation state persistence
 */
class ConversationStateRepository {
  /**
   * Create a new ConversationStateRepository
   * @param {Object} supabase - Supabase client
   * @param {Object} logger - Logger instance
   */
  /**
   * Method constructor
   */
  constructor(supabase, logger) {
    // Use provided supabase client or fallback to the default one
    this.supabase = supabase || supabaseClient;
    this.tableName = 'conversation_states';
    this.logger = logger || dbLogger.child('repository:conversationState');
  }
  /**
   * Create a new conversation state
   * @param {Object} state - Conversation state to create
   * @returns {Promise<Object>} Created state
   */
  /**
   * Method createState
   */
  async createState(state) {
    try {
      if (!state.id || !state.userId || !state.context) {
        throw new Error('ID, userId, and context are required to create conversation state');
      }
      const {
        data,
        error
      } = await this.supabase.from(this.tableName).insert([{
        id: state.id,
        userId: state.userId,
        context: state.context,
        lastResponseId: state.lastResponseId,
        metadata: state.metadata || {},
        createdAt: state.createdAt || new Date().toISOString(),
        updatedAt: state.updatedAt || new Date().toISOString()
      }]).select('*').single();
      if (error) {
        this.logger.error('Error creating conversation state', {
          error: error.message,
          userId: state.userId,
          context: state.context
        });
        throw error;
      }
      this.logger.info('Created conversation state', {
        stateId: data.id,
        userId: state.userId,
        context: state.context
      });
      // Return with camelCase keys
      return {
        id: data.id,
        userId: data.userId,
        context: data.context,
        lastResponseId: data.lastResponseId,
        metadata: data.metadata || {},
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    } catch (error) {
      this.logger.error('Error in createState', {
        error: error.message,
        state
      });
      throw error;
    }
  }
  /**
   * Find a conversation state by ID
   * @param {string} stateId - State ID
   * @returns {Promise<Object|null>} State or null if not found
   */
  /**
   * Method findStateById
   */
  async findStateById(stateId) {
    try {
      if (!stateId) {
        throw new Error('State ID is required');
      }
      const {
        data,
        error
      } = await this.supabase.from(this.tableName).select('*').eq('id', stateId).single();
      if (error) {
        if (error.code === 'PGRST116') {
          // Not found error
          return null;
        }
        this.logger.error('Error finding conversation state by ID', {
          error: error.message,
          stateId
        });
        throw error;
      }
      if (!data) {
        return null;
      }
      ;
      // Return with camelCase keys
      return {
        id: data.id,
        userId: data.userId,
        context: data.context,
        lastResponseId: data.lastResponseId,
        metadata: data.metadata || {},
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    } catch (error) {
      this.logger.error('Error in findStateById', {
        error: error.message,
        stateId
      });
      throw error;
    }
  }
  /**
   * Find a conversation state by user ID and context
   * @param {string} userId - User ID
   * @param {string} context - Context identifier
   * @returns {Promise<Object|null>} State or null if not found
   */
  /**
   * Method findStateByContext
   */
  async findStateByContext(userId, context) {
    try {
      if (!userId || !context) {
        throw new Error('User ID and context are required');
      }
      const {
        data,
        error
      } = await this.supabase.from(this.tableName).select('*').eq('userId', userId).eq('context', context).order('createdAt', {
        ascending: false
      }).limit(1).single();
      if (error) {
        if (error.code === 'PGRST116') {
          // Not found error
          return null;
        }
        this.logger.error('Error finding conversation state by context', {
          error: error.message,
          userId,
          context
        });
        throw error;
      }
      if (!data) {
        return null;
      }
      ;
      // Return with camelCase keys
      return {
        id: data.id,
        userId: data.userId,
        context: data.context,
        lastResponseId: data.lastResponseId,
        metadata: data.metadata || {},
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    } catch (error) {
      this.logger.error('Error in findStateByContext', {
        error: error.message,
        userId,
        context
      });
      throw error;
    }
  }
  /**
   * Update a conversation state
   * @param {string} stateId - State ID
   * @param {Object} updates - Properties to update
   * @returns {Promise<boolean>} Success status
   */
  /**
   * Method updateState
   */
  async updateState(stateId, updates) {
    try {
      if (!stateId) {
        throw new Error('State ID is required for update');
      }
      // Convert camelCase keys to snake_case for database
      const dbUpdates = {};
      if (updates.lastResponseId !== undefined) {
        dbUpdates.lastResponseId = updates.lastResponseId;
      }
      ;
      if (updates.metadata !== undefined) {
        dbUpdates.metadata = updates.metadata;
      }
      ;
      // Always update the timestamp
      dbUpdates.updatedAt = updates.updatedAt || new Date().toISOString();
      const {
        error
      } = await this.supabase.from(this.tableName).update(dbUpdates).eq('id', stateId);
      if (error) {
        this.logger.error('Error updating conversation state', {
          error: error.message,
          stateId,
          updates
        });
        throw error;
      }
      this.logger.debug('Updated conversation state', {
        stateId
      });
      return true;
    } catch (error) {
      this.logger.error('Error in updateState', {
        error: error.message,
        stateId,
        updates
      });
      return false;
    }
  }
  /**
   * Delete a conversation state
   * @param {string} stateId - State ID
   * @returns {Promise<boolean>} Success status
   */
  /**
   * Method deleteState
   */
  async deleteState(stateId) {
    try {
      if (!stateId) {
        throw new Error('State ID is required for deletion');
      }
      const {
        error
      } = await this.supabase.from(this.tableName).delete().eq('id', stateId);
      if (error) {
        this.logger.error('Error deleting conversation state', {
          error: error.message,
          stateId
        });
        throw error;
      }
      this.logger.info('Deleted conversation state', {
        stateId
      });
      return true;
    } catch (error) {
      this.logger.error('Error in deleteState', {
        error: error.message,
        stateId
      });
      return false;
    }
  }
  /**
   * Get conversation state by ID
   * @param {string} conversationId - ID of the conversation
   * @returns {Promise<Object|null>} Conversation state
   */
  async getConversationState(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }
      const {
        data,
        error
      } = await this.supabase.from(this.tableName).select('*').eq('conversation_id', conversationId).maybeSingle();
      if (error) {
        throw new Error(`Failed to get conversation state: ${error.message}`);
      }
      return data ? this._mapFromDb(data) : null;
    } catch (error) {
      this.logger.error('Error getting conversation state', {
        conversationId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
export default ConversationStateRepository;