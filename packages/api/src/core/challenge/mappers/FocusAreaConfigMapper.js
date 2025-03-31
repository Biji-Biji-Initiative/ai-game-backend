"../../../challenge/models/config/FocusArea.js;
'use strict';
/**
 * FocusAreaConfigMapper class
 * Responsible for mapping between FocusAreaConfig domain objects and database representation
 */
class FocusAreaConfigMapper {
    /**
     * Convert a database record to a FocusAreaConfig domain entity
     * @param {Object} data - Database focus area config record
     * @returns {FocusAreaConfig} FocusAreaConfig domain entity
     */
    toDomain(data) {
        if (!data) {
            return null;
        }
        // Convert from snake_case database format to camelCase domain format
        const focusAreaConfigData = {
            id: data.id,
            code: data.code,
            name: data.name || data.display_name,
            description: data.description,
            isActive: data.is_active || data.isActive,
            priority: data.priority || 0,
            createdAt: data.created_at instanceof Date
                ? data.created_at
                : new Date(data.created_at || data.createdAt),
            updatedAt: data.updated_at instanceof Date
                ? data.updated_at
                : new Date(data.updated_at || data.updatedAt),
        };
        // Create and return a new FocusAreaConfig domain entity
        return new FocusAreaConfig(focusAreaConfigData);
    }
    /**
     * Convert a FocusAreaConfig domain entity to database format
     * @param {FocusAreaConfig} focusAreaConfig - FocusAreaConfig domain entity
     * @returns {Object} Database-ready object
     */
    toPersistence(focusAreaConfig) {
        if (!focusAreaConfig) {
            return null;
        }
        // Convert from domain entity to database format (camelCase to snake_case)
        return {
            id: focusAreaConfig.id,
            code: focusAreaConfig.code,
            name: focusAreaConfig.name,
            display_name: focusAreaConfig.name,
            description: focusAreaConfig.description,
            is_active: focusAreaConfig.isActive,
            priority: focusAreaConfig.priority,
            created_at: focusAreaConfig.createdAt instanceof Date
                ? focusAreaConfig.createdAt.toISOString()
                : focusAreaConfig.createdAt,
            updated_at: focusAreaConfig.updatedAt instanceof Date
                ? focusAreaConfig.updatedAt.toISOString()
                : focusAreaConfig.updatedAt,
        };
    }
    /**
     * Convert an array of database records to FocusAreaConfig domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<FocusAreaConfig>} Array of FocusAreaConfig domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            return [];
        }
        return dataArray.map(data => this.toDomain(data));
    }
    /**
     * Convert an array of FocusAreaConfig domain entities to database format
     * @param {Array<FocusAreaConfig>} focusAreaConfigs - Array of FocusAreaConfig domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(focusAreaConfigs) {
        if (!Array.isArray(focusAreaConfigs)) {
            return [];
        }
        return focusAreaConfigs.map(config => this.toPersistence(config));
    }
}
export default new FocusAreaConfigMapper();
"