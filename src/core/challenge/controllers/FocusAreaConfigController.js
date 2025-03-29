'use strict';

/**
 * FocusAreaConfig Controller
 * 
 * Handles HTTP requests related to focus area configurations.
 * Uses DTOs to format domain data for API responses.
 */

const { focusAreaConfigRepository } = require('../repositories/config/FocusAreaConfigRepository');
const { FocusAreaConfigDTOMapper } = require('../dtos/FocusAreaConfigDTO');
const { handleApiError } = require('../../infra/errors/ErrorHandler');
const FocusArea = require('../models/config/FocusArea');

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
  }
  
  /**
   * Get all focus area configurations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllFocusAreaConfigs(req, res) {
    try {
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
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Get focus area configuration by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFocusAreaConfigById(req, res) {
    try {
      const { id } = req.params;
      
      // Get focus area configuration from repository
      const focusAreaConfig = await this.repository.findById(id);
      
      // Check if focus area configuration exists
      if (!focusAreaConfig) {
        return res.status(404).json({
          success: false,
          message: `Focus area configuration with ID ${id} not found`
        });
      }
      
      // Convert to DTO before sending response
      const focusAreaConfigDTO = FocusAreaConfigDTOMapper.toDTO(focusAreaConfig);
      
      // Return success response
      res.status(200).json({
        success: true,
        data: focusAreaConfigDTO
      });
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Get focus area configuration by code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFocusAreaConfigByCode(req, res) {
    try {
      const { code } = req.params;
      
      // Get focus area configuration from repository
      const focusAreaConfig = await this.repository.findByCode(code);
      
      // Check if focus area configuration exists
      if (!focusAreaConfig) {
        return res.status(404).json({
          success: false,
          message: `Focus area configuration with code ${code} not found`
        });
      }
      
      // Convert to DTO before sending response
      const focusAreaConfigDTO = FocusAreaConfigDTOMapper.toDTO(focusAreaConfig);
      
      // Return success response
      res.status(200).json({
        success: true,
        data: focusAreaConfigDTO
      });
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Get focus area configurations by prerequisite
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFocusAreaConfigsByPrerequisite(req, res) {
    try {
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
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Get focus area configurations by related area
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getFocusAreaConfigsByRelatedArea(req, res) {
    try {
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
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Create a new focus area configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createFocusAreaConfig(req, res) {
    try {
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
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Update a focus area configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateFocusAreaConfig(req, res) {
    try {
      const { code } = req.params;
      
      // Get existing focus area configuration
      const existingFocusAreaConfig = await this.repository.findByCode(code);
      
      // Check if focus area configuration exists
      if (!existingFocusAreaConfig) {
        return res.status(404).json({
          success: false,
          message: `Focus area configuration with code ${code} not found`
        });
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
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Delete a focus area configuration
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteFocusAreaConfig(req, res) {
    try {
      const { code } = req.params;
      
      // Delete focus area configuration
      const deleted = await this.repository.delete(code);
      
      // Check if deletion was successful
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: `Focus area configuration with code ${code} not found`
        });
      }
      
      // Return success response
      res.status(200).json({
        success: true,
        message: `Focus area configuration with code ${code} deleted successfully`
      });
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
  
  /**
   * Invalidate focus area configuration cache
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async invalidateCache(req, res) {
    try {
      // Invalidate cache
      await this.repository.invalidateCache();
      
      // Return success response
      res.status(200).json({
        success: true,
        message: 'Focus area configuration cache invalidated successfully'
      });
    } catch (error) {
      handleApiError(error, req, res);
    }
  }
}

module.exports = FocusAreaConfigController; 