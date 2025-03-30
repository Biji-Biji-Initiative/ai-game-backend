import FormatTypeRepository from "../../challenge/repositories/config/FormatTypeRepository.js";
import { FormatTypeDTOMapper } from "../../challenge/dtos/FormatTypeDTO.js";
import { withControllerErrorHandling } from "../../infra/errors/errorStandardization.js";
import { 
  ChallengeError, 
  ChallengeNotFoundError,
  ChallengeValidationError 
} from "../../challenge/errors/ChallengeErrors.js";
'use strict';
/**
 * FormatType Controller
 * Responsible for handling format type-related API requests
 */
class FormatTypeController {
    /**
     * Create a new FormatTypeController
     * @param {FormatTypeRepository} formatTypeRepository - Repository for format types
     */
    constructor(formatTypeRepository = null) {
        this.formatTypeRepository = formatTypeRepository || new FormatTypeRepository();
        
        // Apply standardized error handling to all methods
        this.getAllFormatTypes = withControllerErrorHandling(
            this.getAllFormatTypes.bind(this),
            {
                methodName: 'getAllFormatTypes',
                domainName: 'challenge',
                logger: this.logger,
                errorMappings: [
                    { errorClass: ChallengeNotFoundError, statusCode: 404 },
                    { errorClass: ChallengeValidationError, statusCode: 400 },
                    { errorClass: ChallengeError, statusCode: 500 }
                ]
            }
        );
        
        this.getFormatTypeById = withControllerErrorHandling(
            this.getFormatTypeById.bind(this),
            {
                methodName: 'getFormatTypeById',
                domainName: 'challenge',
                logger: this.logger,
                errorMappings: [
                    { errorClass: ChallengeNotFoundError, statusCode: 404 },
                    { errorClass: ChallengeValidationError, statusCode: 400 },
                    { errorClass: ChallengeError, statusCode: 500 }
                ]
            }
        );
        
        this.getFormatTypeByCode = withControllerErrorHandling(
            this.getFormatTypeByCode.bind(this),
            {
                methodName: 'getFormatTypeByCode',
                domainName: 'challenge',
                logger: this.logger,
                errorMappings: [
                    { errorClass: ChallengeNotFoundError, statusCode: 404 },
                    { errorClass: ChallengeValidationError, statusCode: 400 },
                    { errorClass: ChallengeError, statusCode: 500 }
                ]
            }
        );
        
        this.createFormatType = withControllerErrorHandling(
            this.createFormatType.bind(this),
            {
                methodName: 'createFormatType',
                domainName: 'challenge',
                logger: this.logger,
                errorMappings: [
                    { errorClass: ChallengeNotFoundError, statusCode: 404 },
                    { errorClass: ChallengeValidationError, statusCode: 400 },
                    { errorClass: ChallengeError, statusCode: 500 }
                ]
            }
        );
        
        this.updateFormatType = withControllerErrorHandling(
            this.updateFormatType.bind(this),
            {
                methodName: 'updateFormatType',
                domainName: 'challenge',
                logger: this.logger,
                errorMappings: [
                    { errorClass: ChallengeNotFoundError, statusCode: 404 },
                    { errorClass: ChallengeValidationError, statusCode: 400 },
                    { errorClass: ChallengeError, statusCode: 500 }
                ]
            }
        );
        
        this.deleteFormatType = withControllerErrorHandling(
            this.deleteFormatType.bind(this),
            {
                methodName: 'deleteFormatType',
                domainName: 'challenge',
                logger: this.logger,
                errorMappings: [
                    { errorClass: ChallengeNotFoundError, statusCode: 404 },
                    { errorClass: ChallengeValidationError, statusCode: 400 },
                    { errorClass: ChallengeError, statusCode: 500 }
                ]
            }
        );
    }
    /**
     * Get all format types
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getAllFormatTypes(req, res) {
        // Get all format types from repository
        const formatTypes = await this.formatTypeRepository.findAll();
        
        // Convert to DTOs before sending response
        const formatTypeDTOs = FormatTypeDTOMapper.toDTOCollection(formatTypes);
        
        // Return success response
        res.status(200).json({
            success: true,
            count: formatTypeDTOs.length,
            data: formatTypeDTOs
        });
    }
    /**
     * Get format type by ID
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getFormatTypeById(req, res) {
        const { id } = req.params;
        
        // Get format type from repository
        const formatType = await this.formatTypeRepository.findById(id);
        
        // Check if format type exists
        if (!formatType) {
            throw new ChallengeNotFoundError(`Format type with ID ${id} not found`);
        }
        
        // Convert to DTO before sending response
        const formatTypeDTO = FormatTypeDTOMapper.toDTO(formatType);
        
        // Return success response
        res.status(200).json({
            success: true,
            data: formatTypeDTO
        });
    }
    /**
     * Get format type by code
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getFormatTypeByCode(req, res) {
        const { code } = req.params;
        
        // Get format type from repository
        const formatType = await this.formatTypeRepository.findByCode(code);
        
        // Check if format type exists
        if (!formatType) {
            throw new ChallengeNotFoundError(`Format type with code ${code} not found`);
        }
        
        // Convert to DTO before sending response
        const formatTypeDTO = FormatTypeDTOMapper.toDTO(formatType);
        
        // Return success response
        res.status(200).json({
            success: true,
            data: formatTypeDTO
        });
    }
    /**
     * Create a new format type
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async createFormatType(req, res) {
        // Convert request body to domain parameters
        const domainParams = FormatTypeDTOMapper.fromRequest(req.body);
        
        // Create format type
        const formatType = await this.formatTypeRepository.create(domainParams);
        
        // Convert to DTO before sending response
        const formatTypeDTO = FormatTypeDTOMapper.toDTO(formatType);
        
        // Return success response
        res.status(201).json({
            success: true,
            data: formatTypeDTO
        });
    }
    /**
     * Update a format type
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async updateFormatType(req, res) {
        const { id } = req.params;
        
        // Convert request body to domain parameters
        const domainParams = FormatTypeDTOMapper.fromRequest(req.body);
        
        // Update format type
        const formatType = await this.formatTypeRepository.update(id, domainParams);
        
        // If no format type was returned, it means it wasn't found
        if (!formatType) {
            throw new ChallengeNotFoundError(`Format type with ID ${id} not found`);
        }
        
        // Convert to DTO before sending response
        const formatTypeDTO = FormatTypeDTOMapper.toDTO(formatType);
        
        // Return success response
        res.status(200).json({
            success: true,
            data: formatTypeDTO
        });
    }
    /**
     * Delete a format type
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async deleteFormatType(req, res) {
        const { id } = req.params;
        
        // Delete format type
        const result = await this.formatTypeRepository.delete(id);
        
        // If no rows were affected, it means the format type wasn't found
        if (!result) {
            throw new ChallengeNotFoundError(`Format type with ID ${id} not found`);
        }
        
        // Return success response
        res.status(200).json({
            success: true,
            message: `Format type with ID ${id} deleted successfully`
        });
    }
}
export default FormatTypeController;
