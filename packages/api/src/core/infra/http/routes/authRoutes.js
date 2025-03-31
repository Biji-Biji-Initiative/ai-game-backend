import express from 'express';
'use strict';

/**
 * Authentication Routes
 * 
 * Creates routes for authentication operations.
 * Following the dependency injection pattern, this module exports a function
 * that accepts pre-resolved dependencies rather than creating them internally.
 * 
 * @param {Object} deps - Dependencies required by these routes
 * @param {Object} deps.authController - Resolved auth controller instance
 * @param {Object} deps.validation - Validation middleware
 * @returns {Object} Express router with auth routes
 */
function createAuthRoutes({ authController, validation }) {
  const router = express.Router();
  const { validateBody } = validation || {};
  
  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: User login
   *     description: Authenticates a user and returns a JWT token. Tokens are valid for 24 hours.
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address
   *               password:
   *                 type: string
   *                 format: password
   *                 description: User's password
   *           examples:
   *             loginExample:
   *               summary: Example login request
   *               value:
   *                 email: "user@example.com"
   *                 password: "securePassword123"
   *     responses:
   *       200:
   *         description: Login successful
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
   *                     token:
   *                       type: string
   *                       description: JWT authentication token
   *                     user:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         email:
   *                           type: string
   *                         fullName:
   *                           type: string
   *             examples:
   *               loginSuccess:
   *                 summary: Successful login response
   *                 value:
   *                   success: true
   *                   data:
   *                     token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
   *                     user:
   *                       id: "550e8400-e29b-41d4-a716-446655440000"
   *                       email: "user@example.com"
   *                       fullName: "John Doe"
   *                       role: "user"
   *                       createdAt: "2023-01-15T08:30:25.000Z"
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Invalid email or password"
   *       429:
   *         $ref: '#/components/responses/RateLimitError'
   */
  // Login route
  router.post('/login', 
    validateBody ? validateBody({ email: 'string', password: 'string' }) : [],
    authController.login.bind(authController)
  );
  
  /**
   * @swagger
   * /auth/signup:
   *   post:
   *     summary: User registration
   *     description: Creates a new user account and returns a JWT token for immediate authentication.
   *     tags: [Auth]
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
   *                 description: User's email address (must be unique)
   *               password:
   *                 type: string
   *                 format: password
   *                 description: User's password (minimum 8 characters, requires letters and numbers)
   *               fullName:
   *                 type: string
   *                 description: User's full name
   *           examples:
   *             signupExample:
   *               summary: Example signup request
   *               value:
   *                 email: "newuser@example.com"
   *                 password: "securePassword123"
   *                 fullName: "Jane Smith"
   *     responses:
   *       201:
   *         description: User created successfully
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
   *                     token:
   *                       type: string
   *                       description: JWT authentication token
   *                     user:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         email:
   *                           type: string
   *                         fullName:
   *                           type: string
   *             examples:
   *               signupSuccess:
   *                 summary: Successful signup response
   *                 value:
   *                   success: true
   *                   data:
   *                     token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUgU21pdGgiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
   *                     user:
   *                       id: "6729a051-f5da-42e1-9626-142157770000"
   *                       email: "newuser@example.com"
   *                       fullName: "Jane Smith"
   *                       role: "user"
   *                       createdAt: "2023-05-22T14:56:38.000Z"
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       409:
   *         description: Email already in use
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Email address is already registered"
   *       429:
   *         $ref: '#/components/responses/RateLimitError'
   */
  // Signup route
  router.post('/signup',
    validateBody ? validateBody({ email: 'string', password: 'string', fullName: 'string' }) : [],
    authController.signup.bind(authController)
  );

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     summary: Refresh authentication token
   *     description: Generates a new JWT token using a valid refresh token
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refreshToken
   *             properties:
   *               refreshToken:
   *                 type: string
   *                 description: Refresh token received during login
   *           examples:
   *             refreshTokenExample:
   *               summary: Example refresh token request
   *               value:
   *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
   *     responses:
   *       200:
   *         description: Token refreshed successfully
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
   *                     token:
   *                       type: string
   *                       description: New JWT authentication token
   *                     refreshToken:
   *                       type: string
   *                       description: New refresh token
   *             examples:
   *               refreshSuccess:
   *                 summary: Successful token refresh
   *                 value:
   *                   success: true
   *                   data:
   *                     token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
   *                     refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         description: Invalid or expired refresh token
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: "Invalid or expired refresh token"
   *       429:
   *         $ref: '#/components/responses/RateLimitError'
   */
  router.post('/refresh',
    validateBody ? validateBody({ refreshToken: 'string' }) : [],
    authController.refreshToken.bind(authController)
  );
  
  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: Logout user
   *     description: Invalidates the current user's tokens
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Successfully logged out"
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  router.post('/logout', authController.logout.bind(authController));

  // Password reset endpoints
  router.post('/forgotPassword', authController.forgotPassword.bind(authController));
  router.post('/resetPassword', authController.resetPassword.bind(authController));

  // Get auth status - this is used by the verification script
  router.get('/status', authController.getStatus.bind(authController));

  return router;
}

export default createAuthRoutes;
