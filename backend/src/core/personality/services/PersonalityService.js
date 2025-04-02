'use strict';

import Personality from "#app/core/personality/models/Personality.js";
import PersonalityRepository from "#app/core/personality/repositories/PersonalityRepository.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { v4 as uuidv4 } from "uuid";
import { personalityLogger } from "#app/core/infra/logging/domainLogger.js";
import { applyRepositoryErrorHandling, applyServiceErrorHandling, applyControllerErrorHandling, createErrorMapper, withServiceErrorHandling } from "#app/core/infra/errors/centralizedErrorUtils.js";
import { PersonalityError, PersonalityNotFoundError, PersonalityValidationError, PersonalityProcessingError } from "#app/core/personality/errors/PersonalityErrors.js";
import { NoPersonalityDataError } from "#app/core/personality/errors/PersonalityErrors.js";
import ConfigurationError from "#app/core/infra/errors/ConfigurationError.js";
import { validateDependencies } from "#app/core/shared/utils/serviceUtils.js";

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
   * @param {Object} dependencies - Service dependencies
   * @param {Object} dependencies.personalityRepository - Repository for personality data
   * @param {Object} dependencies.traitsAnalysisService - Service for analyzing traits
   * @param {Object} dependencies.insightGenerator - Service for generating insights, via port
   * @param {Object} dependencies.eventBus - Event bus for domain events
   */
  constructor(dependencies = {}) {
    // Extract dependencies
    const { personalityRepository, traitsAnalysisService, insightGenerator, eventBus } = 
      typeof dependencies === 'object' && dependencies !== null ? dependencies : {};
    
    // Validate required dependencies - Use a stricter validation
    this.logger = personalityLogger.child({ service: 'PersonalityService' }); // Get logger early
    if (!personalityRepository) {
        this.logger.error('CRITICAL: PersonalityRepository dependency is missing!');
        throw new ConfigurationError('PersonalityRepository is required for PersonalityService');
    }
    if (!traitsAnalysisService) {
        this.logger.error('CRITICAL: TraitsAnalysisService dependency is missing!');
        throw new ConfigurationError('TraitsAnalysisService is required for PersonalityService');
    }
    if (!insightGenerator) {
        this.logger.error('CRITICAL: InsightGenerator dependency is missing!');
        throw new ConfigurationError('InsightGenerator is required for PersonalityService');
    }
    
    if (!eventBus) {
        this.logger.warn('No event bus provided to PersonalityService. Events collected by domain objects may not be published automatically by the repository.');
    }
    
    // Store dependencies
    this.personalityRepository = personalityRepository;
    this.traitsAnalysisService = traitsAnalysisService;
    this.insightGenerator = insightGenerator;
    this.eventBus = eventBus; // Store for potential direct use if necessary, though repository should handle most
    
    this.logger.info('PersonalityService initialized successfully with dependencies.');
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
        this.logger.info(`No profile found for user ${userId}. Creating new profile.`);
        // Create a default empty profile
        const newProfile = new Personality({
          userId,
          // Default values as per model constructor
        }, { EventTypes: EventTypes }); // Pass EventTypes if needed by constructor
        
        // Use save, which should handle event publishing via withTransaction
        profile = await this.personalityRepository.save(newProfile);
      }
      return profile;
    } catch (error) {
      // Map to domain-specific errors
      if (error instanceof PersonalityError) {
        throw error;
      }
      this.logger.error(`Error getting profile for user ${userId}: ${error.message}`, { error });
      throw new PersonalityProcessingError(`Failed to get personality profile: ${error.message}`, { cause: error });
    }
  }
  
  /**
   * Get personality profile with computed insights
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Personality profile with computed insights
   */
  async getEnrichedProfile(userId) {
     try {
        const profile = await this.getProfile(userId);
        return await this.processPersonalityData(profile);
    } catch (error) {
      this.logger.error(`Error getting enriched profile for user ${userId}: ${error.message}`, { error });
       if (error instanceof PersonalityError) {
        throw error;
      }
      throw new PersonalityProcessingError(`Failed to get enriched personality profile: ${error.message}`, { cause: error });
    }
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
      if (Object.keys(profile.personalityTraits || {}).length === 0) {
        throw new NoPersonalityDataError('No personality traits available for analysis');
      }
      // Create or get a conversation thread for insights
      if (!profile.threadId) {
        const threadId = uuidv4();
        profile.setThreadId(threadId); 
        // Save will be called later after processing
      }
      // Make sure personality profile is fully analyzed
      await this.processPersonalityData(profile); // This also saves if changes were made
      
      // Generate insights using the insight generator port
      this.logger.debug('Generating insights', {
        userId: profile.userId
      });
      const insights = await this.insightGenerator.generateFor(profile);
      // Store insights in the profile
      profile.setInsights(insights);
      
      // Save the profile with new insights (and potentially threadId, processed data)
      const savedProfile = await this.personalityRepository.save(profile);
      
      this.logger.info('Generated insights', {
        userId: profile.userId
      });
      return insights;
    } catch (error) {
      this.logger.error('Error generating insights', {
        error: error.message,
        userId
      });
       if (error instanceof PersonalityError) {
        throw error;
      }
      throw new PersonalityProcessingError(`Failed to generate insights: ${error.message}`, { cause: error });
    }
  }
  
  /**
   * Process personality data to ensure computed fields are populated
   * @param {Personality} profile - The personality profile to process
   * @returns {Promise<Personality>} The processed profile
   * @private
   */
  async processPersonalityData(profile) {
    let requiresSave = false;
    // Calculate dominant traits if needed
    if (Object.keys(profile.personalityTraits || {}).length > 0 && (!profile.dominantTraits || profile.dominantTraits.length === 0)) {
      const dominantTraits = this.traitsAnalysisService.computeDominantTraits(profile.personalityTraits);
      profile.setDominantTraits(dominantTraits);
      const traitClusters = this.traitsAnalysisService.identifyTraitClusters(dominantTraits);
      profile.setTraitClusters(traitClusters);
      requiresSave = true;
    }

    // Calculate AI attitude profile if needed
    if (Object.keys(profile.aiAttitudes || {}).length > 0 && (!profile.aiAttitudeProfile || Object.keys(profile.aiAttitudeProfile).length === 0)) {
      const aiAttitudeProfile = this.traitsAnalysisService.analyzeAiAttitudes(profile.aiAttitudes);
      profile.setAIAttitudeProfile(aiAttitudeProfile);
       requiresSave = true;
    }

    // Save if changes were made during processing
    if (requiresSave) {
      this.logger.debug(`Saving processed personality data for user ${profile.userId}`);
      return await this.personalityRepository.save(profile);
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
      // Update traits (domain object handles events)
      profile.updateTraits(traits);
      
      // Re-process personality data after trait update
      await this.processPersonalityData(profile); // This also saves the profile
      
      // No need to manually publish events here, repository's `save` handles it.
      
      this.logger.info(`Updated personality traits for user ${userId}`);
      return profile; // Return the updated profile
    } catch (error) {
      this.logger.error('Error updating personality traits', {
        error: error.message,
        userId
      });
       if (error instanceof PersonalityError) {
        throw error;
      }
      throw new PersonalityProcessingError(`Failed to update traits: ${error.message}`, { cause: error });
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
      // Update attitudes (domain object handles events)
      profile.updateAttitudes(attitudes);
      
       // Re-process personality data after attitude update
      await this.processPersonalityData(profile); // This also saves the profile

      // No need to manually publish events here, repository's `save` handles it.

      this.logger.info(`Updated AI attitudes for user ${userId}`);
      return profile; // Return the updated profile
    } catch (error) {
      this.logger.error('Error updating AI attitudes', {
        error: error.message,
        userId
      });
       if (error instanceof PersonalityError) {
        throw error;
      }
      throw new PersonalityProcessingError(`Failed to update AI attitudes: ${error.message}`, { cause: error });
    }
  }
  
  // Remove updatePreferences if it's handled by UserService
  // Or keep if Personality has specific preference logic
  // /**
  //  * Update preferences for a user
  //  * @param {string} userId - User ID
  //  * @param {Object} preferences - Preferences to update
  //  * @returns {Promise<Personality>} Updated personality profile
  //  */
  // async updatePreferences(userId, preferences) { ... }
}

// Applying error handling to the class prototype methods AFTER the class definition
// This pattern ensures `this` context is correct when wrappers are applied.
Object.getOwnPropertyNames(PersonalityService.prototype).forEach(methodName => {
  if (typeof PersonalityService.prototype[methodName] === 'function' && methodName !== 'constructor') {
    PersonalityService.prototype[methodName] = withServiceErrorHandling(
      PersonalityService.prototype[methodName],
      {
        methodName: methodName,
        domainName: 'personality',
        logger: personalityLogger.child({ service: 'PersonalityService' }), // Ensure logger context
        errorMapper: personalityServiceErrorMapper
      }
    );
  }
});

export default PersonalityService; 