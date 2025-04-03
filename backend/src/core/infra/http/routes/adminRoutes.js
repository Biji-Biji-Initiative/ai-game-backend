import express from 'express';

/**
 * Admin routes setup
 * @param {Object} params - Dependencies
 * @param {Object} params.adminController - Admin controller instance
 * @param {Object} params.authMiddleware - Authentication middleware
 * @returns {Object} - Express router
 */
const setupAdminRoutes = ({ adminController, authMiddleware }) => {
  const router = express.Router();

  /**
   * Middleware to check if user has admin role
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next function
   */
  const isAdmin = (req, res, next) => {
    // Check if user has admin role in JWT claims
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  };

  // Apply authentication middleware to all admin routes
  router.use(authMiddleware.authenticateUser);
  router.use(isAdmin);

  // Users management
  router.get('/users', adminController.getAllUsers.bind(adminController));
  router.put('/users/:userId', adminController.updateUser.bind(adminController));
  router.delete('/users/:userId', adminController.deleteUser.bind(adminController));

  // Evaluations management
  router.get('/evaluations', adminController.getAllEvaluations.bind(adminController));

  // Analytics
  router.get('/analytics', adminController.getAnalytics.bind(adminController));

  return router;
};

export default setupAdminRoutes; 