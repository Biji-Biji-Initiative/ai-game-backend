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
const { userLogger } = require('../../infra/logging/domainLogger');

/**
 * Error for user repository operations
 */
class UserRepositoryError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'UserRepositoryError';
    this.cause = options.cause;
    this.metadata = options.metadata || {};
  }
}

/**
 * Error for user not found
 */
class UserNotFoundError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'UserNotFoundError';
    this.cause = options.cause;
    this.metadata = options.metadata || {};
  }
}

/**
 * Error for user validation issues
 */
class UserValidationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'UserValidationError';
    this.cause = options.cause;
    this.metadata = options.metadata || {};
  }
}

class UserRepository {
  /**
   * Create a new UserRepository
   * @param {Object} supabase - Supabase client instance
   * @param {Object} logger - Logger instance
   */
  constructor(supabase, logger) {
    this.supabase = supabase || supabaseClient;
    this.tableName = 'users';
    this.logger = logger || userLogger.child({ component: 'repository:user' });
  }
  
  /**
   * Log a message with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @private
   */
  log(level, message, meta = {}) {
    if (this.logger && typeof this.logger[level] === 'function') {
      this.logger[level](message, meta);
    }
  }

  /**
   * Find a user by ID
   * @param {string} id - User ID
   * @returns {Promise<User|null>} User object or null if not found
   * @throws {UserRepositoryError} If database operation fails
   */
  async findById(id) {
    try {
      if (!id) {
        throw new UserValidationError('User ID is required');
      }
      
      this.log('debug', 'Finding user by ID', { id });
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // Handle "not found" error
        if (error.code === 'PGRST116') {
          this.log('debug', 'User not found', { id });
          return null;
        }
        
        throw new UserRepositoryError(`Error fetching user: ${error.message}`, {
          cause: error,
          metadata: { id }
        });
      }
      
      if (!data) {
        this.log('debug', 'User not found', { id });
        return null;
      }

      // Validate the database data before converting to domain object
      const validationResult = userDatabaseSchema.safeParse(data);
      if (!validationResult.success) {
        this.log('warn', 'Database data validation warning', { 
          id, 
          errors: validationResult.error.errors 
        });
      }

      return new User(data);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError) {
        throw error;
      }
      
      this.log('error', 'Error finding user by ID', { 
        id, 
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to find user: ${error.message}`, {
        cause: error,
        metadata: { id }
      });
    }
  }

  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>} User object or null if not found
   * @throws {UserRepositoryError} If database operation fails
   */
  async findByEmail(email) {
    try {
      if (!email) {
        throw new UserValidationError('Email is required');
      }
      
      this.log('debug', 'Finding user by email', { email });
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        throw new UserRepositoryError(`Error fetching user by email: ${error.message}`, {
          cause: error,
          metadata: { email }
        });
      }
      
      if (!data) {
        this.log('debug', 'User not found by email', { email });
        return null;
      }

      // Validate the database data before converting to domain object
      const validationResult = userDatabaseSchema.safeParse(data);
      if (!validationResult.success) {
        this.log('warn', 'Database data validation warning', { 
          email, 
          errors: validationResult.error.errors 
        });
      }

      return new User(data);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError) {
        throw error;
      }
      
      this.log('error', 'Error finding user by email', { 
        email, 
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to find user by email: ${error.message}`, {
        cause: error,
        metadata: { email }
      });
    }
  }

  /**
   * Save a user domain object to the database
   * @param {User} user - User domain object
   * @returns {Promise<User>} Updated user domain object
   * @throws {UserValidationError} If the user object fails validation
   * @throws {UserRepositoryError} If database operation fails
   */
  async save(user) {
    try {
      if (!user) {
        throw new UserValidationError('User object is required');
      }
      
      if (!(user instanceof User)) {
        throw new UserValidationError('Object must be a User instance');
      }
      
      // Convert domain object to database format
      const dbData = user.toDatabase();
      
      // Set the updated_at timestamp if not already set
      if (!dbData.updated_at) {
        dbData.updated_at = new Date().toISOString();
      }
      
      // Check if user exists
      if (user.id) {
        // Update existing user
        this.log('debug', 'Updating existing user', { id: user.id });
        
        const { data, error } = await this.supabase
          .from(this.tableName)
          .update(dbData)
          .eq('id', user.id)
          .select()
          .single();
          
        if (error) {
          throw new UserRepositoryError(`Error updating user: ${error.message}`, {
            cause: error,
            metadata: { id: user.id }
          });
        }
        
        this.log('debug', 'User updated successfully', { id: user.id });
        return new User(data);
      } else {
        // Create new user with generated ID if not provided
        if (!dbData.id) {
          dbData.id = uuidv4();
        }
        
        this.log('debug', 'Creating new user', { email: user.email });
        
        const { data, error } = await this.supabase
          .from(this.tableName)
          .insert(dbData)
          .select()
          .single();
          
        if (error) {
          throw new UserRepositoryError(`Error creating user: ${error.message}`, {
            cause: error,
            metadata: { email: user.email }
          });
        }
        
        this.log('debug', 'User created successfully', { id: data.id });
        return new User(data);
      }
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError) {
        throw error;
      }
      
      this.log('error', 'Error saving user', { 
        id: user?.id, 
        email: user?.email,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to save user: ${error.message}`, {
        cause: error,
        metadata: { id: user?.id, email: user?.email }
      });
    }
  }

  /**
   * Find all users matching criteria
   * @param {Object} criteria - Filtering criteria
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array<User>>} List of matching users
   * @throws {UserRepositoryError} If database operation fails
   */
  async findAll(criteria = {}, options = {}) {
    try {
      this.log('debug', 'Finding users by criteria', { criteria, options });
      
      let query = this.supabase
        .from(this.tableName)
        .select('*');

      // Apply criteria filters
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(this.convertToDbField(key), value);
        }
      });

      // Apply pagination options
      if (options.limit) query = query.limit(options.limit);
      if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      
      // Apply ordering
      if (options.orderBy) {
        const [column, direction] = options.orderBy.split(' ');
        query = query.order(this.convertToDbField(column), { ascending: direction !== 'desc' });
      } else {
        // Default order by created_at desc
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        throw new UserRepositoryError(`Error fetching users: ${error.message}`, {
          cause: error,
          metadata: { criteria, options }
        });
      }

      // Convert to User objects
      return (data || []).map(userData => new User(userData));
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError) {
        throw error;
      }
      
      this.log('error', 'Error finding users', { 
        criteria, 
        options,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to find users: ${error.message}`, {
        cause: error,
        metadata: { criteria, options }
      });
    }
  }

  /**
   * Delete a user by ID
   * @param {string} id - User ID
   * @returns {Promise<boolean>} True if successful
   * @throws {UserRepositoryError} If database operation fails
   */
  async delete(id) {
    try {
      if (!id) {
        throw new UserValidationError('User ID is required');
      }
      
      this.log('debug', 'Deleting user', { id });
      
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw new UserRepositoryError(`Error deleting user: ${error.message}`, {
          cause: error,
          metadata: { id }
        });
      }

      this.log('debug', 'User deleted successfully', { id });
      return true;
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError) {
        throw error;
      }
      
      this.log('error', 'Error deleting user', { 
        id,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to delete user: ${error.message}`, {
        cause: error,
        metadata: { id }
      });
    }
  }

  /**
   * Update user's last active timestamp
   * @param {string} id - User ID
   * @returns {Promise<User>} Updated user
   * @throws {UserNotFoundError} If user not found
   * @throws {UserRepositoryError} If database operation fails
   */
  async updateActivity(id) {
    try {
      if (!id) {
        throw new UserValidationError('User ID is required');
      }
      
      this.log('debug', 'Updating user activity', { id });
      
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

      if (error) {
        // Check for not found error
        if (error.code === 'PGRST116') {
          throw new UserNotFoundError(`User with ID ${id} not found`);
        }
        
        throw new UserRepositoryError(`Error updating user activity: ${error.message}`, {
          cause: error,
          metadata: { id }
        });
      }

      this.log('debug', 'User activity updated', { id });
      return new User(data);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError ||
          error instanceof UserNotFoundError) {
        throw error;
      }
      
      this.log('error', 'Error updating user activity', { 
        id,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to update user activity: ${error.message}`, {
        cause: error,
        metadata: { id }
      });
    }
  }

  /**
   * Update a user by email
   * @param {string} email - User email
   * @param {Object} updateData - Data to update
   * @returns {Promise<User>} Updated user object
   * @throws {UserNotFoundError} If user not found
   * @throws {UserRepositoryError} If database operation fails
   */
  async update(email, updateData) {
    try {
      if (!email) {
        throw new UserValidationError('Email is required');
      }
      
      if (!updateData || typeof updateData !== 'object') {
        throw new UserValidationError('Update data must be an object');
      }
      
      this.log('debug', 'Updating user by email', { email });
      
      // First get the existing user
      const { data: existingUser, error: findError } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (findError) {
        // Handle "not found" error
        if (findError.code === 'PGRST116') {
          throw new UserNotFoundError(`User with email ${email} not found`);
        }
        
        throw new UserRepositoryError(`Error fetching user for update: ${findError.message}`, {
          cause: findError,
          metadata: { email }
        });
      }
      
      if (!existingUser) {
        throw new UserNotFoundError(`User with email ${email} not found`);
      }

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

      if (error) {
        throw new UserRepositoryError(`Error updating user: ${error.message}`, {
          cause: error,
          metadata: { email }
        });
      }

      this.log('debug', 'User updated by email successfully', { email });
      
      // Return updated user as domain object
      return new User(data);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError ||
          error instanceof UserNotFoundError) {
        throw error;
      }
      
      this.log('error', 'Error updating user by email', { 
        email, 
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to update user by email: ${error.message}`, {
        cause: error,
        metadata: { email }
      });
    }
  }

  /**
   * Update a user's status
   * @param {string} id - User ID
   * @param {string} status - New status (active, inactive, pending, suspended)
   * @returns {Promise<User>} Updated user object
   * @throws {UserNotFoundError} If user not found
   * @throws {UserRepositoryError} If database operation fails
   */
  async updateStatus(id, status) {
    try {
      if (!id) {
        throw new UserValidationError('User ID is required');
      }
      
      if (!status) {
        throw new UserValidationError('Status is required');
      }
      
      this.log('debug', 'Updating user status', { id, status });
      
      // First get the existing user
      const user = await this.findById(id);
      if (!user) {
        throw new UserNotFoundError(`User with ID ${id} not found`);
      }
      
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
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError ||
          error instanceof UserNotFoundError) {
        throw error;
      }
      
      this.log('error', 'Error updating user status', { 
        id, 
        status,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to update user status: ${error.message}`, {
        cause: error,
        metadata: { id, status }
      });
    }
  }

  /**
   * Add a role to a user
   * @param {string} id - User ID
   * @param {string} role - Role to add
   * @returns {Promise<User>} Updated user object
   * @throws {UserNotFoundError} If user not found
   * @throws {UserRepositoryError} If database operation fails
   */
  async addRole(id, role) {
    try {
      if (!id) {
        throw new UserValidationError('User ID is required');
      }
      
      if (!role) {
        throw new UserValidationError('Role is required');
      }
      
      this.log('debug', 'Adding role to user', { id, role });
      
      // First get the existing user
      const user = await this.findById(id);
      if (!user) {
        throw new UserNotFoundError(`User with ID ${id} not found`);
      }
      
      // Use the domain model method to add role
      user.addRole(role);
      
      // Save the updated user
      return await this.save(user);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError ||
          error instanceof UserNotFoundError) {
        throw error;
      }
      
      this.log('error', 'Error adding role to user', { 
        id, 
        role,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to add role to user: ${error.message}`, {
        cause: error,
        metadata: { id, role }
      });
    }
  }

  /**
   * Remove a role from a user
   * @param {string} id - User ID
   * @param {string} role - Role to remove
   * @returns {Promise<User>} Updated user object
   * @throws {UserNotFoundError} If user not found
   * @throws {UserRepositoryError} If database operation fails
   */
  async removeRole(id, role) {
    try {
      if (!id) {
        throw new UserValidationError('User ID is required');
      }
      
      if (!role) {
        throw new UserValidationError('Role is required');
      }
      
      this.log('debug', 'Removing role from user', { id, role });
      
      // First get the existing user
      const user = await this.findById(id);
      if (!user) {
        throw new UserNotFoundError(`User with ID ${id} not found`);
      }
      
      // Use the domain model method to remove role
      user.removeRole(role);
      
      // Save the updated user
      return await this.save(user);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError ||
          error instanceof UserNotFoundError) {
        throw error;
      }
      
      this.log('error', 'Error removing role from user', { 
        id, 
        role,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to remove role from user: ${error.message}`, {
        cause: error,
        metadata: { id, role }
      });
    }
  }

  /**
   * Mark a user's onboarding as completed
   * @param {string} id - User ID
   * @returns {Promise<User>} Updated user object
   * @throws {UserNotFoundError} If user not found
   * @throws {UserRepositoryError} If database operation fails
   */
  async completeOnboarding(id) {
    try {
      if (!id) {
        throw new UserValidationError('User ID is required');
      }
      
      this.log('debug', 'Completing user onboarding', { id });
      
      // First get the existing user
      const user = await this.findById(id);
      if (!user) {
        throw new UserNotFoundError(`User with ID ${id} not found`);
      }
      
      // Use the domain model method to complete onboarding
      user.completeOnboarding();
      
      // Save the updated user
      return await this.save(user);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError ||
          error instanceof UserNotFoundError) {
        throw error;
      }
      
      this.log('error', 'Error completing user onboarding', { 
        id,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to complete user onboarding: ${error.message}`, {
        cause: error,
        metadata: { id }
      });
    }
  }

  /**
   * Record a user login
   * @param {string} id - User ID
   * @returns {Promise<User>} Updated user object
   * @throws {UserNotFoundError} If user not found
   * @throws {UserRepositoryError} If database operation fails
   */
  async recordLogin(id) {
    try {
      if (!id) {
        throw new UserValidationError('User ID is required');
      }
      
      this.log('debug', 'Recording user login', { id });
      
      // First get the existing user
      const user = await this.findById(id);
      if (!user) {
        throw new UserNotFoundError(`User with ID ${id} not found`);
      }
      
      // Use the domain model method to record login
      user.recordLogin();
      
      // Save the updated user
      return await this.save(user);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError ||
          error instanceof UserNotFoundError) {
        throw error;
      }
      
      this.log('error', 'Error recording user login', { 
        id,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to record user login: ${error.message}`, {
        cause: error,
        metadata: { id }
      });
    }
  }

  /**
   * Find users by role
   * @param {string} role - Role to search for
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array<User>>} List of matching users
   * @throws {UserRepositoryError} If database operation fails
   */
  async findByRole(role, options = {}) {
    try {
      if (!role) {
        throw new UserValidationError('Role is required');
      }
      
      this.log('debug', 'Finding users by role', { role, options });
      
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

      if (error) {
        throw new UserRepositoryError(`Error fetching users by role: ${error.message}`, {
          cause: error,
          metadata: { role, options }
        });
      }

      this.log('debug', `Found ${data?.length || 0} users with role`, { role });
      
      // Convert to User objects
      return (data || []).map(userData => new User(userData));
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError) {
        throw error;
      }
      
      this.log('error', 'Error finding users by role', { 
        role,
        options,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to find users by role: ${error.message}`, {
        cause: error,
        metadata: { role, options }
      });
    }
  }

  /**
   * Update user preferences
   * @param {string} id - User ID
   * @param {string} key - Preference key
   * @param {any} value - Preference value
   * @returns {Promise<User>} Updated user object
   * @throws {UserNotFoundError} If user not found
   * @throws {UserRepositoryError} If database operation fails
   */
  async updatePreference(id, key, value) {
    try {
      if (!id) {
        throw new UserValidationError('User ID is required');
      }
      
      if (!key) {
        throw new UserValidationError('Preference key is required');
      }
      
      this.log('debug', 'Updating user preference', { id, key });
      
      // First get the existing user
      const user = await this.findById(id);
      if (!user) {
        throw new UserNotFoundError(`User with ID ${id} not found`);
      }
      
      // Use the domain model method to update preference
      user.setPreference(key, value);
      
      // Save the updated user
      return await this.save(user);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError ||
          error instanceof UserNotFoundError) {
        throw error;
      }
      
      this.log('error', 'Error updating user preference', { 
        id,
        key,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to update user preference: ${error.message}`, {
        cause: error,
        metadata: { id, key }
      });
    }
  }

  /**
   * Helper method to convert camelCase to snake_case for database fields
   * @param {string} field - Field name in camelCase
   * @returns {string} Field name in snake_case
   * @private
   */
  convertToDbField(field) {
    if (!field) return field;
    
    // Handle common fields directly
    const fieldMap = {
      'userId': 'user_id',
      'fullName': 'full_name',
      'emailVerified': 'email_verified',
      'supabaseId': 'supabase_id',
      'lastActive': 'last_active',
      'lastLogin': 'last_login',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'profileComplete': 'profile_complete',
      'professionalTitle': 'professional_title',
      'preferredLanguage': 'preferred_language',
      'focusAreas': 'focus_areas',
      'learningGoals': 'learning_goals',
      'dominantTraits': 'dominant_traits'
    };
    
    return fieldMap[field] || field.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  /**
   * Create a new user from data
   * @param {Object} userData - User data (email, password, fullName, etc.)
   * @returns {Promise<User>} Created user
   * @throws {UserRepositoryError} If database operation fails
   */
  async createUser(userData) {
    try {
      if (!userData || !userData.email) {
        throw new UserValidationError('Email is required to create a user');
      }
      
      this.log('debug', 'Creating new user', { email: userData.email });
      
      // Create a new User domain object
      const user = new User({
        id: uuidv4(),
        email: userData.email,
        full_name: userData.fullName || 'User',
        password: userData.password, // In a real app, we would hash this
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        roles: ['user']
      });
      
      // Save to database
      return await this.save(user);
    } catch (error) {
      // Don't re-wrap repository errors
      if (error instanceof UserRepositoryError ||
          error instanceof UserValidationError) {
        throw error;
      }
      
      this.log('error', 'Error creating user', { 
        email: userData?.email,
        error: error.message,
        stack: error.stack
      });
      
      throw new UserRepositoryError(`Failed to create user: ${error.message}`, {
        cause: error,
        metadata: { email: userData?.email }
      });
    }
  }
}

module.exports = UserRepository;
module.exports.UserRepositoryError = UserRepositoryError;
module.exports.UserNotFoundError = UserNotFoundError;
module.exports.UserValidationError = UserValidationError; 