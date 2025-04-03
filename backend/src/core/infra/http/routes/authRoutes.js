'use strict';

import express from 'express';

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
  
  
  // Signup route
  router.post('/signup',
    validateBody ? validateBody({ email: 'string', password: 'string', fullName: 'string' }) : [],
    authController.signup.bind(authController)
  );

  
  router.post('/refresh',
    validateBody ? validateBody({ refreshToken: 'string' }) : [],
    authController.refreshToken.bind(authController)
  );
  
  
  router.post('/logout', authController.logout.bind(authController));

  // Password reset endpoints
  router.post('/forgotPassword', authController.forgotPassword.bind(authController));
  router.post('/resetPassword', authController.resetPassword.bind(authController));

  // Email verification endpoints
  router.get('/verify-email', authController.verifyEmail.bind(authController));
  router.post('/send-verification-email', authController.sendVerificationEmail.bind(authController));

  // Get auth status - this is used by the verification script
  router.get('/status', (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Auth service is running',
      authenticated: false
    });
  });

  return router;
}

export default createAuthRoutes;
