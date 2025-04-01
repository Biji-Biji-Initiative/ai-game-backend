import { createErrorMapper, withServiceErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { AdaptiveError } from "#app/core/adaptive/errors/adaptiveErrors.js";
import { v4 as uuidv4 } from "uuid";
/**
 * Service for handling adaptive learning operations
 */
class AdaptiveService {
    /**
     * Constructor
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.adaptiveRepository - Repository for adaptive data
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.cacheService - Cache service for optimizing data access
     */
    constructor(dependencies = {}) {
        const { adaptiveRepository, logger, cacheService } = dependencies;
        this.repository = adaptiveRepository;
        this.logger = logger || console;
        this.cache = cacheService;
        // Create error mapper for adaptive service
        const errorMapper = createErrorMapper({
            Error: AdaptiveError
        }, AdaptiveError);
        // Apply standardized error handling to methods
        this.getRecommendations = withServiceErrorHandling(this.getRecommendations.bind(this), { methodName: 'getRecommendations', domainName: 'adaptive', logger: this.logger, errorMapper });
        this.generateChallenge = withServiceErrorHandling(this.generateChallenge.bind(this), { methodName: 'generateChallenge', domainName: 'adaptive', logger: this.logger, errorMapper });
        this.adjustDifficulty = withServiceErrorHandling(this.adjustDifficulty.bind(this), { methodName: 'adjustDifficulty', domainName: 'adaptive', logger: this.logger, errorMapper });
        this.calculateDifficulty = withServiceErrorHandling(this.calculateDifficulty.bind(this), { methodName: 'calculateDifficulty', domainName: 'adaptive', logger: this.logger, errorMapper });
        this.invalidateUserCaches = withServiceErrorHandling(this.invalidateUserCaches.bind(this), { methodName: 'invalidateUserCaches', domainName: 'adaptive', logger: this.logger, errorMapper });
    }
    /**
     * Get personalized recommendations for a user
     * @param {string} userId - User ID
     * @param {Object} options - Additional options
     * @returns {Promise<Array>} Array of recommendations
     */
    getRecommendations(userId, options = {}) {
        if (!userId) {
            throw new Error('User ID is required for recommendations');
        }
        this.logger.info('Getting personalized recommendations', { userId });
        // Cache key if caching is enabled
        if (this.cache) {
            const cacheKey = `recommendations:user:${userId}:${JSON.stringify(options)}`;
            return this.cache.getOrSet(cacheKey, () => {
                return this.generateRecommendations(userId, options);
            }, 300); // Cache for 5 minutes
        }
        return this.generateRecommendations(userId, options);
    }
    /**
     * Helper method to generate recommendations
     * @param {string} _userId - User ID
     * @param {Object} _options - Options
     * @returns {Promise<Array>} Array of recommendations
     * @private
     */
    generateRecommendations(_userId, _options) {
        // Basic implementation - would normally fetch data from repository
        // and run recommendation algorithms
        return [
            {
                type: 'challenge',
                id: 'sample-challenge-1',
                title: 'Creative Problem Solving',
                relevance: 0.95,
                reason: 'Matches your learning goals'
            },
            {
                type: 'focus-area',
                id: 'ai-ethics',
                title: 'AI Ethics',
                relevance: 0.8,
                reason: 'Complements your current progress'
            }
        ];
    }
    /**
     * Generate a personalized challenge
     * @param {string} userId - User ID
     * @param {Object} options - Challenge generation options
     * @returns {Promise<Object>} Generated challenge
     */
    generateChallenge(userId, options = {}) {
        if (!userId) {
            throw new Error('User ID is required for challenge generation');
        }
        this.logger.info('Generating personalized challenge', { userId, options });
        // Placeholder - would integrate with challengeCoordinator in practice
        return {
            id: uuidv4(),
            title: 'Personalized Challenge',
            difficulty: options.difficulty || 'intermediate',
            focusArea: options.focusArea || 'ai-ethics',
            status: 'generated'
        };
    }
    /**
     * Adjust difficulty based on user performance
     * @param {string} userId - User ID
     * @param {Object} performanceData - User performance data
     * @returns {Promise<Object>} Updated difficulty settings
     */
    adjustDifficulty(userId, performanceData) {
        if (!userId) {
            throw new Error('User ID is required for difficulty adjustment');
        }
        if (!performanceData || typeof performanceData !== 'object') {
            throw new Error('Performance data is required and must be an object');
        }
        this.logger.info('Adjusting difficulty', { userId, performanceData });
        // Simple placeholder implementation
        const currentLevel = performanceData.currentLevel || 'intermediate';
        const score = performanceData.score || 75;
        let newLevel = currentLevel;
        if (score > 90) {
            newLevel = 'advanced';
        }
        else if (score < 50) {
            newLevel = 'beginner';
        }
        const result = {
            previousLevel: currentLevel,
            newLevel,
            adjustmentReason: `Performance score: ${score}`
        };
        // Update cache if caching is enabled
        if (this.cache) {
            const cacheKey = `user:${userId}:difficulty`;
            this.cache.set(cacheKey, result, 1800); // 30 minutes
        }
        return result;
    }
    /**
     * Calculate optimal difficulty level for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Optimal difficulty settings
     */
    calculateDifficulty(userId) {
        if (!userId) {
            throw new Error('User ID is required for difficulty calculation');
        }
        this.logger.info('Calculating optimal difficulty', { userId });
        // Use cache if available
        if (this.cache) {
            const cacheKey = `user:${userId}:optimalDifficulty`;
            return this.cache.getOrSet(cacheKey, () => {
                // Placeholder implementation
                return {
                    level: 'intermediate',
                    customSettings: {
                        contextComplexity: 0.6,
                        questionCount: 2
                    }
                };
            }, 1800); // Cache for 30 minutes
        }
        // Placeholder implementation
        return {
            level: 'intermediate',
            customSettings: {
                contextComplexity: 0.6,
                questionCount: 2
            }
        };
    }
    /**
     * Invalidate all adaptive caches for a user
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    invalidateUserCaches(userId) {
        if (!userId || !this.cache) {
            return;
        }
        try {
            // Get all keys for this user
            const userKeys = this.cache.keys(`user:${userId}`);
            const recommendationKeys = this.cache.keys(`recommendations:user:${userId}`);
            // Delete all matching keys
            [...userKeys, ...recommendationKeys].forEach(key => {
                this.cache.delete(key);
            });
            this.logger.debug(`Invalidated ${userKeys.length + recommendationKeys.length} adaptive cache entries for user`, {
                userId
            });
        }
        catch (error) {
            this.logger.warn('Error invalidating adaptive caches', {
                error: error.message,
                userId
            });
            // Don't rethrow - this is a non-critical operation
        }
    }
}
export default AdaptiveService;
