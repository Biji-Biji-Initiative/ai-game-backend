/**
 * Authentication Middleware
 * 
 * Infrastructure middleware for handling authentication and authorization
 * Located in the infrastructure layer according to our DDD architecture
 */

const { logger } = require('../../../infra/logging/logger');
const AppError = require('../../../infra/errors/AppError');
const container = require('../../../../config/container');

/**
 * Authenticate user from request
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateUser = async (req, res, next) => {
  try {
    // Get token from request header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new AppError('No token provided', 401));
    }

    // Get Supabase client from container
    const { supabaseClient } = container.get('supabaseClient');

    // Verify the JWT token with Supabase
    const { data: userData, error } = await supabaseClient.auth.getUser(token);

    if (error || !userData || !userData.user) {
      return next(new AppError('Invalid or expired token', 401));
    }

    // Get the user repository from container
    const userRepository = container.get('userRepository');

    // Get the user from our database
    const user = await userRepository.findByEmail(userData.user.email);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Set user in request object for later use
    req.user = user;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', { error: error.message });
    return next(new AppError('Authentication error', 500));
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
    return next(new AppError('Unauthenticated', 401));
  }

  if (!req.user.isAdmin) {
    return next(new AppError('Forbidden: Admin role required', 403));
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
  addRequestId
}; 