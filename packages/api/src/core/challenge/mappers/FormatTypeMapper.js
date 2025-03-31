"../../../challenge/models/config/FormatType.js;
'use strict';
/**
 * FormatTypeMapper class
 * Responsible for mapping between FormatType domain objects and database representation
 */
class FormatTypeMapper {
    /**
     * Convert a database record to a FormatType domain entity
     * @param {Object} data - Database format type record
     * @returns {FormatType} FormatType domain entity
     */
    toDomain(data) {
        if (!data) {
            return null;
        }
        // Create FormatType object from database record
        const formatType = new FormatType({
            id: data.id,
            code: data.code,
            name: data.name,
            description: data.description,
            promptTemplate: data.prompt_template || data.promptTemplate,
            responseFormat: data.response_format || data.responseFormat,
            systemInstructions: data.system_instructions || data.systemInstructions,
            defaultTimeLimit: data.default_time_limit || data.defaultTimeLimit,
            defaultMaxAttempts: data.default_max_attempts || data.defaultMaxAttempts,
            isActive: data.is_active !== undefined ? data.is_active : data.isActive,
            sortOrder: data.sort_order || data.sortOrder || 0,
            createdAt: data.created_at || data.createdAt,
            updatedAt: data.updated_at || data.updatedAt,
        });
        return formatType;
    }
    /**
     * Convert a FormatType domain entity to database format
     * @param {FormatType} formatType - FormatType domain entity
     * @returns {Object} Database-ready object
     */
    toPersistence(formatType) {
        if (!formatType) {
            return null;
        }
        // Convert to database format (camelCase to snake_case)
        return {
            id: formatType.id,
            code: formatType.code,
            name: formatType.name,
            description: formatType.description,
            prompt_template: formatType.promptTemplate,
            response_format: formatType.responseFormat,
            system_instructions: formatType.systemInstructions,
            default_time_limit: formatType.defaultTimeLimit,
            default_max_attempts: formatType.defaultMaxAttempts,
            is_active: formatType.isActive,
            sort_order: formatType.sortOrder,
            created_at: formatType.createdAt instanceof Date
                ? formatType.createdAt.toISOString()
                : formatType.createdAt,
            updated_at: formatType.updatedAt instanceof Date
                ? formatType.updatedAt.toISOString()
                : formatType.updatedAt,
        };
    }
    /**
     * Convert an array of database records to FormatType domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<FormatType>} Array of FormatType domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            return [];
        }
        return dataArray.map(data => this.toDomain(data));
    }
    /**
     * Convert an array of FormatType domain entities to database format
     * @param {Array<FormatType>} formatTypes - Array of FormatType domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(formatTypes) {
        if (!Array.isArray(formatTypes)) {
            return [];
        }
        return formatTypes.map(formatType => this.toPersistence(formatType));
    }
}
export default new FormatTypeMapper();
"