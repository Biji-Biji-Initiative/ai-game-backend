import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
'use strict';

/**
 * Repository for rival persistence using Supabase
 * Handles storage and retrieval of rival entities
 */
class SupabaseRivalRepository {
  /**
   * Create a new SupabaseRivalRepository
   * @param {Object} config - Configuration for the repository
   * @param {string} config.supabaseUrl - Supabase URL
   * @param {string} config.supabaseKey - Supabase API key
   * @param {string} [config.tableName='rivals'] - Table name for rivals
   * @param {string} [config.userPerformanceTable='user_performance'] - Table name for user performance
   * @param {Object} [config.logger] - Logger instance
   */
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.tableName = config.tableName || 'rivals';
    this.userPerformanceTable = config.userPerformanceTable || 'user_performance';
    this.logger = config.logger || console;
  }

  /**
   * Save a rival
   * @param {Object} rival - Rival to save
   * @returns {Promise<Object>} Saved rival
   */
  async saveRival(rival) {
    try {
      // Ensure rival has an ID
      if (!rival.id) {
        rival.id = uuidv4();
      }
      
      // Ensure timestamps are set
      if (!rival.createdAt) {
        rival.createdAt = new Date().toISOString();
      }
      rival.updatedAt = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(rival, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error saving rival', {
        rivalId: rival.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a rival by ID
   * @param {string} rivalId - ID of the rival to retrieve
   * @returns {Promise<Object>} Retrieved rival
   */
  async getRivalById(rivalId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', rivalId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error getting rival by ID', {
        rivalId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get rivals for a user
   * @param {string} userId - ID of the user
   * @returns {Promise<Array<Object>>} User's rivals
   */
  async getRivalsByUserId(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      this.logger.error('Error getting rivals by user ID', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete a rival
   * @param {string} rivalId - ID of the rival to delete
   * @returns {Promise<void>}
   */
  async deleteRival(rivalId) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', rivalId);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      this.logger.error('Error deleting rival', {
        rivalId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user performance data
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} User performance data
   */
  async getUserPerformance(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.userPerformanceTable)
        .select('*')
        .eq('userId', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      // If no performance data exists, return default structure
      if (!data) {
        return {
          userId,
          round1: null,
          round2: null,
          round3: null,
          averageScore: 0,
          totalChallenges: 0
        };
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error getting user performance', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
}

export default SupabaseRivalRepository;
