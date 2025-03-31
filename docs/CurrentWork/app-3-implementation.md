# APP-3: Implement User Preferences Manager

## Overview

After analyzing the codebase, I've found that while there are basic preferences handling mechanisms in the User model (`setPreference` and `getPreference` methods), there's no dedicated service for managing preferences consistently. 

Currently:
1. The `User` model has basic preference methods
2. The tests reference `updateUserPreference()` which isn't fully implemented in UserService
3. There's no centralized preference validation or schema enforcement
4. No dedicated API endpoints for preference management

## Proposed Solution

I'll implement a dedicated User Preferences Manager with the following components:

### 1. Schema and Validation

Create a comprehensive preferences schema in Zod:
- Define all valid preference categories
- Define allowed values for each preference
- Ensure type safety and validation

### 2. User Preferences Manager Service

Create a new service class `UserPreferencesManager` that will:
- Validate preferences against the schema
- Get/set individual preferences
- Get/set preference categories
- Get default preferences
- Reset preferences to defaults
- Handle preference migrations when schema changes

### 3. API Endpoints

Add new routes to manage preferences:
- GET `/users/me/preferences` - Get all preferences
- GET `/users/me/preferences/:category` - Get preferences by category
- PUT `/users/me/preferences` - Update all preferences
- PUT `/users/me/preferences/:category` - Update preferences for a category
- PATCH `/users/me/preferences/:key` - Update a single preference
- DELETE `/users/me/preferences/:key` - Reset a preference to default

### 4. Controller Methods

Extend UserController with preference-specific methods:
- `getUserPreferences` - Get all preferences
- `getUserPreferencesByCategory` - Get preferences by category
- `updateUserPreferences` - Update multiple preferences
- `updateUserPreferencesByCategory` - Update preferences in a category
- `updateSinglePreference` - Update single preference
- `resetPreference` - Reset preference to default

### 5. Integration with UserService

Extend UserService with preference methods:
- `getUserPreferences(userId)` - Get all preferences
- `getUserPreferencesByCategory(userId, category)` - Get preferences by category
- `updateUserPreferences(userId, preferences)` - Update all preferences
- `updateUserPreferencesByCategory(userId, category, preferences)` - Update category
- `setUserPreference(userId, key, value)` - Set a single preference
- `resetUserPreference(userId, key)` - Reset to default

## Implementation Details

### Step 1: Create Preference Schemas

First, I'll define comprehensive preference schemas for different categories:

```javascript
// src/core/user/schemas/preferencesSchema.js
import { z } from 'zod';

// UI preferences schema
export const uiPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
  compactView: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  animationsEnabled: z.boolean().default(true),
}).strict();

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  challengeReminders: z.boolean().default(true),
  weeklyProgressReports: z.boolean().default(true),
  newFeaturesAnnouncements: z.boolean().default(true),
}).strict();

// AI interaction preferences schema
export const aiInteractionPreferencesSchema = z.object({
  detailLevel: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
  communicationStyle: z.enum(['formal', 'casual', 'technical']).default('casual'),
  responseFormat: z.enum(['structured', 'conversational', 'mixed']).default('mixed'),
  codeExamplesEnabled: z.boolean().default(true),
  includeExplanations: z.boolean().default(true),
}).strict();

// Learning preferences schema
export const learningPreferencesSchema = z.object({
  preferredChallengeTypes: z.array(z.string()).default([]),
  preferredDifficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).default('intermediate'),
  topicsToAvoid: z.array(z.string()).default([]),
  learningStyle: z.enum(['visual', 'auditory', 'reading', 'kinesthetic']).default('reading'),
  preferredFeedbackStyle: z.enum(['direct', 'gentle', 'detailed', 'minimal']).default('detailed'),
}).strict();

// Complete preferences schema
export const preferencesSchema = z.object({
  ui: uiPreferencesSchema.default({}),
  notifications: notificationPreferencesSchema.default({}),
  aiInteraction: aiInteractionPreferencesSchema.default({}),
  learning: learningPreferencesSchema.default({}),
}).strict();

// Schema for getting default preferences
export function getDefaultPreferences() {
  return preferencesSchema.parse({});
}

// Helper for validating preferences by category
export function validatePreferenceCategory(category, data) {
  switch (category) {
    case 'ui':
      return uiPreferencesSchema.parse(data);
    case 'notifications':
      return notificationPreferencesSchema.parse(data);
    case 'aiInteraction':
      return aiInteractionPreferencesSchema.parse(data);
    case 'learning':
      return learningPreferencesSchema.parse(data);
    default:
      throw new Error(`Unknown preference category: ${category}`);
  }
}
```

### Step 2: Create UserPreferencesManager Service

Next, I'll create the service class:

```javascript
// src/core/user/services/UserPreferencesManager.js
import { preferencesSchema, validatePreferenceCategory, getDefaultPreferences } from '../schemas/preferencesSchema.js';
import { UserNotFoundError, UserValidationError } from '../errors/UserErrors.js';
import { withServiceErrorHandling, createErrorMapper } from '../../infra/errors/errorStandardization.js';

// Create an error mapper for the preferences manager
const preferenceErrorMapper = createErrorMapper({
  'UserNotFoundError': UserNotFoundError,
  'UserValidationError': UserValidationError,
}, UserValidationError);

/**
 * Manages user preferences with validation, defaults, and schema enforcement
 */
export default class UserPreferencesManager {
  /**
   * Create a new UserPreferencesManager
   * @param {Object} dependencies - Dependencies
   * @param {Object} dependencies.userService - User service
   * @param {Object} dependencies.logger - Logger
   */
  constructor({ userService, logger }) {
    this.userService = userService;
    this.logger = logger;

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
    if (!['ui', 'notifications', 'aiInteraction', 'learning'].includes(category)) {
      throw new UserValidationError(`Invalid preference category: ${category}`);
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
      user.preferences = validatedPreferences;
      const updatedUser = await this.userService.updateUser(userId, { preferences: validatedPreferences });
      
      return updatedUser.preferences;
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('; ');
        throw new UserValidationError(`Invalid preferences: ${formattedErrors}`);
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
    if (!['ui', 'notifications', 'aiInteraction', 'learning'].includes(category)) {
      throw new UserValidationError(`Invalid preference category: ${category}`);
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
      user.preferences = updatedPreferences;
      const updatedUser = await this.userService.updateUser(userId, { preferences: updatedPreferences });
      
      return updatedUser.preferences[category];
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('; ');
        throw new UserValidationError(`Invalid ${category} preferences: ${formattedErrors}`);
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
      throw new UserValidationError('Invalid preference key. Use format "category.name" or "name"');
    }

    try {
      // Get current preferences
      const currentPrefs = user.preferences || {};
      let updatedPrefs = { ...currentPrefs };

      // Handle nested preference
      if (keyParts.length === 2) {
        const [category, prefName] = keyParts;
        
        // Validate category
        if (!['ui', 'notifications', 'aiInteraction', 'learning'].includes(category)) {
          throw new UserValidationError(`Invalid preference category: ${category}`);
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
        // Top-level preference (rare, but supported)
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
        throw new UserValidationError(`Invalid preference value: ${formattedErrors}`);
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
      throw new UserValidationError('Invalid preference key. Use format "category.name" or "name"');
    }

    // Get default preferences
    const defaultPrefs = getDefaultPreferences();
    const currentPrefs = user.preferences || {};
    let updatedPrefs = { ...currentPrefs };

    // Handle nested preference
    if (keyParts.length === 2) {
      const [category, prefName] = keyParts;
      
      // Validate category
      if (!['ui', 'notifications', 'aiInteraction', 'learning'].includes(category)) {
        throw new UserValidationError(`Invalid preference category: ${category}`);
      }

      // Get default value
      const defaultValue = defaultPrefs[category]?.[prefName];
      if (defaultValue === undefined) {
        throw new UserValidationError(`Unknown preference: ${key}`);
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
        throw new UserValidationError(`Unknown preference: ${key}`);
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
```

### Step 3: Add API Routes and Controller Methods

Next, I'll extend the User controller and add routes:

```javascript
// Add new methods to UserController
// src/core/user/controllers/UserController.js

// Constructor dependency injection
constructor({
  userService,
  userRepository,
  userPreferencesManager, // Add this dependency
  focusAreaCoordinator,
  logger
}) {
  // ... existing code ...
  this.userPreferencesManager = userPreferencesManager;
  
  // Apply standardized error handling to preference methods
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
}

/**
 * Get all preferences for the current user
 */
async getUserPreferences(req, res, _next) {
  const { id } = req.user;
  
  this.logger.debug('Getting user preferences', { userId: id });
  const preferences = await this.userPreferencesManager.getUserPreferences(id);
  
  return res.success({
    preferences
  }, 'User preferences retrieved successfully');
}

/**
 * Get preferences for a specific category for the current user
 */
async getUserPreferencesByCategory(req, res, _next) {
  const { id } = req.user;
  const { category } = req.params;
  
  this.logger.debug('Getting user preferences by category', { userId: id, category });
  const preferences = await this.userPreferencesManager.getUserPreferencesByCategory(id, category);
  
  return res.success({
    [category]: preferences
  }, `${category} preferences retrieved successfully`);
}

/**
 * Update all preferences for the current user
 */
async updateUserPreferences(req, res, _next) {
  const { id } = req.user;
  const { preferences } = req.body;
  
  this.logger.debug('Updating user preferences', { userId: id });
  const updatedPreferences = await this.userPreferencesManager.updateUserPreferences(id, preferences);
  
  return res.success({
    preferences: updatedPreferences
  }, 'User preferences updated successfully');
}

/**
 * Update preferences for a specific category for the current user
 */
async updateUserPreferencesByCategory(req, res, _next) {
  const { id } = req.user;
  const { category } = req.params;
  const categoryPreferences = req.body;
  
  this.logger.debug('Updating user preferences by category', { userId: id, category });
  const updatedPreferences = await this.userPreferencesManager.updateUserPreferencesByCategory(
    id, category, categoryPreferences
  );
  
  return res.success({
    [category]: updatedPreferences
  }, `${category} preferences updated successfully`);
}

/**
 * Update a single preference for the current user
 */
async updateSinglePreference(req, res, _next) {
  const { id } = req.user;
  const { key } = req.params;
  const { value } = req.body;
  
  this.logger.debug('Updating single user preference', { userId: id, key });
  const updatedPreferences = await this.userPreferencesManager.setUserPreference(id, key, value);
  
  return res.success({
    preferences: updatedPreferences
  }, `Preference ${key} updated successfully`);
}

/**
 * Reset a preference to its default value for the current user
 */
async resetPreference(req, res, _next) {
  const { id } = req.user;
  const { key } = req.params;
  
  this.logger.debug('Resetting user preference', { userId: id, key });
  const updatedPreferences = await this.userPreferencesManager.resetUserPreference(id, key);
  
  return res.success({
    preferences: updatedPreferences
  }, `Preference ${key} reset to default successfully`);
}
```

### Step 4: Add Routes

Now, I'll add the routes to the User routes:

```javascript
// Preference routes
router.get('/me/preferences',
  authenticateUser,
  userController.getUserPreferences.bind(userController)
);

router.get('/me/preferences/:category',
  authenticateUser,
  ...createValidationMiddleware({ params: userApiSchemas.preferencesCategoryParamSchema }),
  userController.getUserPreferencesByCategory.bind(userController)
);

router.put('/me/preferences',
  authenticateUser,
  ...createValidationMiddleware({ body: userApiSchemas.preferencesUpdateSchema }),
  userController.updateUserPreferences.bind(userController)
);

router.put('/me/preferences/:category',
  authenticateUser,
  ...createValidationMiddleware({ 
    params: userApiSchemas.preferencesCategoryParamSchema,
    body: userApiSchemas.preferencesCategoryUpdateSchema 
  }),
  userController.updateUserPreferencesByCategory.bind(userController)
);

router.patch('/me/preferences/:key',
  authenticateUser,
  ...createValidationMiddleware({ 
    params: userApiSchemas.preferencesKeyParamSchema,
    body: userApiSchemas.preferenceValueSchema 
  }),
  userController.updateSinglePreference.bind(userController)
);

router.delete('/me/preferences/:key',
  authenticateUser,
  ...createValidationMiddleware({ params: userApiSchemas.preferencesKeyParamSchema }),
  userController.resetPreference.bind(userController)
);
```

### Step 5: Add Missing Schemas

Finally, I'll add the required schemas to the userApiSchemas:

```javascript
// Add to src/core/user/schemas/userApiSchemas.js

// Schema for preference category param
export const preferencesCategoryParamSchema = z.object({
  category: z.enum(['ui', 'notifications', 'aiInteraction', 'learning'], {
    errorMap: () => ({ message: 'Category must be one of: ui, notifications, aiInteraction, learning' })
  })
}).strict();

// Schema for preference key param
export const preferencesKeyParamSchema = z.object({
  key: z.string().min(1).regex(/^[a-zA-Z0-9.]+$/, {
    message: 'Preference key must contain only letters, numbers, and dots'
  })
}).strict();

// Schema for preferences update
export const preferencesUpdateSchema = preferencesSchema;

// Schema for category-specific update
export const preferencesCategoryUpdateSchema = z.record(z.any());

// Schema for single preference value update
export const preferenceValueSchema = z.object({
  value: z.any()
}).strict();
```

## Testing Plan

1. Unit tests for `UserPreferencesManager` methods
2. Integration tests for the API routes
3. Validation tests for preference schemas

## Deliverables

1. New Files:
   - `src/core/user/services/UserPreferencesManager.js`
   - `src/core/user/schemas/preferencesSchema.js`
   - Test files for the new components

2. Modified Files:
   - `src/core/user/controllers/UserController.js` - Add preference methods
   - `src/core/user/schemas/userApiSchemas.js` - Add preference schemas
   - `src/core/infra/http/routes/userRoutes.js` - Add preference routes
   - `src/core/user/services/UserService.js` - Add references to UserPreferencesManager

3. Documentation:
   - API documentation for the new endpoints
   - Example usage for the preferences manager 