import Recommendation from "#app/core/adaptive/models/Recommendation.js";
import { AdaptiveValidationError } from "#app/core/adaptive/errors/adaptiveErrors.js";
'use strict';
/**
 * RecommendationMapper class
 * Provides methods to convert between domain entities and database representations
 */
class RecommendationMapper {
    /**
     * Convert a Recommendation entity to database format
     * @param {Recommendation} recommendation - Recommendation domain entity
     * @returns {Object} Database-formatted recommendation data
     */
    toPersistence(recommendation) {
        if (!recommendation) {
            throw new AdaptiveValidationError('Recommendation is required for persistence mapping');
        }
        if (!(recommendation instanceof Recommendation)) {
            throw new AdaptiveValidationError('Object must be a Recommendation instance for persistence mapping');
        }
        return {
            id: recommendation.id,
            user_id: recommendation.userId,
            created_at: recommendation.createdAt,
            recommended_focus_areas: recommendation.recommendedFocusAreas,
            recommended_challenge_types: recommendation.recommendedChallengeTypes,
            suggested_learning_resources: recommendation.suggestedLearningResources,
            challenge_parameters: recommendation.challengeParameters,
            strengths: recommendation.strengths,
            weaknesses: recommendation.weaknesses,
            metadata: recommendation.metadata,
        };
    }
    /**
     * Convert database data to a Recommendation domain entity
     * @param {Object} data - Database data
     * @returns {Recommendation} Recommendation domain entity
     */
    toDomain(data) {
        if (!data) {
            return null;
        }
        const recommendationData = {
            id: data.id,
            userId: data.user_id,
            createdAt: data.created_at,
            recommendedFocusAreas: data.recommended_focus_areas,
            recommendedChallengeTypes: data.recommended_challenge_types,
            suggestedLearningResources: data.suggested_learning_resources,
            challengeParameters: data.challenge_parameters,
            strengths: data.strengths,
            weaknesses: data.weaknesses,
            metadata: data.metadata,
        };
        return new Recommendation(recommendationData);
    }
    /**
     * Convert a collection of database records to domain entities
     * @param {Array<Object>} items - Array of database records
     * @returns {Array<Recommendation>} Array of Recommendation domain entities
     */
    toDomainCollection(items) {
        if (!Array.isArray(items)) {
            return [];
        }
        return items.map(item => this.toDomain(item)).filter(Boolean);
    }
}
// Create a singleton instance
const recommendationMapper = new RecommendationMapper();
export default recommendationMapper;
