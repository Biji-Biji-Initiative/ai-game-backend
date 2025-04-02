import Entity from "#app/core/common/models/Entity.js";
import { AdaptiveValidationError } from "#app/core/adaptive/errors/adaptiveErrors.js";
'use strict';
/**
 * Class representing a recommendation for user learning
 * @extends Entity
 */
class Recommendation extends Entity {
    /**
     * Create a recommendation instance
     * @param {Object} data - Recommendation data
     */
    /**
     * Method constructor
     */
    constructor(data = {}) {
        super(data.id);
        this.userId = data.userId || data.user_id || null;
        this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
        this.recommendedFocusAreas = data.recommendedFocusAreas || data.recommended_focus_areas || [];
        this.recommendedChallengeTypes =
            data.recommendedChallengeTypes || data.recommended_challenge_types || [];
        this.suggestedLearningResources =
            data.suggestedLearningResources || data.suggested_learning_resources || [];
        this.challengeParameters = data.challengeParameters || data.challenge_parameters || null;
        this.strengths = data.strengths || [];
        this.weaknesses = data.weaknesses || [];
        this.metadata = data.metadata || {};
    }
    /**
     * Validate the recommendation model
     * @returns {Object} Validation result with isValid and errors properties
     */
    /**
     * Method validate
     */
    validate() {
        const errors = [];
        // Required fields
        if (!this.userId) {
            errors.push('User ID is required');
        }
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
            errors,
        };
    }
    /**
     * Set recommended focus areas
     * @param {Array} focusAreas - Array of focus areas
     */
    /**
     * Method setRecommendedFocusAreas
     */
    setRecommendedFocusAreas(focusAreas) {
        if (!Array.isArray(focusAreas)) {
            throw new AdaptiveValidationError('Focus areas must be an array');
        }
        this.recommendedFocusAreas = focusAreas;
        // Add domain event instead of directly publishing
        if (this.userId) {
            this.addDomainEvent('FocusAreasRecommended', {
                userId: this.userId,
                focusAreas: this.recommendedFocusAreas,
            });
        }
    }
    /**
     * Set recommended challenge types
     * @param {Array} challengeTypes - Array of challenge types
     */
    /**
     * Method setRecommendedChallengeTypes
     */
    setRecommendedChallengeTypes(challengeTypes) {
        if (!Array.isArray(challengeTypes)) {
            throw new AdaptiveValidationError('Challenge types must be an array');
        }
        this.recommendedChallengeTypes = challengeTypes;
        // Add domain event instead of directly publishing
        if (this.userId) {
            this.addDomainEvent('ChallengeTypesRecommended', {
                userId: this.userId,
                challengeTypes: this.recommendedChallengeTypes,
            });
        }
    }
    /**
     * Set suggested learning resources
     * @param {Array} resources - Array of learning resources
     */
    /**
     * Method setSuggestedLearningResources
     */
    setSuggestedLearningResources(resources) {
        if (!Array.isArray(resources)) {
            throw new AdaptiveValidationError('Learning resources must be an array');
        }
        this.suggestedLearningResources = resources;
    }
    /**
     * Set challenge parameters
     * @param {Object} parameters - Challenge parameters
     */
    /**
     * Method setChallengeParameters
     */
    setChallengeParameters(parameters) {
        if (!parameters || typeof parameters !== 'object') {
            throw new AdaptiveValidationError('Challenge parameters must be an object');
        }
        this.challengeParameters = parameters;
        // Add domain event instead of directly publishing
        if (this.userId) {
            this.addDomainEvent('ChallengeParametersGenerated', {
                userId: this.userId,
                challengeParameters: this.challengeParameters,
            });
        }
    }
    /**
     * Set strengths and weaknesses
     * @param {Array} strengths - Areas of strength
     * @param {Array} weaknesses - Areas of weakness
     */
    /**
     * Method setStrengthsAndWeaknesses
     */
    setStrengthsAndWeaknesses(strengths, weaknesses) {
        if (strengths && !Array.isArray(strengths)) {
            throw new AdaptiveValidationError('Strengths must be an array');
        }
        if (weaknesses && !Array.isArray(weaknesses)) {
            throw new AdaptiveValidationError('Weaknesses must be an array');
        }
        this.strengths = strengths || [];
        this.weaknesses = weaknesses || [];
    }
    /**
     * Add metadata to the recommendation
     * @param {string} key - Metadata key
     * @param {any} value - Metadata value
     */
    /**
     * Method addMetadata
     */
    addMetadata(key, value) {
        if (!key) {
            throw new AdaptiveValidationError('Metadata key is required');
        }
        this.metadata[key] = value;
    }
}
export default Recommendation;
