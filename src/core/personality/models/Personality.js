/**
 * Personality Domain Model
 * 
 * This model represents a user's personality profile including traits,
 * AI attitudes, and insights in the system.
 */

const domainEvents = require('../../shared/domainEvents');
const { v4: uuidv4 } = require('uuid');

class Personality {
  /**
   * Create a personality instance
   * @param {Object} data - Personality data
   */
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.userId = data.userId || data.user_id || null;
    this.personalityTraits = data.personalityTraits || data.personality_traits || {};
    this.aiAttitudes = data.aiAttitudes || data.ai_attitudes || {};
    this.dominantTraits = data.dominantTraits || data.dominant_traits || [];
    this.traitClusters = data.traitClusters || data.trait_clusters || {};
    this.aiAttitudeProfile = data.aiAttitudeProfile || data.ai_attitude_profile || {};
    this.insights = data.insights || {};
    this.threadId = data.threadId || data.thread_id || null;
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
  }

  /**
   * Validate the personality model
   * @returns {Object} Validation result with isValid and errors properties
   */
  validate() {
    const errors = [];

    // Required fields
    if (!this.userId) errors.push('User ID is required');

    // Validate trait values are between 0-100
    const invalidTraits = Object.entries(this.personalityTraits).filter(
      ([key, value]) => value < 0 || value > 100 || !Number.isFinite(value)
    );
    
    if (invalidTraits.length > 0) {
      errors.push(`Personality trait values must be between 0 and 100: ${invalidTraits.map(([k]) => k).join(', ')}`);
    }

    // Validate attitude values are between 0-100
    const invalidAttitudes = Object.entries(this.aiAttitudes).filter(
      ([key, value]) => value < 0 || value > 100 || !Number.isFinite(value)
    );
    
    if (invalidAttitudes.length > 0) {
      errors.push(`AI attitude values must be between 0 and 100: ${invalidAttitudes.map(([k]) => k).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Update personality traits
   * @param {Object} traits - New personality traits to merge with existing ones
   */
  updateTraits(traits) {
    // Validate trait values
    const invalidTraits = Object.entries(traits).filter(
      ([key, value]) => value < 0 || value > 100 || !Number.isFinite(value)
    );
    
    if (invalidTraits.length > 0) {
      throw new Error(`Personality trait values must be between 0 and 100: ${invalidTraits.map(([k]) => k).join(', ')}`);
    }

    // Merge traits
    this.personalityTraits = {
      ...this.personalityTraits,
      ...traits
    };
    
    this.updatedAt = new Date().toISOString();
    
    // Publish domain event
    if (this.userId) {
      domainEvents.publish('PersonalityTraitsUpdated', {
        userId: this.userId,
        personalityId: this.id,
        traits: this.personalityTraits
      });
    }
  }

  /**
   * Update AI attitudes
   * @param {Object} attitudes - New AI attitudes to merge with existing ones
   */
  updateAttitudes(attitudes) {
    // Validate attitude values
    const invalidAttitudes = Object.entries(attitudes).filter(
      ([key, value]) => value < 0 || value > 100 || !Number.isFinite(value)
    );
    
    if (invalidAttitudes.length > 0) {
      throw new Error(`AI attitude values must be between 0 and 100: ${invalidAttitudes.map(([k]) => k).join(', ')}`);
    }

    // Merge attitudes
    this.aiAttitudes = {
      ...this.aiAttitudes,
      ...attitudes
    };
    
    this.updatedAt = new Date().toISOString();
    
    // Publish domain event
    if (this.userId) {
      domainEvents.publish('AIAttitudesUpdated', {
        userId: this.userId,
        personalityId: this.id,
        attitudes: this.aiAttitudes
      });
    }
  }

  /**
   * Set dominant traits based on personality analysis
   * @param {Array} dominantTraits - Array of dominant trait objects
   */
  setDominantTraits(dominantTraits) {
    this.dominantTraits = dominantTraits;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Set trait clusters based on personality analysis
   * @param {Object} traitClusters - Categorized trait clusters
   */
  setTraitClusters(traitClusters) {
    this.traitClusters = traitClusters;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Set AI attitude profile
   * @param {Object} aiAttitudeProfile - Categorized AI attitude profile
   */
  setAIAttitudeProfile(aiAttitudeProfile) {
    this.aiAttitudeProfile = aiAttitudeProfile;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Set insights generated from personality analysis
   * @param {Object} insights - Generated insights
   */
  setInsights(insights) {
    this.insights = insights;
    this.updatedAt = new Date().toISOString();
    
    // Publish domain event
    if (this.userId) {
      domainEvents.publish('PersonalityInsightsGenerated', {
        userId: this.userId,
        personalityId: this.id
      });
    }
  }

  /**
   * Set the conversation thread ID for personality analysis
   * @param {string} threadId - Conversation thread ID
   */
  setThreadId(threadId) {
    this.threadId = threadId;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Convert personality data to format suitable for database storage
   * @returns {Object} Database-formatted personality data
   */
  toDatabase() {
    return {
      id: this.id,
      user_id: this.userId,
      personality_traits: this.personalityTraits,
      ai_attitudes: this.aiAttitudes,
      dominant_traits: this.dominantTraits,
      trait_clusters: this.traitClusters,
      ai_attitude_profile: this.aiAttitudeProfile,
      insights: this.insights,
      thread_id: this.threadId,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }
}

module.exports = Personality; 