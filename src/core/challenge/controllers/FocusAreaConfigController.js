import { focusAreaConfigRepository } from "../../challenge/repositories/config/FocusAreaConfigRepository.js";
import { FocusAreaConfigDTOMapper } from "../../challenge/dtos/FocusAreaConfigDTO.js";
import FocusArea from "../../challenge/models/config/FocusArea.js";
import { withControllerErrorHandling } from "../../infra/errors/errorStandardization.js";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError } from "../../challenge/errors/ChallengeErrors.js";
'use strict';
/**
 * FocusAreaConfig Controller
 * Responsible for handling focus area configuration-related API requests
 */
class FocusAreaConfigController {
    /**
     * Create a new FocusAreaConfigController
     * @param {FocusAreaConfigRepository} focusAreaConfigRepository - Repository for focus area configurations
     */
    constructor(repository = null) {
        this.repository = repository || focusAreaConfigRepository;
        // Apply standardized error handling to all methods
        this.getAllFocusAreaConfigs = withControllerErrorHandling(this.getAllFocusAreaConfigs.bind(this), {
            methodName: 'getAllFocusAreaConfigs',
            domainName: 'challenge',
            logger: this.logger,
            errorMappings: [
                { errorClass: ChallengeNotFoundError, statusCode: 404 },
                { errorClass: ChallengeValidationError, statusCode: 400 },
                { errorClass: ChallengeError, statusCode: 500 }
            ]
        });
        this.getFocusAreaConfigById = withControllerErrorHandling(this.getFocusAreaConfigById.bind(this), {
            methodName: 'getFocusAreaConfigById',
            domainName: 'challenge',
            logger: this.logger,
            errorMappings: [
                { errorClass: ChallengeNotFoundError, statusCode: 404 },
                { errorClass: ChallengeValidationError, statusCode: 400 },
                { errorClass: ChallengeError, statusCode: 500 }
            ]
        });
        this.getFocusAreaConfigByCode = withControllerErrorHandling(this.getFocusAreaConfigByCode.bind(this), {
            methodName: 'getFocusAreaConfigByCode',
            domainName: 'challenge',
            logger: this.logger,
            errorMappings: [
                { errorClass: ChallengeNotFoundError, statusCode: 404 },
                { errorClass: ChallengeValidationError, statusCode: 400 },
                { errorClass: ChallengeError, statusCode: 500 }
            ]
        });
        this.getFocusAreaConfigsByPrerequisite = withControllerErrorHandling(this.getFocusAreaConfigsByPrerequisite.bind(this), {
            methodName: 'getFocusAreaConfigsByPrerequisite',
            domainName: 'challenge',
            logger: this.logger,
            errorMappings: [
                { errorClass: ChallengeNotFoundError, statusCode: 404 },
                { errorClass: ChallengeValidationError, statusCode: 400 },
                { errorClass: ChallengeError, statusCode: 500 }
            ]
        });
        this.getFocusAreaConfigsByRelatedArea = withControllerErrorHandling(this.getFocusAreaConfigsByRelatedArea.bind(this), {
            methodName: 'getFocusAreaConfigsByRelatedArea',
            domainName: 'challenge',
            logger: this.logger,
            errorMappings: [
                { errorClass: ChallengeNotFoundError, statusCode: 404 },
                { errorClass: ChallengeValidationError, statusCode: 400 },
                { errorClass: ChallengeError, statusCode: 500 }
            ]
        });
        this.createFocusAreaConfig = withControllerErrorHandling(this.createFocusAreaConfig.bind(this), {
            methodName: 'createFocusAreaConfig',
            domainName: 'challenge',
            logger: this.logger,
            errorMappings: [
                { errorClass: ChallengeNotFoundError, statusCode: 404 },
                { errorClass: ChallengeValidationError, statusCode: 400 },
                { errorClass: ChallengeError, statusCode: 500 }
            ]
        });
        this.updateFocusAreaConfig = withControllerErrorHandling(this.updateFocusAreaConfig.bind(this), {
            methodName: 'updateFocusAreaConfig',
            domainName: 'challenge',
            logger: this.logger,
            errorMappings: [
                { errorClass: ChallengeNotFoundError, statusCode: 404 },
                { errorClass: ChallengeValidationError, statusCode: 400 },
                { errorClass: ChallengeError, statusCode: 500 }
            ]
        });
        this.deleteFocusAreaConfig = withControllerErrorHandling(this.deleteFocusAreaConfig.bind(this), {
            methodName: 'deleteFocusAreaConfig',
            domainName: 'challenge',
            logger: this.logger,
            errorMappings: [
                { errorClass: ChallengeNotFoundError, statusCode: 404 },
                { errorClass: ChallengeValidationError, statusCode: 400 },
                { errorClass: ChallengeError, statusCode: 500 }
            ]
        });
        this.invalidateCache = withControllerErrorHandling(this.invalidateCache.bind(this), {
            methodName: 'invalidateCache',
            domainName: 'challenge',
            logger: this.logger,
            errorMappings: [
                { errorClass: ChallengeError, statusCode: 500 }
            ]
        });
    }
    /**
     * Get all focus area configurations
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getAllFocusAreaConfigs(req, res) {
        // Get all focus area configurations from repository
        const focusAreaConfigs = await this.repository.findAll();
        // Convert to DTOs before sending response
        const focusAreaConfigDTOs = FocusAreaConfigDTOMapper.toDTOCollection(focusAreaConfigs);
        // Return success response
        res.status(200).json({
            success: true,
            count: focusAreaConfigDTOs.length,
            data: focusAreaConfigDTOs
        });
    }
    /**
     * Get focus area configuration by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getFocusAreaConfigById(req, res) {
        const { id } = req.params;
        // Get focus area configuration from repository
        const focusAreaConfig = await this.repository.findById(id);
        // Check if focus area configuration exists
        if (!focusAreaConfig) {
            throw new ChallengeNotFoundError(`Focus area configuration with ID ${id} not found`);
        }
        // Convert to DTO before sending response
        const focusAreaConfigDTO = FocusAreaConfigDTOMapper.toDTO(focusAreaConfig);
        // Return success response
        res.status(200).json({
            success: true,
            data: focusAreaConfigDTO
        });
    }
    /**
     * Get focus area configuration by code
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getFocusAreaConfigByCode(req, res) {
        const { code } = req.params;
        // Get focus area configuration from repository
        const focusAreaConfig = await this.repository.findByCode(code);
        // Check if focus area configuration exists
        if (!focusAreaConfig) {
            throw new ChallengeNotFoundError(`Focus area configuration with code ${code} not found`);
        }
        // Convert to DTO before sending response
        const focusAreaConfigDTO = FocusAreaConfigDTOMapper.toDTO(focusAreaConfig);
        // Return success response
        res.status(200).json({
            success: true,
            data: focusAreaConfigDTO
        });
    }
    /**
     * Get focus area configurations by prerequisite
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getFocusAreaConfigsByPrerequisite(req, res) {
        const { prerequisiteCode } = req.params;
        // Get focus area configurations from repository
        const focusAreaConfigs = await this.repository.findByPrerequisite(prerequisiteCode);
        // Convert to DTOs before sending response
        const focusAreaConfigDTOs = FocusAreaConfigDTOMapper.toDTOCollection(focusAreaConfigs);
        // Return success response
        res.status(200).json({
            success: true,
            count: focusAreaConfigDTOs.length,
            data: focusAreaConfigDTOs
        });
    }
    /**
     * Get focus area configurations by related area
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getFocusAreaConfigsByRelatedArea(req, res) {
        const { relatedAreaCode } = req.params;
        // Get focus area configurations from repository
        const focusAreaConfigs = await this.repository.findByRelatedArea(relatedAreaCode);
        // Convert to DTOs before sending response
        const focusAreaConfigDTOs = FocusAreaConfigDTOMapper.toDTOCollection(focusAreaConfigs);
        // Return success response
        res.status(200).json({
            success: true,
            count: focusAreaConfigDTOs.length,
            data: focusAreaConfigDTOs
        });
    }
    /**
     * Create a new focus area configuration
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async createFocusAreaConfig(req, res) {
        // Convert request body to domain parameters
        const domainParams = FocusAreaConfigDTOMapper.fromRequest(req.body);
        // Create focus area domain entity
        const focusArea = new FocusArea(domainParams);
        // Save focus area configuration
        const savedFocusAreaConfig = await this.repository.save(focusArea);
        // Convert to DTO before sending response
        const focusAreaConfigDTO = FocusAreaConfigDTOMapper.toDTO(savedFocusAreaConfig);
        // Return success response
        res.status(201).json({
            success: true,
            data: focusAreaConfigDTO
        });
    }
    /**
     * Update a focus area configuration
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async updateFocusAreaConfig(req, res) {
        const { code } = req.params;
        // Get existing focus area configuration
        const existingFocusAreaConfig = await this.repository.findByCode(code);
        // Check if focus area configuration exists
        if (!existingFocusAreaConfig) {
            throw new ChallengeNotFoundError(`Focus area configuration with code ${code} not found`);
        }
        // Convert request body to domain parameters
        const updateParams = FocusAreaConfigDTOMapper.fromRequest(req.body);
        // Update focus area configuration
        const updatedFocusAreaConfig = existingFocusAreaConfig.update(updateParams);
        // Save updated focus area configuration
        const savedFocusAreaConfig = await this.repository.save(updatedFocusAreaConfig);
        // Convert to DTO before sending response
        const focusAreaConfigDTO = FocusAreaConfigDTOMapper.toDTO(savedFocusAreaConfig);
        // Return success response
        res.status(200).json({
            success: true,
            data: focusAreaConfigDTO
        });
    }
    /**
     * Delete a focus area configuration
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async deleteFocusAreaConfig(req, res) {
        const { code } = req.params;
        // Delete focus area configuration
        const deleted = await this.repository.delete(code);
        // Check if deletion was successful
        if (!deleted) {
            throw new ChallengeNotFoundError(`Focus area configuration with code ${code} not found`);
        }
        // Return success response
        res.status(200).json({
            success: true,
            message: `Focus area configuration with code ${code} deleted successfully`
        });
    }
    /**
     * Invalidate focus area configuration cache
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async invalidateCache(req, res) {
        // Invalidate cache
        await this.repository.invalidateCache();
        // Return success response
        res.status(200).json({
            success: true,
            message: 'Focus area configuration cache invalidated successfully'
        });
    }
}
export default FocusAreaConfigController;
