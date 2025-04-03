import express from 'express';
import userApiSchemas from "#app/core/user/schemas/userApiSchemas.js";
import { requireAdmin } from "#app/core/infra/http/middleware/auth.js";
import { authorizeUserSpecificResource } from "#app/core/infra/http/middleware/resourceAuth.js";
import { createValidationMiddleware } from "#app/core/infra/http/middleware/validationFactory.js";
import { logger as appLogger } from '#app/core/infra/logging/logger.js';
import { container } from "#app/config/container.js";
import { v4 as uuidv4 } from 'uuid';
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

  // --- Public Routes --- 

  /**
   * POST /register: 
   *   summary: Register user interest (minimal profile)
   *   description: Creates a basic user profile with just name and email, without authentication.
   *   tags: [Users, Public]
   *   requestBody:
   *     required: true
   *     content:
   *       application/json:
   *         schema:
   *           $ref: '#/components/schemas/RegisterUserInterestRequest'
   *   responses:
   *     201:
   *       description: User profile created successfully.
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterUserInterestResponse'
   *     400:
   *       $ref: '#/components/responses/ValidationError'
   *     409:
   *       description: Email already in use.
   */
  // Check if controller has registerUserInterest method before binding
  if (typeof userController.registerUserInterest === 'function') {
    router.post('/register', 
      ...createValidationMiddleware({ body: userApiSchemas.registerUserInterestSchema }),
      userController.registerUserInterest.bind(userController)
    );
    logger.info('Mounted /register route with controller method');
  } else {
    logger.error('registerUserInterest method not available on userController');
  }

  // --- Admin Routes (Require Admin) --- 

  // Get user by email (admin only)
  router.get('/email/:email', 
    requireAdmin,
    ...createValidationMiddleware({ params: userApiSchemas.emailParamSchema }),
    userController.getUserByEmail.bind(userController)
  );

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

  // --- Authenticated User Routes --- 
  // Note: Auth middleware is applied globally before these routes are hit

  // Create user (POST /) - Might be confusing, consider if this should be admin only or removed?
  // This looks like the old signup route that required a password.
  // Let's comment it out for now to avoid confusion with the new /register route.
  /*
  router.post('/', 
    ...createValidationMiddleware({ body: userApiSchemas.createUserSchema }), // This schema likely requires password
    userController.createUser.bind(userController)
  );
  */

  // Current user profile endpoints
  router.get('/me', 
    userController.getCurrentUser.bind(userController)
  );
  
  // Get user profile (assuming this is for the current user? duplicates /me?)
  // router.get('/profile', 
  //   userController.getUserProfile.bind(userController)
  // );
  
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
  router.get('/me/preferences',
    userController.getUserPreferences.bind(userController)
  );
  router.get('/me/preferences/:category',
    ...createValidationMiddleware({ params: userApiSchemas.preferencesCategoryParamSchema }),
    userController.getUserPreferencesByCategory.bind(userController)
  );
  router.put('/me/preferences',
    ...createValidationMiddleware({ body: userApiSchemas.preferencesUpdateSchema }),
    userController.updateUserPreferences.bind(userController)
  );
  router.put('/me/preferences/:category',
    ...createValidationMiddleware({ 
      params: userApiSchemas.preferencesCategoryParamSchema,
      body: userApiSchemas.preferencesCategoryUpdateSchema 
    }),
    userController.updateUserPreferencesByCategory.bind(userController)
  );
  router.patch('/me/preferences/:key',
    ...createValidationMiddleware({ 
      params: userApiSchemas.preferencesKeyParamSchema,
      body: userApiSchemas.preferenceValueSchema 
    }),
    userController.updateSinglePreference.bind(userController)
  );
  router.delete('/me/preferences/:key',
    ...createValidationMiddleware({ params: userApiSchemas.preferencesKeyParamSchema }),
    userController.resetPreference.bind(userController)
  );
  
  // --- Specific User Routes (Admin or Self) --- 

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

  logger.info('User routes configured.');
  return router;
}
