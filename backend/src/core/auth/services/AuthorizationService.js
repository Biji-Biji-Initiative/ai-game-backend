import { UserAuthorizationError } from "#app/core/user/errors/UserErrors.js";
import { logger } from "#app/core/infra/logging/logger.js";

/**
 * Authorization Service
 * 
 * Provides centralized authorization rules and checks for the application.
 * This service enforces access control policies based on:
 * 1. Resource ownership (users can access their own resources)
 * 2. Admin privileges (admins can access any resource)
 * 3. Resource-specific rules (e.g., collaborative challenges)
 * 4. Permission-based access (for fine-grained control)
 */
class AuthorizationService {
  /**
   * Create a new AuthorizationService
   */
  constructor() {
    this.logger = logger.child({ service: 'authorization-service' });
  }

  /**
   * Verify a user's access to a resource
   * @param {string} userId - The ID of the user making the request
   * @param {string} resourceOwnerId - The ID of the resource owner
   * @param {string} resourceType - The type of resource (e.g., 'challenge', 'evaluation')
   * @param {string} action - The action being performed (e.g., 'read', 'update', 'delete')
   * @param {Object} options - Additional context for authorization
   * @returns {boolean} True if authorized, throws error if not
   * @throws {UserAuthorizationError} If user is not authorized
   */
  verifyResourceAccess(userId, resourceOwnerId, resourceType, action, options = {}) {
    if (!userId) {
      throw new UserAuthorizationError('User ID is required for authorization');
    }

    // Admin users can access any resource
    if (options.isAdmin) {
      this.logger.debug('Admin access granted', { userId, resourceType, action });
      return true;
    }

    // Check if user is accessing their own resource
    if (userId === resourceOwnerId) {
      this.logger.debug('Self-resource access granted', { userId, resourceType, action });
      return true;
    }

    // Check for shared/public resources that might be accessible
    if (options.isPublic) {
      this.logger.debug('Public resource access granted', { userId, resourceType, action });
      return true;
    }

    // Handle special cases for specific resource types
    switch (resourceType) {
      case 'challenge':
        // Check if this is a collaborative challenge
        if (options.isCollaborative && action === 'read') {
          this.logger.debug('Collaborative challenge access granted', { userId, resourceType, action });
          return true;
        }
        break;
      
      case 'evaluation':
        // Only owners can access evaluations
        break;
        
      case 'progress':
        // Only owners can access progress data
        break;
        
      // Add cases for other resource types as needed
    }

    // Default: deny access if no rules matched
    this.logger.warn('Access denied', { userId, resourceOwnerId, resourceType, action });
    throw new UserAuthorizationError(
      `You don't have permission to ${action} this ${resourceType}`,
      action
    );
  }

  /**
   * Check if user has a specific permission
   * @param {Object} user - User object with roles and permissions
   * @param {string} permission - Permission to check
   * @returns {boolean} True if user has permission
   * @throws {UserAuthorizationError} If user doesn't have the permission
   */
  verifyPermission(user, permission) {
    if (!user) {
      throw new UserAuthorizationError('User is required for permission check');
    }

    // Admin users have all permissions
    if (user.isAdmin) {
      return true;
    }

    // Check user permissions (assuming user object has a permissions array)
    const hasPermission = user.permissions && 
      user.permissions.includes(permission);
    
    if (!hasPermission) {
      this.logger.warn('Permission denied', { userId: user.id, permission });
      throw new UserAuthorizationError(
        `You don't have the required permission: ${permission}`,
        permission
      );
    }

    return true;
  }
}

export default AuthorizationService; 