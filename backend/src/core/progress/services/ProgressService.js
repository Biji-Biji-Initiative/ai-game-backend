import { createErrorMapper, withServiceErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { ProgressError } from "#app/core/progress/errors/progressErrors.js";
import ConfigurationError from "#app/core/infra/errors/ConfigurationError.js";
import { ProgressValidationError } from "#app/core/progress/errors/progressErrors.js";
'use strict';
/**
 * Service for handling progress-related operations
 */
class ProgressService {
    /**
     * Create a new ProgressService
     * @param {Object} dependencies - Service dependencies
     * @param {Object} dependencies.progressRepository - Repository for progress data
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.cacheService - Optional cache service
     */
    constructor(dependencies = {}) {
        const { progressRepository, logger, cacheService } = dependencies;
        
        if (!progressRepository) {
            if (process.env.NODE_ENV === 'production') {
                throw new ConfigurationError('progressRepository is required for ProgressService in production mode', {
                    serviceName: 'ProgressService',
                    dependencyName: 'progressRepository'
                });
            } else {
                throw new Error('progressRepository is required for ProgressService');
            }
        }
        
        this.progressRepository = progressRepository;
        this.logger = logger || console;
        this.cache = cacheService;
        // Create error mapper for standardized error handling
        const errorMapper = createErrorMapper({
            'Error': ProgressError
        }, ProgressError);
        // Apply standardized error handling to methods
        this.getProgress = withServiceErrorHandling(this.getProgress.bind(this), { methodName: 'getProgress', domainName: 'progress', logger: this.logger, errorMapper });
        this.getOrCreateProgress = withServiceErrorHandling(this.getOrCreateProgress.bind(this), { methodName: 'getOrCreateProgress', domainName: 'progress', logger: this.logger, errorMapper });
        this.recordChallengeCompletion = withServiceErrorHandling(this.recordChallengeCompletion.bind(this), { methodName: 'recordChallengeCompletion', domainName: 'progress', logger: this.logger, errorMapper });
        this.updateSkillLevels = withServiceErrorHandling(this.updateSkillLevels.bind(this), { methodName: 'updateSkillLevels', domainName: 'progress', logger: this.logger, errorMapper });
    }
    /**
     * Get user progress data
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User progress data
     */
    async getProgress(userId) {
        if (!userId) {
            throw new ProgressValidationError('User ID is required to get progress');
        }
        // Check cache first if available
        if (this.cache) {
            const cacheKey = `progress:${userId}`;
            const cachedProgress = await this.cache.get(cacheKey);
            if (cachedProgress) {
                this.logger.debug('Retrieved progress from cache', { userId });
                return cachedProgress;
            }
        }
        const progress = await this.progressRepository.findByUserId(userId);
        // Cache result if cache service is available
        if (progress && this.cache) {
            const cacheKey = `progress:${userId}`;
            await this.cache.set(cacheKey, progress, 300); // Cache for 5 minutes
        }
        return progress;
    }
    /**
     * Get or create user progress
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User progress data
     */
    async getOrCreateProgress(userId) {
        if (!userId) {
            throw new ProgressValidationError('User ID is required to get or create progress');
        }
        let progress = await this.getProgress(userId);
        if (!progress) {
            this.logger.info('Creating new progress record for user', { userId });
            // Create a new progress record
            const newProgress = {
                userId,
                completedChallenges: 0,
                skillLevels: {},
                challengeHistory: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            progress = await this.progressRepository.create(newProgress);
            // Cache if available
            if (this.cache) {
                const cacheKey = `progress:${userId}`;
                await this.cache.set(cacheKey, progress, 300); // Cache for 5 minutes
            }
        }
        return progress;
    }
    /**
     * Record a challenge completion for a user
     * @param {string} userId - User ID
     * @param {string} challengeId - Challenge ID
     * @param {number} score - Score (0-100)
     * @param {number} completionTime - Time to complete in seconds
     * @param {Object} evaluationData - Evaluation data
     * @returns {Promise<Object>} Updated progress
     */
    async recordChallengeCompletion(userId, challengeId, score, completionTime, evaluationData = {}) {
        if (!userId) {
            throw new ProgressValidationError('User ID is required');
        }
        if (!challengeId) {
            throw new ProgressValidationError('Challenge ID is required');
        }
        if (typeof score !== 'number' || score < 0 || score > 100) {
            throw new ProgressValidationError('Score must be a number between 0 and 100');
        }
        // Get user progress
        const progress = await this.getOrCreateProgress(userId);
        // Record the challenge completion
        progress.recordChallengeCompletion(challengeId, score, completionTime, evaluationData);
        // Save updated progress
        const updatedProgress = await this.progressRepository.save(progress);
        this.logger.info('Recorded challenge completion', {
            userId,
            challengeId,
            score
        });
        // Invalidate cache if using caching
        if (this.cache) {
            this.invalidateProgressCache(userId);
        }
        return updatedProgress;
    }
    /**
     * Update skill levels for a user
     * @param {string} userId - User ID
     * @param {Object} skillLevels - Skill levels to update
     * @returns {Promise<Object>} Updated progress record
     */
    async updateSkillLevels(userId, skillLevels) {
        if (!userId) {
            throw new ProgressValidationError('User ID is required');
        }
        if (!skillLevels || typeof skillLevels !== 'object') {
            throw new ProgressValidationError('Skill levels must be provided as an object');
        }
        // Get user progress
        const progress = await this.getOrCreateProgress(userId);
        // Update the skill levels
        Object.entries(skillLevels).forEach(([skill, level]) => {
            if (typeof level === 'number' && level >= 0 && level <= 100) {
                progress.updateSkillLevel(skill, level);
            }
            else {
                this.logger.warn('Invalid skill level ignored', { skill, level });
            }
        });
        // Save updated progress
        const updatedProgress = await this.progressRepository.save(progress);
        this.logger.info('Updated skill levels', {
            userId,
            skillCount: Object.keys(skillLevels).length
        });
        // Invalidate cache if using caching
        if (this.cache) {
            this.invalidateProgressCache(userId);
        }
        return updatedProgress;
    }
    /**
     * Invalidate progress cache for a user
     * @param {string} userId - User ID
     * @private
     */
    invalidateProgressCache(userId) {
        if (!this.cache || !userId) {
            return;
        }
        const cacheKey = `progress:${userId}`;
        this.cache.delete(cacheKey);
        this.logger.debug('Invalidated progress cache', { userId });
    }
    /**
     * Get progress records for multiple users at once
     * Uses batch loading to prevent N+1 query issues
     * 
     * @param {Array<string>} userIds - Array of user IDs
     * @param {Object} options - Query options
     * @param {Array<string>} [options.include] - Related entities to include (e.g., ['challenge', 'user'])
     * @returns {Promise<Object>} Map of user IDs to progress records
     */
    async getProgressForUsers(userIds, options = {}) {
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return {};
        }
        
        this.logger.debug('Getting progress for multiple users', { 
            count: userIds.length, 
            userIds: userIds.length <= 5 ? userIds : `${userIds.length} users`
        });
        
        // Check cache first if available
        const result = {};
        const uncachedIds = [];
        
        if (this.cache) {
            // Try to get progress from cache for each user
            for (const userId of userIds) {
                const cacheKey = `progress:${userId}`;
                const cachedProgress = await this.cache.get(cacheKey);
                
                if (cachedProgress) {
                    result[userId] = cachedProgress;
                } else {
                    uncachedIds.push(userId);
                }
            }
        } else {
            // No cache, all IDs need to be fetched
            uncachedIds.push(...userIds);
        }
        
        // If all results were found in cache, return immediately
        if (uncachedIds.length === 0) {
            return result;
        }
        
        // Fetch all progress records for uncached users in a single query
        try {
            const progressRecords = [];
            
            // First try to find existing progress records
            const existingProgress = await this.progressRepository.findByUserIds(uncachedIds, options);
            progressRecords.push(...existingProgress);
            
            // Map results by user ID for easy lookup
            for (const progress of progressRecords) {
                result[progress.userId] = progress;
                
                // Cache if available
                if (this.cache) {
                    const cacheKey = `progress:${progress.userId}`;
                    await this.cache.set(cacheKey, progress, 300); // Cache for 5 minutes
                }
            }
            
            return result;
        } catch (error) {
            this.logger.error('Error fetching progress for multiple users', {
                error: error.message,
                stack: error.stack,
                userCount: uncachedIds.length
            });
            throw error;
        }
    }
    
    /**
     * Get user progress with related challenge data
     * Uses eager loading to prevent N+1 query issues
     * 
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User progress data with related challenges
     */
    async getProgressWithChallenges(userId) {
        if (!userId) {
            throw new ProgressValidationError('User ID is required to get progress with challenges');
        }
        
        // Check cache first if available
        if (this.cache) {
            const cacheKey = `progress:withChallenges:${userId}`;
            const cachedResult = await this.cache.get(cacheKey);
            if (cachedResult) {
                this.logger.debug('Retrieved progress with challenges from cache', { userId });
                return cachedResult;
            }
        }
        
        // Get progress with eager loading of challenges
        const progress = await this.progressRepository.findByUserId(userId, {
            include: ['challenge'] // Use eager loading option to prevent N+1 query
        });
        
        // Cache result if cache service is available
        if (progress && this.cache) {
            const cacheKey = `progress:withChallenges:${userId}`;
            await this.cache.set(cacheKey, progress, 300); // Cache for 5 minutes
        }
        
        return progress;
    }
}
export default ProgressService;
