import { createErrorMapper, withServiceErrorHandling } from "../../infra/errors/errorStandardization.js";
import { ProgressError } from "../errors/progressErrors.js";
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
            throw new Error('progressRepository is required for ProgressService');
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
            throw new Error('User ID is required to get progress');
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
            throw new Error('User ID is required to get or create progress');
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
            throw new Error('User ID is required');
        }
        if (!challengeId) {
            throw new Error('Challenge ID is required');
        }
        if (typeof score !== 'number' || score < 0 || score > 100) {
            throw new Error('Score must be a number between 0 and 100');
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
            throw new Error('User ID is required');
        }
        if (!skillLevels || typeof skillLevels !== 'object') {
            throw new Error('Skill levels must be provided as an object');
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
}
export default ProgressService;
