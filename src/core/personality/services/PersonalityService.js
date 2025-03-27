/**
 * Personality Service
 * 
 * Handles business logic for personality analysis, AI attitudes, and insights generation.
 */

const Personality = require('../models/Personality');
const PersonalityRepository = require('../repositories/PersonalityRepository');
const TraitsAnalysisService = require('./TraitsAnalysisService');
const domainEvents = require('../../shared/domainEvents');
const { v4: uuidv4 } = require('uuid');

class PersonalityService {
  constructor(personalityRepository, traitsAnalysisService, promptBuilder, openaiClient) {
    this.personalityRepository = personalityRepository || new PersonalityRepository();
    this.traitsAnalysisService = traitsAnalysisService || new TraitsAnalysisService(this.personalityRepository);
    this.promptBuilder = promptBuilder;
    this.openaiClient = openaiClient;
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
        await domainEvents.publish('PersonalityProfileCreated', {
          userId,
          personalityId: profile.id
        });
      }
      
      return profile;
    } catch (error) {
      console.error('PersonalityService.getOrCreatePersonalityProfile error:', error);
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
        throw new Error('No personality traits available for analysis');
      }
      
      // Create or get a conversation thread for insights
      if (!profile.threadId) {
        const threadId = uuidv4();
        profile.setThreadId(threadId);
        await this.personalityRepository.save(profile);
      }
      
      // Make sure personality profile is fully analyzed
      await this.processPersonalityData(profile);
      
      // Build prompt for insights generation
      const promptTemplate = await this.promptBuilder.buildPrompt('personality', {
        personalityTraits: profile.personalityTraits,
        aiAttitudes: profile.aiAttitudes,
        dominantTraits: profile.dominantTraits,
        traitClusters: profile.traitClusters,
        aiAttitudeProfile: profile.aiAttitudeProfile
      });
      
      // Generate insights using OpenAI
      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an AI personality analyst helping users understand their cognitive profile and AI attitudes. Respond with valid JSON only.'
          },
          { role: 'user', content: promptTemplate }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });
      
      const insights = JSON.parse(response.choices[0].message.content);
      
      // Store insights in the profile
      profile.setInsights(insights);
      await this.personalityRepository.save(profile);
      
      return insights;
    } catch (error) {
      console.error('PersonalityService.generateInsights error:', error);
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
      domainEvents.publish('PersonalityTraitsUpdatedForUser', {
        userId: profile.userId,
        personalityTraits: profile.personalityTraits
      });
      
      return savedProfile;
    } catch (error) {
      console.error('PersonalityService.updatePersonalityTraits error:', error);
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
      domainEvents.publish('AIAttitudesUpdatedForUser', {
        userId: profile.userId,
        aiAttitudes: profile.aiAttitudes
      });
      
      return savedProfile;
    } catch (error) {
      console.error('PersonalityService.updateAIAttitudes error:', error);
      throw error;
    }
  }

  /**
   * Get personality profile for a user
   * @param {string} userId - User ID
   * @returns {Promise<Personality|null>} Personality profile or null if not found
   */
  async getPersonalityProfile(userId) {
    try {
      return this.personalityRepository.findByUserId(userId);
    } catch (error) {
      console.error('PersonalityService.getPersonalityProfile error:', error);
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
      console.error('PersonalityService.deletePersonalityProfile error:', error);
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
      console.error('PersonalityService.calculateChallengeCompatibility error:', error);
      return 50; // Default neutral score on error
    }
  }
}

module.exports = PersonalityService; 