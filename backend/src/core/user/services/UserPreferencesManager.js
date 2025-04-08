import { 
  preferencesSchema, 
  validatePreferenceCategory, 
  getDefaultPreferences,
  isValidPreferenceCategory 
} from "#app/core/user/schemas/preferencesSchema.js";
import { UserNotFoundError, UserCreationError } from "#app/core/user/errors/UserErrors.js";
import { withServiceErrorHandling, createErrorMapper } from "#app/core/infra/errors/errorStandardization.js";
import { logger as appLogger } from "#app/core/infra/logging/logger.js";
import { userLogger } from "#app/core/infra/logging/domainLogger.js";
import { validateDependencies } from "#app/core/shared/utils/serviceUtils.js";

const PREFERENCES_CACHE_TTL = 3600; // 1 hour

// Create an error mapper for the preferences manager
const preferenceErrorMapper = createErrorMapper({
  'UserNotFoundError': UserNotFoundError,
  'ValidationError': UserCreationError,
}, UserCreationError);

/**
 * Manages user preferences with validation, defaults, and schema enforcement
 * 
 * This service provides a centralized way to manage user preferences,
 * ensuring consistency, validation, and proper defaults across the application.
 */
export default class UserPreferencesManager {
  /**
   * Create a new UserPreferencesManager
   * @param {Object} dependencies - Dependencies
   * @param {Object} dependencies.userService - User service
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({ userService, logger }) {
    this.userService = userService;
    this.logger = logger || appLogger.child({ component: 'user-preferences-manager' });

    // Apply standardized error handling
    this.getUserPreferences = withServiceErrorHandling(this.getUserPreferences.bind(this), {
      methodName: 'getUserPreferences',
      domainName: 'userPreferences',
      logger: this.logger,
      errorMapper: preferenceErrorMapper
    });

    this.getUserPreferencesByCategory = withServiceErrorHandling(this.getUserPreferencesByCategory.bind(this), {
      methodName: 'getUserPreferencesByCategory',
      domainName: 'userPreferences',
      logger: this.logger,
      errorMapper: preferenceErrorMapper
    });

    this.updateUserPreferences = withServiceErrorHandling(this.updateUserPreferences.bind(this), {
      methodName: 'updateUserPreferences',
      domainName: 'userPreferences',
      logger: this.logger,
      errorMapper: preferenceErrorMapper
    });

    this.updateUserPreferencesByCategory = withServiceErrorHandling(this.updateUserPreferencesByCategory.bind(this), {
      methodName: 'updateUserPreferencesByCategory',
      domainName: 'userPreferences',
      logger: this.logger,
      errorMapper: preferenceErrorMapper
    });

    this.setUserPreference = withServiceErrorHandling(this.setUserPreference.bind(this), {
      methodName: 'setUserPreference',
      domainName: 'userPreferences',
      logger: this.logger,
      errorMapper: preferenceErrorMapper
    });

    this.resetUserPreference = withServiceErrorHandling(this.resetUserPreference.bind(this), {
      methodName: 'resetUserPreference',
      domainName: 'userPreferences',
      logger: this.logger,
      errorMapper: preferenceErrorMapper
    });
  }

  /**
   * Get all preferences for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User preferences
   */
  async getUserPreferences(userId) {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserNotFoundError(`User with ID ${userId} not found`);
    }

    // Return current preferences merged with defaults
    const defaultPrefs = getDefaultPreferences();
    return { ...defaultPrefs, ...user.preferences };
  }

  /**
   * Get preferences for a specific category
   * @param {string} userId - User ID
   * @param {string} category - Preference category
   * @returns {Promise<Object>} Category preferences
   */
  async getUserPreferencesByCategory(userId, category) {
    if (!isValidPreferenceCategory(category)) {
      throw new UserCreationError(`Invalid preference category: ${category}`);
    }

    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserNotFoundError(`User with ID ${userId} not found`);
    }

    // Get defaults for this category
    const defaultPrefs = getDefaultPreferences();
    const categoryDefaults = defaultPrefs[category] || {};
    
    // Get user's current preferences for this category
    const userCategoryPrefs = user.preferences?.[category] || {};

    // Merge defaults with user preferences
    return { ...categoryDefaults, ...userCategoryPrefs };
  }

  /**
   * Update all user preferences
   * @param {string} userId - User ID
   * @param {Object} newPreferences - New preferences
   * @returns {Promise<Object>} Updated user preferences
   */
  async updateUserPreferences(userId, newPreferences) {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserNotFoundError(`User with ID ${userId} not found`);
    }

    try {
      // Validate preferences against schema
      const validatedPreferences = preferencesSchema.parse(newPreferences);

      // Update user
      const updatedUser = await this.userService.updateUser(userId, { preferences: validatedPreferences });
      
      return updatedUser.preferences;
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('; ');
        throw new UserCreationError(`Invalid preferences: ${formattedErrors}`);
      }
      throw error;
    }
  }

  /**
   * Update preferences for a specific category
   * @param {string} userId - User ID
   * @param {string} category - Preference category
   * @param {Object} categoryPreferences - New category preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updateUserPreferencesByCategory(userId, category, categoryPreferences) {
    if (!isValidPreferenceCategory(category)) {
      throw new UserCreationError(`Invalid preference category: ${category}`);
    }

    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserNotFoundError(`User with ID ${userId} not found`);
    }

    try {
      // Validate category preferences
      const validatedCategoryPrefs = validatePreferenceCategory(category, categoryPreferences);

      // Create updated preferences object
      const currentPrefs = user.preferences || {};
      const updatedPreferences = {
        ...currentPrefs,
        [category]: validatedCategoryPrefs
      };

      // Update user
      const updatedUser = await this.userService.updateUser(userId, { preferences: updatedPreferences });
      
      return updatedUser.preferences[category];
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('; ');
        throw new UserCreationError(`Invalid ${category} preferences: ${formattedErrors}`);
      }
      throw error;
    }
  }

  /**
   * Set a single user preference
   * @param {string} userId - User ID
   * @param {string} key - Preference key (dot notation for nested, e.g. 'ui.theme')
   * @param {any} value - Preference value
   * @returns {Promise<Object>} Updated user preferences
   */
  async setUserPreference(userId, key, value) {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserNotFoundError(`User with ID ${userId} not found`);
    }

    // Parse key path
    const keyParts = key.split('.');
    if (keyParts.length < 1 || keyParts.length > 2) {
      throw new UserCreationError('Invalid preference key. Use format "category.name" or "name"');
    }

    try {
      // Get current preferences
      const currentPrefs = user.preferences || {};
      let updatedPrefs = { ...currentPrefs };

      // Handle nested preference
      if (keyParts.length === 2) {
        const [category, prefName] = keyParts;
        
        // Validate category
        if (!isValidPreferenceCategory(category)) {
          throw new UserCreationError(`Invalid preference category: ${category}`);
        }

        // Initialize category if needed
        if (!updatedPrefs[category]) {
          updatedPrefs[category] = {};
        }

        // Update the specific preference
        updatedPrefs = {
          ...updatedPrefs,
          [category]: {
            ...updatedPrefs[category],
            [prefName]: value
          }
        };

        // Validate the updated category
        const validatedCategory = validatePreferenceCategory(category, updatedPrefs[category]);
        updatedPrefs[category] = validatedCategory;
      } else {
        // Top-level preference
        updatedPrefs[keyParts[0]] = value;
        
        // Validate full preferences
        updatedPrefs = preferencesSchema.parse(updatedPrefs);
      }

      // Update user
      const updatedUser = await this.userService.updateUser(userId, { preferences: updatedPrefs });
      return updatedUser.preferences;
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('; ');
        throw new UserCreationError(`Invalid preference value: ${formattedErrors}`);
      }
      throw error;
    }
  }

  /**
   * Reset a preference to its default value
   * @param {string} userId - User ID
   * @param {string} key - Preference key (dot notation)
   * @returns {Promise<Object>} Updated user preferences
   */
  async resetUserPreference(userId, key) {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new UserNotFoundError(`User with ID ${userId} not found`);
    }

    // Parse key path
    const keyParts = key.split('.');
    if (keyParts.length < 1 || keyParts.length > 2) {
      throw new UserCreationError('Invalid preference key. Use format "category.name" or "name"');
    }

    // Get default preferences
    const defaultPrefs = getDefaultPreferences();
    const currentPrefs = user.preferences || {};
    let updatedPrefs = { ...currentPrefs };

    // Handle nested preference
    if (keyParts.length === 2) {
      const [category, prefName] = keyParts;
      
      // Validate category
      if (!isValidPreferenceCategory(category)) {
        throw new UserCreationError(`Invalid preference category: ${category}`);
      }

      // Get default value
      const defaultValue = defaultPrefs[category]?.[prefName];
      if (defaultValue === undefined) {
        throw new UserCreationError(`Unknown preference: ${key}`);
      }

      // Initialize category if needed
      if (!updatedPrefs[category]) {
        updatedPrefs[category] = {};
      }

      // Set to default value
      updatedPrefs = {
        ...updatedPrefs,
        [category]: {
          ...updatedPrefs[category],
          [prefName]: defaultValue
        }
      };
    } else {
      // Top-level preference reset
      const topLevelKey = keyParts[0];
      const defaultValue = defaultPrefs[topLevelKey];
      if (defaultValue === undefined) {
        throw new UserCreationError(`Unknown preference: ${key}`);
      }
      
      updatedPrefs[topLevelKey] = defaultValue;
    }

    // Update user
    const updatedUser = await this.userService.updateUser(userId, { preferences: updatedPrefs });
    return updatedUser.preferences;
  }

  /**
   * Get default value for a preference
   * @param {string} key - Preference key (dot notation)
   * @returns {any} Default preference value
   */
  getDefaultPreferenceValue(key) {
    const defaultPrefs = getDefaultPreferences();
    const keyParts = key.split('.');

    if (keyParts.length === 1) {
      return defaultPrefs[keyParts[0]];
    } else if (keyParts.length === 2) {
      const [category, prefName] = keyParts;
      return defaultPrefs[category]?.[prefName];
    }
    
    return undefined;
  }
} 