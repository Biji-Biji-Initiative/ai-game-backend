'use strict';

/**
 * FormatType Controller
 * 
 * Handles HTTP requests related to format types.
 * Uses DTOs to format domain data for API responses.
 */

const FormatTypeRepository = require('../repositories/config/FormatTypeRepository');
const { FormatTypeDTOMapper } = require('../dtos/FormatTypeDTO');
const { handleApiError } = require('../../infra/errors/ErrorHandler');

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
  }
  
  /**
   * Get all format types
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllFormatTypes(req, res) {
    try {
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
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Get format type by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFormatTypeById(req, res) {
    try {
      const { id } = req.params;
      
      // Get format type from repository
      const formatType = await this.formatTypeRepository.findById(id);
      
      // Convert to DTO before sending response
      const formatTypeDTO = FormatTypeDTOMapper.toDTO(formatType);
      
      // Return success response
      res.status(200).json({
        success: true,
        data: formatTypeDTO
      });
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Get format type by code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFormatTypeByCode(req, res) {
    try {
      const { code } = req.params;
      
      // Get format type from repository
      const formatType = await this.formatTypeRepository.findByCode(code);
      
      // Convert to DTO before sending response
      const formatTypeDTO = FormatTypeDTOMapper.toDTO(formatType);
      
      // Return success response
      res.status(200).json({
        success: true,
        data: formatTypeDTO
      });
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Create a new format type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createFormatType(req, res) {
    try {
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
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Update a format type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateFormatType(req, res) {
    try {
      const { id } = req.params;
      
      // Convert request body to domain parameters
      const domainParams = FormatTypeDTOMapper.fromRequest(req.body);
      
      // Update format type
      const formatType = await this.formatTypeRepository.update(id, domainParams);
      
      // Convert to DTO before sending response
      const formatTypeDTO = FormatTypeDTOMapper.toDTO(formatType);
      
      // Return success response
      res.status(200).json({
        success: true,
        data: formatTypeDTO
      });
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Delete a format type
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteFormatType(req, res) {
    try {
      const { id } = req.params;
      
      // Delete format type
      await this.formatTypeRepository.delete(id);
      
      // Return success response
      res.status(200).json({
        success: true,
        message: `Format type with ID ${id} deleted successfully`
      });
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
}

module.exports = FormatTypeController; 