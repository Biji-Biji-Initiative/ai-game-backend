/**
 * User Repository
 * 
 * Handles data access operations for User domain model.
 * Uses Zod schemas for data validation and conversion.
 * Personality data is now managed by the personality domain.
 */

const User = require('../models/User');
const { supabaseClient } = require('../../../core/infra/db/supabaseClient');
const { v4: uuidv4 } = require('uuid');
const { userDatabaseSchema, fromDatabase } = require('../schemas/userSchema');

class UserRepository {
  constructor(supabase) {
    this.supabase = supabase || supabaseClient;
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
   * Save a user domain object to the database
   * @param {User} user - User domain object
   * @returns {Promise<User>} Updated user domain object
   */
  async save(user) {
    try {
      // Convert domain object to database format
      const dbData = user.toDatabase();
      
      // Set the updated_at timestamp if not already set
      if (!dbData.updated_at) {
        dbData.updated_at = new Date().toISOString();
      }
      
      // Check if user exists
      if (user.id) {
        // Update existing user
        const { data, error } = await this.supabase
          .from(this.tableName)
          .update(dbData)
          .eq('id', user.id)
          .select()
          .single();
          
        if (error) throw new Error(`Error updating user: ${error.message}`);
        
        return new User(data);
      } else {
        // Create new user
        const { data, error } = await this.supabase
          .from(this.tableName)
          .insert(dbData)
          .select()
          .single();
          
        if (error) throw new Error(`Error creating user: ${error.message}`);
        
        return new User(data);
      }
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

  /**
   * Update a user by email
   * @param {string} email - User email
   * @param {Object} updateData - Data to update
   * @returns {Promise<User>} Updated user object
   */
  async update(email, updateData) {
    try {
      // First get the existing user
      const { data: existingUser, error: findError } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (findError) throw new Error(`Error fetching user for update: ${findError.message}`);
      if (!existingUser) return null;

      // Create a User domain object with existing data
      const user = new User(existingUser);
      
      // Update the user domain object with the API data
      user.updateProfile(updateData);
      
      // Convert back to database format using the schema transformer
      const dbData = user.toDatabase();

      // Perform the update
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(dbData)
        .eq('email', email)
        .select()
        .single();

      if (error) throw new Error(`Error updating user: ${error.message}`);

      // Return updated user as domain object
      return new User(data);
    } catch (error) {
      console.error('UserRepository.update error:', error);
      throw error;
    }
  }

  /**
   * Update a user's status
   * @param {string} id - User ID
   * @param {string} status - New status (active, inactive, pending, suspended)
   * @returns {Promise<User>} Updated user object
   */
  async updateStatus(id, status) {
    try {
      // First get the existing user
      const user = await this.findById(id);
      if (!user) return null;
      
      // Use the domain model methods to update status
      if (status === 'active') {
        user.activate();
      } else if (status === 'inactive') {
        user.deactivate();
      } else {
        // For other statuses, set directly and update timestamp
        user.status = status;
        user.updatedAt = new Date().toISOString();
      }
      
      // Save the updated user
      return await this.save(user);
    } catch (error) {
      console.error('UserRepository.updateStatus error:', error);
      throw error;
    }
  }

  /**
   * Add a role to a user
   * @param {string} id - User ID
   * @param {string} role - Role to add
   * @returns {Promise<User>} Updated user object
   */
  async addRole(id, role) {
    try {
      // First get the existing user
      const user = await this.findById(id);
      if (!user) return null;
      
      // Use the domain model method to add role
      user.addRole(role);
      
      // Save the updated user
      return await this.save(user);
    } catch (error) {
      console.error('UserRepository.addRole error:', error);
      throw error;
    }
  }

  /**
   * Remove a role from a user
   * @param {string} id - User ID
   * @param {string} role - Role to remove
   * @returns {Promise<User>} Updated user object
   */
  async removeRole(id, role) {
    try {
      // First get the existing user
      const user = await this.findById(id);
      if (!user) return null;
      
      // Use the domain model method to remove role
      user.removeRole(role);
      
      // Save the updated user
      return await this.save(user);
    } catch (error) {
      console.error('UserRepository.removeRole error:', error);
      throw error;
    }
  }

  /**
   * Mark a user's onboarding as completed
   * @param {string} id - User ID
   * @returns {Promise<User>} Updated user object
   */
  async completeOnboarding(id) {
    try {
      // First get the existing user
      const user = await this.findById(id);
      if (!user) return null;
      
      // Use the domain model method to complete onboarding
      user.completeOnboarding();
      
      // Save the updated user
      return await this.save(user);
    } catch (error) {
      console.error('UserRepository.completeOnboarding error:', error);
      throw error;
    }
  }

  /**
   * Record a user login
   * @param {string} id - User ID
   * @returns {Promise<User>} Updated user object
   */
  async recordLogin(id) {
    try {
      // First get the existing user
      const user = await this.findById(id);
      if (!user) return null;
      
      // Use the domain model method to record login
      user.recordLogin();
      
      // Save the updated user
      return await this.save(user);
    } catch (error) {
      console.error('UserRepository.recordLogin error:', error);
      throw error;
    }
  }

  /**
   * Find users by role
   * @param {string} role - Role to search for
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array<User>>} List of matching users
   */
  async findByRole(role, options = {}) {
    try {
      // For Supabase, we need to use the contains operator for arrays
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .contains('roles', [role])
        .order(options.orderBy || 'created_at', { 
          ascending: options.orderDirection === 'asc' 
        })
        .range(
          options.offset || 0, 
          (options.offset || 0) + (options.limit || 10) - 1
        );

      if (error) throw new Error(`Error fetching users by role: ${error.message}`);

      // Convert to User objects
      return (data || []).map(userData => new User(userData));
    } catch (error) {
      console.error('UserRepository.findByRole error:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   * @param {string} id - User ID
   * @param {string} key - Preference key
   * @param {any} value - Preference value
   * @returns {Promise<User>} Updated user object
   */
  async updatePreference(id, key, value) {
    try {
      // First get the existing user
      const user = await this.findById(id);
      if (!user) return null;
      
      // Use the domain model method to update preference
      user.setPreference(key, value);
      
      // Save the updated user
      return await this.save(user);
    } catch (error) {
      console.error('UserRepository.updatePreference error:', error);
      throw error;
    }
  }
}

module.exports = UserRepository; 