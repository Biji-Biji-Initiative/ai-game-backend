/**
 * User Service (Refactored with Standardized Error Handling)
 *
 * Handles business logic for user management with integrated caching.
 * Personality data is managed by the personality domain.
 */
// Imports using ES modules
import User from "#app/core/user/models/User.js";
import UserRepository from "#app/core/user/repositories/UserRepository.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { v4 as uuidv4 } from 'uuid';
import { userLogger } from "#app/core/infra/logging/domainLogger.js";
import { UserNotFoundError, UserCreationError, UserUpdateError } from "#app/core/user/errors/UserErrors.js";
import { withServiceErrorHandling, createErrorMapper } from "#app/core/infra/errors/errorStandardization.js";
import ConfigurationError from "#app/core/infra/errors/ConfigurationError.js";
import { validateDependencies } from "#app/core/shared/utils/serviceUtils.js";
// Import value objects
import { Email, UserId, createEmail, createUserId } from "#app/core/common/valueObjects/index.js";
import UserMapper from '../mappers/UserMapper.js';
import logger from '#app/core/infra/logging/logger.js';
// Only keep the cache TTL that is used
const USER_CACHE_TTL = 300; // 5 minutes
// Create an error mapper for the user service
const userServiceErrorMapper = createErrorMapper({
    'UserNotFoundError': UserNotFoundError,
    'UserValidationError': UserCreationError,
    'EntityNotFoundError': UserNotFoundError,
    'ValidationError': UserCreationError
}, UserUpdateError);
/**
 * @class UserService
 * @description Service for user operations with standardized caching and error handling
 */
export default class UserService {
    /**
     * Create a new UserService
     * @param {Object} dependencies - Service dependencies
     * @param {UserRepository} dependencies.userRepository - User repository instance
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.eventBus - Event bus instance
     * @param {CacheService} dependencies.cacheService - Cache service for optimizing data access
     * @param {UserPreferencesManager} dependencies.userPreferencesManager - User preferences manager
     * @throws {Error} If cacheService is not provided
     */
    constructor(dependencies = {}) {
        const { userRepository, logger, eventBus, cacheService, userPreferencesManager } = dependencies;
        
        // Validate required dependencies
        validateDependencies(dependencies, {
            serviceName: 'UserService',
            required: ['userRepository', 'cacheService'],
            productionOnly: true
        });
        
        // Add eventBus validation/warning
        if (!eventBus) {
            this.logger?.warn('EventBus was not provided to UserService. Domain events will not be published.');
        }
        
        // Store repository reference
        this.userRepository = userRepository;
        this.cache = cacheService;
        
        // In development mode, provide fallbacks if needed
        if (process.env.NODE_ENV !== 'production') {
            // In development/testing, allow fallbacks for easier development
            if (!userRepository) {
                this.userRepository = new UserRepository();
            }
            
            // Handle missing cache service with a fallback implementation in non-production
            if (!cacheService) {
                this.logger = logger || userLogger.child('service');
                this.logger.warn('No CacheService provided, using in-memory fallback cache');
                
                // Create a simple in-memory cache as fallback
                this.cache = {
                    // eslint-disable-next-line no-unused-vars
                    async get(_key) { return null; },
                    // eslint-disable-next-line no-unused-vars
                    async set(_key, _value, _ttl) { return true; },
                    // eslint-disable-next-line no-unused-vars
                    async delete(_key) { return true; },
                    // eslint-disable-next-line no-unused-vars
                    async keys(_pattern) { return []; },
                    // eslint-disable-next-line no-unused-vars
                    async getOrSet(_key, factory, _ttl) { return await factory(); },
                    // eslint-disable-next-line no-unused-vars
                    async invalidateCache(_prefix) { return true; }
                };
            }
        }
        
        // Common initialization for all environments
        this.logger = logger || userLogger.child('service');
        this.eventBus = eventBus;
        this.userPreferencesManager = userPreferencesManager;
        
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
        this.findById = withServiceErrorHandling(this.findById.bind(this), {
            methodName: 'findById',
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
        this.updateUserDifficulty = withServiceErrorHandling(this.updateUserDifficulty.bind(this), {
            methodName: 'updateUserDifficulty',
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
                throw new UserCreationError(`Invalid email format: ${userData.email}`);
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
            throw new UserCreationError(`Invalid user data: ${validation.errors.join(', ')}`);
        }
        // Check if user with same email already exists
        const existingUser = await this.getUserByEmail(user.email);
        if (existingUser) {
            throw new UserCreationError(`User with email ${user.email} already exists`);
        }
        // Save user to database
        const savedUser = await this.userRepository.save(user);
        
        // Find the user entity to add the event
        const entity = await this.userRepository.findById(user.id);
        if (entity) {
            // Add domain event to entity
            entity.addDomainEvent(EventTypes.USER_CREATED, {
              userId: user.id,
                    email: user.email
            });
            
            // Save entity with events (this will trigger publishing)
            await this.userRepository.save(entity);
        }
        
        // Cache the new user
        await this.cache.set(`user:id:${savedUser.id}`, savedUser, USER_CACHE_TTL);
        await this.cache.set(`user:email:${savedUser.email}`, savedUser, USER_CACHE_TTL);
        // Invalidate user lists
        await this.invalidateUserListCaches();
        return entity || savedUser;
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
            throw new UserCreationError(`Invalid user ID: ${id}`);
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
     * Standardized method to get a user by ID
     * @param {string|UserId} id - User ID or UserId value object
     * @returns {Promise<User|null>} User object or null if not found
     */
    findById(id) {
        // Delegate to the existing getUserById method
        return this.getUserById(id);
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
            throw new UserCreationError(`Invalid email format: ${email}`);
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
                throw new UserCreationError(`Invalid email format: ${idOrEmail}`);
            }
            // Get user by email
            user = await this.userRepository.findByEmail(emailVO.value, true);
        }
        else {
            // Treat as user ID
            const userIdVO = idOrEmail instanceof UserId ? idOrEmail : createUserId(idOrEmail);
            if (!userIdVO) {
                throw new UserCreationError(`Invalid user ID: ${idOrEmail}`);
            }
            // Get existing user directly from repository to ensure fresh data
            user = await this.userRepository.findById(userIdVO.value, true);
        }
        // Use the domain model's method to update profile
        user.updateProfile(updates);
        // Validate updated user
        const validation = user.validate();
        if (!validation.isValid) {
            throw new UserCreationError(`Invalid user data: ${validation.errors.join(', ')}`);
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
            throw new UserCreationError(`Invalid user ID: ${id}`);
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
        }
        catch (error) {
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
    /**
     * Get all preferences for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User preferences
     */
    async getUserPreferences(userId) {
        if (!this.userPreferencesManager) {
            throw new UserUpdateError('UserPreferencesManager not available for preference operations');
        }
        return this.userPreferencesManager.getUserPreferences(userId);
    }
    /**
     * Get preferences for a specific category
     * @param {string} userId - User ID
     * @param {string} category - Preference category
     * @returns {Promise<Object>} Category preferences
     */
    async getUserPreferencesByCategory(userId, category) {
        if (!this.userPreferencesManager) {
            throw new UserUpdateError('UserPreferencesManager not available for preference operations');
        }
        return this.userPreferencesManager.getUserPreferencesByCategory(userId, category);
    }
    /**
     * Update all user preferences
     * @param {string} userId - User ID
     * @param {Object} preferences - New preferences
     * @returns {Promise<Object>} Updated preferences
     */
    async updateUserPreferences(userId, preferences) {
        if (!this.userPreferencesManager) {
            throw new UserUpdateError('UserPreferencesManager not available for preference operations');
        }
        return this.userPreferencesManager.updateUserPreferences(userId, preferences);
    }
    /**
     * Update preferences for a specific category
     * @param {string} userId - User ID
     * @param {string} category - Preference category
     * @param {Object} categoryPreferences - New category preferences
     * @returns {Promise<Object>} Updated category preferences
     */
    async updateUserPreferencesByCategory(userId, category, categoryPreferences) {
        if (!this.userPreferencesManager) {
            throw new UserUpdateError('UserPreferencesManager not available for preference operations');
        }
        return this.userPreferencesManager.updateUserPreferencesByCategory(userId, category, categoryPreferences);
    }
    /**
     * Set a single user preference
     * @param {string} userId - User ID
     * @param {string} key - Preference key
     * @param {any} value - Preference value
     * @returns {Promise<Object>} Updated preferences
     */
    async setUserPreference(userId, key, value) {
        if (!this.userPreferencesManager) {
            throw new UserUpdateError('UserPreferencesManager not available for preference operations');
        }
        return this.userPreferencesManager.setUserPreference(userId, key, value);
    }
    /**
     * Reset a preference to default
     * @param {string} userId - User ID
     * @param {string} key - Preference key
     * @returns {Promise<Object>} Updated preferences
     */
    async resetUserPreference(userId, key) {
        if (!this.userPreferencesManager) {
            throw new UserUpdateError('UserPreferencesManager not available for preference operations');
        }
        return this.userPreferencesManager.resetUserPreference(userId, key);
    }
    /**
     * List all users (supports basic pagination/sorting via options)
     * @param {Object} options - Query options (e.g., limit, offset, sortBy, sortDir)
     * @returns {Promise<{users: Array<User>, total: number}>} List of users and total count
     */
    async listUsers(options = {}) {
        this.logger.debug('Listing users', { options });
        // Directly call repository's findAll which should handle options
        // Ensure repository returns the structure { users: [...], total: ... }
        // Note: Caching for list operations might be complex, handled carefully if needed.
        // Currently relies on repository potentially caching if implemented there, or no caching.
        const result = await this.userRepository.findAll({}, options);
        return result; 
    }
    /**
     * Delete a user by ID
     * @param {string|UserId} id - User ID or UserId value object
     * @returns {Promise<void>}
     */
    async deleteUser(id) {
        // Convert to value object if needed
        const userIdVO = id instanceof UserId ? id : createUserId(id);
        if (!userIdVO) {
            throw new UserCreationError(`Invalid user ID: ${id}`);
        }
        // Delete user from repository
        await this.userRepository.delete(userIdVO.value);
        // Invalidate user lists
        await this.invalidateUserListCaches();
    }
    /**
     * Update a user's difficulty level
     * @param {string|UserId} userId - User ID or UserId value object
     * @param {string} difficultyLevel - The new difficulty level code (e.g., 'beginner')
     * @returns {Promise<User>} Updated user
     * @throws {UserNotFoundError} If user not found
     * @throws {UserCreationError} If difficultyLevel is invalid
     * @throws {UserUpdateError} If update fails
     */
    async updateUserDifficulty(userId, difficultyLevel) {
        this.logger.info('Updating user difficulty', { userId, difficultyLevel });
        // Convert to value object if needed
        const userIdVO = userId instanceof UserId ? userId : createUserId(userId);
        if (!userIdVO) {
            throw new UserCreationError(`Invalid user ID: ${userId}`);
        }

        // Get existing user directly from repository to ensure fresh data and lock
        // Pass throwIfNotFound=true to ensure we get an error if user is gone
        const user = await this.userRepository.findById(userIdVO.value, true);

        // Use the domain model's method to update difficulty (handles validation & event)
        user.setDifficultyLevel(difficultyLevel);

        // Save updated user
        const updatedUser = await this.userRepository.save(user);

        // Update cache with fresh data
        await this.cache.set(`user:id:${updatedUser.id}`, updatedUser, USER_CACHE_TTL);
        if (updatedUser.email) {
            await this.cache.set(`user:email:${updatedUser.email}`, updatedUser, USER_CACHE_TTL);
        }

        // Invalidate cache for lists and searches (optional, depends if difficulty is used in lists)
        // await this.invalidateUserListCaches();

        this.logger.info('User difficulty updated successfully', { userId: updatedUser.id, newLevel: updatedUser.difficultyLevel });
        return updatedUser;
    }
}
