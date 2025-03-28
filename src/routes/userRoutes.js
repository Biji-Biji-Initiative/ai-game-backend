const express = require('express');
const router = express.Router();
const UserController = require('../core/user/controllers/UserController');
const { 
  authenticateUser, 
  requireAdmin 
} = require('../core/infra/http/middleware/auth');
const { 
  validateBody, 
  validateParams 
} = require('../core/infra/http/middleware/validation');
const { 
  updateUserSchema,
  updateFocusAreaSchema,
  userIdSchema
} = require('../core/user/schemas/userApiSchemas');

// Create controller instance
const userController = new UserController();

// Simple user creation - for testing purposes only
router.post('/', 
  (req, res, next) => userController.createUser(req, res, next)
);

// Get user by email - for testing purposes only
router.get('/email/:email', 
  (req, res, next) => userController.getUserByEmail(req, res, next)
);

// User profile endpoints
router.get('/me', 
  authenticateUser, 
  (req, res, next) => userController.getCurrentUser(req, res, next)
);

router.put('/me', 
  authenticateUser, 
  validateBody(updateUserSchema),
  (req, res, next) => userController.updateCurrentUser(req, res, next)
);

router.put('/me/focus-area', 
  authenticateUser, 
  validateBody(updateFocusAreaSchema),
  (req, res, next) => userController.setFocusArea(req, res, next)
);

// Admin user management endpoints 
router.get('/:id', 
  authenticateUser, 
  requireAdmin, 
  validateParams(userIdSchema),
  (req, res, next) => userController.getUserById(req, res, next)
);

router.get('/', 
  authenticateUser, 
  requireAdmin, 
  (req, res, next) => userController.listUsers(req, res, next)
);

module.exports = router;
