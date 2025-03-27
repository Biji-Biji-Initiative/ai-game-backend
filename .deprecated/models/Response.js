/**
 * Response Model
 * Defines the schema and methods for user responses to challenges in Supabase
 * 
 * @module Response
 */

const supabase = require('../lib/supabase');
const logger = require('../utils/logger');

/**
 * Response Schema Definition
 * This represents the structure of the 'responses' table in Supabase
 * 
 * CREATE TABLE responses (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID NOT NULL REFERENCES users(id),
 *   challenge_id UUID NOT NULL REFERENCES challenges(id),
 *   text TEXT NOT NULL,
 *   thread_id TEXT NOT NULL,
 *   message_id TEXT NOT NULL,
 *   submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   evaluation_id UUID REFERENCES evaluations(id),
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */

/**
 * Response class for interacting with the responses table in Supabase
 */
class Response {
  /**
   * Find a response by ID
   * @param {string} id - Response ID
   * @returns {Promise<Object|null>} Response object or null if not found
   * @throws {Error} If database query fails
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error finding response by ID: ${error.message}`, { id, error });
      throw new Error(`Failed to find response: ${error.message}`);
    }
  }
  
  /**
   * Find responses by challenge ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Array>} Array of response objects
   * @throws {Error} If database query fails
   */
  static async findByChallengeId(challengeId) {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error finding responses by challenge ID: ${error.message}`, { challengeId, error });
      throw new Error(`Failed to find responses: ${error.message}`);
    }
  }
  
  /**
   * Find responses by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @returns {Promise<Array>} Array of response objects
   * @throws {Error} If database query fails
   */
  static async findByUserId(userId, options = {}) {
    try {
      let query = supabase
        .from('responses')
        .select('*, challenges(title, type, difficulty, focus_area)')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false });
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error finding responses by user ID: ${error.message}`, { userId, options, error });
      throw new Error(`Failed to find responses: ${error.message}`);
    }
  }
  
  /**
   * Create a new response
   * @param {Object} responseData - Response data
   * @returns {Promise<Object>} Created response object
   * @throws {Error} If response creation fails
   */
  static async create(responseData) {
    try {
      // Validate required fields
      if (!responseData.user_id) throw new Error('User ID is required');
      if (!responseData.challenge_id) throw new Error('Challenge ID is required');
      if (!responseData.text) throw new Error('Response text is required');
      if (!responseData.thread_id) throw new Error('Thread ID is required');
      if (!responseData.message_id) throw new Error('Message ID is required');
      
      const { data, error } = await supabase
        .from('responses')
        .insert([{
          user_id: responseData.user_id,
          challenge_id: responseData.challenge_id,
          text: responseData.text,
          thread_id: responseData.thread_id,
          message_id: responseData.message_id,
          submitted_at: responseData.submitted_at || new Date().toISOString(),
          evaluation_id: responseData.evaluation_id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error creating response: ${error.message}`, { responseData, error });
      throw new Error(`Failed to create response: ${error.message}`);
    }
  }
  
  /**
   * Update a response
   * @param {string} id - Response ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated response object
   * @throws {Error} If response update fails
   */
  static async update(id, updateData) {
    try {
      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('responses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error updating response: ${error.message}`, { id, updateData, error });
      throw new Error(`Failed to update response: ${error.message}`);
    }
  }
  
  /**
   * Link an evaluation to a response
   * @param {string} id - Response ID
   * @param {string} evaluationId - Evaluation ID
   * @returns {Promise<Object>} Updated response object
   * @throws {Error} If response update fails
   */
  static async linkEvaluation(id, evaluationId) {
    try {
      if (!evaluationId) throw new Error('Evaluation ID is required');
      
      const { data, error } = await supabase
        .from('responses')
        .update({
          evaluation_id: evaluationId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error linking evaluation to response: ${error.message}`, { id, evaluationId, error });
      throw new Error(`Failed to link evaluation to response: ${error.message}`);
    }
  }
}

module.exports = Response;
