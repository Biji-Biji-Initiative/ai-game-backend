'use strict';

/**
 * Authentication Middleware
 *
 * Infrastructure middleware for handling authentication and authorization
 * Located in the infrastructure layer according to our DDD architecture
 */

const { supabaseClient } = require('../../core/infra/db/supabaseClient');
const { logger } = require('../../core/infra/logging/logger');
// const container = require('../../../../config/container');

// Using domain-specific error classes
const { UserNotFoundError } = require('../../../user/errors/UserErrors');

/**
 * Authentication errors in the infrastructure layer
 */
class AuthError extends Error {
  /**
   * Method constructor
   */
  constructor(message, statusCode = 401) {
    super(message);
    this.statusCode = statusCode;
    this.status = 'fail';
    this.isOperational = true;
    this.metadata = {
      domain: 'auth',
      errorType: 'AUTH_ERROR',
    };
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a JWT token is invalid or missing
 */
class TokenError extends AuthError {
  /**
   * Method constructor
   */
  constructor(message = 'Invalid or missing token') {
    super(message, 401);
    this.metadata.errorType = 'TOKEN_ERROR';
  }
}

/**
 * Error thrown when a user lacks required permissions
 */
class PermissionError extends AuthError {
  /**
   * Method constructor
   */
  constructor(requiredRole = 'admin') {
    super(`Forbidden: '${requiredRole}' role required`, 403);
    this.metadata.errorType = 'PERMISSION_ERROR';
  }
}

/**
 * Authenticate user from request
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateUser = async (req, res, next) => {
  try {
    // TESTING ONLY: For endpoints that don't need authentication in development
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
      logger.info('BYPASS MODE: Authentication bypassed in development mode');

      req.user = {
        id: 'a46bfa50-d4a1-408c-bbcc-faed77fc7d2a',
        email: 'testuser@test.com',
        fullName: 'Test User',
        professionalTitle: 'Software Engineer',
        location: 'San Francisco',
        country: 'USA',
        focusArea: 'Testing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return next();
    }

    // 1. Get token from request header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new TokenError('No token provided or invalid format'));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next(new TokenError('No token provided'));
    }

    logger.debug('Processing authentication request', { tokenPrefix: token.substring(0, 10) });

    // 2. Use the centralized Supabase client from infrastructure layer
    const supabase = supabaseClient;

    // 3. Verify the token with Supabase Auth
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      logger.error('Token verification failed', { error: authError.message });
      return next(new TokenError(`Invalid token: ${authError.message}`));
    }

    if (!userData || !userData.user) {
      logger.error('No user data returned from token verification');
      return next(new TokenError('Invalid token: no user data returned'));
    }

    logger.debug('User authenticated successfully', { email: userData.user.email });

    // 4. Look up the user in our database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userData.user.email)
      .single();

    if (dbError) {
      logger.error('Database lookup error', { error: dbError.message });
      return next(new AuthError(`Database error: ${dbError.message}`, 500));
    }

    if (!dbUser) {
      logger.error('User not found in database', { email: userData.user.email });
      return next(new UserNotFoundError(userData.user.email));
    }

    // 5. Create a domain User object from the database record
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      professionalTitle: dbUser.professional_title,
      location: dbUser.location,
      country: dbUser.country,
      focusArea: dbUser.focus_area,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
    };

    logger.debug('Authentication successful', { userId: req.user.id });
    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message, stack: error.stack });
    return next(new AuthError(`Authentication failed: ${error.message}`, 500));
  }
};

/**
 * Middleware to require admin role
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new TokenError('Authentication required'));
  }

  if (!req.user.isAdmin) {
    return next(new PermissionError('admin'));
  }

  next();
};

/**
 * Add request ID to each request for tracking
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const addRequestId = (req, res, next) => {
  const { v4: uuidv4 } = require('uuid');
  req.id = uuidv4();
  next();
};

module.exports = {
  authenticateUser,
  requireAdmin,
  addRequestId,
  // Export error classes for use in tests and other modules
  AuthError,
  TokenError,
  PermissionError,
};
