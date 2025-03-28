/**
 * Recommendation Domain Model
 * 
 * This model represents personalized challenge and learning recommendations
 * based on user performance, profile, and learning history.
 */

const domainEvents = require('../../common/events/domainEvents');
const { v4: uuidv4 } = require('uuid');

class Recommendation {
  /**
   * Create a recommendation instance
   * @param {Object} data - Recommendation data
   */
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.userId = data.userId || data.user_id || null;
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    this.recommendedFocusAreas = data.recommendedFocusAreas || data.recommended_focus_areas || [];
    this.recommendedChallengeTypes = data.recommendedChallengeTypes || data.recommended_challenge_types || [];
    this.suggestedLearningResources = data.suggestedLearningResources || data.suggested_learning_resources || [];
    this.challengeParameters = data.challengeParameters || data.challenge_parameters || null;
    this.strengths = data.strengths || [];
    this.weaknesses = data.weaknesses || [];
    this.metadata = data.metadata || {};
  }

  /**
   * Validate the recommendation model
   * @returns {Object} Validation result with isValid and errors properties
   */
  validate() {
    const errors = [];

    // Required fields
    if (!this.userId) errors.push('User ID is required');

    // Validate arrays
    if (!Array.isArray(this.recommendedFocusAreas)) {
      errors.push('Recommended focus areas must be an array');
    }

    if (!Array.isArray(this.recommendedChallengeTypes)) {
      errors.push('Recommended challenge types must be an array');
    }

    if (!Array.isArray(this.suggestedLearningResources)) {
      errors.push('Suggested learning resources must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Set recommended focus areas
   * @param {Array} focusAreas - Array of focus areas
   */
  setRecommendedFocusAreas(focusAreas) {
    if (!Array.isArray(focusAreas)) {
      throw new Error('Focus areas must be an array');
    }

    this.recommendedFocusAreas = focusAreas;
    
    // Publish domain event
    if (this.userId) {
      domainEvents.publish('FocusAreasRecommended', {
        userId: this.userId,
        focusAreas: this.recommendedFocusAreas
      });
    }
  }

  /**
   * Set recommended challenge types
   * @param {Array} challengeTypes - Array of challenge types
   */
  setRecommendedChallengeTypes(challengeTypes) {
    if (!Array.isArray(challengeTypes)) {
      throw new Error('Challenge types must be an array');
    }

    this.recommendedChallengeTypes = challengeTypes;
    
    // Publish domain event
    if (this.userId) {
      domainEvents.publish('ChallengeTypesRecommended', {
        userId: this.userId,
        challengeTypes: this.recommendedChallengeTypes
      });
    }
  }

  /**
   * Set suggested learning resources
   * @param {Array} resources - Array of learning resources
   */
  setSuggestedLearningResources(resources) {
    if (!Array.isArray(resources)) {
      throw new Error('Learning resources must be an array');
    }

    this.suggestedLearningResources = resources;
  }

  /**
   * Set challenge parameters
   * @param {Object} parameters - Challenge parameters
   */
  setChallengeParameters(parameters) {
    if (!parameters || typeof parameters !== 'object') {
      throw new Error('Challenge parameters must be an object');
    }

    this.challengeParameters = parameters;
    
    // Publish domain event
    if (this.userId) {
      domainEvents.publish('ChallengeParametersGenerated', {
        userId: this.userId,
        challengeParameters: this.challengeParameters
      });
    }
  }

  /**
   * Set strengths and weaknesses
   * @param {Array} strengths - Areas of strength
   * @param {Array} weaknesses - Areas of weakness
   */
  setStrengthsAndWeaknesses(strengths, weaknesses) {
    if (strengths && !Array.isArray(strengths)) {
      throw new Error('Strengths must be an array');
    }

    if (weaknesses && !Array.isArray(weaknesses)) {
      throw new Error('Weaknesses must be an array');
    }

    this.strengths = strengths || [];
    this.weaknesses = weaknesses || [];
  }

  /**
   * Add metadata to the recommendation
   * @param {string} key - Metadata key
   * @param {any} value - Metadata value
   */
  addMetadata(key, value) {
    if (!key) {
      throw new Error('Metadata key is required');
    }

    this.metadata[key] = value;
  }

  /**
   * Convert recommendation data to format suitable for database storage
   * @returns {Object} Database-formatted recommendation data
   */
  toDatabase() {
    return {
      id: this.id,
      user_id: this.userId,
      created_at: this.createdAt,
      recommended_focus_areas: this.recommendedFocusAreas,
      recommended_challenge_types: this.recommendedChallengeTypes,
      suggested_learning_resources: this.suggestedLearningResources,
      challenge_parameters: this.challengeParameters,
      strengths: this.strengths,
      weaknesses: this.weaknesses,
      metadata: this.metadata
    };
  }
}

module.exports = Recommendation; 