/**
 * Adaptive Controller
 * 
 * Handles HTTP requests related to adaptive learning operations.
 */

class AdaptiveController {
  /**
   * Create a new AdaptiveController
   * @param {Object} dependencies - Dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.adaptiveService - Adaptive service
   */
  constructor(dependencies = {}) {
    const { logger, adaptiveService } = dependencies;
    
    this.logger = logger;
    this.adaptiveService = adaptiveService;
  }

  /**
   * Get personalized recommendations for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getRecommendations(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get recommendations
      const recommendations = await this.adaptiveService.getLatestRecommendations(req.user.id);

      // Return recommendations
      return res.status(200).json({
        status: 'success',
        data: {
          recommendedFocusAreas: recommendations.recommendedFocusAreas,
          recommendedChallengeTypes: recommendations.recommendedChallengeTypes,
          suggestedLearningResources: recommendations.suggestedLearningResources,
          strengths: recommendations.strengths,
          weaknesses: recommendations.weaknesses
        }
      });
    } catch (error) {
      this.logger.error('Error getting recommendations', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get personalized recommendations'
      });
    }
  }

  /**
   * Generate a dynamic challenge for the current user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async generateChallenge(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { focusArea } = req.query;

      // Generate challenge
      const challengeParams = await this.adaptiveService.generateDynamicChallenge(
        req.user.id,
        focusArea || null
      );

      // Return challenge parameters
      return res.status(200).json({
        status: 'success',
        data: challengeParams
      });
    } catch (error) {
      this.logger.error('Error generating challenge', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to generate challenge'
      });
    }
  }

  /**
   * Adjust difficulty based on user performance
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async adjustDifficulty(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { challengeId, score } = req.body;
      
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

      // Adjust difficulty
      const difficulty = await this.adaptiveService.adjustDifficulty(
        req.user.id,
        challengeId,
        score
      );

      // Return adjusted difficulty
      return res.status(200).json({
        status: 'success',
        data: {
          difficulty: difficulty.toSettings()
        }
      });
    } catch (error) {
      this.logger.error('Error adjusting difficulty', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to adjust difficulty'
      });
    }
  }

  /**
   * Calculate optimal difficulty for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async calculateDifficulty(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { challengeType } = req.query;

      // Calculate difficulty
      const difficulty = await this.adaptiveService.calculateOptimalDifficulty(
        req.user.id,
        challengeType || null
      );

      // Return difficulty settings
      return res.status(200).json({
        status: 'success',
        data: {
          difficulty: difficulty.toSettings()
        }
      });
    } catch (error) {
      this.logger.error('Error calculating difficulty', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to calculate difficulty'
      });
    }
  }
}

module.exports = AdaptiveController; 