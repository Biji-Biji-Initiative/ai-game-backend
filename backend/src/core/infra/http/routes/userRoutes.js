import express from 'express';
import userApiSchemas from "#app/core/user/schemas/userApiSchemas.js";
import { requireAdmin } from "#app/core/infra/http/middleware/auth.js";
import { authorizeUserSpecificResource } from "#app/core/infra/http/middleware/resourceAuth.js";
import { createValidationMiddleware } from "#app/core/infra/http/middleware/validationFactory.js";
import { logger as appLogger } from '#app/core/infra/logging/logger.js';
'use strict';

/**
 * User Routes
 * 
 * Creates routes for user-related operations.
 * Following the dependency injection pattern, this module exports a function
 * that accepts pre-resolved dependencies rather than creating them internally.
 * 
 * @param {Object} options - Dependencies and options
 * @param {Object} options.userController - User controller instance
 * @returns {Object} Express router with user routes
 */
export default function userRoutes(options) {
  const router = express.Router();
  const logger = appLogger.child({ component: 'UserRoutes' });
  
  // Extract userController from options - handles both direct controller and object param
  const userController = options.userController ? options.userController : options;
  
  // Check if we have a valid controller
  if (!userController || typeof userController.createUser !== 'function') {
    logger.error('Invalid userController provided to userRoutes');
    return router;
  }

  /**
   * /users:
   *   post:
   *     summary: Create a new user
   *     description: Creates a new user account
   *     tags: [Users]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *               - fullName
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address
   *               password:
   *                 type: string
   *                 format: password
   *                 description: User's password
   *               fullName:
   *                 type: string
   *                 description: User's full name
   *     responses:
   *       201:
   *         description: User created successfully
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       409:
   *         description: Email already in use
   */
  // Create user (public endpoint for signup)
  router.post('/', 
    ...createValidationMiddleware({ body: userApiSchemas.createUserSchema }),
    userController.createUser.bind(userController)
  );
  
  // Get user by email (admin only)
  router.get('/email/:email', 
    requireAdmin,
    ...createValidationMiddleware({ params: userApiSchemas.emailParamSchema }),
    userController.getUserByEmail.bind(userController)
  );
  
  // Current user profile endpoints
  router.get('/me', 
    userController.getCurrentUser.bind(userController)
  );
  
  // Get user profile
  router.get('/profile', 
    userController.getUserProfile.bind(userController)
  );
  
  // Update current user profile
  router.put('/me', 
    ...createValidationMiddleware({ body: userApiSchemas.updateUserSchema }),
    userController.updateCurrentUser.bind(userController)
  );
  
  // Update current user focus area
  router.put('/me/focus-area', 
    ...createValidationMiddleware({ body: userApiSchemas.updateFocusAreaSchema }),
    userController.setFocusArea.bind(userController)
  );
  
  // User preferences routes
  /**
   * Get all preferences for the current user
   */
  router.get('/me/preferences',
    userController.getUserPreferences.bind(userController)
  );

  /**
   * Get preferences for a specific category for the current user
   */
  router.get('/me/preferences/:category',
    ...createValidationMiddleware({ params: userApiSchemas.preferencesCategoryParamSchema }),
    userController.getUserPreferencesByCategory.bind(userController)
  );

  /**
   * Update all preferences for the current user
   */
  router.put('/me/preferences',
    ...createValidationMiddleware({ body: userApiSchemas.preferencesUpdateSchema }),
    userController.updateUserPreferences.bind(userController)
  );

  /**
   * Update preferences for a specific category for the current user
   */
  router.put('/me/preferences/:category',
    ...createValidationMiddleware({ 
      params: userApiSchemas.preferencesCategoryParamSchema,
      body: userApiSchemas.preferencesCategoryUpdateSchema 
    }),
    userController.updateUserPreferencesByCategory.bind(userController)
  );

  /**
   * Update a single preference for the current user
   */
  router.patch('/me/preferences/:key',
    ...createValidationMiddleware({ 
      params: userApiSchemas.preferencesKeyParamSchema,
      body: userApiSchemas.preferenceValueSchema 
    }),
    userController.updateSinglePreference.bind(userController)
  );

  /**
   * Reset a preference to its default value for the current user
   */
  router.delete('/me/preferences/:key',
    ...createValidationMiddleware({ params: userApiSchemas.preferencesKeyParamSchema }),
    userController.resetPreference.bind(userController)
  );
  
  // Get a specific user by ID (only if admin or same user)
  router.get('/:id', 
    authorizeUserSpecificResource('id'),
    ...createValidationMiddleware({ params: userApiSchemas.userIdSchema }),
    userController.getUserById.bind(userController)
  );
  
  // Update a specific user (only if admin or same user)
  if (typeof userController.updateUser === 'function') {
    router.put('/:id', 
      authorizeUserSpecificResource('id'),
      ...createValidationMiddleware({ 
        params: userApiSchemas.userIdSchema,
        body: userApiSchemas.updateUserSchema
      }),
      userController.updateUser.bind(userController)
    );
  }
  
  // List all users (admin only)
  router.get('/', 
    requireAdmin, 
    ...createValidationMiddleware({ query: userApiSchemas.listUsersQuerySchema }),
    userController.listUsers.bind(userController)
  );
  
  // Delete a user (admin only)
  if (typeof userController.deleteUser === 'function') {
    router.delete('/:id',
      requireAdmin,
      ...createValidationMiddleware({ params: userApiSchemas.userIdSchema }),
      userController.deleteUser.bind(userController)
    );
  }

  return router;
}
