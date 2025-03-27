/**
 * User API Routes
 */

const express = require('express');
const router = express.Router();
const UserController = require('../../controllers/UserController');
const { authenticateUser, requireAdmin } = require('../../middleware/auth');

const userController = new UserController();

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateUser, (req, res) => userController.getCurrentUser(req, res));

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticateUser, (req, res) => userController.updateCurrentUser(req, res));

/**
 * @route   PUT /api/users/me/focus-area
 * @desc    Set focus area for current user
 * @access  Private
 */
router.put('/me/focus-area', authenticateUser, (req, res) => userController.setFocusArea(req, res));

/**
 * @route   GET /api/users
 * @desc    List all users (admin only)
 * @access  Admin
 */
router.get('/', authenticateUser, requireAdmin, (req, res) => userController.listUsers(req, res));

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Admin
 */
router.get('/:id', authenticateUser, requireAdmin, (req, res) => userController.getUserById(req, res));

module.exports = router; 