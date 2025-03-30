import { supabaseClient } from "../../db/supabaseClient.js";
import { logger } from "../../logging/logger.js";
import { UserNotFoundError } from "../../../user/errors/UserErrors.js";
import { v4 as uuidv4 } from "uuid";
import { createErrorMapper, withControllerErrorHandling } from "../../errors/errorStandardization.js";
'use strict';
/**
 * Authentication Middleware
 *
 * Infrastructure middleware for handling authentication and authorization
 * Located in the infrastructure layer according to our DDD architecture
 */
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
      errorType: 'AUTH_ERROR'
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
// Create an error mapper for authentication
const authErrorMapper = createErrorMapper({
  TokenError: TokenError,
  PermissionError: PermissionError,
  UserNotFoundError: UserNotFoundError,
  Error: AuthError
}, AuthError);
/**
 * The actual authentication logic separated from the middleware wrapper
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const performAuthentication = async req => {
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
      updatedAt: new Date().toISOString()
    };
    return;
  }
  // 1. Get token from request header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TokenError('No token provided or invalid format');
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new TokenError('No token provided');
  }
  logger.debug('Processing authentication request', {
    tokenPrefix: token.substring(0, 10)
  });
  // 2. Use the centralized Supabase client from infrastructure layer
  const supabase = supabaseClient;
  // 3. Verify the token with Supabase Auth
  const {
    data: userData,
    error: authError
  } = await supabase.auth.getUser(token);
  if (authError) {
    logger.error('Token verification failed', {
      error: authError.message
    });
    throw new TokenError(`Invalid token: ${authError.message}`);
  }
  if (!userData || !userData.user) {
    logger.error('No user data returned from token verification');
    throw new TokenError('Invalid token: no user data returned');
  }
  logger.debug('User authenticated successfully', {
    email: userData.user.email
  });
  // 4. Look up the user in our database
  const {
    data: dbUser,
    error: dbError
  } = await supabase.from('users').select('*').eq('email', userData.user.email).single();
  if (dbError) {
    logger.error('Database lookup error', {
      error: dbError.message
    });
    throw new AuthError(`Database error: ${dbError.message}`, 500);
  }
  if (!dbUser) {
    logger.error('User not found in database', {
      email: userData.user.email
    });
    throw new UserNotFoundError(userData.user.email);
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
    updatedAt: dbUser.updated_at
  };
  logger.debug('Authentication successful', {
    userId: req.user.id
  });
};
/**
 * Authenticate user from request - wrapped with standardized error handling
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateUser = async (req, res, next) => {
  try {
    await performAuthentication(req);
    next();
  } catch (error) {
    const mappedError = authErrorMapper(error, {
      methodName: 'authenticateUser',
      domainName: 'auth'
    });
    next(mappedError);
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
  req.id = uuidv4();
  next();
};
export { authenticateUser };
export { requireAdmin };
export { addRequestId };
export { AuthError };
export { TokenError };
export { PermissionError };
export default {
  authenticateUser,
  requireAdmin,
  addRequestId,
  AuthError,
  TokenError,
  PermissionError
};