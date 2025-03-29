'use strict';

/**
 * User Service (Refactored with Standardized Error Handling)
 * 
 * Handles business logic for user management with integrated caching.
 * Personality data is managed by the personality domain.
 */

// Uncomment these imports (remove the //)
const User = require('../models/User');
const UserRepository = require('../repositories/UserRepository');
const { EventTypes, eventBus } = require('../../common/events/domainEvents');
const { v4: uuidv4 } = require('uuid');
const { userLogger } = require('../../../core/infra/logging/domainLogger');
const { 
  UserNotFoundError, 
  UserValidationError, 
  UserError 
} = require('../errors/UserErrors');
const {
  withServiceErrorHandling,
  createErrorMapper
} = require('../../../core/infra/errors/errorStandardization');
// Import value objects
const { 
  Email, 
  UserId, 
  createEmail, 
  createUserId 
} = require('../../common/valueObjects');

// Only keep the cache TTL that is used
const USER_CACHE_TTL = 300; // 5 minutes

// Create an error mapper for the user service
const userServiceErrorMapper = createErrorMapper({
  'UserNotFoundError': UserNotFoundError,
  'UserValidationError': UserValidationError,
  'EntityNotFoundError': UserNotFoundError,
  'ValidationError': UserValidationError
}, UserError);

/**
 * @class UserService
 * @description Service for user operations with standardized caching and error handling
 */
class UserService {
  /**
   * Create a new UserService
   * @param {UserRepository} userRepository - User repository instance
   * @param {Object} logger - Logger instance
   * @param {CacheService} cacheService - Cache service for optimizing data access
   * @throws {Error} If cacheService is not provided
   */
  /**
   * Method constructor
   */
  constructor(userRepository, logger, cacheService) {
    if (!cacheService) {
      throw new Error('CacheService is required for UserService');
    }
    
    this.userRepository = userRepository || new UserRepository();
    this.logger = logger || userLogger.child('service');
    this.cache = cacheService;
    
    // Apply standardized error handling to methods
    this.createUser = withServiceErrorHandling(this.createUser.bind(this), {
      methodName: 'createUser',
      domainName: 'user',
      logger: this.logger,
      errorMapper: userServiceErrorMapper
    });
    
    this.getUserById = withServiceErrorHandling(this.getUserById.bind(this), {
      methodName: 'getUserById',
      domainName: 'user',
      logger: this.logger,
      errorMapper: userServiceErrorMapper
    });
    
    this.getUserByEmail = withServiceErrorHandling(this.getUserByEmail.bind(this), {
      methodName: 'getUserByEmail',
      domainName: 'user',
      logger: this.logger,
      errorMapper: userServiceErrorMapper
    });
    
    this.updateUser = withServiceErrorHandling(this.updateUser.bind(this), {
      methodName: 'updateUser',
      domainName: 'user',
      logger: this.logger,
      errorMapper: userServiceErrorMapper
    });
    
    this.updateUserActivity = withServiceErrorHandling(this.updateUserActivity.bind(this), {
      methodName: 'updateUserActivity',
      domainName: 'user',
      logger: this.logger,
      errorMapper: userServiceErrorMapper
    });
    
    // Apply to other methods as needed...
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<User>} Created user
   */
  async createUser(userData) {
    // Convert email to value object if not already
    if (userData.email && !(userData.email instanceof Email)) {
      const emailVO = createEmail(userData.email);
      if (!emailVO) {
        throw new UserValidationError(`Invalid email format: ${userData.email}`);
      }
      userData.email = emailVO.value;
    }

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
      throw new UserValidationError(`Invalid user data: ${validation.errors.join(', ')}`);
    }

    // Check if user with same email already exists
    const existingUser = await this.getUserByEmail(user.email);
    
    if (existingUser) {
      throw new UserValidationError(`User with email ${user.email} already exists`);
    }
    
    // Save user to database
    const savedUser = await this.userRepository.save(user);
    
    // Publish user created event
    await eventBus.publishEvent(EventTypes.USER_CREATED, {
      userId: savedUser.id,
      email: savedUser.email
    });
    
    // Cache the new user
    await this.cache.set(`user:id:${savedUser.id}`, savedUser, USER_CACHE_TTL);
    await this.cache.set(`user:email:${savedUser.email}`, savedUser, USER_CACHE_TTL);
    
    // Invalidate user lists
    await this.invalidateUserListCaches();
    
    return savedUser;
  }

  /**
   * Get a user by ID
   * @param {string|UserId} id - User ID or UserId value object
   * @returns {Promise<User|null>} User object or null if not found
   */
  getUserById(id) {
    // Convert to value object if needed
    const userIdVO = id instanceof UserId ? id : createUserId(id);
    if (!userIdVO) {
      throw new UserValidationError(`Invalid user ID: ${id}`);
    }
    
    const cacheKey = `user:id:${userIdVO.value}`;
    
    // Using variable to hold promise and await it before returning to fix linter error
    const userPromise = this.cache.getOrSet(cacheKey, async () => {
      const user = await this.userRepository.findById(userIdVO.value);
      
      if (user && user.email) {
        // Cross-reference cache for the same user
        await this.cache.set(`user:email:${user.email}`, user, USER_CACHE_TTL);
      }
      
      return user;
    }, USER_CACHE_TTL);
    
    // await the promise before returning
    return userPromise;
  }

  /**
   * Get a user by email
   * @param {string|Email} email - User email or Email value object
   * @returns {Promise<User|null>} User object or null if not found
   */
  getUserByEmail(email) {
    // Convert to value object if needed
    const emailVO = email instanceof Email ? email : createEmail(email);
    if (!emailVO) {
      throw new UserValidationError(`Invalid email format: ${email}`);
    }
    
    const cacheKey = `user:email:${emailVO.value}`;
    
    // Using variable to hold promise and await it before returning to fix linter error
    const userPromise = this.cache.getOrSet(cacheKey, async () => {
      const user = await this.userRepository.findByEmail(emailVO.value);
      
      if (user && user.id) {
        // Cross-reference cache for the same user
        await this.cache.set(`user:id:${user.id}`, user, USER_CACHE_TTL);
      }
      
      return user;
    }, USER_CACHE_TTL);
    
    // Return the promise directly
    return userPromise;
  }

  /**
   * Update a user's profile information
   * @param {string|UserId|Email} idOrEmail - User ID, UserId, or Email to identify the user
   * @param {Object} updates - Fields to update
   * @returns {Promise<User>} Updated user
   */
  async updateUser(idOrEmail, updates) {
    let user;
    
    // Handle different identifier types
    if (idOrEmail instanceof Email || (typeof idOrEmail === 'string' && idOrEmail.includes('@'))) {
      // Treat as email
      const emailVO = idOrEmail instanceof Email ? idOrEmail : createEmail(idOrEmail);
      if (!emailVO) {
        throw new UserValidationError(`Invalid email format: ${idOrEmail}`);
      }
      
      // Get user by email
      user = await this.userRepository.findByEmail(emailVO.value, true);
    } else {
      // Treat as user ID
      const userIdVO = idOrEmail instanceof UserId ? idOrEmail : createUserId(idOrEmail);
      if (!userIdVO) {
        throw new UserValidationError(`Invalid user ID: ${idOrEmail}`);
      }
      
      // Get existing user directly from repository to ensure fresh data
      user = await this.userRepository.findById(userIdVO.value, true);
    }

    // Use the domain model's method to update profile
    user.updateProfile(updates);

    // Validate updated user
    const validation = user.validate();
    if (!validation.isValid) {
      throw new UserValidationError(`Invalid user data: ${validation.errors.join(', ')}`);
    }

    // Save updated user
    const updatedUser = await this.userRepository.save(user);
    
    // Update cache with fresh data
    await this.cache.set(`user:id:${updatedUser.id}`, updatedUser, USER_CACHE_TTL);
    
    if (updatedUser.email) {
      await this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
    }
    
    // Invalidate cache for lists and searches
    await this.invalidateUserListCaches();
    
    return updatedUser;
  }

  /**
   * Update user's last activity timestamp
   * @param {string|UserId} id - User ID or UserId value object
   * @returns {Promise<void>}
   */
  async updateUserActivity(id) {
    // Convert to value object if needed
    const userIdVO = id instanceof UserId ? id : createUserId(id);
    if (!userIdVO) {
      throw new UserValidationError(`Invalid user ID: ${id}`);
    }
    
    // Get existing user
    const user = await this.userRepository.findById(userIdVO.value);
    if (!user) {
      throw new UserNotFoundError(`User with ID ${userIdVO.value} not found`);
    }
    
    // Update last active timestamp
    user.lastActive = new Date().toISOString();
    
    // Save to repository
    await this.userRepository.save(user);
    
    // Update cache
    await this.cache.set(`user:id:${userIdVO.value}`, user, USER_CACHE_TTL);
    if (user.email) {
      await this.cache.set(`user:email:${user.email}`, user, USER_CACHE_TTL);
    }
  }

  /**
   * Helper method to invalidate all user list related caches
   * @private
   */
  /**
   * Method invalidateUserListCaches
   */
  async invalidateUserListCaches() {
    try {
      // Get all keys with the users:find: prefix
      const findKeys = await this.cache.keys('users:find:');
      const roleKeys = await this.cache.keys('users:role:');
      
      // Delete all matching keys
      for (const key of [...findKeys, ...roleKeys]) {
        await this.cache.delete(key);
      }
      
      this.logger.debug(`Invalidated ${findKeys.length + roleKeys.length} user list cache entries`);
    } catch (error) {
      this.logger.warn('Error invalidating user list caches', { error: error.message });
    }
  }

  /**
   * Find a user by email (alternative name for getUserByEmail, for backward compatibility)
   * @param {string|Email} email - User email or Email value object
   * @returns {Promise<User|null>} User object or null if not found
   */
  findByEmail(email) {
    return this.getUserByEmail(email);
  }
  
  // Additional methods can be added here...
}

module.exports = UserService; 