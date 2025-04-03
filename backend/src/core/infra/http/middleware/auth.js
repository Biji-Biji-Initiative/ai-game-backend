import { logger } from "#app/core/infra/logging/logger.js";
import { UserNotFoundError } from "#app/core/user/errors/UserErrors.js";
import { v4 as uuidv4 } from "uuid";
import { createErrorMapper, withControllerErrorHandling } from "#app/core/infra/errors/errorStandardization.js";
import { setUser, clearUser } from "#app/config/setup/sentry.js";
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
  constructor(message = 'Invalid or missing token', isExpired = false) {
    super(message, 401);
    this.metadata.errorType = isExpired ? 'TOKEN_EXPIRED_ERROR' : 'TOKEN_ERROR';
    this.isTokenExpired = isExpired;
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
 * @param {Object} supabase - The initialized Supabase client instance
 */
const performAuthentication = async (req, supabase) => {
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
  // 2. Use the PROVIDED Supabase client
  if (!supabase) {
    logger.error('Supabase client was not provided to performAuthentication');
    throw new AuthError('Authentication configuration error', 500);
  }
  // 3. Verify the token with Supabase Auth
  const {
    data: userData,
    error: authError
  } = await supabase.auth.getUser(token);
  if (authError) {
    logger.error('Token verification failed', {
      error: authError.message,
      code: authError.code || 'unknown'
    });
    
    // Check if the error is specifically about token expiration
    if (authError.message?.includes('expired') || authError.code === 'PGRST301') {
      throw new TokenError('Token expired', true); // Pass a second parameter to indicate expiration specifically
    }
    
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
  
  if (dbError && dbError.code !== 'PGRST116') { // PGRST116 is the "not found" error code
    logger.error('Database lookup error', {
      error: dbError.message,
      code: dbError.code
    });
    throw new AuthError(`Database error: ${dbError.message}`, 500);
  }
  
  // If user is in Supabase but not in our DB, we'll create a minimal record
  if (!dbUser) {
    logger.info('User exists in Supabase but not in our database, creating minimal profile', {
      email: userData.user.email
    });
    
    // Create a minimal user record with just the necessary information
    const minimalUserData = {
      email: userData.user.email,
      name: userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || 'User',
      supabase_id: userData.user.id,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      roles: ['user']
    };
    
    // Insert user into our database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(minimalUserData)
      .select()
      .single();
      
    if (insertError) {
      logger.error('Failed to create minimal user profile', {
        email: userData.user.email,
        error: insertError.message
      });
      
      // Even if we can't create the user, we'll still proceed with auth
      // We'll create a minimal user object for this request only
      req.user = {
        email: userData.user.email,
        fullName: minimalUserData.name,
        supabaseId: userData.user.id,
        roles: ['user'],
        isTemporaryUser: true // Flag that this is a temporary user object
      };
      
      logger.debug('Created temporary user object for authenticated user without profile', {
        email: req.user.email
      });
      
      return; // Continue with request processing
    }
    
    // Use the newly created user
    req.user = {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.name,
      professionalTitle: newUser.professional_title || '',
      location: newUser.location || '',
      country: newUser.country || '',
      focusArea: newUser.focus_area || '',
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at,
      roles: newUser.roles || ['user']
    };
    
    logger.info('Created minimal user profile during authentication', {
      userId: req.user.id,
      email: req.user.email
    });
    
    return; // Continue with request processing
  }
  
  // 5. Create a domain User object from the existing database record
  req.user = {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.name,
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
 * Factory function to create the authentication middleware.
 * @param {Object} supabase - The initialized Supabase client instance.
 * @returns {Function} Express middleware function.
 */
const createAuthMiddleware = (supabase) => {
    if (!supabase) {
        logger.error('CRITICAL: Supabase client was not provided to createAuthMiddleware factory.');
        // Return a middleware that immediately fails if supabase is missing during setup
        return (req, res, next) => {
            next(new AuthError('Server authentication setup error - Supabase client missing', 500));
        };
    }
    
    // Return the actual middleware function
    return async (req, res, next) => {
        try {
            // Use the supabase client passed into the factory
            await performAuthentication(req, supabase);
            
            // Add user to Sentry for error tracking
            if (req.user && req.user.id) {
                setUser({
                    id: req.user.id,
                    email: req.user.email,
                    username: req.user.fullName
                });
            }
            
            next();
        } catch (error) {
            // Clear any user data from Sentry
            clearUser();
            
            const mappedError = authErrorMapper(error, {
                methodName: 'authenticateUser', // Keep original name for logging context
                domainName: 'auth'
            });
            
            // Add special handling for expired tokens
            if (error instanceof TokenError && error.isTokenExpired) {
                // Add a header to indicate token expiration specifically
                res.set('X-Token-Expired', 'true');
                
                // Modify the error response to guide the client to refresh
                mappedError.message = 'Your session has expired. Please refresh your access token.';
                mappedError.metadata = {
                    ...mappedError.metadata,
                    tokenStatus: 'expired',
                    action: 'refresh' 
                };
            }
            
            next(mappedError);
        }
    };
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
export { createAuthMiddleware };
export { requireAdmin };
export { addRequestId };
export { AuthError };
export { TokenError };
export { PermissionError };
export default {
  createAuthMiddleware,
  requireAdmin,
  addRequestId,
  AuthError,
  TokenError,
  PermissionError
};