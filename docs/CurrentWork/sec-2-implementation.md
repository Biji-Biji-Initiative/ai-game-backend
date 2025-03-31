# SEC-2: Apply Input Validation Middleware Consistently

## Problem Statement

After analyzing the codebase, I've identified the following issues with input validation:

1. **Inconsistent Implementation**: Some routes use Zod validation middleware, while others perform ad-hoc validation in controllers or don't validate at all.
2. **Missing AppError Import**: The validation middleware references AppError but doesn't import it correctly.
3. **Manual Validation**: Many controllers contain manual validation code that's redundant and inconsistent.
4. **Incomplete Coverage**: Not all endpoints validate query params, URL params, and request bodies.
5. **Security Risk**: Missing validation leaves the application vulnerable to injection attacks and unexpected behavior.

## Solution Approach

To address these issues, we'll implement a comprehensive validation approach with:

1. **Fix Middleware Implementation**: Update the validation middleware to properly import AppError.
2. **Standardize Schema Definitions**: Ensure all API endpoints have corresponding Zod schemas.
3. **Consistent Registration**: Apply validation middleware to all routes in a consistent pattern.
4. **Remove Manual Validation**: Replace in-controller validation with middleware.
5. **Add Coverage Testing**: Implement tests to verify validation coverage.

## Implementation Steps

### 1. Fix Validation Middleware

First, let's update the validation middleware to properly import AppError and make it more robust:

```javascript
// src/core/infra/http/middleware/validation.js
import { AppError } from "../../errors/AppError.js";
import { logger } from "../../logging/logger.js";
'use strict';

/**
 * HTTP Request Validation Middleware
 *
 * Provides middleware functions to validate request bodies,
 * query parameters, and URL parameters using Zod schemas.
 */

/**
 * Creates a middleware function that validates request body
 * against the provided Zod schema
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validateBody = schema => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.body);
      // Replace request body with validated data
      req.body = validatedData;
      next();
    } catch (error) {
      logger.debug('Body validation failed', { 
        path: req.path, 
        method: req.method,
        errors: error.errors
      });
      
      // Format Zod validation errors
      if (error.errors) {
        const formattedErrors = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join('; ');
        return next(new AppError(formattedErrors, 400));
      }
      next(new AppError('Validation error', 400));
    }
  };
};

/**
 * Creates a middleware function that validates request query parameters
 * against the provided Zod schema
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validateQuery = schema => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.query);
      // Replace request query with validated data
      req.query = validatedData;
      next();
    } catch (error) {
      logger.debug('Query validation failed', { 
        path: req.path, 
        method: req.method,
        errors: error.errors
      });
      
      // Format Zod validation errors
      if (error.errors) {
        const formattedErrors = error.errors
          .map(err => `Query parameter ${err.path.join('.')}: ${err.message}`)
          .join('; ');
        return next(new AppError(formattedErrors, 400));
      }
      next(new AppError('Invalid query parameters', 400));
    }
  };
};

/**
 * Creates a middleware function that validates request URL parameters
 * against the provided Zod schema
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
const validateParams = schema => {
  return (req, res, next) => {
    try {
      const validatedData = schema.parse(req.params);
      // Replace request params with validated data
      req.params = validatedData;
      next();
    } catch (error) {
      logger.debug('Params validation failed', { 
        path: req.path, 
        method: req.method,
        errors: error.errors
      });
      
      // Format Zod validation errors
      if (error.errors) {
        const formattedErrors = error.errors
          .map(err => `URL parameter ${err.path.join('.')}: ${err.message}`)
          .join('; ');
        return next(new AppError(formattedErrors, 400));
      }
      next(new AppError('Invalid URL parameters', 400));
    }
  };
};

export {
  validateBody,
  validateQuery,
  validateParams
};
```

### 2. Create a Validation Factory to Simplify Registration

Let's create a validation factory to make it easier to apply validation middleware consistently:

```javascript
// src/core/infra/http/middleware/validationFactory.js
import { 
  validateBody,
  validateQuery,
  validateParams 
} from './validation.js';

/**
 * Creates a set of validation middleware functions for a route
 * 
 * @param {Object} schemas - Schema definitions for the route
 * @param {import('zod').ZodSchema} [schemas.body] - Schema for validating request body
 * @param {import('zod').ZodSchema} [schemas.query] - Schema for validating query parameters
 * @param {import('zod').ZodSchema} [schemas.params] - Schema for validating URL parameters
 * @returns {Array<Function>} Array of middleware functions for validation
 */
export const createValidationMiddleware = (schemas = {}) => {
  const middleware = [];
  
  if (schemas.body) {
    middleware.push(validateBody(schemas.body));
  }
  
  if (schemas.query) {
    middleware.push(validateQuery(schemas.query));
  }
  
  if (schemas.params) {
    middleware.push(validateParams(schemas.params));
  }
  
  return middleware;
};
```

### 3. Update Routes and Add Missing Schemas

First, let's update the User routes with comprehensive validation:

#### Example: User Routes

```javascript
// src/core/infra/http/routes/userRoutes.js
import express from 'express';
import UserController from "../../../user/controllers/UserController.js";
import { authenticateUser, requireAdmin } from "../middleware/auth.js";
import { authorizeUserSpecificResource } from "../middleware/resourceAuth.js";
import { createValidationMiddleware } from "../middleware/validationFactory.js";
import * as userSchemas from "../../../user/schemas/userApiSchemas.js";

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
  // Create user (public endpoint for signup)
  router.post('/', 
    createValidationMiddleware({ body: userSchemas.createUserSchema }),
    userController.createUser.bind(userController)
  );
  
  // Get user by email (admin only)
  router.get('/email/:email', 
    authenticateUser, 
    requireAdmin,
    createValidationMiddleware({ params: userSchemas.emailParamSchema }),
    userController.getUserByEmail.bind(userController)
  );
  
  // Current user profile endpoints
  router.get('/me', 
    authenticateUser, 
    userController.getCurrentUser.bind(userController)
  );
  
  // Update current user profile
  router.put('/me', 
    authenticateUser,
    createValidationMiddleware({ body: userSchemas.updateUserSchema }),
    userController.updateCurrentUser.bind(userController)
  );
  
  // Update current user focus area
  router.put('/me/focus-area', 
    authenticateUser,
    createValidationMiddleware({ body: userSchemas.updateFocusAreaSchema }),
    userController.setFocusArea.bind(userController)
  );
  
  // Get a specific user by ID (only if admin or same user)
  router.get('/:id', 
    authenticateUser,
    authorizeUserSpecificResource('id'),
    createValidationMiddleware({ params: userSchemas.userIdSchema }),
    userController.getUserById.bind(userController)
  );
  
  // Update a specific user (only if admin or same user)
  router.put('/:id', 
    authenticateUser,
    authorizeUserSpecificResource('id'),
    createValidationMiddleware({ 
      params: userSchemas.userIdSchema,
      body: userSchemas.updateUserSchema
    }),
    userController.updateUser.bind(userController)
  );
  
  // List all users (admin only)
  router.get('/', 
    authenticateUser, 
    requireAdmin,
    createValidationMiddleware({ query: userSchemas.listUsersQuerySchema }),
    userController.listUsers.bind(userController)
  );
  
  // Delete a user (admin only)
  router.delete('/:id',
    authenticateUser,
    requireAdmin,
    createValidationMiddleware({ params: userSchemas.userIdSchema }),
    userController.deleteUser.bind(userController)
  );

  return router;
}
```

### 4. Add Missing Schemas in User API Schemas

```javascript
// src/core/user/schemas/userApiSchemas.js
import { z } from "zod";
'use strict';

/**
 * Schema for validating user profile update requests
 */
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  professionalTitle: z.string().min(1).max(100).optional(),
  location: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
  }).optional(),
  settings: z.record(z.any()).optional(),
}).strict();

/**
 * Schema for validating focus area update requests
 */
export const updateFocusAreaSchema = z.object({
  focusArea: z.string().min(1).max(50),
}).strict();

/**
 * Schema for validating user creation requests
 */
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(50).optional(),
  role: z.enum(['user', 'admin']).optional().default('user'),
}).strict();

/**
 * Schema for validating user ID parameter
 */
export const userIdSchema = z.object({
  id: z.string().uuid(),
}).strict();

/**
 * Schema for validating email parameter
 */
export const emailParamSchema = z.object({
  email: z.string().email('Invalid email format'),
}).strict();

/**
 * Schema for validating query parameters when listing users
 */
export const listUsersQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  sortBy: z.enum(['name', 'email', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  query: z.string().optional(),
}).strict();
```

### 5. Similar Process for Other Routes

Apply the same pattern to all other routes, starting with the critical ones:

1. Challenge routes
2. Evaluation routes
3. Authentication routes
4. System routes

For each route module:
1. Import the validation factory
2. Import or create corresponding schemas
3. Apply validation middleware consistently

### 6. Remove Manual Validation from Controllers

After applying middleware validation, we should refactor controllers to remove redundant validation logic. For example:

#### Before:
```javascript
async recordChallengeCompletion(req, res) {
  // Check if user is authenticated
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Convert request to domain parameters
  const params = ProgressDTOMapper.fromRequest(req.body);
  const { challengeId, challengeScore: score, completionTime, evaluationData } = req.body;
  
  // Basic validation
  if (!challengeId) {
    return res.status(400).json({
      status: 'error',
      message: 'Challenge ID is required'
    });
  }
  if (isNaN(score) || score < 0 || score > 100) {
    return res.status(400).json({
      status: 'error',
      message: 'Score must be a number between 0 and 100'
    });
  }
  if (isNaN(completionTime) || completionTime < 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Completion time must be a positive number'
    });
  }
  
  // Main logic...
}
```

#### After:
```javascript
async recordChallengeCompletion(req, res) {
  // Convert request to domain parameters
  const params = ProgressDTOMapper.fromRequest(req.body);
  
  // Main logic...
  const progress = await this.progressService.recordChallengeCompletion(
    req.user.id, 
    params.challengeId, 
    params.challengeScore, 
    params.completionTime, 
    params.evaluationData || {}
  );
  
  // Convert to DTO and return...
}
```

### 7. Add Validation Tests

To ensure coverage and prevent regression, add tests to verify validation:

```javascript
// tests/unit/core/infra/http/middleware/validation.test.js
import { expect } from 'chai';
import sinon from 'sinon';
import { validateBody, validateQuery, validateParams } from '../../../../../../src/core/infra/http/middleware/validation.js';
import { z } from 'zod';
import { AppError } from '../../../../../../src/core/infra/errors/AppError.js';

describe('Validation Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {}
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    next = sinon.stub();
  });
  
  describe('validateBody', () => {
    it('should pass validation when schema matches', () => {
      const schema = z.object({
        name: z.string()
      });
      
      req.body = { name: 'Test User' };
      
      const middleware = validateBody(schema);
      middleware(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      expect(next.args[0]).to.be.empty; // No error passed
    });
    
    it('should transform data according to schema', () => {
      const schema = z.object({
        age: z.string().transform(val => parseInt(val, 10))
      });
      
      req.body = { age: '25' };
      
      const middleware = validateBody(schema);
      middleware(req, res, next);
      
      expect(req.body.age).to.equal(25);
      expect(next.calledOnce).to.be.true;
    });
    
    it('should return validation error when schema fails', () => {
      const schema = z.object({
        email: z.string().email()
      });
      
      req.body = { email: 'not-an-email' };
      
      const middleware = validateBody(schema);
      middleware(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      expect(next.args[0][0]).to.be.instanceOf(AppError);
      expect(next.args[0][0].statusCode).to.equal(400);
    });
  });
  
  // Similar tests for validateQuery and validateParams...
});
```

### 8. Validation Coverage Test

Also add integration tests to verify all routes are properly validated:

```javascript
// tests/integration/routes/validation-coverage.test.js
import request from 'supertest';
import { app } from '../../../src/app.js';
import { expect } from 'chai';

describe('API Validation Coverage', () => {
  describe('User Routes', () => {
    it('should validate user creation request', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({ /* missing required fields */ });
      
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('error');
    });
    
    // Tests for other user endpoints...
  });
  
  // Tests for other route groups...
});
```

## Key Changes

### New Components

1. **Validation Factory**: A new utility to simplify applying validation middleware
2. **Missing Schemas**: Additional Zod schemas for endpoints that need them
3. **Validation Tests**: Unit and integration tests for validation coverage

### Updated Components

1. **Validation Middleware**: Fixed imports and enhanced logging
2. **Route Definitions**: Updated to consistently use validation middleware
3. **Controllers**: Refactored to remove manual validation
4. **API Schemas**: Expanded with missing schema definitions

## Benefits

1. **Security**: Better protection against injection attacks and invalid data
2. **Consistency**: Standardized approach to validation across all endpoints
3. **Maintainability**: Centralized validation logic makes changes easier
4. **Type Safety**: Zod transforms provide better type safety for request data
5. **Documentation**: Schemas serve as living documentation of API requirements

## Test Strategy

1. **Unit Tests**: Test each validation middleware function
2. **Integration Tests**: Verify validation is applied to all endpoints
3. **Security Tests**: Test boundary cases to ensure validation prevents common attacks
4. **Error Format Tests**: Verify validation errors are consistently formatted 