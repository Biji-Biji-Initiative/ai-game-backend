/**
 * Personality Controller
 * 
 * Handles HTTP requests related to personality operations.
 */

class PersonalityController {
  /**
   * Create a new PersonalityController
   * @param {Object} dependencies - Dependencies
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.personalityService - Personality service
   */
  constructor(dependencies = {}) {
    const { logger, personalityService, errorHandler } = dependencies;
    
    this.logger = logger;
    this.personalityService = personalityService;
    this.AppError = errorHandler?.AppError;
  }

  /**
   * Generate insights for a user's personality
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async generateInsights(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate insights
      const insights = await this.personalityService.generateInsights(req.user.id);

      // Return insights
      return res.status(200).json({
        status: 'success',
        data: { insights }
      });
    } catch (error) {
      this.logger.error('Error generating insights', { error: error.message, userId: req.user?.id });
      
      if (error.message.includes('No personality traits available')) {
        return res.status(400).json({ 
          status: 'error',
          message: 'No personality traits available. Please update your traits first.'
        });
      }
      
      return res.status(500).json({ 
        status: 'error',
        message: 'Failed to generate insights'
      });
    }
  }

  /**
   * Update personality traits for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async updatePersonalityTraits(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { personalityTraits } = req.body;
      
      // Basic validation
      if (!personalityTraits || typeof personalityTraits !== 'object') {
        return res.status(400).json({ 
          status: 'error',
          message: 'Personality traits are required and must be an object'
        });
      }

      // Update personality traits
      const profile = await this.personalityService.updatePersonalityTraits(
        req.user.id,
        personalityTraits
      );

      // Return the updated profile
      return res.status(200).json({
        status: 'success',
        data: {
          id: profile.id,
          personalityTraits: profile.personalityTraits,
          dominantTraits: profile.dominantTraits,
          traitClusters: profile.traitClusters,
          updatedAt: profile.updatedAt
        }
      });
    } catch (error) {
      this.logger.error('Error updating personality traits', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      if (error.message.includes('between 0 and 100')) {
        return res.status(400).json({
          status: 'error',
          message: 'Personality trait values must be between 0 and 100'
        });
      }
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update personality traits'
      });
    }
  }

  /**
   * Update AI attitudes for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async updateAIAttitudes(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { aiAttitudes } = req.body;
      
      // Basic validation
      if (!aiAttitudes || typeof aiAttitudes !== 'object') {
        return res.status(400).json({
          status: 'error',
          message: 'AI attitudes are required and must be an object'
        });
      }

      // Update AI attitudes
      const profile = await this.personalityService.updateAIAttitudes(
        req.user.id,
        aiAttitudes
      );

      // Return the updated profile
      return res.status(200).json({
        status: 'success',
        data: {
          id: profile.id,
          aiAttitudes: profile.aiAttitudes,
          aiAttitudeProfile: profile.aiAttitudeProfile,
          updatedAt: profile.updatedAt
        }
      });
    } catch (error) {
      this.logger.error('Error updating AI attitudes', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      if (error.message.includes('between 0 and 100')) {
        return res.status(400).json({
          status: 'error',
          message: 'AI attitude values must be between 0 and 100'
        });
      }
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update AI attitudes'
      });
    }
  }

  /**
   * Get personality profile for a user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getPersonalityProfile(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get personality profile
      const profile = await this.personalityService.getPersonalityProfile(req.user.id);

      if (!profile) {
        return res.status(404).json({
          status: 'error',
          message: 'Personality profile not found'
        });
      }

      // Return the profile
      return res.status(200).json({
        status: 'success',
        data: profile
      });
    } catch (error) {
      this.logger.error('Error getting personality profile', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get personality profile'
      });
    }
  }
}

module.exports = PersonalityController;