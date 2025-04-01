import DifficultyLevel from "#app/core/challenge/models/config/DifficultyLevel.js";
'use strict';
/**
 * DifficultyLevelMapper class
 * Responsible for mapping between DifficultyLevel domain objects and database representation
 */
class DifficultyLevelMapper {
    /**
     * Convert a database record to a DifficultyLevel domain entity
     * @param {Object} data - Database difficulty level record
     * @returns {DifficultyLevel} DifficultyLevel domain entity
     */
    toDomain(data) {
        if (!data) {
            return null;
        }
        // Create DifficultyLevel object from database record
        const difficultyLevel = new DifficultyLevel({
            id: data.id,
            code: data.code,
            name: data.name,
            description: data.description,
            level: data.level,
            sortOrder: data.sort_order || data.sortOrder || 0,
            multiplier: data.multiplier,
            minimumScore: data.minimum_score || data.minimumScore,
            timeLimit: data.time_limit || data.timeLimit,
            maxAttempts: data.max_attempts || data.maxAttempts,
            isActive: data.is_active !== undefined ? data.is_active : data.isActive,
            createdAt: data.created_at || data.createdAt,
            updatedAt: data.updated_at || data.updatedAt,
        });
        return difficultyLevel;
    }
    /**
     * Convert a DifficultyLevel domain entity to database format
     * @param {DifficultyLevel} difficultyLevel - DifficultyLevel domain entity
     * @returns {Object} Database-ready object
     */
    toPersistence(difficultyLevel) {
        if (!difficultyLevel) {
            return null;
        }
        // Convert to database format (camelCase to snake_case)
        return {
            id: difficultyLevel.id,
            code: difficultyLevel.code,
            name: difficultyLevel.name,
            description: difficultyLevel.description,
            level: difficultyLevel.level,
            sort_order: difficultyLevel.sortOrder,
            multiplier: difficultyLevel.multiplier,
            minimum_score: difficultyLevel.minimumScore,
            time_limit: difficultyLevel.timeLimit,
            max_attempts: difficultyLevel.maxAttempts,
            is_active: difficultyLevel.isActive,
            created_at: difficultyLevel.createdAt instanceof Date
                ? difficultyLevel.createdAt.toISOString()
                : difficultyLevel.createdAt,
            updated_at: difficultyLevel.updatedAt instanceof Date
                ? difficultyLevel.updatedAt.toISOString()
                : difficultyLevel.updatedAt,
        };
    }
    /**
     * Convert an array of database records to DifficultyLevel domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<DifficultyLevel>} Array of DifficultyLevel domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            return [];
        }
        return dataArray.map(data => this.toDomain(data));
    }
    /**
     * Convert an array of DifficultyLevel domain entities to database format
     * @param {Array<DifficultyLevel>} difficultyLevels - Array of DifficultyLevel domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(difficultyLevels) {
        if (!Array.isArray(difficultyLevels)) {
            return [];
        }
        return difficultyLevels.map(difficultyLevel => this.toPersistence(difficultyLevel));
    }
}
export default new DifficultyLevelMapper();
