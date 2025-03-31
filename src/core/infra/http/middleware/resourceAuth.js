import AuthorizationService from "@/core/auth/services/AuthorizationService.js";
import { logger } from "@/core/infra/logging/logger.js";
import { UserAuthorizationError } from "@/core/user/errors/UserErrors.js";

// Create a singleton instance of the authorization service
const authService = new AuthorizationService();

/**
 * Middleware to verify user can access a resource
 * 
 * This middleware provides a flexible way to protect resources based on ownership
 * and other access rules defined in the AuthorizationService.
 * 
 * @param {Object} options - Authorization options
 * @param {string} options.resourceType - Type of resource being accessed 
 * @param {string} options.paramName - Request parameter containing resource ID
 * @param {string} options.action - Action being performed (read, update, delete)
 * @param {Function} options.getResourceOwner - Function to get resource owner ID
 * @returns {Function} Express middleware
 */
export const authorizeResource = (options) => {
  const { 
    resourceType, 
    paramName = 'id', 
    action = 'read',
    getResourceOwner
  } = options;

  return async (req, res, next) => {
    try {
      // Must be authenticated first
      if (!req.user || !req.user.id) {
        return next(new UserAuthorizationError('Authentication required'));
      }

      const userId = req.user.id;
      const resourceId = req.params[paramName];
      
      if (!resourceId) {
        return next(new UserAuthorizationError(
          `Resource ID not provided in parameter: ${paramName}`
        ));
      }

      // If getResourceOwner function is provided, use it to retrieve the owner
      let resourceOwnerId;
      if (typeof getResourceOwner === 'function') {
        try {
          resourceOwnerId = await getResourceOwner(resourceId, req);
        } catch (error) {
          logger.error('Error retrieving resource owner', {
            error: error.message,
            resourceType,
            resourceId
          });
          return next(error);
        }
      } else {
        // Default: assume the parameter in the path is the user ID (for simple cases)
        resourceOwnerId = resourceId;
      }

      // Check if user is authorized to access this resource
      authService.verifyResourceAccess(
        userId, 
        resourceOwnerId, 
        resourceType, 
        action,
        {
          isAdmin: req.user.isAdmin,
          ...options
        }
      );

      // Continue if authorized
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to require a specific permission
 * 
 * This middleware checks if the user has a specific permission,
 * which is useful for feature-based authorization.
 * 
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return next(new UserAuthorizationError('Authentication required'));
      }

      authService.verifyPermission(req.user, permission);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to ensure user can only access their own data
 * 
 * This is a specialized middleware for the common case of user-specific
 * resources where the user ID is in the URL parameter.
 * 
 * @param {string} paramName - Request parameter name containing userId
 * @returns {Function} Express middleware
 */
export const authorizeUserSpecificResource = (paramName = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return next(new UserAuthorizationError('Authentication required'));
      }

      const paramValue = req.params[paramName];
      
      // Special case handling for 'me' parameter
      if (paramValue === 'me') {
        // If parameter is 'me', we'll replace it with the actual user ID
        req.params[paramName] = req.user.id;
        return next();
      }

      // Return error if user is accessing another user's resources (unless admin)
      if (paramValue !== req.user.id && !req.user.isAdmin) {
        return next(new UserAuthorizationError(
          `You don't have permission to access this resource`,
          'read'
        ));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}; 