/**
 * Adaptive Repository
 * 
 * Handles data access operations for adaptive learning models.
 */

const Recommendation = require('../models/Recommendation');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

class AdaptiveRepository {
  constructor(supabaseClient) {
    this.supabase = supabaseClient || createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
    );
    this.tableName = 'user_recommendations';
  }

  /**
   * Find a recommendation by ID
   * @param {string} id - Recommendation ID
   * @returns {Promise<Recommendation|null>} Recommendation object or null if not found
   */
  async findById(id) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(`Error fetching recommendation: ${error.message}`);
      if (!data) return null;

      return new Recommendation(data);
    } catch (error) {
      console.error('AdaptiveRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Find latest recommendation for a user
   * @param {string} userId - User ID
   * @returns {Promise<Recommendation|null>} Recommendation object or null if not found
   */
  async findLatestForUser(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(`Error fetching recommendation for user: ${error.message}`);
      if (!data) return null;

      return new Recommendation(data);
    } catch (error) {
      console.error('AdaptiveRepository.findLatestForUser error:', error);
      throw error;
    }
  }

  /**
   * Find recommendations by user ID
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of recommendations to return
   * @returns {Promise<Array<Recommendation>>} Array of Recommendation objects
   */
  async findByUserId(userId, limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(`Error fetching recommendations for user: ${error.message}`);

      return (data || []).map(item => new Recommendation(item));
    } catch (error) {
      console.error('AdaptiveRepository.findByUserId error:', error);
      throw error;
    }
  }

  /**
   * Save a recommendation to the database (create or update)
   * @param {Recommendation} recommendation - Recommendation object to save
   * @returns {Promise<Recommendation>} Updated recommendation object
   */
  async save(recommendation) {
    try {
      // Validate recommendation before saving
      const validation = recommendation.validate();
      if (!validation.isValid) {
        throw new Error(`Invalid recommendation data: ${validation.errors.join(', ')}`);
      }

      // Set ID if not present (for new recommendations)
      if (!recommendation.id) recommendation.id = uuidv4();

      // Convert to database format
      const recommendationData = recommendation.toDatabase();

      // Upsert recommendation data
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(recommendationData)
        .select()
        .single();

      if (error) throw new Error(`Error saving recommendation: ${error.message}`);

      // Return updated recommendation
      return new Recommendation(data);
    } catch (error) {
      console.error('AdaptiveRepository.save error:', error);
      throw error;
    }
  }

  /**
   * Delete a recommendation by ID
   * @param {string} id - Recommendation ID
   * @returns {Promise<boolean>} True if successful
   */
  async delete(id) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Error deleting recommendation: ${error.message}`);

      return true;
    } catch (error) {
      console.error('AdaptiveRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * Delete all recommendations for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteAllForUser(userId) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', userId);

      if (error) throw new Error(`Error deleting user recommendations: ${error.message}`);

      return true;
    } catch (error) {
      console.error('AdaptiveRepository.deleteAllForUser error:', error);
      throw error;
    }
  }
}

module.exports = AdaptiveRepository; 