'use strict';

/**
 * Personality Service
 * 
 * Handles business logic for personality analysis, AI attitudes, and insights generation.
 */

const Personality = require('../models/Personality');
const PersonalityRepository = require('../repositories/PersonalityRepository');
const { EventTypes, eventBus } = require('../../common/events/domainEvents');
const { v4: uuidv4 } = require('uuid');
const { personalityLogger } = require('../../../core/infra/logging/domainLogger');
const {
  applyRepositoryErrorHandling,
  applyServiceErrorHandling,
  applyControllerErrorHandling,
  createErrorMapper
} = require('../../../core/infra/errors/centralizedErrorUtils');

// Import domain-specific error classes
const {
  PersonalityError,
  PersonalityNotFoundError,
  PersonalityValidationError,
  PersonalityProcessingError,
} = require('../errors/PersonalityErrors');

// Create an error mapper for services
const personalityServiceErrorMapper = createErrorMapper(
  {
    PersonalityNotFoundError: PersonalityNotFoundError,
    PersonalityValidationError: PersonalityValidationError,
    PersonalityProcessingError: PersonalityProcessingError,
    Error: PersonalityError,
  },
  PersonalityError
);
const { NoPersonalityDataError } = require('../errors/PersonalityErrors');

/**
 * Service that manages personality profiles, traits analysis, and insights
 */
class PersonalityService {
  /**
   * Create a new PersonalityService
   * @param {Object} personalityRepository - Repository for personality data
   * @param {Object} traitsAnalysisService - Service for analyzing traits
   * @param {Object} insightGenerator - Service for generating insights, via port
   */
  constructor(personalityRepository, traitsAnalysisService, insightGenerator) {
    this.personalityRepository = personalityRepository || new PersonalityRepository();
    this.traitsAnalysisService = traitsAnalysisService;
    this.insightGenerator = insightGenerator;
    this.logger = personalityLogger.child('service');
  }

  /**
   * Get or create a personality profile for a user
   * @param {string} userId - User ID
   * @returns {Promise<Personality>} Personality profile
   */
  getOrCreatePersonalityProfile(userId) {
    try {
      // Try to find existing profile
      let profile = await this.personalityRepository.findByUserId(userId);
      
      // If no profile exists, create a new one
      if (!profile) {
        profile = new Personality({
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        profile = await this.personalityRepository.save(profile);
        
        // Publish domain event for new profile
        await eventBus.publishEvent(EventTypes.PERSONALITY_PROFILE_UPDATED, {
          userId,
          personalityId: profile.id,
          updateType: 'created'
        });
      }
      
      return profile;
    } catch (error) {
      this.logger.error('Error getting or creating personality profile', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get personality profile with computed insights
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Personality profile with computed insights
   */
  getEnrichedProfile(userId) {
    return this.traitsAnalysisService.getEnrichedProfile(userId);
  }

  /**
   * Generate insights based on a user's personality traits and AI attitudes
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Generated insights
   */
  generateInsights(userId) {
    try {
      // Get personality profile
      const profile = await this.getOrCreatePersonalityProfile(userId);
      
      // Check if there are personality traits to analyze
      if (Object.keys(profile.personalityTraits).length === 0) {
        throw new NoPersonalityDataError('No personality traits available for analysis');
      }
      
      // Create or get a conversation thread for insights
      if (!profile.threadId) {
        const threadId = uuidv4();
        profile.setThreadId(threadId);
        await this.personalityRepository.save(profile);
      }
      
      // Make sure personality profile is fully analyzed
      await this.processPersonalityData(profile);
      
      // Generate insights using the insight generator port
      this.logger.debug('Generating insights', { userId: profile.userId });
      const insights = await this.insightGenerator.generateFor(profile);
      
      // Store insights in the profile
      profile.setInsights(insights);
      await this.personalityRepository.save(profile);
      
      this.logger.info('Generated insights', { userId: profile.userId });
      return insights;
    } catch (error) {
      this.logger.error('Error generating insights', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Process personality data to ensure computed fields are populated
   * @param {Personality} profile - The personality profile to process
   * @returns {Promise<Personality>} The processed profile
   * @private
   */
  processPersonalityData(profile) {
    // Calculate dominant traits if needed
    if (Object.keys(profile.personalityTraits) {
  .length > 0 && 
}
        profile.dominantTraits.length === 0) {
      
      const dominantTraits = this.traitsAnalysisService.computeDominantTraits(
        profile.personalityTraits
      );
      profile.setDominantTraits(dominantTraits);
      
      const traitClusters = this.traitsAnalysisService.identifyTraitClusters(dominantTraits);
      profile.setTraitClusters(traitClusters);
    }
    
    // Calculate AI attitude profile if needed
    if (Object.keys(profile.aiAttitudes) {
  .length > 0 && 
}
        Object.keys(profile.aiAttitudeProfile).length === 0) {
      
      const aiAttitudeProfile = this.traitsAnalysisService.analyzeAiAttitudes(
        profile.aiAttitudes
      );
      profile.setAIAttitudeProfile(aiAttitudeProfile);
    }
    
    // Save if changes were made
    if (profile.updatedAt !== profile.createdAt) {
      await this.personalityRepository.save(profile);
    }
    
    return profile;
  }

  /**
   * Update personality traits for a user
   * @param {string} userId - User ID
   * @param {Object} traits - Personality traits to update
   * @returns {Promise<Personality>} Updated personality profile
   */
  updatePersonalityTraits(userId, traits) {
    try {
      // Get personality profile
      const profile = await this.getOrCreatePersonalityProfile(userId);
      
      // Update traits
      profile.updateTraits(traits);
      
      // Process personality data
      const dominantTraits = this.traitsAnalysisService.computeDominantTraits(
        profile.personalityTraits
      );
      profile.setDominantTraits(dominantTraits);
      
      const traitClusters = this.traitsAnalysisService.identifyTraitClusters(dominantTraits);
      profile.setTraitClusters(traitClusters);
      
      // Save updated profile
      const savedProfile = await this.personalityRepository.save(profile);
      
      // Publish domain event for user service to update its copy if needed
      await eventBus.publishEvent(EventTypes.PERSONALITY_PROFILE_UPDATED, {
        userId: profile.userId,
        personalityId: profile.id,
        personalityTraits: profile.personalityTraits,
        updateType: 'traits'
      });
      
      return savedProfile;
    } catch (error) {
      this.logger.error('Error updating personality traits', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Update AI attitudes for a user
   * @param {string} userId - User ID
   * @param {Object} attitudes - AI attitudes to update
   * @returns {Promise<Personality>} Updated personality profile
   */
  updateAIAttitudes(userId, attitudes) {
    try {
      // Get personality profile
      const profile = await this.getOrCreatePersonalityProfile(userId);
      
      // Update attitudes
      profile.updateAttitudes(attitudes);
      
      // Process AI attitude data
      const aiAttitudeProfile = this.traitsAnalysisService.analyzeAiAttitudes(
        profile.aiAttitudes
      );
      profile.setAIAttitudeProfile(aiAttitudeProfile);
      
      // Save updated profile
      const savedProfile = await this.personalityRepository.save(profile);
      
      // Publish domain event for user service to update its copy if needed
      await eventBus.publishEvent(EventTypes.PERSONALITY_PROFILE_UPDATED, {
        userId: profile.userId,
        personalityId: profile.id,
        aiAttitudes: profile.aiAttitudes,
        updateType: 'attitudes'
      });
      
      return savedProfile;
    } catch (error) {
      this.logger.error('Error updating AI attitudes', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get personality profile for a user
   * @param {string} userId - User ID
   * @param {Object} queryParams - Query parameters for filtering data
   * @returns {Promise<Object>} Personality profile
   */
  getPersonalityProfile(userId, queryParams = {}) {
    try {
      const profile = await this.personalityRepository.findByUserId(userId);
      
      if (!profile) {
        throw new NoPersonalityDataError(`No personality profile found for user: ${userId}`);
      }
      
      // Apply query param filters
      const result = {};
      
      if (!queryParams.excludePersonalityTraits) {
        result.personalityTraits = profile.personalityTraits;
      }
      
      if (!queryParams.excludeDominantTraits) {
        result.dominantTraits = profile.dominantTraits;
      }
      
      if (!queryParams.excludeAiAttitudes) {
        result.aiAttitudes = profile.aiAttitudes;
      }
      
      if (!queryParams.excludeAiAttitudeProfile) {
        result.aiAttitudeProfile = profile.aiAttitudeProfile;
      }
      
      return {
        id: profile.id,
        userId: profile.userId,
        ...result
      };
    } catch (error) {
      this.logger.error('Error getting personality profile', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete a personality profile
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if successful
   */
  deletePersonalityProfile(userId) {
    try {
      const deleted = await this.personalityRepository.deleteByUserId(userId);
      
      if (deleted) {
        await eventBus.publishEvent(EventTypes.PERSONALITY_PROFILE_DELETED, {
          userId
        });
      }
      
      return deleted;
    } catch (error) {
      this.logger.error('Error deleting personality profile', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Calculate compatibility between user personality and challenge traits
   * @param {string} userId - User ID to check compatibility for
   * @param {Object} challengeTraits - Challenge traits to compare against
   * @returns {Promise<Object>} Compatibility scores and analysis
   */
  calculateChallengeCompatibility(userId, challengeTraits) {
    try {
      // Get the user's personality profile
      const profile = await this.getOrCreatePersonalityProfile(userId);
      
      // Extract traits to compare
      const userTraits = profile.personalityTraits;
      
      // Calculate compatibility scores
      const compatibilityScores = 
        this.traitsAnalysisService.calculateTraitCompatibility(
          userTraits, 
          challengeTraits
        );
      
      // Create recommendations based on compatibility
      const recommendations = 
        this.traitsAnalysisService.generateRecommendations(
          compatibilityScores, 
          userTraits, 
          challengeTraits
        );
      
      return {
        userId,
        overallScore: compatibilityScores.overall,
        traitScores: compatibilityScores.traits,
        recommendations
      };
    } catch (error) {
      this.logger.error('Error calculating challenge compatibility', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

module.exports = PersonalityService;
