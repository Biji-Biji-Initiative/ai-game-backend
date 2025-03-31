"../../../common/events/domainEvents.js;
import { v4 as uuidv4 } from ""uuid";
"../../../infra/logging/domainLogger.js103;
""../../../infra/errors/centralizedErrorUtils.js179;
""../../../personality/errors/PersonalityErrors.js350;
""../../../personality/errors/PersonalityErrors.js517;
""../../../common/valueObjects/index.js608;
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
   * @param {string|UserId} userId - User ID or UserId value object
   * @returns {Promise<Personality>} Personality profile
   * @throws {PersonalityValidationError} If userId is invalid
   * @throws {PersonalityProcessingError} If an error occurs during retrieval
   */
  async getProfile(userId) {
    try {
      // Validate and extract userId value
      let userIdValue;
      
      if (userId instanceof UserId) {
        userIdValue = userId.value;
      } else if (typeof userId === 'string') {
        const userIdVO = createUserId(userId);
        if (!userIdVO) {
          throw new PersonalityValidationError('Invalid User ID format');
        }
        userIdValue = userIdVO.value;
      } else {
        throw new PersonalityValidationError('User ID is required and must be either a string or UserId value object');
      }
      
      let profile = await this.personalityRepository.findByUserId(userIdValue);
      // If profile doesn't exist, create a new one
      if (!profile) {
        // Create a default empty profile
        const newProfile = new Personality({
          userId: userIdValue,
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
   * @param {string|UserId} userId - User ID or UserId value object
   * @returns {Promise<Object>} Personality profile with computed insights
   * @throws {PersonalityValidationError} If userId is invalid
   */
  async getEnrichedProfile(userId) {
    // Extract userId value if it's a value object
    const userIdValue = userId instanceof UserId ? userId.value : userId;
    return this.traitsAnalysisService.getEnrichedProfile(userIdValue);
  }
  /**
   * Generate insights based on a user's personality traits and AI attitudes
   * @param {string|UserId} userId - User ID or UserId value object
   * @returns {Promise<Object>} Generated insights
   * @throws {PersonalityValidationError} If userId is invalid
   * @throws {NoPersonalityDataError} If no personality data is available for analysis
   * @throws {PersonalityProcessingError} If an error occurs during insight generation
   */
  async generateInsights(userId) {
    try {
      // Extract userId value if it's a value object
      const userIdValue = userId instanceof UserId ? userId.value : userId;
      
      // Get personality profile
      const profile = await this.getProfile(userIdValue);
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
        userId: userId instanceof UserId ? userId.value : userId
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
   * @param {string|UserId} userId - User ID or UserId value object
   * @param {Object} traits - Personality traits to update
   * @returns {Promise<Personality>} Updated personality profile
   * @throws {PersonalityValidationError} If userId is invalid
   * @throws {PersonalityProcessingError} If an error occurs during update
   */
  async updatePersonalityTraits(userId, traits) {
    try {
      // Extract userId value if it's a value object
      const userIdValue = userId instanceof UserId ? userId.value : userId;
      
      // Get personality profile
      const profile = await this.getProfile(userIdValue);
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
        userId: userId instanceof UserId ? userId.value : userId
      });
      throw error;
    }
  }
  /**
   * Update AI attitudes for a user
   * @param {string|UserId} userId - User ID or UserId value object
   * @param {Object} attitudes - AI attitudes to update
   * @returns {Promise<Personality>} Updated personality profile
   * @throws {PersonalityValidationError} If userId is invalid
   * @throws {PersonalityProcessingError} If an error occurs during update
   */
  async updateAIAttitudes(userId, attitudes) {
    try {
      // Extract userId value if it's a value object
      const userIdValue = userId instanceof UserId ? userId.value : userId;
      
      // Get personality profile
      const profile = await this.getProfile(userIdValue);
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
        userId: userId instanceof UserId ? userId.value : userId
      });
      throw error;
    }
  }
  /**
   * Get personality profile for a user
   * @param {string|UserId} userId - User ID or UserId value object
   * @param {Object} queryParams - Query parameters for filtering data
   * @returns {Promise<Object>} Personality profile
   * @throws {PersonalityValidationError} If userId is invalid
   * @throws {NoPersonalityDataError} If no personality profile is found
   * @throws {PersonalityProcessingError} If an error occurs during retrieval
   */
  async getPersonalityProfile(userId, queryParams = {}) {
    try {
      // Extract userId value if it's a value object
      const userIdValue = userId instanceof UserId ? userId.value : userId;
      
      const profile = await this.personalityRepository.findByUserId(userIdValue);
      if (!profile) {
        throw new NoPersonalityDataError(`No personality profile found for user: ${userIdValue}`);
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
        userId: userId instanceof UserId ? userId.value : userId
      });
      throw error;
    }
  }
  /**
   * Delete a personality profile
   * @param {string|UserId} userId - User ID or UserId value object
   * @returns {Promise<boolean>} True if successful
   * @throws {PersonalityValidationError} If userId is invalid
   * @throws {PersonalityProcessingError} If an error occurs during deletion
   */
  async deletePersonalityProfile(userId) {
    try {
      // Extract userId value if it's a value object
      const userIdValue = userId instanceof UserId ? userId.value : userId;
      
      const deleted = await this.personalityRepository.deleteByUserId(userIdValue);
      if (deleted) {
        await eventBus.publishEvent(EventTypes.PERSONALITY_PROFILE_DELETED, {
          userId: userIdValue
        });
      }
      return deleted;
    } catch (error) {
      this.logger.error('Error deleting personality profile', {
        error: error.message,
        userId: userId instanceof UserId ? userId.value : userId
      });
      throw error;
    }
  }
  /**
   * Calculate compatibility between user personality and challenge traits
   * @param {string|UserId} userId - User ID or UserId value object to check compatibility for
   * @param {Object} challengeTraits - Challenge traits to compare against
   * @returns {Promise<Object>} Compatibility scores and analysis
   * @throws {PersonalityValidationError} If userId is invalid
   * @throws {PersonalityProcessingError} If an error occurs during compatibility calculation
   */
  async calculateChallengeCompatibility(userId, challengeTraits) {
    try {
      // Extract userId value if it's a value object
      const userIdValue = userId instanceof UserId ? userId.value : userId;
      
      // Get the user's personality profile
      const profile = await this.getProfile(userIdValue);
      // Extract traits to compare
      const userTraits = profile.personalityTraits;
      // Calculate compatibility scores
      const compatibilityScores = this.traitsAnalysisService.calculateTraitCompatibility(userTraits, challengeTraits);
      // Create recommendations based on compatibility
      const recommendations = this.traitsAnalysisService.generateRecommendations(compatibilityScores, userTraits, challengeTraits);
      return {
        userId: userIdValue,
        overallScore: compatibilityScores.overall,
        traitScores: compatibilityScores.traits,
        recommendations
      };
    } catch (error) {
      this.logger.error('Error calculating challenge compatibility', {
        error: error.message,
        userId: userId instanceof UserId ? userId.value : userId
      });
      throw error;
    }
  }
}
export default PersonalityService;"