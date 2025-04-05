import { createClient } from '@supabase/supabase-js';
'use strict';

/**
 * Repository for OpenAI thread state persistence using Supabase
 * Handles storage and retrieval of thread states
 */
class SupabaseThreadStateRepository {
  /**
   * Create a new SupabaseThreadStateRepository
   * @param {Object} config - Configuration for the repository
   * @param {string} config.supabaseUrl - Supabase URL
   * @param {string} config.supabaseKey - Supabase API key
   * @param {string} [config.tableName='ai_thread_states'] - Table name for thread states
   * @param {Object} [config.logger] - Logger instance
   */
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.tableName = config.tableName || 'ai_thread_states';
    this.logger = config.logger || console;
  }

  /**
   * Save a thread state
   * @param {Object} threadState - Thread state to save
   * @returns {Promise<Object>} Saved thread state
   */
  async saveThreadState(threadState) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(threadState, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error saving thread state', {
        threadId: threadState.threadId,
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
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('threadId', threadId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      return data;
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
   * @param {string} userId - ID of the user
   * @param {string} contextType - Type of context
   * @param {string} contextId - ID of the context object
   * @returns {Promise<Object>} Thread state
   */
  async getThreadStateByContext(userId, contextType, contextId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('userId', userId)
        .eq('contextType', contextType)
        .eq('contextId', contextId)
        .eq('status', 'active')
        .order('createdAt', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error getting thread state by context', {
        userId,
        contextType,
        contextId,
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
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('userId', userId)
        .order('lastActivity', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error getting thread states by user ID', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete a thread state
   * @param {string} threadId - ID of the thread
   * @returns {Promise<void>}
   */
  async deleteThreadState(threadId) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('threadId', threadId);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error('Error deleting thread state', {
        threadId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clean up old thread states
   * @param {Object} [options] - Options for cleanup
   * @param {number} [options.olderThanDays=30] - Delete states older than this many days
   * @param {string} [options.status='archived'] - Status of states to delete
   * @returns {Promise<number>} Number of deleted states
   */
  async cleanupOldThreadStates(options = {}) {
    const olderThanDays = options.olderThanDays || 30;
    const status = options.status || 'archived';
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('status', status)
        .lt('lastActivity', cutoffDate.toISOString())
        .select('id');
      
      if (error) {
        throw error;
      }
      
      return data.length;
    } catch (error) {
      this.logger.error('Error cleaning up old thread states', {
        olderThanDays,
        status,
        error: error.message
      });
      throw error;
    }
  }
}

export default SupabaseThreadStateRepository;
