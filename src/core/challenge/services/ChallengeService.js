import { v4 as uuidv4 } from "uuid";
import { getCacheService, getCacheInvalidationManager } from "../../infra/cache/cacheFactory.js";
import { withServiceErrorHandling, createErrorMapper } from "../../infra/errors/errorStandardization.js";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError, ChallengeProcessingError } from "../errors/ChallengeErrors.js";
import challengeErrors from "../errors/ChallengeErrors.js";
import { Email, ChallengeId, FocusArea, createEmail, createChallengeId, createFocusArea } from "../../common/valueObjects/index.js";
'use strict';

const { ValidationError } = challengeErrors;
// Create error mapper for service
const challengeServiceErrorMapper = createErrorMapper({
    'ValidationError': ValidationError,
    'ChallengeNotFoundError': ChallengeNotFoundError,
    'ChallengeValidationError': ChallengeValidationError,
    'ChallengeProcessingError': ChallengeProcessingError,
    'Error': ChallengeError
}, ChallengeError);
// Get cache services
const cache = getCacheService();
const cacheInvalidator = getCacheInvalidationManager();
// Cache key prefixes
const CACHE_KEYS = {
    CHALLENGE_BY_ID: 'challenge:byId:',
    CHALLENGES_BY_USER: 'challenge:byUser:',
    RECENT_CHALLENGES: 'challenge:recent:',
    CHALLENGES_BY_FOCUS_AREA: 'challenge:byFocusArea:',
    CHALLENGE_SEARCH: 'challenge:search:',
    CHALLENGE_LIST: 'challenge:list:'
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
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(dependencies = {}) {
        const { challengeRepository, logger } = dependencies;
        
        // In any environment, try to use provided dependencies but fall back to mocks if needed
        this.repository = challengeRepository || {
            findById: () => Promise.resolve(null),
            findByUserEmail: () => Promise.resolve([]),
            findAll: () => Promise.resolve([]),
            save: (challenge) => Promise.resolve(challenge),
            update: (challenge) => Promise.resolve(challenge),
            delete: () => Promise.resolve(true)
        };
        
        this.logger = logger || console;
        
        if (process.env.NODE_ENV === 'production') {
            if (!challengeRepository) {
                console.warn('WARNING: ChallengeService running in production mode with mock repository. This is not recommended.');
            } else {
                console.log('ChallengeService initialized in production mode with real repository');
            }
        } else {
            console.log('ChallengeService running in development mode with ' + 
                (challengeRepository ? 'real' : 'mock') + ' repository');
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
            throw new ChallengeValidationError(`Invalid challenge ID: ${challengeIdOrVO}`);
        }
        
        const cacheKey = `${CACHE_KEYS.CHALLENGE_BY_ID}${challengeIdVO.value}`;
        return cache.getOrSet(cacheKey, () => {
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
    getChallengesForUserOrVO(emailOrEmailVO, options = {}) {
        // Convert to value object if needed using the standardized pattern
        const emailVO = emailOrEmailVO instanceof Email 
            ? emailOrEmailVO 
            : createEmail(emailOrEmailVO);
            
        // Validate and throw domain-specific error
        if (!emailVO) {
            throw new ChallengeValidationError(`Invalid email format: ${emailOrEmailVO}`);
        }
        
        const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortDir = 'desc' } = options;
        
        // Create a cache key that includes all query parameters
        const cacheKey = `${CACHE_KEYS.CHALLENGES_BY_USER}${emailVO.value}:${limit}:${offset}:${status || 'all'}:${sortBy}:${sortDir}`;
        
        return cache.getOrSet(cacheKey, () => {
            this.logger.debug(`Getting challenges for user: ${emailVO.value}`, { options });
            // Pass the value object directly to the repository
            return this.repository.findByUserEmail(emailVO, { limit, offset, status, sortBy, sortDir });
        });
    }
    /**
     * Get recent challenges for a user
     * @param {string|Email} emailOrEmailVO - User email or Email value object
     * @param {number} limit - Maximum number of challenges to return
     * @returns {Promise<Array<Challenge>>} List of recent challenges
     */
    getRecentChallengesForUserOrVO(emailOrEmailVO, limit = 5) {
        // Convert to value object if needed using the standardized pattern
        const emailVO = emailOrEmailVO instanceof Email 
            ? emailOrEmailVO 
            : createEmail(emailOrEmailVO);
            
        // Validate and throw domain-specific error
        if (!emailVO) {
            throw new ChallengeValidationError(`Invalid email format: ${emailOrEmailVO}`);
        }
        
        const cacheKey = `${CACHE_KEYS.RECENT_CHALLENGES}${emailVO.value}:${limit}`;
        
        return cache.getOrSet(cacheKey, () => {
            this.logger.debug(`Getting recent challenges for user: ${emailVO.value}`, { limit });
            // Pass the value object directly to the repository
            return this.repository.findRecentByUserEmail(emailVO, limit);
        });
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
            throw new ChallengeValidationError(`Invalid challenge ID: ${challengeIdOrVO}`);
        }
        
        this.logger.debug(`Updating challenge: ${challengeIdVO.value}`);
        
        // Get existing challenge
        const existingChallenge = await this.repository.findById(challengeIdVO);
        if (!existingChallenge) {
            throw new ChallengeNotFoundError(`Challenge not found with ID: ${challengeIdVO.value}`);
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
            throw new ChallengeValidationError(`Invalid challenge ID: ${challengeIdOrVO}`);
        }
        
        this.logger.debug(`Deleting challenge: ${challengeIdVO.value}`);
        
        // Get challenge before deleting (for cache invalidation)
        const challenge = await this.repository.findById(challengeIdVO);
        if (!challenge) {
            throw new ChallengeNotFoundError(`Challenge not found with ID: ${challengeIdVO.value}`);
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
        return cache.getOrSet(cacheKey, () => {
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
            throw new ChallengeValidationError(`Invalid focus area: ${focusAreaOrVO}`);
        }
        
        const { limit = 10, offset = 0, status, sortBy = 'createdAt', sortDir = 'desc' } = options;
        
        // Create a cache key that includes all query parameters
        const cacheKey = `${CACHE_KEYS.CHALLENGES_BY_FOCUS_AREA}${focusAreaVO.value}:` +
            `${limit}:${offset}:${status || 'all'}:` +
            `${sortBy}:${sortDir}`;
            
        return cache.getOrSet(cacheKey, () => {
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
        return cache.getOrSet(cacheKey, () => {
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
            await cacheInvalidator.invalidateChallengeCaches(challenge.id);
            // Additionally invalidate user-specific caches if userId is present
            if (challenge.userId) {
                await cacheInvalidator.invalidatePattern(`${CACHE_KEYS.CHALLENGES_BY_USER}${challenge.userId}:*`);
                await cacheInvalidator.invalidatePattern(`${CACHE_KEYS.RECENT_CHALLENGES}${challenge.userId}:*`);
            }
            // Invalidate focus area related caches if focusAreaId is present
            if (challenge.focusAreaId) {
                await cacheInvalidator.invalidatePattern(`${CACHE_KEYS.CHALLENGES_BY_FOCUS_AREA}${challenge.focusAreaId}:*`);
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
}
// Create instance with repository and export it
const challengeService = new ChallengeService();
export { ChallengeService };
export { challengeService };
export default {
    ChallengeService,
    challengeService
};
