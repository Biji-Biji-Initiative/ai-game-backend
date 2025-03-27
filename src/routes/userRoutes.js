const express = require('express');
const router = express.Router();
const UserController = require('../core/user/controllers/UserController');
const { authenticateUser, requireAdmin } = require('../core/infra/http/middleware/auth');

// Create controller instance
const userController = new UserController();

// User profile endpoints
router.get('/me', authenticateUser, (req, res, next) => userController.getCurrentUser(req, res, next));
router.put('/me', authenticateUser, (req, res, next) => userController.updateCurrentUser(req, res, next));
router.put('/me/focus-area', authenticateUser, (req, res, next) => userController.setFocusArea(req, res, next));

// Admin user management endpoints 
router.get('/:id', authenticateUser, requireAdmin, (req, res, next) => userController.getUserById(req, res, next));
router.get('/', authenticateUser, requireAdmin, (req, res, next) => userController.listUsers(req, res, next));

module.exports = router;
