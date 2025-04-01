import Challenge from "#app/core/challenge/models/Challenge.js";
'use strict';
/**
 * ChallengeMapper class
 * Responsible for mapping between Challenge domain objects and database representation
 */
class ChallengeMapper {
    /**
     * Convert a database record to a Challenge domain entity
     * @param {Object} data - Database challenge record
     * @returns {Challenge} Challenge domain entity
     */
    toDomain(data) {
        if (!data) {
            return null;
        }
        // Convert string dates to Date objects if needed
        const createdAt = data.created_at instanceof Date
            ? data.created_at
            : new Date(data.created_at || data.createdAt);
        const updatedAt = data.updated_at instanceof Date
            ? data.updated_at
            : new Date(data.updated_at || data.updatedAt);
        // Convert from snake_case database format to camelCase domain format
        const challengeData = {
            id: data.id,
            content: data.content,
            userEmail: data.user_email || data.userEmail,
            userId: data.user_id || data.userId,
            focusArea: data.focus_area || data.focusArea,
            focusAreaId: data.focus_area_id || data.focusAreaId,
            challengeType: data.challenge_type || data.challengeType,
            formatType: data.format_type || data.formatType,
            difficulty: data.difficulty,
            status: data.status,
            createdAt,
            updatedAt,
        };
        // Create and return a new Challenge domain entity
        return new Challenge(challengeData);
    }
    /**
     * Convert a Challenge domain entity to database format
     * @param {Challenge} challenge - Challenge domain entity
     * @returns {Object} Database-ready object
     */
    toPersistence(challenge) {
        if (!challenge) {
            return null;
        }
        // Convert from domain entity to database format (camelCase to snake_case)
        return {
            id: challenge.id,
            content: challenge.content,
            user_email: challenge.userEmail,
            user_id: challenge.userId,
            focus_area: challenge.focusArea,
            focus_area_id: challenge.focusAreaId,
            challenge_type: challenge.challengeType,
            format_type: challenge.formatType,
            difficulty: challenge.difficulty,
            status: challenge.status,
            created_at: challenge.createdAt instanceof Date
                ? challenge.createdAt.toISOString()
                : challenge.createdAt,
            updated_at: challenge.updatedAt instanceof Date
                ? challenge.updatedAt.toISOString()
                : challenge.updatedAt,
        };
    }
    /**
     * Convert an array of database records to Challenge domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<Challenge>} Array of Challenge domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            return [];
        }
        return dataArray.map(data => this.toDomain(data));
    }
    /**
     * Convert an array of Challenge domain entities to database format
     * @param {Array<Challenge>} challenges - Array of Challenge domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(challenges) {
        if (!Array.isArray(challenges)) {
            return [];
        }
        return challenges.map(challenge => this.toPersistence(challenge));
    }
}
export default new ChallengeMapper();
