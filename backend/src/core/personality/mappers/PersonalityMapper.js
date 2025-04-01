import Personality from "#app/core/personality/models/Personality.js";
import { personalityDatabaseSchema } from "#app/core/personality/schemas/personalitySchema.js";
'use strict';
/**
 * PersonalityMapper class
 * Provides methods to convert between domain entities and database representations
 */
class PersonalityMapper {
    /**
     * Convert a Personality entity to database format
     * @param {Personality} personality - Personality domain entity
     * @returns {Object} Database-formatted personality data
     */
    toPersistence(personality) {
        if (!personality) {
            throw new Error('Personality is required');
        }
        if (!(personality instanceof Personality)) {
            throw new Error('Object must be a Personality instance');
        }
        // Validate the data using the schema (optional but recommended)
        const validationResult = personalityDatabaseSchema.safeParse({
            id: personality.id,
            user_id: personality.userId,
            personality_traits: personality.personalityTraits,
            ai_attitudes: personality.aiAttitudes,
            dominant_traits: personality.dominantTraits,
            trait_clusters: personality.traitClusters,
            ai_attitude_profile: personality.aiAttitudeProfile,
            insights: personality.insights,
            thread_id: personality.threadId,
            created_at: personality.createdAt,
            updated_at: personality.updatedAt,
        });
        if (!validationResult.success) {
            throw new Error(`Invalid personality data: ${validationResult.error.message}`);
        }
        // Return the validated data (or construct it directly if validation is skipped)
        return validationResult.data;
    }
    /**
     * Convert database data to a Personality domain entity
     * @param {Object} data - Database data
     * @returns {Personality} Personality domain entity
     */
    toDomain(data) {
        if (!data) {
            return null;
        }
        return new Personality(data);
    }
    /**
     * Convert a collection of database records to domain entities
     * @param {Array<Object>} items - Array of database records
     * @returns {Array<Personality>} Array of Personality domain entities
     */
    toDomainCollection(items) {
        if (!items || !Array.isArray(items)) {
            return [];
        }
        return items.map(item => this.toDomain(item));
    }
}
// Create a singleton instance
const personalityMapper = new PersonalityMapper();
export default personalityMapper;
