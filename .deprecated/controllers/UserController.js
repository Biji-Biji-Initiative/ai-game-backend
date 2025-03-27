/**
 * User Controller
 * 
 * Handles HTTP requests related to user operations.
 */

const UserService = require('../core/user/services/UserService');

class UserController {
  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get current user profile
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getCurrentUser(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get user from database
      const user = await this.userService.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update last active timestamp
      await this.userService.updateUserActivity(user.id);

      // Return user data (excluding sensitive fields)
      return res.status(200).json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        professionalTitle: user.professionalTitle,
        role: user.role,
        location: user.location,
        country: user.country,
        personalityTraits: user.personalityTraits,
        aiAttitudes: user.aiAttitudes,
        focusArea: user.focusArea,
        lastActive: user.lastActive,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error('UserController.getCurrentUser error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update current user profile
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async updateCurrentUser(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get updatable fields from request body
      const {
        fullName,
        professionalTitle,
        location,
        country,
        personalityTraits,
        aiAttitudes
      } = req.body;

      // Create updates object with only provided fields
      const updates = {};
      if (fullName !== undefined) updates.fullName = fullName;
      if (professionalTitle !== undefined) updates.professionalTitle = professionalTitle;
      if (location !== undefined) updates.location = location;
      if (country !== undefined) updates.country = country;
      if (personalityTraits !== undefined) updates.personalityTraits = personalityTraits;
      if (aiAttitudes !== undefined) updates.aiAttitudes = aiAttitudes;

      // Update user
      const updatedUser = await this.userService.updateUser(req.user.id, updates);

      // Return updated user data
      return res.status(200).json({
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        professionalTitle: updatedUser.professionalTitle,
        role: updatedUser.role,
        location: updatedUser.location,
        country: updatedUser.country,
        personalityTraits: updatedUser.personalityTraits,
        aiAttitudes: updatedUser.aiAttitudes,
        focusArea: updatedUser.focusArea,
        lastActive: updatedUser.lastActive,
        updatedAt: updatedUser.updatedAt
      });
    } catch (error) {
      console.error('UserController.updateCurrentUser error:', error);

      // Handle validation errors
      if (error.message && error.message.includes('Invalid user data')) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Set focus area for current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async setFocusArea(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { focusArea, threadId } = req.body;

      if (!focusArea) {
        return res.status(400).json({ error: 'Focus area is required' });
      }

      // Update user's focus area
      const updatedUser = await this.userService.setUserFocusArea(
        req.user.id,
        focusArea,
        threadId
      );

      // Return updated user data
      return res.status(200).json({
        id: updatedUser.id,
        focusArea: updatedUser.focusArea,
        focusAreaThreadId: updatedUser.focusAreaThreadId,
        updatedAt: updatedUser.updatedAt
      });
    } catch (error) {
      console.error('UserController.setFocusArea error:', error);
      
      if (error.message && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user by ID (admin only)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getUserById(req, res) {
    try {
      // Check if user is authenticated and is admin
      if (!req.user || !req.user.id || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get user from database
      const user = await this.userService.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user data
      return res.status(200).json({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        professionalTitle: user.professionalTitle,
        role: user.role,
        location: user.location,
        country: user.country,
        personalityTraits: user.personalityTraits,
        aiAttitudes: user.aiAttitudes,
        focusArea: user.focusArea,
        lastActive: user.lastActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    } catch (error) {
      console.error('UserController.getUserById error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * List users (admin only)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async listUsers(req, res) {
    try {
      // Check if user is authenticated and is admin
      if (!req.user || !req.user.id || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Get query parameters
      const { limit = 20, offset = 0, orderBy = 'created_at desc' } = req.query;
      
      // Additional filters
      const criteria = {};
      if (req.query.role) criteria.role = req.query.role;
      if (req.query.focusArea) criteria.focus_area = req.query.focusArea;
      if (req.query.country) criteria.country = req.query.country;

      // Find users
      const users = await this.userService.findUsers(criteria, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy
      });

      // Map users to remove sensitive data
      const mappedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        professionalTitle: user.professionalTitle,
        role: user.role,
        location: user.location,
        country: user.country,
        focusArea: user.focusArea,
        lastActive: user.lastActive,
        createdAt: user.createdAt
      }));

      return res.status(200).json({
        users: mappedUsers,
        total: mappedUsers.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('UserController.listUsers error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = UserController; 