/**
 * Challenge Model
 * Defines the schema and methods for user challenges in Supabase
 * 
 * @module Challenge
 */

const supabase = require('../lib/supabase');
const logger = require('../utils/logger');

/**
 * Challenge Schema Definition
 * This represents the structure of the 'challenges' table in Supabase
 * 
 * CREATE TABLE challenges (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID NOT NULL REFERENCES users(id),
 *   title TEXT NOT NULL,
 *   description TEXT NOT NULL,
 *   type TEXT NOT NULL,
 *   difficulty TEXT NOT NULL,
 *   focus_area TEXT NOT NULL,
 *   prompt TEXT NOT NULL,
 *   criteria JSONB NOT NULL,
 *   thread_id TEXT NOT NULL,
 *   message_id TEXT,
 *   status TEXT NOT NULL DEFAULT 'active',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   completed_at TIMESTAMP WITH TIME ZONE
 * );
 */

/**
 * Challenge class for interacting with the challenges table in Supabase
 */
class Challenge {
  /**
   * Find a challenge by ID
   * @param {string} id - Challenge ID
   * @returns {Promise<Object|null>} Challenge object or null if not found
   * @throws {Error} If database query fails
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error finding challenge by ID: ${error.message}`, { id, error });
      throw new Error(`Failed to find challenge: ${error.message}`);
    }
  }
  
  /**
   * Find challenges by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {string} options.status - Filter by status (active, completed, all)
   * @param {number} options.limit - Maximum number of results
   * @param {string} options.focusArea - Filter by focus area
   * @returns {Promise<Array>} Array of challenge objects
   * @throws {Error} If database query fails
   */
  static async findByUserId(userId, options = {}) {
    try {
      let query = supabase
        .from('challenges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      // Apply status filter
      if (options.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }
      
      // Apply focus area filter
      if (options.focusArea) {
        query = query.eq('focus_area', options.focusArea);
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error finding challenges by user ID: ${error.message}`, { userId, options, error });
      throw new Error(`Failed to find challenges: ${error.message}`);
    }
  }
  
  /**
   * Create a new challenge
   * @param {Object} challengeData - Challenge data
   * @returns {Promise<Object>} Created challenge object
   * @throws {Error} If challenge creation fails
   */
  static async create(challengeData) {
    try {
      // Validate required fields
      if (!challengeData.user_id) throw new Error('User ID is required');
      if (!challengeData.title) throw new Error('Title is required');
      if (!challengeData.description) throw new Error('Description is required');
      if (!challengeData.type) throw new Error('Type is required');
      if (!challengeData.difficulty) throw new Error('Difficulty is required');
      if (!challengeData.focus_area) throw new Error('Focus area is required');
      if (!challengeData.prompt) throw new Error('Prompt is required');
      if (!challengeData.thread_id) throw new Error('Thread ID is required');
      
      const { data, error } = await supabase
        .from('challenges')
        .insert([{
          user_id: challengeData.user_id,
          title: challengeData.title,
          description: challengeData.description,
          type: challengeData.type,
          difficulty: challengeData.difficulty,
          focus_area: challengeData.focus_area,
          prompt: challengeData.prompt,
          criteria: challengeData.criteria || {},
          thread_id: challengeData.thread_id,
          message_id: challengeData.message_id,
          status: challengeData.status || 'active'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error creating challenge: ${error.message}`, { challengeData, error });
      throw new Error(`Failed to create challenge: ${error.message}`);
    }
  }
  
  /**
   * Update a challenge
   * @param {string} id - Challenge ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated challenge object
   * @throws {Error} If challenge update fails
   */
  static async update(id, updateData) {
    try {
      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('challenges')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error updating challenge: ${error.message}`, { id, updateData, error });
      throw new Error(`Failed to update challenge: ${error.message}`);
    }
  }
  
  /**
   * Mark a challenge as completed
   * @param {string} id - Challenge ID
   * @returns {Promise<Object>} Updated challenge object
   * @throws {Error} If challenge update fails
   */
  static async markAsCompleted(id) {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error marking challenge as completed: ${error.message}`, { id, error });
      throw new Error(`Failed to mark challenge as completed: ${error.message}`);
    }
  }
}

module.exports = Challenge;
