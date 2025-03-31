"../../../adaptive/models/Recommendation.js;
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
            throw new Error('Recommendation is required');
        }
        if (!(recommendation instanceof Recommendation)) {
            throw new Error('Object must be a Recommendation instance');
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
        return new Recommendation(data);
    }
    /**
     * Convert a collection of database records to domain entities
     * @param {Array<Object>} items - Array of database records
     * @returns {Array<Recommendation>} Array of Recommendation domain entities
     */
    toDomainCollection(items) {
        if (!items || !Array.isArray(items)) {
            return [];
        }
        return items.map(item => this.toDomain(item));
    }
}
// Create a singleton instance
const recommendationMapper = new RecommendationMapper();
export default recommendationMapper;
"