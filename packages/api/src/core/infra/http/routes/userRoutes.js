"../../../user/schemas/userApiSchemas.js;
'use strict';

/**
 * User Routes
 * 
 * Creates routes for user-related operations.
 * Following the dependency injection pattern, this module exports a function
 * that accepts pre-resolved dependencies rather than creating them internally.
 * 
 * @param {Object} deps - Dependencies required by these routes
 * @param {Object} deps.userController - Resolved user controller instance
 * @param {Function} deps.authenticateUser - Authentication middleware
 * @param {Function} deps.requireAdmin - Admin role verification middleware
 * @param {Object} deps.validation - Validation middleware
 * @returns {Object} Express router with user routes
 */
function createUserRoutes({ userController, authenticateUser, requireAdmin, validation }) {
  const router = express.Router();
  const { validateBody, validateParams } = validation;
  const { updateUserSchema, updateFocusAreaSchema, userIdSchema } = userApiSchemas;

  /**
   * @swagger
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
  // Simple user creation
  router.post('/', userController.createUser.bind(userController));
  
  /**
   * @swagger
   * /users/email/{email}:
   *   get:
   *     summary: Get user by email
   *     description: Retrieves a user by their email address
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: email
   *         required: true
   *         schema:
   *           type: string
   *           format: email
   *         description: Email address of the user to retrieve
   *     responses:
   *       200:
   *         description: User retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     email:
   *                       type: string
   *                     fullName:
   *                       type: string
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  // Get user by email
  router.get('/email/:email', userController.getUserByEmail.bind(userController));
  
  /**
   * @swagger
   * /users/me:
   *   get:
   *     summary: Get current user profile
   *     description: Retrieves the profile of the currently authenticated user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     email:
   *                       type: string
   *                     fullName:
   *                       type: string
   *                     focusAreas:
   *                       type: array
   *                       items:
   *                         type: string
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  // User profile endpoints
  router.get('/me', authenticateUser, userController.getCurrentUser.bind(userController));
  
  /**
   * @swagger
   * /users/me:
   *   put:
   *     summary: Update current user profile
   *     description: Updates the profile of the currently authenticated user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fullName:
   *                 type: string
   *               password:
   *                 type: string
   *                 format: password
   *     responses:
   *       200:
   *         description: User profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     email:
   *                       type: string
   *                     fullName:
   *                       type: string
   *                     updatedAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  router.put('/me', 
    authenticateUser, 
    validateBody(updateUserSchema), 
    userController.updateCurrentUser.bind(userController)
  );
  
  /**
   * @swagger
   * /users/me/focus-area:
   *   put:
   *     summary: Update focus area
   *     description: Updates the focus area for the currently authenticated user
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - focusAreas
   *             properties:
   *               focusAreas:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: List of focus areas for the user
   *     responses:
   *       200:
   *         description: Focus area updated successfully
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  router.put('/me/focus-area', 
    authenticateUser, 
    validateBody(updateFocusAreaSchema), 
    userController.setFocusArea.bind(userController)
  );
  
  /**
   * @swagger
   * /users/{id}:
   *   get:
   *     summary: Get user by ID
   *     description: Retrieves a user by their ID (admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the user to retrieve
   *     responses:
   *       200:
   *         description: User retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     email:
   *                       type: string
   *                     fullName:
   *                       type: string
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         description: Forbidden - Admin access required
   *       404:
   *         $ref: '#/components/responses/NotFoundError'
   */
  // Admin user management endpoints
  router.get('/:id', 
    authenticateUser, 
    requireAdmin, 
    validateParams(userIdSchema), 
    userController.getUserById.bind(userController)
  );
  
  /**
   * @swagger
   * /users:
   *   get:
   *     summary: List all users
   *     description: Retrieves a list of all users (admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       email:
   *                         type: string
   *                       fullName:
   *                         type: string
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       403:
   *         description: Forbidden - Admin access required
   */
  router.get('/', 
    authenticateUser, 
    requireAdmin, 
    userController.listUsers.bind(userController)
  );

  return router;
}

export default createUserRoutes;
"