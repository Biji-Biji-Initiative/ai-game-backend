/**
 * Auth Controller
 * 
 * Handles user authentication for the API tester
 */

class AuthController {
  /**
   * Create a new AuthController
   * @param {Object} dependencies - Injected dependencies
   * @param {Object} dependencies.userRepository - Repository for user operations
   * @param {Object} dependencies.logger - Logger instance
   */
  constructor({ userRepository, logger }) {
    this.userRepository = userRepository;
    this.logger = logger;
  }

  /**
   * Simple login for development/testing
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Email and password are required'
        });
      }
      
      // For testing purposes, we'll just check if user exists and return it
      const user = await this.userRepository.findUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // In a real app, we'd verify the password here
      // For test/dev purposes, we're skipping password verification
      
      this.logger.info(`Dev/test login for user: ${email}`);
      
      // Return a dummy token for test UI to use
      return res.status(200).json({
        status: 'success',
        data: {
          user,
          token: `test-token-${Date.now()}`
        }
      });
    } catch (error) {
      this.logger.error('Error in login', { error: error.message });
      next(error);
    }
  }

  /**
   * Simple signup for development/testing
   */
  async signup(req, res, next) {
    try {
      const { email, password, fullName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Email and password are required'
        });
      }
      
      // Check if user already exists
      const existingUser = await this.userRepository.findUserByEmail(email);
      
      if (existingUser) {
        // User exists - for test purposes, we can just log them in
        this.logger.info(`User already exists, logging in: ${email}`);
        
        return res.status(200).json({
          status: 'success',
          data: {
            user: existingUser,
            token: `test-token-${Date.now()}`
          }
        });
      }
      
      // Create a new user
      const userData = {
        email,
        fullName: fullName || 'Test User',
        // In a real app, we'd hash the password
        password: password
      };
      
      const newUser = await this.userRepository.createUser(userData);
      
      this.logger.info(`Created new test user: ${email}`);
      
      return res.status(201).json({
        status: 'success',
        data: {
          user: newUser,
          token: `test-token-${Date.now()}`
        }
      });
    } catch (error) {
      this.logger.error('Error in signup', { error: error.message });
      next(error);
    }
  }
}

module.exports = AuthController; 