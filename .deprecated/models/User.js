/**
 * User Model
 * Defines the schema and methods for user data in Supabase
 * 
 * @module User
 */

const supabase = require('../lib/supabase');
const logger = require('../utils/logger');

/**
 * User Schema Definition
 * This represents the structure of the 'users' table in Supabase
 * 
 * CREATE TABLE users (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   email TEXT NOT NULL UNIQUE,
 *   age INTEGER CHECK (age >= 13),
 *   traits TEXT[],
 *   preferences JSONB,
 *   thread_ids JSONB NOT NULL DEFAULT '{
 *     "challenge": null,
 *     "evaluation": null,
 *     "personality": null,
 *     "focusArea": null,
 *     "progress": null
 *   }',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */

/**
 * User class for interacting with the users table in Supabase
 */
class User {
  /**
   * Find a user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User object or null if not found
   * @throws {Error} If database query fails
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error finding user by ID: ${error.message}`, { id, error });
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }
  
  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null if not found
   * @throws {Error} If database query fails
   */
  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error finding user by email: ${error.message}`, { email, error });
      throw new Error(`Failed to find user: ${error.message}`);
    }
  }
  
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user object
   * @throws {Error} If user creation fails
   */
  static async create(userData) {
    try {
      // Validate required fields
      if (!userData.name) throw new Error('Name is required');
      if (!userData.email) throw new Error('Email is required');
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          name: userData.name,
          email: userData.email.toLowerCase(),
          age: userData.age,
          traits: userData.traits || [],
          preferences: userData.preferences || {},
          thread_ids: userData.thread_ids || {
            challenge: null,
            evaluation: null,
            personality: null,
            focusArea: null,
            progress: null
          }
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`, { userData, error });
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }
  
  /**
   * Update a user
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user object
   * @throws {Error} If user update fails
   */
  static async update(id, updateData) {
    try {
      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error updating user: ${error.message}`, { id, updateData, error });
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }
  
  /**
   * Ensure thread IDs exist for a user
   * @param {string} userId - User ID
   * @param {Object} openaiClient - OpenAI client instance
   * @returns {Promise<Object>} Updated thread IDs
   * @throws {Error} If thread creation fails
   */
  static async ensureThreadIds(userId, openaiClient) {
    try {
      if (!openaiClient) {
        throw new Error('OpenAI client is required to ensure thread IDs');
      }
      
      // Get current user data
      const user = await this.findById(userId);
      if (!user) throw new Error(`User not found: ${userId}`);
      
      const threadTypes = ['challenge', 'evaluation', 'personality', 'focusArea', 'progress'];
      const threadIds = user.thread_ids || {};
      let updated = false;
      
      // Create missing threads
      for (const type of threadTypes) {
        if (!threadIds[type]) {
          try {
            // Create a new thread using the Responses API
            const thread = await openaiClient.createThread();
            threadIds[type] = thread.id;
            updated = true;
          } catch (error) {
            throw new Error(`Failed to create ${type} thread: ${error.message}`);
          }
        }
      }
      
      // Update user if any threads were created
      if (updated) {
        await this.update(userId, { thread_ids: threadIds });
      }
      
      return threadIds;
    } catch (error) {
      logger.error(`Error ensuring thread IDs: ${error.message}`, { userId, error });
      throw new Error(`Failed to ensure thread IDs: ${error.message}`);
    }
  }
  
  /**
   * Validate that all required thread IDs exist
   * @param {Object} threadIds - Thread IDs object
   * @throws {Error} If any required thread ID is missing
   */
  static validateThreadIds(threadIds) {
    const threadTypes = ['challenge', 'evaluation', 'personality', 'focusArea', 'progress'];
    
    for (const type of threadTypes) {
      if (!threadIds[type]) {
        throw new Error(`Missing required ${type} thread ID`);
      }
    }
    
    return true;
  }
}

module.exports = User;
