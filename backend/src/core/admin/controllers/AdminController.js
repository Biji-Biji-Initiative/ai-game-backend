/**
 * Controller for admin-specific operations
 */
class AdminController {
  /**
   * Initialize the AdminController with dependencies
   * @param {Object} params - Dependencies
   * @param {Object} params.adminService - Admin service instance
   * @param {Object} params.logger - Logger instance
   */
  constructor({ adminService, logger }) {
    this.adminService = adminService;
    this.logger = logger || console;
    
    // Log initialization instead of setting context
    if (this.logger.debug) {
      this.logger.debug('AdminController initialized with dependencies');
    }
  }

  /**
   * Get all users in the system
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async getAllUsers(req, res) {
    try {
      const users = await this.adminService.getAllUsers();
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      this.logger.error('Error getting all users', { error });
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get users', 
        error: error.message 
      });
    }
  }

  /**
   * Get all evaluations across all users
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async getAllEvaluations(req, res) {
    try {
      const evaluations = await this.adminService.getAllEvaluations();
      res.status(200).json({ success: true, data: evaluations });
    } catch (error) {
      this.logger.error('Error getting all evaluations', { error });
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get evaluations', 
        error: error.message 
      });
    }
  }

  /**
   * Get analytics data across all users
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async getAnalytics(req, res) {
    try {
      const analytics = await this.adminService.getAnalytics();
      res.status(200).json({ success: true, data: analytics });
    } catch (error) {
      this.logger.error('Error getting analytics', { error });
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get analytics', 
        error: error.message 
      });
    }
  }

  /**
   * Update a user's account
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const userData = req.body;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID is required' 
        });
      }

      const updatedUser = await this.adminService.updateUser(userId, userData);
      res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
      this.logger.error('Error updating user', { error });
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update user', 
        error: error.message 
      });
    }
  }

  /**
   * Delete a user and all associated data
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Promise<void>}
   */
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID is required' 
        });
      }

      await this.adminService.deleteUser(userId);
      res.status(200).json({ 
        success: true, 
        message: 'User deleted successfully' 
      });
    } catch (error) {
      this.logger.error('Error deleting user', { error });
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete user', 
        error: error.message 
      });
    }
  }
}

export default AdminController; 