import ChallengeType from "#app/core/challenge/models/config/ChallengeType.js";
'use strict';
/**
 * ChallengeTypeMapper class
 * Responsible for mapping between ChallengeType domain objects and database representation
 */
class ChallengeTypeMapper {
    /**
     * Convert a database record to a ChallengeType domain entity
     * @param {Object} data - Database challenge type record
     * @returns {ChallengeType} ChallengeType domain entity
     */
    toDomain(data) {
        if (!data) {
            return null;
        }
        // Create ChallengeType object from database record
        const challengeType = new ChallengeType({
            id: data.id,
            code: data.code,
            name: data.name,
            description: data.description,
            promptTemplate: data.prompt_template || data.promptTemplate,
            systemInstructions: data.system_instructions || data.systemInstructions,
            defaultEvaluationCriteria: data.default_evaluation_criteria || data.defaultEvaluationCriteria || [],
            defaultTimeLimit: data.default_time_limit || data.defaultTimeLimit,
            defaultMaxAttempts: data.default_max_attempts || data.defaultMaxAttempts,
            isActive: data.is_active !== undefined ? data.is_active : data.isActive,
            sortOrder: data.sort_order || data.sortOrder || 0,
            metadata: data.metadata || {},
            createdAt: data.created_at || data.createdAt,
            updatedAt: data.updated_at || data.updatedAt,
        });
        return challengeType;
    }
    /**
     * Convert a ChallengeType domain entity to database format
     * @param {ChallengeType} challengeType - ChallengeType domain entity
     * @returns {Object} Database-ready object
     */
    toPersistence(challengeType) {
        if (!challengeType) {
            return null;
        }
        // Convert to database format (camelCase to snake_case)
        return {
            id: challengeType.id,
            code: challengeType.code,
            name: challengeType.name,
            description: challengeType.description,
            prompt_template: challengeType.promptTemplate,
            system_instructions: challengeType.systemInstructions,
            default_evaluation_criteria: challengeType.defaultEvaluationCriteria,
            default_time_limit: challengeType.defaultTimeLimit,
            default_max_attempts: challengeType.defaultMaxAttempts,
            is_active: challengeType.isActive,
            sort_order: challengeType.sortOrder,
            metadata: challengeType.metadata,
            created_at: challengeType.createdAt instanceof Date
                ? challengeType.createdAt.toISOString()
                : challengeType.createdAt,
            updated_at: challengeType.updatedAt instanceof Date
                ? challengeType.updatedAt.toISOString()
                : challengeType.updatedAt,
        };
    }
    /**
     * Convert an array of database records to ChallengeType domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<ChallengeType>} Array of ChallengeType domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            return [];
        }
        return dataArray.map(data => this.toDomain(data));
    }
    /**
     * Convert an array of ChallengeType domain entities to database format
     * @param {Array<ChallengeType>} challengeTypes - Array of ChallengeType domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(challengeTypes) {
        if (!Array.isArray(challengeTypes)) {
            return [];
        }
        return challengeTypes.map(challengeType => this.toPersistence(challengeType));
    }
}
export default new ChallengeTypeMapper();
