/**
 * Adaptive Repository
 * 
 * Handles data access operations for adaptive learning models.
 * 
 * @module AdaptiveRepository
 * @requires Recommendation
 * @requires RecommendationSchema
 */

const Recommendation = require('../models/Recommendation');
const { supabaseClient } = require('../../../core/infra/db/supabaseClient');
const { v4: uuidv4 } = require('uuid');
const { 
  RecommendationSchema, 
  RecommendationDatabaseSchema 
} = require('../schemas/RecommendationSchema');

class AdaptiveRepository {
  constructor(supabase) {
    this.supabase = supabase || supabaseClient;
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

      // Validate data with Zod schema
      const validationResult = RecommendationDatabaseSchema.safeParse(data);
      if (!validationResult.success) {
        console.error('Invalid recommendation data from database:', validationResult.error);
        throw new Error(`Invalid recommendation data: ${validationResult.error.message}`);
      }

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

      // Validate data with Zod schema
      const validationResult = RecommendationDatabaseSchema.safeParse(data);
      if (!validationResult.success) {
        console.error('Invalid recommendation data from database:', validationResult.error);
        throw new Error(`Invalid recommendation data: ${validationResult.error.message}`);
      }

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

      // Map and validate each recommendation
      return (data || []).map(item => {
        // Validate data with Zod schema
        const validationResult = RecommendationDatabaseSchema.safeParse(item);
        if (!validationResult.success) {
          console.warn('Skipping invalid recommendation data:', validationResult.error);
          return null;
        }
        return new Recommendation(item);
      }).filter(Boolean); // Filter out null values
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
      // Validate recommendation object with Zod schema
      const recommendationData = recommendation.toDatabase();
      const validationResult = RecommendationDatabaseSchema.safeParse(recommendationData);
      
      if (!validationResult.success) {
        console.error('Recommendation validation failed:', validationResult.error.flatten());
        throw new Error(`Invalid recommendation data: ${validationResult.error.message}`);
      }
      
      // Use validated data
      const validData = validationResult.data;

      // Set ID if not present (for new recommendations)
      if (!validData.id) validData.id = uuidv4();

      // Upsert recommendation data
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(validData)
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