import { container } from "../../../config/container.js";
import { DifficultyLevelDTOMapper } from "../dtos/DifficultyLevelDTO.js";
import { withControllerErrorHandling } from "../../infra/errors/errorStandardization.js";
import { ChallengeError, ChallengeNotFoundError, ChallengeValidationError } from "../errors/ChallengeErrors.js";
'use strict';
// Error mappings for controllers
const errorMappings = [
    { errorClass: ChallengeNotFoundError, statusCode: 404 },
    { errorClass: ChallengeValidationError, statusCode: 400 },
    { errorClass: ChallengeError, statusCode: 500 },
];
/**
 * DifficultyLevel Controller
 * Responsible for handling difficulty level-related API requests
 */
class DifficultyLevelController {
    /**
     * Create a new DifficultyLevelController
     * @param {DifficultyLevelRepository} difficultyLevelRepository - Repository for difficulty levels
     */
    constructor(difficultyLevelRepository = null) {
        this.difficultyLevelRepository = difficultyLevelRepository ||
            container.get('difficultyLevelRepository');
        this.logger = this.difficultyLevelRepository.logger ||
            container.get('challengeLogger');
            
        // Apply standardized error handling to controller methods
        this.getAllDifficultyLevels = withControllerErrorHandling(
            this.getAllDifficultyLevels.bind(this),
            {
                methodName: 'getAllDifficultyLevels',
                domainName: 'challenge',
                logger: this.logger,
                errorMappings: errorMappings
            }
        );
        
        this.getDifficultyLevelById = withControllerErrorHandling(
            this.getDifficultyLevelById.bind(this),
            {
                methodName: 'getDifficultyLevelById',
                domainName: 'challenge',
                logger: this.logger,
                errorMappings: errorMappings
            }
        );
        
        this.createDifficultyLevel = withControllerErrorHandling(
            this.createDifficultyLevel.bind(this),
            {
                methodName: 'createDifficultyLevel',
                domainName: 'challenge',
                logger: this.logger,
                errorMappings: errorMappings
            }
        );
        
        this.updateDifficultyLevel = withControllerErrorHandling(
            this.updateDifficultyLevel.bind(this),
            {
                methodName: 'updateDifficultyLevel',
                domainName: 'challenge',
                logger: this.logger,
                errorMappings: errorMappings
            }
        );
        
        this.deleteDifficultyLevel = withControllerErrorHandling(
            this.deleteDifficultyLevel.bind(this),
            {
                methodName: 'deleteDifficultyLevel',
                domainName: 'challenge',
                logger: this.logger,
                errorMappings: errorMappings
            }
        );
    }
    /**
     * Get all difficulty levels
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getAllDifficultyLevels(req, res) {
        // Get all difficulty levels from repository
        const difficultyLevels = await this.difficultyLevelRepository.findAll();
        // Convert to DTOs before sending response
        const difficultyLevelDTOs = DifficultyLevelDTOMapper.toDTOCollection(difficultyLevels);
        // Return success response
        res.status(200).json({
            success: true,
            count: difficultyLevelDTOs.length,
            data: difficultyLevelDTOs
        });
    }
    /**
     * Get difficulty level by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getDifficultyLevelById(req, res) {
        const { id } = req.params;
        if (!id) {
            throw new ChallengeValidationError('Difficulty level ID is required');
        }
        // Get difficulty level from repository
        const difficultyLevel = await this.difficultyLevelRepository.findById(id);
        if (!difficultyLevel) {
            throw new ChallengeNotFoundError(`Difficulty level with ID ${id} not found`);
        }
        // Convert to DTO before sending response
        const difficultyLevelDTO = DifficultyLevelDTOMapper.toDTO(difficultyLevel);
        // Return success response
        res.status(200).json({
            success: true,
            data: difficultyLevelDTO
        });
    }
    /**
     * Create a new difficulty level
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async createDifficultyLevel(req, res) {
        if (!req.body || !req.body.name) {
            throw new ChallengeValidationError('Difficulty level name is required');
        }
        // Convert request body to domain parameters
        const domainParams = DifficultyLevelDTOMapper.fromRequest(req.body);
        // Create difficulty level
        const difficultyLevel = await this.difficultyLevelRepository.create(domainParams);
        // Convert to DTO before sending response
        const difficultyLevelDTO = DifficultyLevelDTOMapper.toDTO(difficultyLevel);
        // Return success response
        res.status(201).json({
            success: true,
            data: difficultyLevelDTO
        });
    }
    /**
     * Update a difficulty level
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async updateDifficultyLevel(req, res) {
        const { id } = req.params;
        if (!id) {
            throw new ChallengeValidationError('Difficulty level ID is required');
        }
        // Convert request body to domain parameters
        const domainParams = DifficultyLevelDTOMapper.fromRequest(req.body);
        // Update difficulty level
        const difficultyLevel = await this.difficultyLevelRepository.update(id, domainParams);
        // Convert to DTO before sending response
        const difficultyLevelDTO = DifficultyLevelDTOMapper.toDTO(difficultyLevel);
        // Return success response
        res.status(200).json({
            success: true,
            data: difficultyLevelDTO
        });
    }
    /**
     * Delete a difficulty level
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async deleteDifficultyLevel(req, res) {
        const { id } = req.params;
        if (!id) {
            throw new ChallengeValidationError('Difficulty level ID is required');
        }
        // Check if the difficulty level exists before deleting
        const exists = await this.difficultyLevelRepository.findById(id);
        if (!exists) {
            throw new ChallengeNotFoundError(`Difficulty level with ID ${id} not found`);
        }
        // Delete difficulty level
        await this.difficultyLevelRepository.delete(id);
        // Return success response
        res.status(200).json({
            success: true,
            message: `Difficulty level with ID ${id} deleted successfully`
        });
    }
}
export default DifficultyLevelController;
