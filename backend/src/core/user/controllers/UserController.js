'use strict';

import { userLogger } from "#app/core/infra/logging/domainLogger.js";
import { UserNotFoundError, UserUpdateError, UserCreationError, InvalidProfileError } from "#app/core/user/errors/UserErrors.js";
import { withControllerErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { UserDTOMapper } from "#app/core/user/dtos/UserDTO.js";
import { updateUserSchema } from "#app/core/user/schemas/userApiSchemas.js"; // Import validation schema
import { preferencesSchema, validatePreferenceCategory, isValidPreferenceCategory } from "#app/core/user/schemas/preferencesSchema.js"; // Import preference schemas/validators
import { userSchema, difficultyLevelSchema } from "#app/core/user/schemas/userSchema.js"; // Import main user schema
import User from "#app/core/user/models/User.js"; // Import User model
import { v4 as uuidv4 } from 'uuid';
import UserService from "../services/UserService.js";
import UserMapper from "../mappers/UserMapper.js";
import { formatSuccess } from "#app/core/infra/http/responseFormatter.js";
/**
 * User Controller (Refactored with Standardized Error Handling)
 *
 * Handles HTTP requests related to user operations.
 * Located within the user domain following our DDD architecture.
 */
// Remove the container import as we'll inject dependencies
// Import userLogger only for fallback
/**
 *
 */
class UserController {
  /**
   * Create a new UserController
   * @param {Object} dependencies - Dependencies for the controller
   * @param {Object} dependencies.userService - User service
   * @param {Object} dependencies.userRepository - User repository (REMOVED - Prefer userService)
   * @param {Object} dependencies.focusAreaCoordinator - Focus area coordinator
   * @param {Object} dependencies.userPreferencesManager - User preferences manager
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({
    userService,
    focusAreaCoordinator,
    userPreferencesManager,
    logger
  }) {
    // Check required dependencies
    if (!userService) {
      throw new Error('userService is required for UserController');
    }
    this.userService = userService;
    this.focusAreaCoordinator = focusAreaCoordinator;
    this.userPreferencesManager = userPreferencesManager;
    this.logger = logger || userLogger.child('controller');
    // Define error mappings for controller methods
    this.errorMappings = [{
      errorClass: UserNotFoundError,
      statusCode: 404
    }, {
      errorClass: UserCreationError,
      statusCode: 400
    }, {
      errorClass: UserUpdateError,
      statusCode: 500
    }, {
      errorClass: InvalidProfileError,
      statusCode: 400
    }, {
      errorClass: UserUpdateError,
      statusCode: 500
    }];
    // Apply standardized error handling to methods
    this.createUser = withControllerErrorHandling(this.createUser.bind(this), {
      methodName: 'createUser',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.getUserByEmail = withControllerErrorHandling(this.getUserByEmail.bind(this), {
      methodName: 'getUserByEmail',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.getCurrentUser = withControllerErrorHandling(this.getCurrentUser.bind(this), {
      methodName: 'getCurrentUser',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.updateCurrentUser = withControllerErrorHandling(this.updateCurrentUser.bind(this), {
      methodName: 'updateCurrentUser',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    this.setFocusArea = withControllerErrorHandling(this.setFocusArea.bind(this), {
      methodName: 'setFocusArea',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    // Apply error handling wrapper to getUserProfile method
    this.getUserProfile = withControllerErrorHandling(this.getUserProfile.bind(this), {
      methodName: 'getUserProfile',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });

    // Apply error handling to new preference methods
    this.getUserPreferences = withControllerErrorHandling(this.getUserPreferences.bind(this), {
      methodName: 'getUserPreferences',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.getUserPreferencesByCategory = withControllerErrorHandling(this.getUserPreferencesByCategory.bind(this), {
      methodName: 'getUserPreferencesByCategory',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.updateUserPreferences = withControllerErrorHandling(this.updateUserPreferences.bind(this), {
      methodName: 'updateUserPreferences',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.updateUserPreferencesByCategory = withControllerErrorHandling(this.updateUserPreferencesByCategory.bind(this), {
      methodName: 'updateUserPreferencesByCategory',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.updateSinglePreference = withControllerErrorHandling(this.updateSinglePreference.bind(this), {
      methodName: 'updateSinglePreference',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
    
    this.resetPreference = withControllerErrorHandling(this.resetPreference.bind(this), {
      methodName: 'resetPreference',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });

    // Bind the new method
    this.registerUserInterest = withControllerErrorHandling(this.registerUserInterest.bind(this), {
      methodName: 'registerUserInterest',
      domainName: 'user',
      logger: this.logger,
      errorMappings: this.errorMappings
    });
  }
  /**
   * Create a new user (testing purposes only)
   */
  async createUser(req, res, _next) {
    // Validate request body (Assume a schema exists or add basic checks)
    const { email, password, firstName, lastName, fullName } = req.body;
    if (!email) {
      throw new UserCreationError('Email is required');
    }
    // Password validation/hashing should happen in service/auth layer ideally

    this.logger.debug('Creating user via controller', { email });
    
    // Use UserService to create the user
    const userData = {
      email,
      password: password || 'password123', // Handle password securely in service
      fullName: fullName || (firstName && lastName ? `${firstName} ${lastName}` : 'Test User')
      // Add other fields as needed
    };
    
    // Check if user exists first via service
    const existingUser = await this.userService.getUserByEmail(email);
    if (existingUser) {
      this.logger.info('User already exists, returning existing user', { email });
      const userDto = UserDTOMapper.toDTO(existingUser);
      return res.status(200).json(formatSuccess(userDto, 'User already exists'));
    }
    
    // Call service to create
    const newUser = await this.userService.createUser(userData);
    
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(newUser);
    this.logger.info('Created new user via controller', { email });
    return res.status(201).json(formatSuccess(userDto, 'User created successfully'));
  }
  /**
   * Get a user by email (testing purposes only)
   */
  async getUserByEmail(req, res, _next) {
    const { email } = req.params;
    if (!email) {
      throw new UserCreationError('Email is required');
    }
    this.logger.debug('Getting user by email via controller', { email });
    
    // Use UserService
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UserNotFoundError(`User with email ${email} not found`);
    }
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(user);
    return res.status(200).json(formatSuccess(userDto));
  }
  /**
   * Get the currently authenticated user
   */
  async getCurrentUser(req, res, _next) {
    const { email } = req.user; // Assumes auth middleware sets req.user.email
    this.logger.debug('Getting current user profile via controller', { email });
    
    // Use UserService
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      // Should not happen if authentication middleware worked correctly
      this.logger.error('Authenticated user not found in DB', { email });
      throw new UserNotFoundError(email);
    }
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(user);
    return res.status(200).json(formatSuccess(userDto, 'User profile retrieved successfully'));
  }
  /**
   * Update the currently authenticated user
   */
  async updateCurrentUser(req, res, _next) {
    const { email } = req.user;
    
    // Validate request body using Zod schema
    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.flatten().fieldErrors;
      throw new UserCreationError('Invalid update data', { validationErrors: formattedErrors });
    }
    
    // Use validated data
    const updateData = validationResult.data;
    
    this.logger.debug('Updating user profile', { email });
    
    // Delegate to the UserService for update logic
    const updatedUser = await this.userService.updateUser(email, updateData);
    
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(updatedUser);
    
    this.logger.info('User profile updated', { email });
    
    return res.status(200).json(formatSuccess(userDto, 'User profile updated successfully'));
  }
  /**
   * Set the focus area for the current user
   */
  async setFocusArea(req, res, _next) {
    const {
      email
    } = req.user;
    const {
      focusArea
    } = req.body;
    if (!focusArea) {
      throw new UserCreationError('Focus area is required');
    }
    this.logger.debug('Setting user focus area', {
      email,
      focusArea
    });
    // Use the focusAreaCoordinator to handle the update
    // This ensures proper state management and domain event publishing
    const updatedUser = await this.focusAreaCoordinator.setUserFocusArea(email, focusArea);
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(updatedUser);
    this.logger.info('User focus area updated', {
      email,
      focusArea
    });
    return res.status(200).json(formatSuccess(userDto, 'User focus area updated successfully'));
  }
  /**
   * Get a user by ID (admin only)
   */
  async getUserById(req, res, _next) {
    const { id } = req.params;
    if (!id) {
      throw new UserCreationError('User ID is required');
    }
    this.logger.debug('Getting user by ID via controller', { userId: id });
    
    // Use UserService
    const user = await this.userService.getUserById(id);
    if (!user) {
      throw new UserNotFoundError(`User with ID ${id} not found`);
    }
    
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(user);
    return res.status(200).json(formatSuccess(userDto));
  }
  /**
   * List all users (admin only)
   */
  async listUsers(req, res, _next) {
    this.logger.debug('Listing all users via controller');
    
    // Use UserService to list users
    const { limit, offset, status /* other filters/sort */ } = req.query;
    const options = {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        status: status
        // Add sortBy, sortDir if needed by service/repo
    };
    
    const result = await this.userService.listUsers(options);
    const users = result.users || [];
    const total = result.total || users.length;
    
    // Convert domain entities to DTOs
    const userDtos = UserDTOMapper.toDTOCollection(users);
    this.logger.info(`Retrieved ${users.length} users (total: ${total})`);
    return res.status(200).json(formatSuccess({
        users: userDtos,
        pagination: { total: total, limit: options.limit || users.length, offset: options.offset || 0 } 
    }, `Retrieved ${users.length} users successfully`));
  }

  /**
   * Get all preferences for the current user
   */
  async getUserPreferences(req, res, _next) {
    const { id } = req.user;
    
    this.logger.debug('Getting user preferences', { userId: id });
    const preferences = await this.userPreferencesManager.getUserPreferences(id);
    
    return res.status(200).json(formatSuccess(preferences, 'User preferences retrieved successfully'));
  }

  /**
   * Get preferences for a specific category for the current user
   */
  async getUserPreferencesByCategory(req, res, _next) {
    const { id } = req.user;
    const { category } = req.params;
    
    this.logger.debug('Getting user preferences by category', { userId: id, category });
    const preferences = await this.userPreferencesManager.getUserPreferencesByCategory(id, category);
    
    return res.status(200).json(formatSuccess({
      [category]: preferences
    }, `${category} preferences retrieved successfully`));
  }

  /**
   * Update all preferences for the current user
   */
  async updateUserPreferences(req, res, _next) {
    const { id } = req.user;
    const { preferences } = req.body;
    
    // Validate request body using Zod schema
    const validationResult = preferencesSchema.safeParse(preferences);
    if (!validationResult.success) {
        const formattedErrors = validationResult.error.flatten().fieldErrors;
        throw new UserCreationError('Invalid preferences data', { validationErrors: formattedErrors });
    }
    const validatedPreferences = validationResult.data;
    
    this.logger.debug('Updating user preferences', { userId: id });
    const updatedPreferences = await this.userPreferencesManager.updateUserPreferences(id, validatedPreferences);
    
    return res.status(200).json(formatSuccess(updatedPreferences, 'Preferences updated successfully'));
  }

  /**
   * Update preferences for a specific category for the current user
   */
  async updateUserPreferencesByCategory(req, res, _next) {
    const { id } = req.user;
    const { category } = req.params;
    const categoryPreferences = req.body;
    
    // Validate category name first
    if (!isValidPreferenceCategory(category)) {
      throw new UserCreationError(`Invalid preference category: ${category}`);
    }
    
    try {
        // Validate the specific category data
        const validatedCategoryPrefs = validatePreferenceCategory(category, categoryPreferences);
        
        this.logger.debug('Updating user preferences by category', { userId: id, category });
        const updatedPreferences = await this.userPreferencesManager.updateUserPreferencesByCategory(
            id, category, validatedCategoryPrefs // Use validated data
        );
        
        return res.status(200).json(formatSuccess(updatedPreferences, `${category} preferences updated successfully`));
    } catch (error) {
        // Catch validation errors from validatePreferenceCategory
        if (error.errors) { // Assuming Zod error structure
            const formattedErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
            throw new UserCreationError(`Invalid ${category} preferences: ${formattedErrors}`);
        } 
        throw error; // Re-throw other errors
    }
  }

  /**
   * Update a single preference for the current user
   */
  async updateSinglePreference(req, res, _next) {
    const { id } = req.user;
    const { key } = req.params;
    const { value } = req.body;
    
    // Basic validation (more complex validation happens in the service)
    if (!key || typeof key !== 'string') {
        throw new UserCreationError('Preference key (param) is required and must be a string');
    }
    if (value === undefined) { // Allow null/false/0
        throw new UserCreationError('Preference value is required in the request body');
    }

    this.logger.debug('Updating single user preference', { userId: id, key });
    
    // Delegate to the service which handles nested key validation and type checking
    const updatedPreferences = await this.userPreferencesManager.setUserPreference(id, key, value);
    
    return res.status(200).json(formatSuccess(updatedPreferences, `Preference '${key}' updated successfully`));
  }

  /**
   * Reset a preference to its default value for the current user
   */
  async resetPreference(req, res, _next) {
    const { id } = req.user;
    const { key } = req.params;
    
    this.logger.debug('Resetting user preference', { userId: id, key });
    const updatedPreferences = await this.userPreferencesManager.resetUserPreference(id, key);
    
    return res.status(200).json(formatSuccess(updatedPreferences, `Preference '${key}' reset successfully`));
  }

  /**
   * Get the current user's profile
   * This method retrieves detailed profile information for the currently authenticated user
   */
  async getUserProfile(req, res, _next) {
    const { email, id } = req.user;
    
    this.logger.debug('Getting user profile data via controller', { userId: id, email });
    
    // Get the user using UserService
    const user = await this.userService.getUserByEmail(email);
    
    if (!user) {
      this.logger.error('Authenticated user not found in DB for profile', { email });
      throw new UserNotFoundError(email);
    }
    
    // Create a profile object with all the necessary information
    // Using DTO mapper is cleaner here
    const userDto = UserDTOMapper.toDTO(user);
    // Construct profile DTO from user DTO if needed, or enhance UserDTO
    const profileData = {
      id: userDto.id,
      email: userDto.email,
      name: userDto.fullName || userDto.displayName,
      displayName: userDto.displayName,
      skillLevel: userDto.preferences?.general?.skillLevel || 'intermediate', // Example access
      profession: userDto.professionalTitle,
      focusAreas: userDto.focusAreas || [],
      // learningGoals: userDto.learningGoals || [], // Add if needed
      // preferredLearningStyle: userDto.preferences?.learning?.style, // Example access
      createdAt: userDto.createdAt,
      updatedAt: userDto.updatedAt
    };
    
    this.logger.info('User profile retrieved successfully', { userId: id });
    
    // Return the profile data
    return res.status(200).json(formatSuccess(profileData, 'User profile retrieved successfully'));
  }

  /**
   * Update a user by ID (admin only)
   */
  async updateUser(req, res, _next) {
    const { id } = req.params;
    
    // Validate request body using Zod schema
    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.flatten().fieldErrors;
      throw new UserCreationError('Invalid update data', { validationErrors: formattedErrors });
    }
    
    // Use validated data
    const updateData = validationResult.data;
    
    this.logger.debug('Updating user by ID', { userId: id });
    
    // Check if user exists first
    const user = await this.userService.findById(id, true);
    
    if (!user) {
      throw new UserNotFoundError(id);
    }
    
    // Delegate to the UserService for update logic
    // Use user.id or user.email depending on what userService.updateUser expects
    const updatedUser = await this.userService.updateUser(user.id, updateData);
    
    // Convert domain entity to DTO
    const userDto = UserDTOMapper.toDTO(updatedUser);
    
    this.logger.info('User updated by ID', { userId: id });
    
    return res.status(200).json(formatSuccess(userDto, 'User updated successfully'));
  }

  /**
   * Delete a user by ID (admin only)
   */
  async deleteUser(req, res, _next) {
    const { id } = req.params;
    if (!id) {
      throw new UserCreationError('User ID is required');
    }
    this.logger.debug('Deleting user by ID via controller', { userId: id });
    
    // Use UserService to delete the user
    // Service handles existence check and cache invalidation
    const deleted = await this.userService.deleteUser(id);
    
    if (!deleted) {
        // This might happen if the service's findById check fails just before delete,
        // or if repo.delete doesn't return the expected structure. Service logs warning.
         throw new UserUpdateError('User deletion failed or could not be confirmed');
    }
    
    this.logger.info('User deleted', { userId: id });
    
    return res.status(200).json(formatSuccess(null, 'User deleted successfully'));
  }

  /**
   * Register user interest (minimal profile creation)
   * Public endpoint, no authentication required.
   */
  async registerUserInterest(req, res, next) {
    const { email, name } = req.body;
    
    this.logger.info('Processing user interest registration', { email });
    
    try {
      // Check if user exists first (using the repository)
      let existingUser = null;
      try {
        // Attempt to find the user, but don't fail the whole request if this errors
        existingUser = await this.userService.getUserByEmail(email);
      } catch (lookupError) {
        this.logger.warn('Error checking for existing user during registration, proceeding...', { 
          email, 
          errorMessage: lookupError.message 
        });
        // Continue, as the main goal is registration if they don't exist.
      }
      
      if (existingUser) {
        this.logger.info('User interest registration attempt for existing email', { email });
        // Return 409 Conflict if user already exists
        return res.status(409).json(formatSuccess(null, 'Email address is already registered. Please log in or reset your password.'));
      }
      
      // Ensure repository is available
      if (!this.userService) {
          this.logger.error('User repository is not available for registration');
          // Use next to pass the error to the central handler
          return next(new Error('User repository is not available')); 
      }
      
      // Create minimal user using the repository method
      const userData = await this.userService.createMinimalUser({
        email,
        name
      });
      
      // Check if userData was returned (should always have data on success)
      if (!userData || !userData.id) {
          this.logger.error('createMinimalUser returned invalid data', { email });
          return next(new Error('Failed to create user profile after registration.'));
      }

      this.logger.info('User interest registered successfully via repository', { 
        email, 
        userId: userData.id 
      });
      
      // Convert database model (snake_case) to a simplified DTO (camelCase) for response
      const userDto = {
        id: userData.id,
        email: userData.email,
        name: userData.name, // DB field is 'name'
        createdAt: userData.created_at // DB field is 'created_at'
      };
      
      // Return 201 Created
      return res.status(201).json(formatSuccess(userDto, 'User profile created successfully'));
      
    } catch (error) {
      // Catch errors from findByEmail (if not handled above) or createMinimalUser
      this.logger.error('Error during user interest registration process', {
        email,
        errorName: error.name,
        errorMessage: error.message,
        // Avoid logging full stack in production, but useful for debug
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      });
      
      // Pass the error to the centralized error handler
      next(error); 
    }
  }
}
export default UserController;