'use strict';
/**
 * Personality Data Loader
 *
 * This service provides cached access to personality data, reducing database load
 * and improving performance for frequently accessed personality information.
 * It acts as a caching layer between the coordinator and the repository.
 */
// Cache TTL constants
const CACHE_TTL = {
    PERSONALITY_BY_USER: 900, // 15 minutes
    AI_ATTITUDES: 1800, // 30 minutes
    TRAITS: 1800, // 30 minutes
    INSIGHTS: 1200 // 20 minutes
};
/**
 * Service for loading and caching personality data
 */
class PersonalityDataLoader {
    /**
     * Create a new PersonalityDataLoader
     * @param {Object} dependencies - Injected dependencies
     * @param {Object} dependencies.personalityRepository - Repository for personality data
     * @param {Object} dependencies.cacheService - Cache service for storing personality data
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor(dependencies) {
        if (!dependencies.personalityRepository) {
            throw new Error('personalityRepository is required for PersonalityDataLoader');
        }
        if (!dependencies.cacheService) {
            throw new Error('cacheService is required for PersonalityDataLoader');
        }
        this.personalityRepository = dependencies.personalityRepository;
        this.cache = dependencies.cacheService;
        this.logger = dependencies.logger;
        if (!this.logger) {
            throw new Error('logger is required for PersonalityDataLoader');
        }
    }
    /**
     * Get personality by user ID, with caching
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Personality object or null if not found
     */
    async getPersonalityByUserId(userId) {
        if (!userId) {
            this.logger.warn('No userId provided to getPersonalityByUserId');
            return null;
        }
        try {
            const cacheKey = `personality:byUser:${userId}`;
            // Try to get from cache first
            const cachedData = await this.cache.get(cacheKey);
            if (cachedData) {
                this.logger.debug('Retrieved personality from cache', { userId });
                return JSON.parse(cachedData);
            }
            // If not in cache, get from repository
            this.logger.debug('Getting personality from repository', { userId });
            const personality = await this.personalityRepository.findByUserId(userId);
            if (personality) {
                // Cache the result
                await this.cache.set(cacheKey, JSON.stringify(personality), CACHE_TTL.PERSONALITY_BY_USER);
                this.logger.debug('Cached personality data', { userId });
            }
            else {
                this.logger.debug('No personality data found for user', { userId });
            }
            return personality;
        }
        catch (error) {
            this.logger.error('Error loading personality data', {
                userId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    /**
     * Get AI attitudes for a user, with caching
     * @param {string} userId - User ID
     * @returns {Promise<Object>} AI attitudes or empty object if not found
     */
    async getAiAttitudes(userId) {
        if (!userId) {
            this.logger.warn('No userId provided to getAiAttitudes');
            return {};
        }
        try {
            const cacheKey = `personality:attitudes:${userId}`;
            // Try to get from cache first
            const cachedData = await this.cache.get(cacheKey);
            if (cachedData) {
                this.logger.debug('Retrieved AI attitudes from cache', { userId });
                return JSON.parse(cachedData);
            }
            // If not in cache, get from repository
            const personality = await this.getPersonalityByUserId(userId);
            const attitudes = personality ? personality.aiAttitudes : {};
            // Cache the result
            await this.cache.set(cacheKey, JSON.stringify(attitudes), CACHE_TTL.AI_ATTITUDES);
            this.logger.debug('Cached AI attitudes', { userId });
            return attitudes;
        }
        catch (error) {
            this.logger.error('Error loading AI attitudes', {
                userId,
                error: error.message,
                stack: error.stack
            });
            return {};
        }
    }
    /**
     * Get personality traits for a user, with caching
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Personality traits or empty object if not found
     */
    async getPersonalityTraits(userId) {
        if (!userId) {
            this.logger.warn('No userId provided to getPersonalityTraits');
            return {};
        }
        try {
            const cacheKey = `personality:traits:${userId}`;
            // Try to get from cache first
            const cachedData = await this.cache.get(cacheKey);
            if (cachedData) {
                this.logger.debug('Retrieved personality traits from cache', { userId });
                return JSON.parse(cachedData);
            }
            // If not in cache, get from repository
            const personality = await this.getPersonalityByUserId(userId);
            const traits = personality ? personality.personalityTraits : {};
            // Cache the result
            await this.cache.set(cacheKey, JSON.stringify(traits), CACHE_TTL.TRAITS);
            this.logger.debug('Cached personality traits', { userId });
            return traits;
        }
        catch (error) {
            this.logger.error('Error loading personality traits', {
                userId,
                error: error.message,
                stack: error.stack
            });
            return {};
        }
    }
    /**
     * Invalidate all cached data for a user
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} True if successful, false otherwise
     */
    async invalidateUserData(userId) {
        if (!userId) {
            this.logger.warn('No userId provided to invalidateUserData');
            return false;
        }
        try {
            const keys = [
                `personality:byUser:${userId}`,
                `personality:attitudes:${userId}`,
                `personality:traits:${userId}`
            ];
            for (const key of keys) {
                await this.cache.del(key);
            }
            this.logger.debug('Invalidated personality cache for user', { userId });
            return true;
        }
        catch (error) {
            this.logger.error('Error invalidating personality cache', {
                userId,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }
}
export default PersonalityDataLoader;
