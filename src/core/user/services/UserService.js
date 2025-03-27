/**
 * User Service
 * 
 * Handles business logic for user management.
 * Personality data is managed by the personality domain.
 */

const User = require('../models/User');
const UserRepository = require('../repositories/UserRepository');
const domainEvents = require('../../shared/domainEvents');
const { v4: uuidv4 } = require('uuid');

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository || new UserRepository();
    
    // Register event handlers for personality domain events
    this._registerPersonalityEventHandlers();
  }
  
  /**
   * Register event handlers for personality domain events
   * @private
   */
  _registerPersonalityEventHandlers() {
    // These events are handled for compatibility but don't affect the user model anymore
    domainEvents.subscribe('PersonalityTraitsUpdatedForUser', this._handlePersonalityTraitsUpdated.bind(this));
    domainEvents.subscribe('AIAttitudesUpdatedForUser', this._handleAIAttitudesUpdated.bind(this));
  }
  
  /**
   * Handle personality traits updated event
   * @param {Object} event - Event data
   * @private
   */
  async _handlePersonalityTraitsUpdated(event) {
    // Just log the event - personality data is no longer stored in the user model
    console.log(`Personality traits updated for user ${event.userId}`);
  }
  
  /**
   * Handle AI attitudes updated event
   * @param {Object} event - Event data
   * @private
   */
  async _handleAIAttitudesUpdated(event) {
    // Just log the event - AI attitudes are no longer stored in the user model
    console.log(`AI attitudes updated for user ${event.userId}`);
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
      await domainEvents.publish('UserCreated', {
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
        await domainEvents.publish('UserDeleted', {
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
}

module.exports = UserService; 