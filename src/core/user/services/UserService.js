/**
 * User Service
 * 
 * Handles business logic for user management with integrated caching.
 * Personality data is managed by the personality domain.
 */

const User = require('../models/User');
const UserRepository = require('../repositories/UserRepository');
const { EventTypes, eventBus } = require('../../common/events/domainEvents');
const { v4: uuidv4 } = require('uuid');
const { userLogger } = require('../../infra/logging/domainLogger');

// Cache TTL constants
const USER_CACHE_TTL = 300; // 5 minutes
const USER_LIST_CACHE_TTL = 60; // 1 minute
const USER_PROFILE_CACHE_TTL = 600; // 10 minutes for profile data
const ROLES_CACHE_TTL = 1800; // 30 minutes for role data

/**
 * @class UserService
 * @description Service for user operations with standardized caching
 */
class UserService {
  /**
   * Create a new UserService
   * @param {UserRepository} userRepository - User repository instance
   * @param {Object} logger - Logger instance
   * @param {CacheService} cacheService - Cache service for optimizing data access
   * @throws {Error} If cacheService is not provided
   */
  constructor(userRepository, logger, cacheService) {
    if (!cacheService) {
      throw new Error('CacheService is required for UserService');
    }
    
    this.userRepository = userRepository || new UserRepository();
    this.logger = logger || userLogger.child('service');
    this.cache = cacheService;
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<User>} Created user
   */
  async createUser(userData) {
    try {
      // Create user object with provided data
      const user = new User({
        ...userData,
        id: userData.id || uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      });

      // Validate user data
      const validation = user.validate();
      if (!validation.isValid) {
        throw new Error(`Invalid user data: ${validation.errors.join(', ')}`);
      }

      // Check if user with same email already exists
      const existingUser = await this.getUserByEmail(user.email);
      
      if (existingUser) {
        throw new Error(`User with email ${user.email} already exists`);
      }
      
      // Save user to database
      const savedUser = await this.userRepository.save(user);
      
      // Publish user created event
      await eventBus.publishEvent(EventTypes.USER_CREATED, {
        userId: savedUser.id,
        email: savedUser.email
      });
      
      // Cache the new user
      this.cache.set(`user:id:${savedUser.id}`, savedUser, USER_CACHE_TTL);
      this.cache.set(`user:email:${savedUser.email}`, savedUser, USER_CACHE_TTL);
      
      // Invalidate user lists
      this.invalidateUserListCaches();
      
      return savedUser;
    } catch (error) {
      this.logger.error('Error creating user', { 
        error: error.message, 
        stack: error.stack,
        email: userData.email 
      });
      throw error;
    }
  }

  /**
   * Get a user by ID
   * @param {string} id - User ID
   * @returns {Promise<User|null>} User object or null if not found
   */
  async getUserById(id) {
    try {
      const cacheKey = `user:id:${id}`;
      
      return this.cache.getOrSet(cacheKey, async () => {
        const user = await this.userRepository.findById(id);
        
        if (user && user.email) {
          // Cross-reference cache for the same user
          this.cache.set(`user:email:${user.email}`, user, USER_CACHE_TTL);
        }
        
        return user;
      }, USER_CACHE_TTL);
    } catch (error) {
      this.logger.error('Error getting user by ID', { 
        error: error.message, 
        stack: error.stack,
        userId: id 
      });
      throw error;
    }
  }

  /**
   * Get a user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>} User object or null if not found
   */
  async getUserByEmail(email) {
    try {
      const cacheKey = `user:email:${email}`;
      
      return this.cache.getOrSet(cacheKey, async () => {
        const user = await this.userRepository.findByEmail(email);
        
        if (user && user.id) {
          // Cross-reference cache for the same user
          this.cache.set(`user:id:${user.id}`, user, USER_CACHE_TTL);
        }
        
        return user;
      }, USER_CACHE_TTL);
    } catch (error) {
      this.logger.error('Error getting user by email', { 
        error: error.message, 
        stack: error.stack,
        email 
      });
      throw error;
    }
  }

  /**
   * Update a user's profile information
   * @param {string} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<User>} Updated user
   */
  async updateUser(id, updates) {
    try {
      // Get existing user directly from repository to ensure fresh data
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }

      // Use the domain model's method to update profile
      user.updateProfile(updates);

      // Validate updated user
      const validation = user.validate();
      if (!validation.isValid) {
        throw new Error(`Invalid user data: ${validation.errors.join(', ')}`);
      }

      // Save updated user
      const updatedUser = await this.userRepository.save(user);
      
      // Update cache with fresh data
      this.cache.set(`user:id:${id}`, updatedUser, USER_CACHE_TTL);
      
      if (updatedUser.email) {
        this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
      }
      
      // Invalidate cache for lists and searches
      this.invalidateUserListCaches();
      
      return updatedUser;
    } catch (error) {
      this.logger.error('Error updating user', { 
        error: error.message, 
        stack: error.stack,
        userId: id 
      });
      throw error;
    }
  }

  /**
   * Update user's last active timestamp
   * @param {string} id - User ID
   * @returns {Promise<User>} Updated user
   */
  async updateUserActivity(id) {
    try {
      // Get existing user - can use cached version for this
      const user = await this.getUserById(id);
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      // Use the domain model's method to update activity
      user.updateActivity();
      
      // Save updated user
      const updatedUser = await this.userRepository.save(user);
      
      // Update cache
      this.cache.set(`user:id:${id}`, updatedUser, USER_CACHE_TTL);
      
      if (updatedUser.email) {
        this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
      }
      
      return updatedUser;
    } catch (error) {
      this.logger.error('Error updating user activity', { 
        error: error.message, 
        stack: error.stack,
        userId: id 
      });
      throw error;
    }
  }

  /**
   * Delete a user
   * @param {string} id - User ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteUser(id) {
    try {
      // Get user directly from repository
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      const result = await this.userRepository.delete(id);
      
      // Publish user deleted event
      if (result) {
        await eventBus.publishEvent(EventTypes.USER_DELETED, {
          userId: id
        });
        
        // Invalidate all caches for this user
        this.cache.delete(`user:id:${id}`);
        
        if (user.email) {
          this.cache.delete(`user:email:${user.email}`);
        }
        
        // Invalidate list caches
        this.invalidateUserListCaches();
      }
      
      return result;
    } catch (error) {
      this.logger.error('Error deleting user', { 
        error: error.message, 
        stack: error.stack,
        userId: id 
      });
      throw error;
    }
  }

  /**
   * Find users matching certain criteria
   * @param {Object} criteria - Filtering criteria
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array<User>>} List of matching users
   */
  async findUsers(criteria, options) {
    try {
      // Create a cache key based on criteria and options
      const criteriaStr = JSON.stringify(criteria || {});
      const optionsStr = JSON.stringify(options || {});
      const cacheKey = `users:find:${criteriaStr}:${optionsStr}`;
      
      return this.cache.getOrSet(cacheKey, async () => {
        const users = await this.userRepository.findAll(criteria, options);
        
        // Cache individual users as well
        users.forEach(user => {
          this.cache.set(`user:id:${user.id}`, user, USER_CACHE_TTL);
          if (user.email) {
            this.cache.set(`user:email:${user.email}`, user, USER_CACHE_TTL);
          }
        });
        
        return users;
      }, USER_LIST_CACHE_TTL);
    } catch (error) {
      this.logger.error('Error finding users', { 
        error: error.message, 
        stack: error.stack,
        criteria,
        options 
      });
      throw error;
    }
  }

  /**
   * Find users by role
   * @param {string} role - Role to search for
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array<User>>} List of matching users
   */
  async findUsersByRole(role, options = {}) {
    try {
      const cacheKey = `users:role:${role}:${JSON.stringify(options)}`;
      
      return this.cache.getOrSet(cacheKey, async () => {
        const users = await this.userRepository.findByRole(role, options);
        
        // Cache individual users
        users.forEach(user => {
          this.cache.set(`user:id:${user.id}`, user, USER_CACHE_TTL);
          if (user.email) {
            this.cache.set(`user:email:${user.email}`, user, USER_CACHE_TTL);
          }
        });
        
        return users;
      }, ROLES_CACHE_TTL);
    } catch (error) {
      this.logger.error('Error finding users by role', { 
        error: error.message, 
        stack: error.stack,
        role,
        options 
      });
      throw error;
    }
  }
  
  /**
   * Helper method to invalidate all user list related caches
   * @private
   */
  invalidateUserListCaches() {
    try {
      // Get all keys with the users:find: prefix
      const findKeys = this.cache.keys('users:find:');
      const roleKeys = this.cache.keys('users:role:');
      
      // Delete all matching keys
      [...findKeys, ...roleKeys].forEach(key => {
        this.cache.delete(key);
      });
      
      this.logger.debug(`Invalidated ${findKeys.length + roleKeys.length} user list cache entries`);
    } catch (error) {
      this.logger.warn('Error invalidating user list caches', { error: error.message });
    }
  }

  /**
   * Set focus area for a user
   * @param {string} userId - User ID
   * @param {string} focusArea - Focus area name
   * @param {string} threadId - Optional thread ID for generation
   * @returns {Promise<User>} Updated user
   */
  async setUserFocusArea(userId, focusArea, threadId = null) {
    try {
      // Get existing user - use repository directly for fresh data
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model's method to set focus area
      user.setFocusArea(focusArea, threadId);

      // Save updated user - domain events are published in the model
      const updatedUser = await this.userRepository.save(user);
      
      // Update cache
      this.cache.set(`user:id:${userId}`, updatedUser, USER_CACHE_TTL);
      
      if (updatedUser.email) {
        this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
      }
      
      // Invalidate user lists that might depend on focus area
      this.invalidateUserListCaches();
      
      return updatedUser;
    } catch (error) {
      this.logger.error('Error setting user focus area', { 
        error: error.message, 
        stack: error.stack,
        userId,
        focusArea 
      });
      throw error;
    }
  }

  /**
   * Activate a user account
   * @param {string} userId - User ID
   * @returns {Promise<User>} Updated user
   */
  async activateUser(userId) {
    try {
      // Get existing user
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to activate
      user.activate();

      // Save the updated user - domain events published in the model
      const updatedUser = await this.userRepository.save(user);
      
      // Update cache
      this.cache.set(`user:id:${userId}`, updatedUser, USER_CACHE_TTL);
      
      if (updatedUser.email) {
        this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
      }
      
      // Invalidate user lists that might depend on active status
      this.invalidateUserListCaches();
      
      return updatedUser;
    } catch (error) {
      this.logger.error('Error activating user', { 
        error: error.message, 
        stack: error.stack,
        userId 
      });
      throw error;
    }
  }

  /**
   * Deactivate a user account
   * @param {string} userId - User ID
   * @returns {Promise<User>} Updated user
   */
  async deactivateUser(userId) {
    try {
      // Get existing user
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to deactivate
      user.deactivate();

      // Save the updated user - domain events published in the model
      const updatedUser = await this.userRepository.save(user);
      
      // Update cache
      this.cache.set(`user:id:${userId}`, updatedUser, USER_CACHE_TTL);
      
      if (updatedUser.email) {
        this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
      }
      
      // Invalidate user lists that might depend on active status
      this.invalidateUserListCaches();
      
      return updatedUser;
    } catch (error) {
      this.logger.error('Error deactivating user', { 
        error: error.message, 
        stack: error.stack,
        userId 
      });
      throw error;
    }
  }

  /**
   * Mark user onboarding as completed
   * @param {string} userId - User ID
   * @returns {Promise<User>} Updated user
   */
  async completeUserOnboarding(userId) {
    try {
      // Get existing user
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to complete onboarding
      user.completeOnboarding();

      // Save the updated user - domain events published in the model
      const updatedUser = await this.userRepository.save(user);
      
      // Update cache
      this.cache.set(`user:id:${userId}`, updatedUser, USER_CACHE_TTL);
      
      if (updatedUser.email) {
        this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
      }
      
      return updatedUser;
    } catch (error) {
      this.logger.error('Error completing user onboarding', { 
        error: error.message, 
        stack: error.stack,
        userId 
      });
      throw error;
    }
  }

  /**
   * Add a role to a user
   * @param {string} userId - User ID
   * @param {string} role - Role to add
   * @returns {Promise<User>} Updated user
   */
  async addUserRole(userId, role) {
    try {
      // Get existing user
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to add role
      user.addRole(role);

      // Save the updated user - domain events published in the model
      const updatedUser = await this.userRepository.save(user);
      
      // Update cache
      this.cache.set(`user:id:${userId}`, updatedUser, USER_CACHE_TTL);
      
      if (updatedUser.email) {
        this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
      }
      
      // Invalidate role-based caches
      this.invalidateUserListCaches();
      
      return updatedUser;
    } catch (error) {
      this.logger.error('Error adding user role', { 
        error: error.message, 
        stack: error.stack,
        userId,
        role 
      });
      throw error;
    }
  }

  /**
   * Remove a role from a user
   * @param {string} userId - User ID
   * @param {string} role - Role to remove
   * @returns {Promise<User>} Updated user
   */
  async removeUserRole(userId, role) {
    try {
      // Get existing user
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to remove role
      user.removeRole(role);

      // Save the updated user - domain events published in the model
      const updatedUser = await this.userRepository.save(user);
      
      // Update cache
      this.cache.set(`user:id:${userId}`, updatedUser, USER_CACHE_TTL);
      
      if (updatedUser.email) {
        this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
      }
      
      // Invalidate role-based caches
      this.invalidateUserListCaches();
      
      return updatedUser;
    } catch (error) {
      this.logger.error('Error removing user role', { 
        error: error.message, 
        stack: error.stack,
        userId,
        role 
      });
      throw error;
    }
  }

  /**
   * Record a user login
   * @param {string} userId - User ID
   * @returns {Promise<User>} Updated user
   */
  async recordUserLogin(userId) {
    try {
      // Get existing user
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to record login
      user.recordLogin();

      // Save the updated user - domain events published in the model
      const updatedUser = await this.userRepository.save(user);
      
      // Update cache
      this.cache.set(`user:id:${userId}`, updatedUser, USER_CACHE_TTL);
      
      if (updatedUser.email) {
        this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
      }
      
      return updatedUser;
    } catch (error) {
      this.logger.error('Error recording user login', { 
        error: error.message, 
        stack: error.stack,
        userId 
      });
      throw error;
    }
  }

  /**
   * Update a user preference
   * @param {string} userId - User ID
   * @param {string} key - Preference key
   * @param {any} value - Preference value
   * @returns {Promise<User>} Updated user
   */
  async updateUserPreference(userId, key, value) {
    try {
      // Get existing user
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to set preference
      user.setPreference(key, value);

      // Save the updated user
      const updatedUser = await this.userRepository.save(user);
      
      // Update cache
      this.cache.set(`user:id:${userId}`, updatedUser, USER_CACHE_TTL);
      
      if (updatedUser.email) {
        this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
      }
      
      return updatedUser;
    } catch (error) {
      this.logger.error('Error updating user preference', { 
        error: error.message, 
        stack: error.stack,
        userId,
        key 
      });
      throw error;
    }
  }
}

module.exports = UserService; 