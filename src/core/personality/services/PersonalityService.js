/**
 * Personality Service
 * 
 * Handles business logic for personality analysis, AI attitudes, and insights generation.
 */

const Personality = require('../models/Personality');
const PersonalityRepository = require('../repositories/PersonalityRepository');
const TraitsAnalysisService = require('./TraitsAnalysisService');
const { EventTypes, eventBus } = require('../../common/events/domainEvents');
const { v4: uuidv4 } = require('uuid');
const { personalityLogger } = require('../../infra/logging/domainLogger');
const { NoPersonalityDataError } = require('../errors/PersonalityErrors');

class PersonalityService {
  /**
   * Create a new PersonalityService
   * @param {PersonalityRepository} personalityRepository - Repository for personality data
   * @param {TraitsAnalysisService} traitsAnalysisService - Service for analyzing traits
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
  async getOrCreatePersonalityProfile(userId) {
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
  async getEnrichedProfile(userId) {
    return this.traitsAnalysisService.getEnrichedProfile(userId);
  }

  /**
   * Generate insights based on a user's personality traits and AI attitudes
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Generated insights
   */
  async generateInsights(userId) {
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
  async processPersonalityData(profile) {
    // Calculate dominant traits if needed
    if (Object.keys(profile.personalityTraits).length > 0 && 
        profile.dominantTraits.length === 0) {
      
      const dominantTraits = this.traitsAnalysisService.computeDominantTraits(profile.personalityTraits);
      profile.setDominantTraits(dominantTraits);
      
      const traitClusters = this.traitsAnalysisService.identifyTraitClusters(dominantTraits);
      profile.setTraitClusters(traitClusters);
    }
    
    // Calculate AI attitude profile if needed
    if (Object.keys(profile.aiAttitudes).length > 0 && 
        Object.keys(profile.aiAttitudeProfile).length === 0) {
      
      const aiAttitudeProfile = this.traitsAnalysisService.analyzeAiAttitudes(profile.aiAttitudes);
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
  async updatePersonalityTraits(userId, traits) {
    try {
      // Get personality profile
      const profile = await this.getOrCreatePersonalityProfile(userId);
      
      // Update traits
      profile.updateTraits(traits);
      
      // Process personality data
      const dominantTraits = this.traitsAnalysisService.computeDominantTraits(profile.personalityTraits);
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
  async updateAIAttitudes(userId, attitudes) {
    try {
      // Get personality profile
      const profile = await this.getOrCreatePersonalityProfile(userId);
      
      // Update attitudes
      profile.updateAttitudes(attitudes);
      
      // Process AI attitude data
      const aiAttitudeProfile = this.traitsAnalysisService.analyzeAiAttitudes(profile.aiAttitudes);
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
   * @returns {Promise<Personality|null>} Personality profile or null if not found
   */
  async getPersonalityProfile(userId, queryParams = {}) {
    try {
      let profile = await this.personalityRepository.findByUserId(userId);
      
      // Filter data based on query parameters if needed
      if (profile && queryParams) {
        if (queryParams.includeInsights === false) {
          profile.insights = {};
        }
        if (queryParams.includeTraits === false) {
          profile.personalityTraits = {};
          profile.dominantTraits = [];
          profile.traitClusters = {};
        }
        if (queryParams.includeAttitudes === false) {
          profile.aiAttitudes = {};
          profile.aiAttitudeProfile = {};
        }
      }
      
      return profile;
    } catch (error) {
      this.logger.error('Error getting personality profile', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Delete personality profile for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if successful
   */
  async deletePersonalityProfile(userId) {
    try {
      return this.personalityRepository.deleteByUserId(userId);
    } catch (error) {
      this.logger.error('Error deleting personality profile', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  
  /**
   * Calculate compatibility between user and challenge
   * @param {string} userId - User ID
   * @param {Object} challengeTraits - Challenge trait requirements 
   * @returns {Promise<number>} Compatibility score (0-100)
   */
  async calculateChallengeCompatibility(userId, challengeTraits) {
    try {
      const profile = await this.getPersonalityProfile(userId);
      
      if (!profile || Object.keys(profile.personalityTraits).length === 0) {
        return 50; // Default neutral score
      }
      
      return this.traitsAnalysisService.calculateTraitCompatibility(
        profile.personalityTraits,
        challengeTraits
      );
    } catch (error) {
      this.logger.error('Error calculating challenge compatibility', {
        error: error.message,
        userId
      });
      return 50; // Default neutral score on error
    }
  }
}

module.exports = PersonalityService; 