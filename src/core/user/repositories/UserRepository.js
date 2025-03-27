/**
 * User Repository
 * 
 * Handles data access operations for User domain model.
 * Uses Zod schemas for data validation and conversion.
 */

const User = require('../models/User');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const { userDatabaseSchema, fromDatabase } = require('../schemas/userSchema');

class UserRepository {
  constructor(supabaseClient) {
    this.supabase = supabaseClient || createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
    );
    this.tableName = 'users';
  }

  /**
   * Find a user by ID
   * @param {string} id - User ID
   * @returns {Promise<User|null>} User object or null if not found
   */
  async findById(id) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(`Error fetching user: ${error.message}`);
      if (!data) return null;

      // Validate the database data before converting to domain object
      const validationResult = userDatabaseSchema.safeParse(data);
      if (!validationResult.success) {
        console.warn('Database data validation warning:', validationResult.error.message);
      }

      return new User(data);
    } catch (error) {
      console.error('UserRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>} User object or null if not found
   */
  async findByEmail(email) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) throw new Error(`Error fetching user by email: ${error.message}`);
      if (!data) return null;

      // Validate the database data before converting to domain object
      const validationResult = userDatabaseSchema.safeParse(data);
      if (!validationResult.success) {
        console.warn('Database data validation warning:', validationResult.error.message);
      }

      return new User(data);
    } catch (error) {
      console.error('UserRepository.findByEmail error:', error);
      throw error;
    }
  }

  /**
   * Save a user to the database (create or update)
   * @param {User} user - User object to save
   * @returns {Promise<User>} Updated user object
   */
  async save(user) {
    try {
      // Validate user before saving
      const validation = user.validate();
      if (!validation.isValid) {
        throw new Error(`Invalid user data: ${validation.errors.join(', ')}`);
      }

      // Set created_at and updated_at if not already set
      const now = new Date().toISOString();
      if (!user.createdAt) user.createdAt = now;
      user.updatedAt = now;

      // Generate ID if not present (for new users)
      if (!user.id) user.id = uuidv4();

      // Convert to database format
      const userData = user.toDatabase();

      // Validate database format
      const dbValidationResult = userDatabaseSchema.safeParse(userData);
      if (!dbValidationResult.success) {
        throw new Error(`Invalid database format: ${dbValidationResult.error.message}`);
      }

      // Upsert user data
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(userData)
        .select()
        .single();

      if (error) throw new Error(`Error saving user: ${error.message}`);

      // Return updated user
      return new User(data);
    } catch (error) {
      console.error('UserRepository.save error:', error);
      throw error;
    }
  }

  /**
   * Find all users matching criteria
   * @param {Object} criteria - Filtering criteria
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array<User>>} List of matching users
   */
  async findAll(criteria = {}, options = {}) {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*');

      // Apply criteria filters
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // Apply pagination options
      if (options.limit) query = query.limit(options.limit);
      if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      
      // Apply ordering
      if (options.orderBy) {
        const [column, direction] = options.orderBy.split(' ');
        query = query.order(column, { ascending: direction !== 'desc' });
      } else {
        // Default order by created_at desc
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw new Error(`Error fetching users: ${error.message}`);

      // Convert to User objects
      return (data || []).map(userData => new User(userData));
    } catch (error) {
      console.error('UserRepository.findAll error:', error);
      throw error;
    }
  }

  /**
   * Delete a user by ID
   * @param {string} id - User ID
   * @returns {Promise<boolean>} True if successful
   */
  async delete(id) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Error deleting user: ${error.message}`);

      return true;
    } catch (error) {
      console.error('UserRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * Update user's last active timestamp
   * @param {string} id - User ID
   * @returns {Promise<User>} Updated user
   */
  async updateActivity(id) {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          last_active: now,
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(`Error updating user activity: ${error.message}`);

      return new User(data);
    } catch (error) {
      console.error('UserRepository.updateActivity error:', error);
      throw error;
    }
  }
}

module.exports = UserRepository; 