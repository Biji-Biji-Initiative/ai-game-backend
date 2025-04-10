'use strict';

import { v4 as uuidv4 } from "uuid";
import { withServiceErrorHandling, createErrorMapper } from "#app/core/infra/errors/errorStandardization.js";
import * as challengeErrors from "#app/core/challenge/errors/ChallengeErrors.js";
import { Email, UserId, ChallengeId, FocusArea, createEmail, createUserId, createChallengeId, createFocusArea } from "#app/core/common/valueObjects/index.js";
import ConfigurationError from "#app/core/infra/errors/ConfigurationError.js";
import { validateDependencies } from "#app/core/shared/utils/serviceUtils.js";
import { ChallengeRepository } from "#app/core/challenge/repositories/challengeRepository.js";
import Challenge from "#app/core/challenge/models/Challenge.js";
import { logger } from "#app/core/infra/logging/logger.js";
import { challengeSchema } from "#app/core/challenge/schemas/ChallengeSchema.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { UserNotFoundError } from "#app/core/user/errors/UserErrors.js";

const { ValidationError } = challengeErrors;
// Create error mapper for service
const challengeServiceErrorMapper = createErrorMapper({
    'ValidationError': ValidationError,
    'ChallengeNotFoundError': challengeErrors.ChallengeNotFoundError,
    'ChallengeValidationError': challengeErrors.ChallengeValidationError,
    'ChallengeProcessingError': challengeErrors.ChallengeProcessingError,
    'Error': challengeErrors.ChallengeError
}, challengeErrors.ChallengeError);
// Cache key prefixes
const CACHE_KEYS = {
    CHALLENGE_BY_ID: 'challenge:byId:',
    CHALLENGES_BY_USER: 'challenge:byUser:',
    RECENT_CHALLENGES: 'challenge:recent:',
    CHALLENGES_BY_FOCUS_AREA: 'challenge:byFocusArea:',
    CHALLENGE_SEARCH: 'challenge:search:',
    CHALLENGE_LIST: 'challenge:list:',
    CHALLENGES_BY_USER_ID: 'challenge:byUserId:',
    RECENT_CHALLENGES_BY_USER_ID: 'challenge:recentByUserId:'
};
/**
 * Challenge Service class
 * Responsible for challenge management and operations
 */
class ChallengeService {
    /**
     * Create a new ChallengeService
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.challengeRepository - Challenge repository instance
     * @param {Object} dependencies.userService - User service instance (needed for user lookups)
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.cacheService - Cache service instance
     * @param {Object} dependencies.cacheInvalidationManager - Cache invalidation manager instance
     */
    constructor(dependencies = {}) {
        const { challengeRepository, userService, logger, cacheService, cacheInvalidationManager } = dependencies;
        
        // Validate required dependencies
        validateDependencies(dependencies, {
            serviceName: 'ChallengeService',
            required: ['challengeRepository', 'logger', 'cacheService', 'cacheInvalidationManager'],
            productionOnly: true
        });
        
        // Store repository reference
        this.repository = challengeRepository;
        
        // In development mode, provide mock fallbacks if needed
        if (process.env.NODE_ENV !== 'production' && !challengeRepository) {
            this.repository = {
                findById: () => Promise.resolve(null),
                findByUserEmail: () => Promise.resolve([]),
                findByUserId: () => Promise.resolve([]),
                findAll: () => Promise.resolve([]),
                save: (challenge) => Promise.resolve(challenge),
                update: (challenge) => Promise.resolve(challenge),
                delete: () => Promise.resolve(true)
            };
        }
        
        // Store userService reference for resolving user IDs
        this.userService = userService;
        
        // No fallback for logger in any environment
        this.logger = logger;
        
        if (!this.logger) {
            throw new ConfigurationError('Logger is required for ChallengeService', {
                serviceName: 'ChallengeService',
                dependencyName: 'logger'
            });
        }
        
        if (process.env.NODE_ENV === 'production') {
            console.log('ChallengeService initialized in production mode with real repository');
        } else {
            console.log('ChallengeService running in development mode with ' + 
                (challengeRepository ? 'real' : 'mock') + ' repository');
        }
        
        // Store injected cache dependencies
        this.cacheService = cacheService;
        this.cacheInvalidator = cacheInvalidationManager;
        if (!this.cacheService) {
           throw new ConfigurationError('cacheService is required for ChallengeService', {
               serviceName: 'ChallengeService',
               dependencyName: 'cacheService'
           });
        }
         if (!this.cacheInvalidator) {
           throw new ConfigurationError('cacheInvalidationManager is required for ChallengeService', {
               serviceName: 'ChallengeService',
               dependencyName: 'cacheInvalidationManager'
           });
        }
        
        // Apply standardized error handling to methods
        this.getChallengeByIdOrVO = withServiceErrorHandling(
            this.getChallengeByIdOrVO.bind(this),
            {
                methodName: 'getChallengeByIdOrVO',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        this.getChallengesForUserOrVO = withServiceErrorHandling(
            this.getChallengesForUserOrVO.bind(this),
            {
                methodName: 'getChallengesForUserOrVO',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        this.getRecentChallengesForUserOrVO = withServiceErrorHandling(
            this.getRecentChallengesForUserOrVO.bind(this),
            {
                methodName: 'getRecentChallengesForUserOrVO',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        this.getChallengesByUserIdOrVO = withServiceErrorHandling(
            this.getChallengesByUserIdOrVO.bind(this),
            {
                methodName: 'getChallengesByUserIdOrVO',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        this.getRecentChallengesByUserIdOrVO = withServiceErrorHandling(
            this.getRecentChallengesByUserIdOrVO.bind(this),
            {
                methodName: 'getRecentChallengesByUserIdOrVO',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        this.saveChallenge = withServiceErrorHandling(
            this.saveChallenge.bind(this),
            {
                methodName: 'saveChallenge',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        this.updateChallengeOrVO = withServiceErrorHandling(
            this.updateChallengeOrVO.bind(this),
            {
                methodName: 'updateChallengeOrVO',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        this.deleteChallengeOrVO = withServiceErrorHandling(
            this.deleteChallengeOrVO.bind(this),
            {
                methodName: 'deleteChallengeOrVO',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        this.searchChallenges = withServiceErrorHandling(
            this.searchChallenges.bind(this),
            {
                methodName: 'searchChallenges',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        this.getChallengesByFocusAreaOrVO = withServiceErrorHandling(
            this.getChallengesByFocusAreaOrVO.bind(this),
            {
                methodName: 'getChallengesByFocusAreaOrVO',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        this.getAllChallenges = withServiceErrorHandling(
            this.getAllChallenges.bind(this),
            {
                methodName: 'getAllChallenges',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        // Also apply to helper methods that might need error handling
        this._invalidateChallengeRelatedCaches = withServiceErrorHandling(
            this._invalidateChallengeRelatedCaches.bind(this),
            {
                methodName: '_invalidateChallengeRelatedCaches',
                domainName: 'challenge',
                logger: this.logger,
                errorMapper: challengeServiceErrorMapper
            }
        );
        
        // Maintain backward compatibility with old method names
        this.getChallengeById = this.getChallengeByIdOrVO;
        this.getChallengesForUser = this.getChallengesForUserOrVO;
        this.getRecentChallengesForUser = this.getRecentChallengesForUserOrVO;
        this.updateChallenge = this.updateChallengeOrVO;
        this.deleteChallenge = this.deleteChallengeOrVO;
        this.getChallengesByFocusArea = this.getChallengesByFocusAreaOrVO;
        this.findById = this.getChallengeByIdOrVO;
        this.findRecentByUserEmail = this.getRecentChallengesForUserOrVO;
        this.findByUserEmail = this.getChallengesForUserOrVO;
        this.getChallengesByUserId = this.getChallengesByUserIdOrVO;
        this.getRecentChallengesByUserId = this.getRecentChallengesByUserIdOrVO;
    }
    /**
     * Get a challenge by ID
     * @param {string|ChallengeId} challengeIdOrVO - Challenge ID or ChallengeId value object
     * @returns {Promise<Challenge|null>} Challenge object or null if not found
     */
    getChallengeByIdOrVO(challengeIdOrVO) {
        // Convert to value object if needed using the standardized pattern
        const challengeIdVO = challengeIdOrVO instanceof ChallengeId 
            ? challengeIdOrVO 
            : createChallengeId(challengeIdOrVO);
            
        // Validate and throw domain-specific error
        if (!challengeIdVO) {
            throw new challengeErrors.ChallengeValidationError(`Invalid challenge ID: ${challengeIdOrVO}`);
        }
        
        const cacheKey = `${CACHE_KEYS.CHALLENGE_BY_ID}${challengeIdVO.value}`;
        return this.cacheService.getOrSet(cacheKey, () => {
            this.logger.debug(`Getting challenge by ID: ${challengeIdVO.value}`);
            // Pass the value object directly to the repository
            return this.repository.findById(challengeIdVO);
        });
    }
    /**
     * Get challenges for a specific user
     * @param {string|Email} emailOrEmailVO - User email or Email value object
     * @param {Object} options - Query options
     * @returns {Promise<Array<Object>>} List of challenges
     */
    async getChallengesForUserOrVO(emailOrEmailVO, options = {}) {
        // Convert to value object if needed
        const emailVO = emailOrEmailVO instanceof Email 
            ? emailOrEmailVO 
            : createEmail(emailOrEmailVO);
            
        if (!emailVO) {
            throw new challengeErrors.ChallengeValidationError(`Invalid email format: ${emailOrEmailVO}`);
        }
        
        // 1. Get User ID from Email using UserService
        if (!this.userService) {
            this.logger.error('UserService dependency missing, cannot perform email lookup.');
            throw new ConfigurationError('UserService is required for email-based challenge lookup');
        }
        
        let user = null;
        try {
            user = await this.userService.getUserByEmail(emailVO);
        } catch (error) {
             // Handle case where user service might throw (e.g., connection issues)
             this.logger.error('Error fetching user by email', { email: emailVO.value, error: error.message });
             // Depending on desired behavior, either re-throw or return empty
             // throw new ChallengeProcessingError(`Failed to lookup user: ${error.message}`, { cause: error });
             return []; // Return empty array if user lookup fails
        }
        
        if (!user) {
            this.logger.debug('User not found for email, returning empty challenge list', { email: emailVO.value });
            return []; // Return empty array if user doesn't exist
        }
        
        // 2. Use User ID to find challenges
        const userIdVO = createUserId(user.id); // Create UserId VO
        if (!userIdVO) {
            this.logger.error('Failed to create UserId Value Object from found user', { userId: user.id });
            return []; // Should not happen if user.id is valid
        }
        
        // Call the ID-based method
        return this.getChallengesByUserIdOrVO(userIdVO, options);
        
        /* --- Old Cache/Direct Repo Logic --- 
        const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortDir = 'desc' } = options;
        const cacheKey = `${CACHE_KEYS.CHALLENGES_BY_USER}${emailVO.value}:${limit}:${offset}:${status || 'all'}:${sortBy}:${sortDir}`;
        return cache.getOrSet(cacheKey, () => {
            this.logger.debug(`Getting challenges for user: ${emailVO.value}`, { options });
            // Pass the value object directly to the repository
            // DEPRECATED CALL: return this.repository.findByUserEmail(emailVO, { limit, offset, status, sortBy, sortDir });
            // This direct call should ideally be replaced by the userService lookup + findByUserId call above
            // For now, let's comment it out, assuming the new logic is preferred.
            return []; // Placeholder if keeping old logic structure but disabling direct call
        });
        */
    }
    /**
     * Get recent challenges for a user
     * @param {string|Email} emailOrEmailVO - User email or Email value object
     * @param {number} limit - Maximum number of challenges to return
     * @returns {Promise<Array<Challenge>>} List of recent challenges
     */
    async getRecentChallengesForUserOrVO(emailOrEmailVO, limit = 5) {
        // Convert to value object if needed
        const emailVO = emailOrEmailVO instanceof Email 
            ? emailOrEmailVO 
            : createEmail(emailOrEmailVO);
            
        if (!emailVO) {
            throw new challengeErrors.ChallengeValidationError(`Invalid email format: ${emailOrEmailVO}`);
        }

        // 1. Get User ID from Email using UserService
        if (!this.userService) {
            this.logger.error('UserService dependency missing, cannot perform email lookup.');
            throw new ConfigurationError('UserService is required for email-based challenge lookup');
        }
        
        let user = null;
        try {
            user = await this.userService.getUserByEmail(emailVO);
        } catch (error) {
             this.logger.error('Error fetching user by email', { email: emailVO.value, error: error.message });
             return []; // Return empty array if user lookup fails
        }
        
        if (!user) {
            this.logger.debug('User not found for email, returning empty recent challenge list', { email: emailVO.value });
            return []; // Return empty array if user doesn't exist
        }
        
        // 2. Use User ID to find recent challenges
        const userIdVO = createUserId(user.id); // Create UserId VO
        if (!userIdVO) {
            this.logger.error('Failed to create UserId Value Object from found user', { userId: user.id });
            return []; // Should not happen if user.id is valid
        }
        
        // Call the ID-based method
        return this.getRecentChallengesByUserIdOrVO(userIdVO, limit);

        /* --- Old Cache/Direct Repo Logic --- 
        const cacheKey = `${CACHE_KEYS.RECENT_CHALLENGES}${emailVO.value}:${limit}`;
        return cache.getOrSet(cacheKey, () => {
            this.logger.debug(`Getting recent challenges for user: ${emailVO.value}`, { limit });
            // Pass the value object directly to the repository
            // DEPRECATED CALL: return this.repository.findRecentByUserEmail(emailVO, limit);
            return []; // Placeholder
        });
        */
    }
    /**
     * Save a new challenge
     * @param {Object} challengeData - Challenge data
     * @returns {Promise<Object>} Saved challenge
     */
    async saveChallenge(challengeData) {
        this.logger.debug('Saving new challenge', { challengeData });
        // Generate UUID if not provided
        const challenge = {
            ...challengeData,
            id: challengeData.id || uuidv4(),
            createdAt: challengeData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const savedChallenge = await this.repository.save(challenge);
        // Invalidate relevant caches
        await this._invalidateChallengeRelatedCaches(savedChallenge);
        return savedChallenge;
    }
    /**
     * Update an existing challenge
     * @param {string|ChallengeId} challengeIdOrVO - Challenge ID or ChallengeId value object
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated challenge
     */
    async updateChallengeOrVO(challengeIdOrVO, updateData) {
        // Convert to value object if needed using the standardized pattern
        const challengeIdVO = challengeIdOrVO instanceof ChallengeId 
            ? challengeIdOrVO 
            : createChallengeId(challengeIdOrVO);
            
        // Validate and throw domain-specific error
        if (!challengeIdVO) {
            throw new challengeErrors.ChallengeValidationError(`Invalid challenge ID: ${challengeIdOrVO}`);
        }
        
        this.logger.debug(`Updating challenge: ${challengeIdVO.value}`);
        
        // Get existing challenge
        const existingChallenge = await this.repository.findById(challengeIdVO);
        if (!existingChallenge) {
            throw new challengeErrors.ChallengeNotFoundError(`Challenge not found with ID: ${challengeIdVO.value}`);
        }
        
        // Merge with existing data and update timestamp
        const challenge = {
            ...existingChallenge,
            ...updateData,
            updatedAt: new Date().toISOString()
        };
        
        const updatedChallenge = await this.repository.update(challengeIdVO, challenge);
        
        // Invalidate relevant caches
        await this._invalidateChallengeRelatedCaches(updatedChallenge);
        
        return updatedChallenge;
    }
    /**
     * Delete a challenge
     * @param {string|ChallengeId} challengeIdOrVO - Challenge ID or ChallengeId value object
     * @returns {Promise<boolean>} True if successfully deleted
     */
    async deleteChallengeOrVO(challengeIdOrVO) {
        // Convert to value object if needed using the standardized pattern
        const challengeIdVO = challengeIdOrVO instanceof ChallengeId 
            ? challengeIdOrVO 
            : createChallengeId(challengeIdOrVO);
            
        // Validate and throw domain-specific error
        if (!challengeIdVO) {
            throw new challengeErrors.ChallengeValidationError(`Invalid challenge ID: ${challengeIdOrVO}`);
        }
        
        this.logger.debug(`Deleting challenge: ${challengeIdVO.value}`);
        
        // Get challenge before deleting (for cache invalidation)
        const challenge = await this.repository.findById(challengeIdVO);
        if (!challenge) {
            throw new challengeErrors.ChallengeNotFoundError(`Challenge not found with ID: ${challengeIdVO.value}`);
        }
        
        const result = await this.repository.delete(challengeIdVO);
        
        // Invalidate relevant caches
        await this._invalidateChallengeRelatedCaches(challenge);
        
        return result;
    }
    /**
     * Search challenges with filters
     * @param {Object} filters - Search filters
     * @param {Object} options - Query options
     * @returns {Promise<Array<Object>>} List of matching challenges
     */
    searchChallenges(filters = {}, options = {}) {
        const { limit = 10, offset = 0, sortBy = 'createdAt', sortDir = 'desc' } = options;
        // Create a cache key that includes search parameters
        const filterKey = JSON.stringify(filters);
        const cacheKey = `${CACHE_KEYS.CHALLENGE_SEARCH}${filterKey}:${limit}:${offset}:${sortBy}:${sortDir}`;
        return this.cacheService.getOrSet(cacheKey, () => {
            this.logger.debug('Searching challenges', { filters, options });
            return this.repository.search(filters, { limit, offset, sortBy, sortDir });
        });
    }
    /**
     * Get challenges by focus area
     * @param {string|FocusArea} focusAreaOrVO - Focus area code or FocusArea value object
     * @param {Object} options - Query options
     * @returns {Promise<Array<Object>>} List of challenges
     */
    getChallengesByFocusAreaOrVO(focusAreaOrVO, options = {}) {
        // Convert to value object if needed using the standardized pattern
        const focusAreaVO = focusAreaOrVO instanceof FocusArea 
            ? focusAreaOrVO 
            : createFocusArea(focusAreaOrVO);
            
        // Validate and throw domain-specific error
        if (!focusAreaVO) {
            throw new challengeErrors.ChallengeValidationError(`Invalid focus area: ${focusAreaOrVO}`);
        }
        
        const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortDir = 'desc' } = options;
        
        // Create a cache key that includes all query parameters
        const cacheKey = `${CACHE_KEYS.CHALLENGES_BY_FOCUS_AREA}${focusAreaVO.value}:` +
            `${limit}:${offset}:${status || 'all'}:` +
            `${sortBy}:${sortDir}`;
            
        return this.cacheService.getOrSet(cacheKey, () => {
            this.logger.debug(`Getting challenges for focus area: ${focusAreaVO.value}`, { options });
            // Pass the value object directly to the repository
            return this.repository.findByFocusAreaId(focusAreaVO, { limit, offset, status, sortBy, sortDir });
        });
    }
    /**
     * Get all challenges with pagination
     * @param {Object} options - Query options
     * @returns {Promise<Array<Object>>} List of challenges
     */
    getAllChallenges(options = {}) {
        const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortDir = 'desc' } = options;
        // Create a cache key that includes all query parameters
        const cacheKey = `${CACHE_KEYS.CHALLENGE_LIST}${limit}:${offset}:${status || 'all'}:${sortBy}:${sortDir}`;
        return this.cacheService.getOrSet(cacheKey, () => {
            this.logger.debug('Getting all challenges', { options });
            return this.repository.findAll({ limit, offset, status, sortBy, sortDir });
        });
    }
    /**
     * Invalidate related challenge caches
     * @param {Object} challenge - Challenge object
     * @private
     */
    async _invalidateChallengeRelatedCaches(challenge) {
        try {
            // Use the cache invalidator for centralized cache invalidation
            await this.cacheInvalidator.invalidateChallengeCaches(challenge.id);
            // Additionally invalidate user-specific caches if userId is present
            if (challenge.userId) {
                await this.cacheInvalidator.invalidatePattern(`${CACHE_KEYS.CHALLENGES_BY_USER}${challenge.userId}:*`);
                await this.cacheInvalidator.invalidatePattern(`${CACHE_KEYS.RECENT_CHALLENGES}${challenge.userId}:*`);
            }
            // Invalidate focus area related caches if focusAreaId is present
            if (challenge.focusAreaId) {
                await this.cacheInvalidator.invalidatePattern(`${CACHE_KEYS.CHALLENGES_BY_FOCUS_AREA}${challenge.focusAreaId}:*`);
            }
            this.logger.debug(`Invalidated caches for challenge: ${challenge.id}`);
        }
        catch (error) {
            this.logger.error(`Error invalidating challenge caches: ${error.message}`, {
                error,
                challengeId: challenge.id
            });
        }
    }
    /**
     * Get challenges by user ID
     * @param {string|UserId} userIdOrUserIdVO - User ID or UserId value object
     * @param {Object} options - Query options
     * @returns {Promise<Array<Challenge>>} List of challenges
     */
    async getChallengesByUserIdOrVO(userIdOrUserIdVO, options = {}) {
        // Convert to value object if needed using the standardized pattern
        const userIdVO = userIdOrUserIdVO instanceof UserId 
            ? userIdOrUserIdVO 
            : createUserId(userIdOrUserIdVO);
            
        // Validate and throw domain-specific error
        if (!userIdVO) {
            throw new challengeErrors.ChallengeValidationError(`Invalid user ID: ${userIdOrUserIdVO}`);
        }
        
        const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortDir = 'desc' } = options;
        
        // Create a cache key that includes all query parameters
        const cacheKey = `${CACHE_KEYS.CHALLENGES_BY_USER_ID}${userIdVO.value}:${limit}:${offset}:${status || 'all'}:${sortBy}:${sortDir}`;
        
        return this.cacheService.getOrSet(cacheKey, () => {
            this.logger.debug(`Getting challenges for user ID: ${userIdVO.value}`, { options });
            // Pass the value object directly to the repository
            return this.repository.findByUserId(userIdVO, { limit, offset, status, sortBy, sortDir });
        });
    }
    /**
     * Get recent challenges by user ID
     * @param {string|UserId} userIdOrUserIdVO - User ID or UserId value object
     * @param {number} limit - Maximum number of challenges to return
     * @returns {Promise<Array<Challenge>>} List of recent challenges
     */
    async getRecentChallengesByUserIdOrVO(userIdOrUserIdVO, limit = 5) {
        // Convert to value object if needed using the standardized pattern
        const userIdVO = userIdOrUserIdVO instanceof UserId 
            ? userIdOrUserIdVO 
            : createUserId(userIdOrUserIdVO);
            
        // Validate and throw domain-specific error
        if (!userIdVO) {
            throw new challengeErrors.ChallengeValidationError(`Invalid user ID: ${userIdOrUserIdVO}`);
        }
        
        const cacheKey = `${CACHE_KEYS.RECENT_CHALLENGES_BY_USER_ID}${userIdVO.value}:${limit}`;
        
        return this.cacheService.getOrSet(cacheKey, () => {
            this.logger.debug(`Getting recent challenges for user ID: ${userIdVO.value}`, { limit });
            // Pass the value object directly to the repository
            return this.repository.findRecentByUserId(userIdVO, limit);
        });
    }
}
// Remove the singleton instantiation to avoid conflicts with the DI container
export { ChallengeService };
export default ChallengeService;
