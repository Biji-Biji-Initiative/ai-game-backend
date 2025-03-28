const express = require('express');
const router = express.Router();
const AuthController = require('../core/auth/controllers/AuthController');
const container = require('../config/container');

// Create controller instance with injected dependencies
const authController = new AuthController({
  userRepository: container.get('userRepository'),
  logger: container.get('logger')
});

// Auth routes
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/signup', (req, res, next) => authController.signup(req, res, next));

module.exports = router; 