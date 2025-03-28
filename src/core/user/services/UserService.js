/**
 * User Service
 * 
 * Handles business logic for user management.
 * Personality data is managed by the personality domain.
 */

const User = require('../models/User');
const UserRepository = require('../repositories/UserRepository');
const { EventTypes, eventBus } = require('../../common/events/domainEvents');
const { v4: uuidv4 } = require('uuid');
const { userLogger } = require('../../infra/logging/domainLogger');

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository || new UserRepository();
    this.logger = userLogger.child('service');
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
      const existingUser = await this.userRepository.findByEmail(user.email);
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
      
      return savedUser;
    } catch (error) {
      console.error('UserService.createUser error:', error);
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
      return this.userRepository.findById(id);
    } catch (error) {
      console.error('UserService.getUserById error:', error);
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
      return this.userRepository.findByEmail(email);
    } catch (error) {
      console.error('UserService.getUserByEmail error:', error);
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
      // Get existing user
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
      return this.userRepository.save(user);
    } catch (error) {
      console.error('UserService.updateUser error:', error);
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
      // Get existing user
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      // Use the domain model's method to update activity
      user.updateActivity();
      
      // Save updated user
      return this.userRepository.save(user);
    } catch (error) {
      console.error('UserService.updateUserActivity error:', error);
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
      }
      
      return result;
    } catch (error) {
      console.error('UserService.deleteUser error:', error);
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
      return this.userRepository.findAll(criteria, options);
    } catch (error) {
      console.error('UserService.findUsers error:', error);
      throw error;
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
      // Get existing user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model's method to set focus area
      user.setFocusArea(focusArea, threadId);

      // Save updated user - domain events are published in the model
      return this.userRepository.save(user);
    } catch (error) {
      console.error('UserService.setUserFocusArea error:', error);
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
      this.logger.debug(`Activating user: ${userId}`);
      
      // Get existing user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to activate
      user.activate();

      // Save the updated user - domain events published in the model
      return this.userRepository.save(user);
    } catch (error) {
      this.logger.error('UserService.activateUser error:', error);
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
      this.logger.debug(`Deactivating user: ${userId}`);
      
      // Get existing user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to deactivate
      user.deactivate();

      // Save the updated user - domain events published in the model
      return this.userRepository.save(user);
    } catch (error) {
      this.logger.error('UserService.deactivateUser error:', error);
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
      this.logger.debug(`Completing onboarding for user: ${userId}`);
      
      // Get existing user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to complete onboarding
      user.completeOnboarding();

      // Save the updated user - domain events published in the model
      return this.userRepository.save(user);
    } catch (error) {
      this.logger.error('UserService.completeUserOnboarding error:', error);
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
      this.logger.debug(`Adding role "${role}" to user: ${userId}`);
      
      // Get existing user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to add role
      user.addRole(role);

      // Save the updated user - domain events published in the model
      return this.userRepository.save(user);
    } catch (error) {
      this.logger.error('UserService.addUserRole error:', error);
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
      this.logger.debug(`Removing role "${role}" from user: ${userId}`);
      
      // Get existing user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to remove role
      user.removeRole(role);

      // Save the updated user - domain events published in the model
      return this.userRepository.save(user);
    } catch (error) {
      this.logger.error('UserService.removeUserRole error:', error);
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
      this.logger.debug(`Recording login for user: ${userId}`);
      
      // Get existing user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to record login
      user.recordLogin();

      // Save the updated user - domain events published in the model
      return this.userRepository.save(user);
    } catch (error) {
      this.logger.error('UserService.recordUserLogin error:', error);
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
      this.logger.debug(`Updating preference "${key}" for user: ${userId}`);
      
      // Get existing user
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Use the domain model method to set preference
      user.setPreference(key, value);

      // Save the updated user
      return this.userRepository.save(user);
    } catch (error) {
      this.logger.error('UserService.updateUserPreference error:', error);
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
      this.logger.debug(`Finding users with role: ${role}`);
      return this.userRepository.findByRole(role, options);
    } catch (error) {
      this.logger.error('UserService.findUsersByRole error:', error);
      throw error;
    }
  }
}

module.exports = UserService; 