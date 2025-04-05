import { logger } from "#app/core/infra/logging/logger.js";
import { FocusAreaError, FocusAreaNotFoundError, FocusAreaGenerationError, FocusAreaValidationError } from "#app/core/focusArea/errors/focusAreaErrors.js";
import { withControllerErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
'use strict';
/**
 * Focus Area Controller
 *
 * Handles HTTP requests related to focus areas.
 * Located within the focusArea domain following our DDD architecture.
 */
// Create focused domain-specific logger
const focusAreaLogger = logger.child({
  service: 'FocusAreaController'
});
/**
 *
 */
class FocusAreaController {
  /**
   * Create a new FocusAreaController
   * @param {Object} dependencies - Dependencies for the controller
   * @param {Object} dependencies.focusAreaManagementCoordinator - Coordinator for managing focus areas
   * @param {Object} dependencies.focusAreaGenerationCoordinator - Coordinator for generating focus areas
   * @param {Object} [dependencies.logger] - Logger instance
   */
  constructor({
    focusAreaManagementCoordinator,
    focusAreaGenerationCoordinator,
    logger
  }) {
    // Check required dependencies
    if (!focusAreaManagementCoordinator) {
      throw new Error('focusAreaManagementCoordinator is required for FocusAreaController');
    }
    if (!focusAreaGenerationCoordinator) {
      throw new Error('focusAreaGenerationCoordinator is required for FocusAreaController');
    }
    
    this.managementCoordinator = focusAreaManagementCoordinator;
    this.generationCoordinator = focusAreaGenerationCoordinator;
    this.logger = logger || focusAreaLogger;
    
    // Define error mappings for controller methods
    this.errorMappings = [{
      errorClass: FocusAreaNotFoundError,
      statusCode: 404
    }, {
      errorClass: FocusAreaValidationError,
      statusCode: 400
    }, {
      errorClass: FocusAreaGenerationError,
      statusCode: 500
    }, {
      errorClass: FocusAreaError,
      statusCode: 400
    }];
    // Apply standardized error handling to methods
    this.getAllFocusAreas = withControllerErrorHandling(this.getAllFocusAreas.bind(this), {
      methodName: 'getAllFocusAreas',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.getFocusAreasForUser = withControllerErrorHandling(this.getFocusAreasForUser.bind(this), {
      methodName: 'getFocusAreasForUser',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.setFocusAreasForUser = withControllerErrorHandling(this.setFocusAreasForUser.bind(this), {
      methodName: 'setFocusAreasForUser',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.getRecommendedFocusAreas = withControllerErrorHandling(this.getRecommendedFocusAreas.bind(this), {
      methodName: 'getRecommendedFocusAreas',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.generateFocusArea = withControllerErrorHandling(this.generateFocusArea.bind(this), {
      methodName: 'generateFocusArea',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.generateFocusAreas = withControllerErrorHandling(this.generateFocusAreas.bind(this), {
      methodName: 'generateFocusAreas',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.regenerateFocusAreasForUser = withControllerErrorHandling(this.regenerateFocusAreasForUser.bind(this), {
      methodName: 'regenerateFocusAreasForUser',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    // Add error handling for the new createThread method
    this.createThread = withControllerErrorHandling(this.createThread.bind(this), {
      methodName: 'createThread',
      domainName: 'focusArea',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
  }
  /**
   * Get all available focus areas
   */
  /**
   * Method getAllFocusAreas
   */
  async getAllFocusAreas(req, res, _next) {
    const focusAreas = await this.managementCoordinator.getAllFocusAreas();
    return res.status(200).json({
      status: 'success',
      data: focusAreas,
      meta: {
        total: focusAreas.length,
        offset: 0,
        limit: focusAreas.length
      }
    });
  }
  /**
   * Get focus areas for a user
   */
  /**
   * Method getFocusAreasForUser
   */
  async getFocusAreasForUser(req, res, _next) {
    const {
      email
    } = req.params;
    // Email validation is handled by middleware
    const focusAreas = await this.managementCoordinator.getFocusAreasForUser(email);
    return res.status(200).json({
      status: 'success',
      data: focusAreas,
      meta: {
        total: focusAreas.length,
        offset: 0,
        limit: focusAreas.length
      }
    });
  }
  /**
   * Set focus areas for a user
   */
  /**
   * Method setFocusAreasForUser
   */
  async setFocusAreasForUser(req, res, _next) {
    const {
      email
    } = req.params;
    const {
      focusAreas
    } = req.body;
    // Email and focusAreas validation handled by middleware
    await this.managementCoordinator.setFocusAreasForUser(email, focusAreas);
    return res.status(200).json({
      status: 'success',
      data: {
        updated: true
      },
      message: 'Focus areas updated successfully'
    });
  }
  /**
   * Get recommended focus areas for a user
   */
  /**
   * Method getRecommendedFocusAreas
   */
  async getRecommendedFocusAreas(req, res, _next) {
    const {
      email
    } = req.params;
    const {
      limit
    } = req.query;
    // Email and limit validation handled by middleware
    const limitValue = limit ? parseInt(limit) : 3;
    const recommendations = await this.managementCoordinator.getRecommendedFocusAreas(email, limitValue);
    return res.status(200).json({
      status: 'success',
      data: recommendations,
      meta: {
        total: recommendations.length,
        offset: 0,
        limit: limitValue
      }
    });
  }
  /**
   * Generate a new focus area (admin only)
   */
  /**
   * Method generateFocusArea
   */
  async generateFocusArea(req, res, _next) {
    const {
      name,
      description,
      category,
      difficulty
    } = req.body;
    // Input validation handled by middleware
    // const focusArea = await this.generationCoordinator.generateFocusArea({
    //   name,
    //   description,
    //   category: category || 'general',
    //   difficulty: difficulty || 'intermediate'
    // }); // Incorrect coordinator
    
    // Placeholder - needs focusAreaService dependency restored
    this.logger.warn('generateFocusArea likely needs focusAreaService dependency restored, not generationCoordinator.');
    return res.status(501).json({ success: false, message: 'Admin focus area generation needs further implementation (focusAreaService dependency)'});
    /* 
    // If using focusAreaService:
    const focusArea = await this.focusAreaService.createFocusAreaTemplate({ name, description, category, difficulty });
    return res.status(201).json({ success: true, data: focusArea });
    */
  }
  async regenerateFocusAreasForUser(req, res, _next) {
    const { email } = req.params;
    // Need user ID for regeneration
    // Option 1: Get user ID here (adds userService dependency back)
    // Option 2: Modify generationCoordinator.regenerateFocusAreas to accept email (less ideal)
    // Assuming option 1 for now - will need to add userService back to constructor/DI
    // const user = await this.userService.getUserByEmail(email); // Requires adding userService back
    // if (!user) { throw new FocusAreaNotFoundError(`User not found: ${email}`); }
    // const userId = user.id;
    // Delegate to the Generation coordinator
    // const focusAreas = await this.generationCoordinator.regenerateFocusAreas(userId);
    
    // Placeholder - needs userService dependency restored
    this.logger.warn('regenerateFocusAreasForUser needs userService dependency restored to find userId from email.');
    return res.status(501).json({ success: false, message: 'Regeneration endpoint needs further implementation (userService dependency)'});
  }
  /**
   * Generate focus areas for the current user based on profile data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} _next - Express next middleware function
   * @returns {Promise<Object>} Response with generated focus areas
   */
  async generateFocusAreas(req, res, _next) {
    this.logger.info('Generating focus areas based on user profile data');

    // Extract user profile data from request
    const profileData = req.body;
    
    // Get the user ID from the authenticated user
    const userId = req.user.id;

    // Ensure the profileData has all necessary fields
    if (!profileData || !profileData.professionalTitle) {
      throw new FocusAreaValidationError('Profile data is required with at least a professional title');
    }

    try {
      // Transform the input data to have the 'name' property required by the validator
      const transformedData = {
        id: userId,
        ...profileData,
        name: `Focus area for ${profileData.professionalTitle}`,
        description: `Generated focus area based on profile data for ${profileData.professionalTitle}`
      };

      // Use the coordinator to generate focus areas
      const focusAreas = await this.generationCoordinator.generateFocusAreasFromUserData(transformedData);
      
      // Use the OpenAPI expected response format
      return res.status(201).json({
        status: 'success',
        data: focusAreas[0] // Return the first focus area
      });
    } catch (error) {
      this.logger.error('Error generating focus areas', { error, userId });
      throw new FocusAreaGenerationError('Failed to generate focus areas: ' + error.message);
    }
  }
  /**
   * Create a thread for focus area generation for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object 
   * @param {Function} _next - Express next middleware function
   * @returns {Promise<Object>} Response with thread ID
   */
  async createThread(req, res, _next) {
    this.logger.info('Creating focus area thread for the current user');
    
    // Get the user ID from the authenticated user
    const userId = req.user.id;
    
    try {
      // Create a thread using the generation coordinator
      const threadId = await this.generationCoordinator.createFocusAreaThread(userId);
      
      return res.status(201).json({
        status: 'success',
        data: {
          threadId
        },
        message: 'Focus area thread created successfully'
      });
    } catch (error) {
      this.logger.error('Error creating focus area thread', { error, userId });
      throw new FocusAreaError('Failed to create focus area thread: ' + error.message);
    }
  }
}
export default FocusAreaController;