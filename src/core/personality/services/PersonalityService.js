import Personality from "../models/Personality.js";
import PersonalityRepository from "../repositories/PersonalityRepository.js";
import domainEvents from "../../common/events/domainEvents.js";
import { v4 as uuidv4 } from "uuid";
import { personalityLogger } from "../../infra/logging/domainLogger.js";
import { applyRepositoryErrorHandling, applyServiceErrorHandling, applyControllerErrorHandling, createErrorMapper } from "../../infra/errors/centralizedErrorUtils.js";
import { PersonalityError, PersonalityNotFoundError, PersonalityValidationError, PersonalityProcessingError } from "../errors/PersonalityErrors.js";
import { NoPersonalityDataError } from "../errors/PersonalityErrors.js";
'use strict';
const {
  EventTypes,
  eventBus
} = domainEvents;
// Create an error mapper for services
const personalityServiceErrorMapper = createErrorMapper({
  PersonalityNotFoundError: PersonalityNotFoundError,
  PersonalityValidationError: PersonalityValidationError,
  PersonalityProcessingError: PersonalityProcessingError,
  Error: PersonalityError
}, PersonalityError);
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
  async getProfile(userId) {
    try {
      // Validate required parameters
      if (!userId) {
        throw new PersonalityValidationError('User ID is required');
      }
      let profile = await this.personalityRepository.findByUserId(userId);
      // If profile doesn't exist, create a new one
      if (!profile) {
        // Create a default empty profile
        const newProfile = new Personality({
          userId,
          traits: {},
          preferences: {},
          attitudes: {},
          insights: []
        });
        profile = await this.personalityRepository.save(newProfile);
      }
      return profile;
    } catch (error) {
      // Map to domain-specific errors
      if (error instanceof PersonalityError) {
        throw error;
      }
      throw new PersonalityProcessingError(`Failed to get personality profile: ${error.message}`);
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
      const profile = await this.getProfile(userId);
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
      this.logger.debug('Generating insights', {
        userId: profile.userId
      });
      const insights = await this.insightGenerator.generateFor(profile);
      // Store insights in the profile
      profile.setInsights(insights);
      await this.personalityRepository.save(profile);
      this.logger.info('Generated insights', {
        userId: profile.userId
      });
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
    if (Object.keys(profile.personalityTraits).length > 0 && profile.dominantTraits.length === 0) {
      const dominantTraits = this.traitsAnalysisService.computeDominantTraits(profile.personalityTraits);
      profile.setDominantTraits(dominantTraits);
      const traitClusters = this.traitsAnalysisService.identifyTraitClusters(dominantTraits);
      profile.setTraitClusters(traitClusters);
    }

    // Calculate AI attitude profile if needed
    if (Object.keys(profile.aiAttitudes).length > 0 && Object.keys(profile.aiAttitudeProfile).length === 0) {
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
      const profile = await this.getProfile(userId);
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
      const profile = await this.getProfile(userId);
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
   * @returns {Promise<Object>} Personality profile
   */
  async getPersonalityProfile(userId, queryParams = {}) {
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
  async deletePersonalityProfile(userId) {
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
  async calculateChallengeCompatibility(userId, challengeTraits) {
    try {
      // Get the user's personality profile
      const profile = await this.getProfile(userId);
      // Extract traits to compare
      const userTraits = profile.personalityTraits;
      // Calculate compatibility scores
      const compatibilityScores = this.traitsAnalysisService.calculateTraitCompatibility(userTraits, challengeTraits);
      // Create recommendations based on compatibility
      const recommendations = this.traitsAnalysisService.generateRecommendations(compatibilityScores, userTraits, challengeTraits);
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
export default PersonalityService;