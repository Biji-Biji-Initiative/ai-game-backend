'use strict';
/**
 * DifficultyLevel Data Transfer Object (DTO)
 *
 * Represents the API representation of a DifficultyLevel.
 * Decouples the domain model from the API contract.
 */
/**
 * DifficultyLevel DTO
 * Used for sending difficulty level data to clients
 */
class DifficultyLevelDTO {
    /**
     * Create a new DifficultyLevelDTO
     * @param {Object} data - DTO data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.code = data.code || '';
        this.name = data.name || '';
        this.description = data.description || '';
        this.sortOrder = data.sortOrder || 0;
        this.standardTime = data.standardTime || 300; // 5 minutes in seconds
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        // Add only API-relevant fields, omitting internal implementation details
        this.standardTimeInMinutes = Math.round((data.standardTime || 300) / 60);
        this.difficulty = this._getDifficultyLabel(data.sortOrder || 0);
    }
    /**
     * Convert to plain object format suitable for JSON serialization
     * @returns {Object} Plain object
     */
    toJSON() {
        return {
            id: this.id,
            code: this.code,
            name: this.name,
            description: this.description,
            sortOrder: this.sortOrder,
            standardTime: this.standardTime,
            isActive: this.isActive,
            standardTimeInMinutes: this.standardTimeInMinutes,
            difficulty: this.difficulty,
        };
    }
    /**
     * Get a user-friendly difficulty label based on sort order
     * @param {number} sortOrder - The numerical sort order
     * @returns {string} A user-friendly difficulty label
     * @private
     */
    _getDifficultyLabel(sortOrder) {
        if (sortOrder < 3) {
            return 'Easy';
        }
        if (sortOrder < 6) {
            return 'Medium';
        }
        if (sortOrder < 9) {
            return 'Hard';
        }
        return 'Expert';
    }
}
/**
 * DifficultyLevel DTO Mapper
 * Converts between domain entities and DTOs
 */
class DifficultyLevelDTOMapper {
    /**
     * Convert a domain DifficultyLevel to a DifficultyLevelDTO
     * @param {DifficultyLevel} difficultyLevel - Domain DifficultyLevel entity
     * @returns {DifficultyLevelDTO} DifficultyLevel DTO for API consumption
     */
    static toDTO(difficultyLevel) {
        if (!difficultyLevel) {
            return null;
        }
        // Extract only the properties needed for the API
        const dto = new DifficultyLevelDTO({
            id: difficultyLevel.id,
            code: difficultyLevel.code,
            name: difficultyLevel.name,
            description: difficultyLevel.description,
            sortOrder: difficultyLevel.sortOrder,
            standardTime: difficultyLevel.standardTime,
            isActive: difficultyLevel.isActive,
        });
        return dto;
    }
    /**
     * Convert an array of domain DifficultyLevels to DifficultyLevelDTOs
     * @param {Array<DifficultyLevel>} difficultyLevels - Array of domain DifficultyLevel entities
     * @returns {Array<DifficultyLevelDTO>} Array of DifficultyLevel DTOs
     */
    static toDTOCollection(difficultyLevels) {
        if (!Array.isArray(difficultyLevels)) {
            return [];
        }
        return difficultyLevels.map(difficultyLevel => DifficultyLevelDTOMapper.toDTO(difficultyLevel));
    }
    /**
     * Convert a request body to parameters for domain operations
     * @param {Object} requestBody - API request body
     * @returns {Object} Parameters for domain operations
     */
    static fromRequest(requestBody) {
        // Extract and validate fields from request
        const { code, name, description, sortOrder, standardTime, isActive } = requestBody;
        // Return an object with validated and sanitized properties
        return {
            code: code ? code.trim().toLowerCase() : null,
            name: name ? name.trim() : null,
            description: description ? description.trim() : null,
            sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : null,
            standardTime: standardTime !== undefined ? parseInt(standardTime, 10) : null,
            isActive: isActive !== undefined ? Boolean(isActive) : null,
        };
    }
}
export { DifficultyLevelDTO };
export { DifficultyLevelDTOMapper };
export default {
    DifficultyLevelDTO,
    DifficultyLevelDTOMapper
};
