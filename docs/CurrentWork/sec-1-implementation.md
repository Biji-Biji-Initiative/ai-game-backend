# SEC-1: Implement Comprehensive Authorization Checks

## Problem Statement

After auditing the codebase, I've identified inconsistent authorization checks across the application:

1. **Inconsistent Implementation**: Some controllers (like `EvaluationController`) implement authorization checks, while others don't.
2. **Ad-hoc Checks**: Authorization logic is scattered throughout controllers with no standardized pattern.
3. **Middleware Underutilization**: The `requireAdmin` middleware exists but is not consistently used.
4. **Security Risk**: Current model allows potential access to data belonging to other users.

## Solution Approach

To address these issues, we'll implement a comprehensive authorization system with:

1. **Standardized Authorization Service**: A centralized service to handle complex authorization rules
2. **Resource-Specific Middleware**: Reusable middleware for common authorization patterns
3. **Domain-Specific Checks**: Enhanced authorization rules in domain services
4. **Audit and Documentation**: Comprehensive documentation of authorization requirements

## Implementation Steps

### 1. Create an Authorization Service

```javascript
// src/core/auth/services/AuthorizationService.js

import { UserAuthorizationError } from "../../user/errors/UserErrors.js";
import { logger } from "../../infra/logging/logger.js";

/**
 * Authorization Service
 * Provides centralized authorization rules and checks
 */
class AuthorizationService {
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
```

### 2. Create Resource-Specific Authorization Middleware

```javascript
// src/core/infra/http/middleware/resourceAuth.js

import { AuthorizationService } from "../../../auth/services/AuthorizationService.js";
import { logger } from "../../../infra/logging/logger.js";
import { UserAuthorizationError } from "../../../user/errors/UserErrors.js";

const authService = new AuthorizationService();

/**
 * Middleware to verify user can access a resource
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
```

### 3. Register Authorization Service in Container

```javascript
// src/config/container/services.js (addition)

// Add this to the existing service registrations
container.register('authorizationService', () => {
  return new AuthorizationService();
}, true); // Singleton: stateless service
```

### 4. Update User Routes with Authorization Middleware

```javascript
// src/core/infra/http/routes/userRoutes.js

import express from 'express';
import UserController from "../../../user/controllers/UserController.js";
import { authenticateUser, requireAdmin } from "../../../infra/http/middleware/auth.js";
import { 
  authorizeUserSpecificResource, 
  requirePermission 
} from "../../../infra/http/middleware/resourceAuth.js";
'use strict';

/**
 * User Routes
 * Handles routes related to user management
 */
const router = express.Router();

/**
 * User routes factory
 * @param {UserController} userController - User controller instance
 * @returns {express.Router} Express router
 */
export default function userRoutes(userController) {
  // Current user profile
  router.get('/me', authenticateUser, (req, res) => userController.getCurrentUser(req, res));
  
  // Update current user profile
  router.put('/me', authenticateUser, (req, res) => userController.updateCurrentUser(req, res));
  
  // Get a specific user by ID (only if admin or same user)
  router.get('/:userId', 
    authenticateUser, 
    authorizeUserSpecificResource('userId'),
    (req, res) => userController.getUserById(req, res)
  );
  
  // Update a specific user (only if admin or same user)
  router.put('/:userId', 
    authenticateUser, 
    authorizeUserSpecificResource('userId'),
    (req, res) => userController.updateUser(req, res)
  );
  
  // List all users (admin only)
  router.get('/', 
    authenticateUser, 
    requireAdmin,
    (req, res) => userController.getAllUsers(req, res)
  );
  
  // Create a new user (admin only)
  router.post('/', 
    authenticateUser, 
    requireAdmin,
    (req, res) => userController.createUser(req, res)
  );
  
  // Delete a user (admin only)
  router.delete('/:userId', 
    authenticateUser, 
    requireAdmin,
    (req, res) => userController.deleteUser(req, res)
  );
  
  return router;
}
```

### 5. Update Challenge Routes with Authorization Middleware

```javascript
// src/core/infra/http/routes/challengeRoutes.js

import express from 'express';
import ChallengeController from "../../../challenge/controllers/ChallengeController.js";
import { authenticateUser, requireAdmin } from "../../../infra/http/middleware/auth.js";
import { authorizeResource } from "../../../infra/http/middleware/resourceAuth.js";
'use strict';

/**
 * Challenge Routes
 * Handles routes related to challenges and exercises
 */
const router = express.Router();

// Function to get the owner of a challenge for authorization
const getChallengeOwner = async (challengeId, req) => {
  const challengeRepository = req.app.get('container').get('challengeRepository');
  const challenge = await challengeRepository.findById(challengeId);
  return challenge ? challenge.userId : null;
};

/**
 * Challenge routes factory
 * @param {ChallengeController} challengeController - Challenge controller instance
 * @returns {express.Router} Express router
 */
export default function challengeRoutes(challengeController) {
  // Get all challenges (no special auth needed - will filter based on user)
  router.get('/', authenticateUser, (req, res) => challengeController.getAllChallenges(req, res));
  
  // Get a specific challenge (must be owner or admin)
  router.get('/:id', 
    authenticateUser,
    authorizeResource({
      resourceType: 'challenge',
      paramName: 'id',
      action: 'read',
      getResourceOwner: getChallengeOwner
    }),
    (req, res) => challengeController.getChallenge(req, res)
  );
  
  // Create a new challenge
  router.post('/', authenticateUser, (req, res) => challengeController.createChallenge(req, res));
  
  // Submit challenge response
  router.post('/:id/responses', 
    authenticateUser,
    authorizeResource({
      resourceType: 'challenge',
      paramName: 'id',
      action: 'update',
      getResourceOwner: getChallengeOwner
    }),
    (req, res) => challengeController.submitChallengeResponse(req, res)
  );
  
  // Get challenge types (available to all authenticated users)
  router.get('/types', authenticateUser, (req, res) => challengeController.getChallengeTypes(req, res));
  
  // Generate a personalized challenge
  router.post('/generate', authenticateUser, (req, res) => challengeController.generateChallenge(req, res));
  
  return router;
}
```

### 6. Update Evaluation Controller and Routes

```javascript
// src/core/infra/http/routes/evaluationRoutes.js

import express from 'express';
import EvaluationController from "../../../evaluation/controllers/EvaluationController.js";
import { authenticateUser, requireAdmin } from "../../../infra/http/middleware/auth.js";
import { 
  authorizeResource, 
  authorizeUserSpecificResource 
} from "../../../infra/http/middleware/resourceAuth.js";
'use strict';

/**
 * Evaluation Routes
 * Handles routes related to evaluation and feedback
 */
const router = express.Router();

// Function to get the owner of an evaluation for authorization
const getEvaluationOwner = async (evaluationId, req) => {
  const evaluationRepository = req.app.get('container').get('evaluationRepository');
  const evaluation = await evaluationRepository.findById(evaluationId);
  return evaluation ? evaluation.userId : null;
};

/**
 * Evaluation routes factory
 * @param {EvaluationController} evaluationController - Evaluation controller instance
 * @returns {express.Router} Express router
 */
export default function evaluationRoutes(evaluationController) {
  // Submit a new evaluation
  router.post('/', authenticateUser, (req, res) => evaluationController.createEvaluation(req, res));
  
  // Stream an evaluation
  router.post('/stream', authenticateUser, (req, res) => evaluationController.streamEvaluation(req, res));
  
  // Get evaluations for a challenge
  router.get('/challenge/:challengeId', 
    authenticateUser,
    (req, res) => evaluationController.getEvaluationsForChallenge(req, res)
  );
  
  // Get evaluations for current user
  router.get('/user/me', 
    authenticateUser,
    (req, res) => evaluationController.getEvaluationsForUser(req, res)
  );
  
  // Get an evaluation by ID
  router.get('/:id', 
    authenticateUser,
    authorizeResource({
      resourceType: 'evaluation',
      paramName: 'id',
      action: 'read',
      getResourceOwner: getEvaluationOwner
    }),
    (req, res) => evaluationController.getEvaluationById(req, res)
  );
  
  return router;
}
```

### 7. Update System Routes with Admin-Only Access

```javascript
// src/core/infra/http/routes/systemRoutes.js

import express from 'express';
import { logger } from "../../logging/logger.js";
import { getCacheService, getCacheInvalidationManager } from "../../cache/cacheFactory.js";
import domainEvents from "../../../common/events/domainEvents.js";
import { authenticateUser, requireAdmin } from "../middleware/auth.js";
'use strict';

/**
 * System Routes
 * Provides monitoring, metrics, and debugging endpoints
 */
const router = express.Router();

/**
 * System routes factory
 * @returns {express.Router} Express router
 */
export default function systemRoutes() {
  // Require admin authentication for all system routes
  router.use(authenticateUser);
  router.use(requireAdmin);
  
  // ... Rest of the systemRoutes implementation ...
}
```

### 8. Create Unit Tests for Authorization System

```javascript
// tests/unit/core/auth/services/AuthorizationService.test.js

import { expect } from 'chai';
import AuthorizationService from '../../../../../src/core/auth/services/AuthorizationService.js';
import { UserAuthorizationError } from '../../../../../src/core/user/errors/UserErrors.js';

describe('AuthorizationService', () => {
  let authService;
  
  beforeEach(() => {
    authService = new AuthorizationService();
  });
  
  describe('verifyResourceAccess', () => {
    it('should allow access to own resources', () => {
      const userId = 'user123';
      const resourceOwnerId = 'user123';
      const resourceType = 'challenge';
      const action = 'read';
      
      expect(() => 
        authService.verifyResourceAccess(userId, resourceOwnerId, resourceType, action)
      ).to.not.throw();
    });
    
    it('should allow admin access to any resource', () => {
      const userId = 'admin123';
      const resourceOwnerId = 'user123';
      const resourceType = 'challenge';
      const action = 'delete';
      
      expect(() => 
        authService.verifyResourceAccess(userId, resourceOwnerId, resourceType, action, { isAdmin: true })
      ).to.not.throw();
    });
    
    it('should deny access to resources owned by others', () => {
      const userId = 'user123';
      const resourceOwnerId = 'user456';
      const resourceType = 'challenge';
      const action = 'update';
      
      expect(() => 
        authService.verifyResourceAccess(userId, resourceOwnerId, resourceType, action)
      ).to.throw(UserAuthorizationError);
    });
    
    it('should allow access to public resources', () => {
      const userId = 'user123';
      const resourceOwnerId = 'user456';
      const resourceType = 'challenge';
      const action = 'read';
      
      expect(() => 
        authService.verifyResourceAccess(userId, resourceOwnerId, resourceType, action, { isPublic: true })
      ).to.not.throw();
    });
    
    it('should allow special access based on resource type rules', () => {
      const userId = 'user123';
      const resourceOwnerId = 'user456';
      const resourceType = 'challenge';
      const action = 'read';
      
      expect(() => 
        authService.verifyResourceAccess(userId, resourceOwnerId, resourceType, action, { isCollaborative: true })
      ).to.not.throw();
    });
  });
  
  describe('verifyPermission', () => {
    it('should allow access with the required permission', () => {
      const user = {
        id: 'user123',
        permissions: ['read:challenges', 'update:profile']
      };
      
      expect(() => 
        authService.verifyPermission(user, 'read:challenges')
      ).to.not.throw();
    });
    
    it('should deny access without the required permission', () => {
      const user = {
        id: 'user123',
        permissions: ['read:challenges']
      };
      
      expect(() => 
        authService.verifyPermission(user, 'delete:challenges')
      ).to.throw(UserAuthorizationError);
    });
    
    it('should allow admin users any permission', () => {
      const user = {
        id: 'admin123',
        isAdmin: true,
        permissions: []
      };
      
      expect(() => 
        authService.verifyPermission(user, 'any:permission')
      ).to.not.throw();
    });
  });
});
```

## Key Changes

### New Components

1. **AuthorizationService**: Central service for access control decisions
2. **resourceAuth.js middleware**: Reusable authorization middleware
3. **authorizeResource**: Generic middleware for resource-based authorization
4. **authorizeUserSpecificResource**: Middleware for user-specific resources
5. **requirePermission**: Middleware for permission-based authorization

### Updated Components

1. **User Routes**: Enhanced with proper user-specific resource controls
2. **Challenge Routes**: Added owner-based resource authorization
3. **Evaluation Routes**: Updated to use central authorization middleware
4. **System Routes**: Strengthened admin-only requirement
5. **Container Configuration**: Added authorization service registration

## Benefits

1. **Consistency**: Standardized approach to authorization across the application
2. **Security**: Proper multi-layer protection against unauthorized access
3. **Maintainability**: Centralized logic makes changes to authorization rules easier
4. **Auditability**: Improved logging of authorization decisions and denials
5. **Extensibility**: Framework for adding more complex authorization rules in the future

## Test Strategy

1. **Unit Tests**: Test the AuthorizationService directly
2. **Controller Tests**: Verify controllers use the service correctly
3. **Integration Tests**: Test end-to-end authorization flow with routes
4. **Security Tests**: Attempt unauthorized access to verify protection

## Future Enhancements

1. **Role-Based Access Control**: Extend to support more complex roles beyond just 'admin' and 'user'
2. **Team/Organization Support**: Add multi-tenant support for organizations with multiple users
3. **Fine-Grained Permissions**: Implement more granular permissions system
4. **Attribute-Based Access Control**: Support for context-aware authorization decisions 