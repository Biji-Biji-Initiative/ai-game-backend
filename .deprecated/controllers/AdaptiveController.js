/**
 * Adaptive Controller
 * 
 * Handles HTTP requests related to adaptive learning operations.
 */

const AdaptiveService = require('../core/adaptive/services/AdaptiveService');
const UserRepository = require('../core/user/repositories/UserRepository');
const ProgressService = require('../core/progress/services/ProgressService');
const ChallengeRepository = require('../core/challenge/repositories/challengeRepository');
const FocusAreaService = require('../core/focusArea/services/focusAreaService');
const logger = require('../utils/logger');

class AdaptiveController {
  constructor() {
    const userRepository = new UserRepository();
    const progressService = new ProgressService();
    const challengeRepository = new ChallengeRepository();
    const focusAreaService = new FocusAreaService(null, userRepository);
    
    this.adaptiveService = new AdaptiveService(
      null, // adaptiveRepository (uses default)
      userRepository,
      challengeRepository,
      progressService,
      focusAreaService
    );
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
      logger.error('Error getting recommendations', { 
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
      logger.error('Error generating challenge', { 
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
      logger.error('Error adjusting difficulty', { 
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
      logger.error('Error calculating difficulty', { 
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