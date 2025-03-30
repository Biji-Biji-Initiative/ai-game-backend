import { withControllerErrorHandling } from "../../infra/errors/errorStandardization.js";
import { ProgressError, ProgressNotFoundError, ProgressValidationError, ProgressProcessingError } from "../errors/progressErrors.js";
import { ProgressDTOMapper } from "../dtos/ProgressDTO.js";
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
        // Get overall progress
        const progress = await this.progressService.calculateOverallProgress(req.user.id);
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
        // Convert request to domain parameters
        const params = ProgressDTOMapper.fromRequest(req.body);
        const { challengeId, challengeScore: score, completionTime, evaluationData } = req.body;
        // Basic validation
        if (!challengeId) {
            return res.status(400).json({
                status: 'error',
                message: 'Challenge ID is required'
            });
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
        // Record challenge completion
        const progress = await this.progressService.recordChallengeCompletion(
            req.user.id, 
            params.challengeId, 
            params.challengeScore, 
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
        const { challengeId } = req.params;
        if (!challengeId) {
            return res.status(400).json({
                status: 'error',
                message: 'Challenge ID is required'
            });
        }
        // Get progress for this challenge
        const progress = await this.progressService.getProgressForChallenge(req.user.id, challengeId);
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
        const { skillLevels } = req.body;
        if (!skillLevels || typeof skillLevels !== 'object') {
            return res.status(400).json({
                status: 'error',
                message: 'Skill levels are required and must be an object'
            });
        }
        // Update skill levels
        const progress = await this.progressService.updateSkillLevels(req.user.id, skillLevels);
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
        // Convert request to domain parameters
        const params = ProgressDTOMapper.fromRequest(req.body);
        if (!params.focusArea) {
            return res.status(400).json({
                status: 'error',
                message: 'Focus area is required'
            });
        }
        // Set focus area
        const progress = await this.progressService.setFocusArea(req.user.id, params.focusArea);
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
        // Get all progress records
        const progressRecords = await this.progressService.getAllProgressForUser(req.user.id);
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
            
            // Get user progress to extract skill information
            const progress = await this.progressService.calculateOverallProgress(req.user.id);
            
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
            
            // Get all progress records to calculate statistics
            const progressRecords = await this.progressService.getAllProgressForUser(req.user.id);
            const overallProgress = await this.progressService.calculateOverallProgress(req.user.id);
            
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
