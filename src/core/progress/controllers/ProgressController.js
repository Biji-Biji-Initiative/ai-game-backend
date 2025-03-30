import { withControllerErrorHandling } from "../../infra/errors/errorStandardization.js";
import { ProgressError, ProgressNotFoundError, ProgressValidationError, ProgressProcessingError } from "../../progress/errors/progressErrors.js";
import { ProgressDTOMapper } from "../../progress/dtos/ProgressDTO.js";
import { 
    UserId, 
    ChallengeId, 
    FocusArea, 
    createUserId, 
    createChallengeId, 
    createFocusArea
} from "../../common/valueObjects/index.js";
'use strict';
// Error mappings for controllers
const progressControllerErrorMappings = [
    { errorClass: ProgressNotFoundError, statusCode: 404 },
    { errorClass: ProgressValidationError, statusCode: 400 },
    { errorClass: ProgressProcessingError, statusCode: 500 },
    { errorClass: ProgressError, statusCode: 500 },
];
/**
 * Progress Controller
 *
 * Handles HTTP requests related to user progress operations.
 */
class ProgressController {
    /**
     * Create a new ProgressController
     * @param {Object} dependencies - Dependencies
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.progressService - Progress service
     */
    constructor(dependencies = {}) {
        const { logger, progressService } = dependencies;
        this.logger = logger;
        this.progressService = progressService;
        
        // Flag to indicate if controller is properly initialized
        this._hasInitialized = !!progressService;
        
        // Apply error handling to controller methods
        this.getUserProgress = withControllerErrorHandling(
            this.getUserProgress.bind(this), 
            {
                methodName: 'getUserProgress',
                domainName: 'progress',
                logger: this.logger,
                errorMappings: progressControllerErrorMappings
            }
        );
        
        this.recordChallengeCompletion = withControllerErrorHandling(
            this.recordChallengeCompletion.bind(this), 
            {
                methodName: 'recordChallengeCompletion',
                domainName: 'progress',
                logger: this.logger,
                errorMappings: progressControllerErrorMappings
            }
        );
        
        this.getChallengeProgress = withControllerErrorHandling(
            this.getChallengeProgress.bind(this), 
            {
                methodName: 'getChallengeProgress',
                domainName: 'progress',
                logger: this.logger,
                errorMappings: progressControllerErrorMappings
            }
        );
        
        this.updateSkillLevels = withControllerErrorHandling(
            this.updateSkillLevels.bind(this), 
            {
                methodName: 'updateSkillLevels',
                domainName: 'progress',
                logger: this.logger,
                errorMappings: progressControllerErrorMappings
            }
        );
        
        this.setFocusArea = withControllerErrorHandling(
            this.setFocusArea.bind(this), 
            {
                methodName: 'setFocusArea',
                domainName: 'progress',
                logger: this.logger,
                errorMappings: progressControllerErrorMappings
            }
        );
        
        this.getAllUserProgress = withControllerErrorHandling(
            this.getAllUserProgress.bind(this), 
            {
                methodName: 'getAllUserProgress',
                domainName: 'progress',
                logger: this.logger,
                errorMappings: progressControllerErrorMappings
            }
        );
        
        // Add methods that were previously in the wrapper
        this.recordProgress = withControllerErrorHandling(
            this.recordProgress.bind(this),
            {
                methodName: 'recordProgress',
                domainName: 'progress',
                logger: this.logger,
                errorMappings: progressControllerErrorMappings
            }
        );
        
        this.getUserSkills = withControllerErrorHandling(
            this.getUserSkills.bind(this),
            {
                methodName: 'getUserSkills',
                domainName: 'progress',
                logger: this.logger,
                errorMappings: progressControllerErrorMappings
            }
        );
        
        this.getProgressStats = withControllerErrorHandling(
            this.getProgressStats.bind(this),
            {
                methodName: 'getProgressStats',
                domainName: 'progress',
                logger: this.logger,
                errorMappings: progressControllerErrorMappings
            }
        );
    }
    /**
     * Get the current user's progress
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async getUserProgress(req, res) {
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Create UserId Value Object from primitive
        const userIdVO = createUserId(req.user.id);
        if (!userIdVO) {
            throw new ProgressValidationError(`Invalid user ID format: ${req.user.id}`);
        }
        
        // Get overall progress using Value Object
        const progress = await this.progressService.calculateOverallProgress(userIdVO);
        
        // Convert to DTO
        const progressSummaryDto = ProgressDTOMapper.toSummaryDTO(progress);
        
        // Return progress data
        return res.status(200).json({
            status: 'success',
            data: { progress: progressSummaryDto }
        });
    }
    /**
     * Record a challenge completion
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async recordChallengeCompletion(req, res) {
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Create UserId Value Object from primitive
        const userIdVO = createUserId(req.user.id);
        if (!userIdVO) {
            throw new ProgressValidationError(`Invalid user ID format: ${req.user.id}`);
        }
        
        // Extract data from request
        const { challengeId, challengeScore: score, completionTime, evaluationData } = req.body;
        
        // Basic validation
        if (!challengeId) {
            return res.status(400).json({
                status: 'error',
                message: 'Challenge ID is required'
            });
        }
        
        // Create ChallengeId Value Object from primitive
        const challengeIdVO = createChallengeId(challengeId);
        if (!challengeIdVO) {
            throw new ProgressValidationError(`Invalid challenge ID format: ${challengeId}`);
        }
        
        if (isNaN(score) || score < 0 || score > 100) {
            return res.status(400).json({
                status: 'error',
                message: 'Score must be a number between 0 and 100'
            });
        }
        if (isNaN(completionTime) || completionTime < 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Completion time must be a positive number'
            });
        }
        
        // Record challenge completion using Value Objects
        const progress = await this.progressService.recordChallengeCompletion(
            userIdVO, 
            challengeIdVO, 
            score, 
            completionTime, 
            evaluationData || {}
        );
        
        // Convert to DTO
        const progressDto = ProgressDTOMapper.toDTO(progress);
        
        // Return updated progress
        return res.status(200).json({
            status: 'success',
            data: {
                challengeId: progressDto.challengeId,
                score: progressDto.averageScore,
                completionTime,
                statistics: progress.statistics,
                skillLevels: progress.skillLevels
            }
        });
    }
    /**
     * Get user's progress for a specific challenge
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async getChallengeProgress(req, res) {
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Create UserId Value Object from primitive
        const userIdVO = createUserId(req.user.id);
        if (!userIdVO) {
            throw new ProgressValidationError(`Invalid user ID format: ${req.user.id}`);
        }
        
        const { challengeId } = req.params;
        if (!challengeId) {
            return res.status(400).json({
                status: 'error',
                message: 'Challenge ID is required'
            });
        }
        
        // Create ChallengeId Value Object from primitive
        const challengeIdVO = createChallengeId(challengeId);
        if (!challengeIdVO) {
            throw new ProgressValidationError(`Invalid challenge ID format: ${challengeId}`);
        }
        
        // Get progress for this challenge using Value Objects
        const progress = await this.progressService.getProgressForChallenge(userIdVO, challengeIdVO);
        if (!progress) {
            return res.status(404).json({
                status: 'error',
                message: 'No progress found for this challenge'
            });
        }
        
        // Convert to DTO
        const progressDto = ProgressDTOMapper.toDTO(progress);
        
        // Return progress data
        return res.status(200).json({
            status: 'success',
            data: {
                challengeId,
                score: progressDto.averageScore,
                completionTime: progress.completionTime,
                skillLevels: progress.skillLevels,
                strengths: progress.strengths,
                weaknesses: progress.weaknesses,
                completedAt: progressDto.updatedAt
            }
        });
    }
    /**
     * Update user's skill levels
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async updateSkillLevels(req, res) {
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Create UserId Value Object from primitive
        const userIdVO = createUserId(req.user.id);
        if (!userIdVO) {
            throw new ProgressValidationError(`Invalid user ID format: ${req.user.id}`);
        }
        
        const { skillLevels } = req.body;
        if (!skillLevels || typeof skillLevels !== 'object') {
            return res.status(400).json({
                status: 'error',
                message: 'Skill levels are required and must be an object'
            });
        }
        
        // Update skill levels using Value Object
        const progress = await this.progressService.updateSkillLevels(userIdVO, skillLevels);
        
        // Convert to DTO
        const progressDto = ProgressDTOMapper.toDTO(progress);
        
        // Return updated skill levels
        return res.status(200).json({
            status: 'success',
            data: {
                skillLevels: progress.skillLevels,
                updatedAt: progressDto.updatedAt
            }
        });
    }
    /**
     * Set focus area for user's progress
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async setFocusArea(req, res) {
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Create UserId Value Object from primitive
        const userIdVO = createUserId(req.user.id);
        if (!userIdVO) {
            throw new ProgressValidationError(`Invalid user ID format: ${req.user.id}`);
        }
        
        // Convert request to domain parameters
        const { focusArea } = req.body;
        if (!focusArea) {
            return res.status(400).json({
                status: 'error',
                message: 'Focus area is required'
            });
        }
        
        // Create FocusArea Value Object from primitive
        const focusAreaVO = createFocusArea(focusArea);
        if (!focusAreaVO) {
            throw new ProgressValidationError(`Invalid focus area format: ${focusArea}`);
        }
        
        // Set focus area using Value Objects
        const progress = await this.progressService.setFocusArea(userIdVO, focusAreaVO);
        
        // Convert to DTO
        const progressDto = ProgressDTOMapper.toDTO(progress);
        
        // Return updated progress
        return res.status(200).json({
            status: 'success',
            data: {
                focusArea: progressDto.focusArea,
                updatedAt: progressDto.updatedAt
            }
        });
    }
    /**
     * Get all progress for the current user
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async getAllUserProgress(req, res) {
        // Check if user is authenticated
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Create UserId Value Object from primitive
        const userIdVO = createUserId(req.user.id);
        if (!userIdVO) {
            throw new ProgressValidationError(`Invalid user ID format: ${req.user.id}`);
        }
        
        // Get all progress records using Value Object
        const progressRecords = await this.progressService.getAllProgressForUser(userIdVO);
        
        // Convert to DTOs
        const progressDtos = ProgressDTOMapper.toDTOCollection(progressRecords);
        
        // Return progress data
        return res.status(200).json({
            status: 'success',
            data: {
                progressRecords: progressDtos.map(p => ({
                    id: p.id,
                    challengeId: p.challengeId,
                    focusArea: p.focusArea,
                    averageScore: p.averageScore,
                    completedAt: p.updatedAt
                })),
                count: progressRecords.length
            }
        });
    }
    /**
     * Record user progress (alternative endpoint to recordChallengeCompletion)
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async recordProgress(req, res) {
        this.logger.info('recordProgress called, forwarding to recordChallengeCompletion');
        
        try {
            // This method is a wrapper around recordChallengeCompletion
            return await this.recordChallengeCompletion(req, res);
        } catch (error) {
            this.logger.error('Error in recordProgress', { error: error.message, stack: error.stack });
            
            // If response already sent, don't try to send again
            if (res.headersSent) return;
            
            return res.status(500).json({
                status: 'error',
                message: 'Failed to record progress',
                error: error.message
            });
        }
    }
    
    /**
     * Get user skills (alternative endpoint to provide skill information)
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async getUserSkills(req, res) {
        this.logger.info('getUserSkills called');
        
        try {
            // Check if user is authenticated
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            // Create UserId Value Object from primitive
            const userIdVO = createUserId(req.user.id);
            if (!userIdVO) {
                throw new ProgressValidationError(`Invalid user ID format: ${req.user.id}`);
            }
            
            // Get user progress to extract skill information using Value Object
            const progress = await this.progressService.calculateOverallProgress(userIdVO);
            
            // Extract skill levels and format response
            return res.status(200).json({
                status: 'success',
                data: {
                    skillLevels: progress.skillLevels || {},
                    strengths: progress.strengths || [],
                    weaknesses: progress.weaknesses || [],
                    updatedAt: progress.updatedAt || new Date().toISOString()
                }
            });
        } catch (error) {
            this.logger.error('Error in getUserSkills', { error: error.message, stack: error.stack });
            
            // If response already sent, don't try to send again
            if (res.headersSent) return;
            
            return res.status(500).json({
                status: 'error',
                message: 'Failed to get user skills',
                error: error.message
            });
        }
    }
    
    /**
     * Get progress statistics (alternative endpoint to provide progress stats)
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async getProgressStats(req, res) {
        this.logger.info('getProgressStats called');
        
        try {
            // Check if user is authenticated
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            // Create UserId Value Object from primitive
            const userIdVO = createUserId(req.user.id);
            if (!userIdVO) {
                throw new ProgressValidationError(`Invalid user ID format: ${req.user.id}`);
            }
            
            // Get all progress records to calculate statistics using Value Object
            const progressRecords = await this.progressService.getAllProgressForUser(userIdVO);
            const overallProgress = await this.progressService.calculateOverallProgress(userIdVO);
            
            // Calculate statistics
            const completedChallenges = progressRecords.length;
            const averageScore = progressRecords.length > 0 
                ? progressRecords.reduce((sum, record) => sum + (record.averageScore || 0), 0) / progressRecords.length 
                : 0;
            
            // Get most recent records
            const recentRecords = [...progressRecords]
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .slice(0, 5);
            
            // Format response
            return res.status(200).json({
                status: 'success',
                data: {
                    completedChallenges,
                    averageScore,
                    totalPoints: Math.round(averageScore * completedChallenges),
                    overallProgress: overallProgress.overallPercentage || 0,
                    skillLevels: overallProgress.skillLevels || {},
                    strengths: overallProgress.strengths || [],
                    weaknesses: overallProgress.weaknesses || [],
                    recentProgress: recentRecords.map(record => ({
                        challengeId: record.challengeId,
                        score: record.averageScore || 0,
                        completedAt: record.updatedAt
                    }))
                }
            });
        } catch (error) {
            this.logger.error('Error in getProgressStats', { error: error.message, stack: error.stack });
            
            // If response already sent, don't try to send again
            if (res.headersSent) return;
            
            return res.status(500).json({
                status: 'error',
                message: 'Failed to get progress statistics',
                error: error.message
            });
        }
    }
}
export default ProgressController;
