'use strict';
/**
 * ChallengeType Data Transfer Object (DTO)
 *
 * Represents the API representation of a ChallengeType.
 * Decouples the domain model from the API contract.
 */
/**
 * ChallengeType DTO
 * Used for sending challenge type data to clients
 */
class ChallengeTypeDTO {
    /**
     * Create a new ChallengeTypeDTO
     * @param {Object} data - DTO data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.code = data.code || '';
        this.name = data.name || '';
        this.description = data.description || '';
        this.formatTypes = data.formatTypes || [];
        this.focusAreas = data.focusAreas || [];
        this.leveragedTraits = data.leveragedTraits || [];
        this.progressionPath = data.progressionPath || [];
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        // Add only API-relevant fields, omitting internal implementation details
        this.formatCount = Array.isArray(data.formatTypes) ? data.formatTypes.length : 0;
        this.focusAreaCount = Array.isArray(data.focusAreas) ? data.focusAreas.length : 0;
        this.hasProgression = Array.isArray(data.progressionPath) && data.progressionPath.length > 0;
        this.primaryTrait = this._getPrimaryTrait(data.leveragedTraits || []);
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
            formatTypes: this.formatTypes,
            focusAreas: this.focusAreas,
            leveragedTraits: this.leveragedTraits,
            progressionPath: this.progressionPath,
            isActive: this.isActive,
            formatCount: this.formatCount,
            focusAreaCount: this.focusAreaCount,
            hasProgression: this.hasProgression,
            primaryTrait: this.primaryTrait,
        };
    }
    /**
     * Get the primary personality trait leveraged by this challenge type
     * @param {Array<string>} traits - Array of trait codes
     * @returns {string|null} Primary trait or null if none
     * @private
     */
    _getPrimaryTrait(traits) {
        if (!Array.isArray(traits) || traits.length === 0) {
            return null;
        }
        // Simply return the first trait as primary (could be enhanced with a more sophisticated algorithm)
        return traits[0];
    }
}
/**
 * ChallengeType DTO Mapper
 * Converts between domain entities and DTOs
 */
class ChallengeTypeDTOMapper {
    /**
     * Convert a domain ChallengeType to a ChallengeTypeDTO
     * @param {ChallengeType} challengeType - Domain ChallengeType entity
     * @returns {ChallengeTypeDTO} ChallengeType DTO for API consumption
     */
    static toDTO(challengeType) {
        if (!challengeType) {
            return null;
        }
        // Extract only the properties needed for the API
        const dto = new ChallengeTypeDTO({
            id: challengeType.id,
            code: challengeType.code,
            name: challengeType.name,
            description: challengeType.description,
            formatTypes: challengeType.formatTypes,
            focusAreas: challengeType.focusAreas,
            leveragedTraits: challengeType.leveragedTraits,
            progressionPath: challengeType.progressionPath,
            isActive: challengeType.isActive,
        });
        return dto;
    }
    /**
     * Convert an array of domain ChallengeTypes to ChallengeTypeDTOs
     * @param {Array<ChallengeType>} challengeTypes - Array of domain ChallengeType entities
     * @returns {Array<ChallengeTypeDTO>} Array of ChallengeType DTOs
     */
    static toDTOCollection(challengeTypes) {
        if (!Array.isArray(challengeTypes)) {
            return [];
        }
        return challengeTypes.map(challengeType => ChallengeTypeDTOMapper.toDTO(challengeType));
    }
    /**
     * Convert a request body to parameters for domain operations
     * @param {Object} requestBody - API request body
     * @returns {Object} Parameters for domain operations
     */
    static fromRequest(requestBody) {
        // Extract and validate fields from request
        const { code, name, description, formatTypes, focusAreas, leveragedTraits, progressionPath, isActive, } = requestBody;
        // Return an object with validated and sanitized properties
        return {
            code: code ? code.trim().toLowerCase() : null,
            name: name ? name.trim() : null,
            description: description ? description.trim() : null,
            formatTypes: Array.isArray(formatTypes) ? formatTypes.map(ft => ft.trim().toLowerCase()) : [],
            focusAreas: Array.isArray(focusAreas) ? focusAreas.map(fa => fa.trim().toLowerCase()) : [],
            leveragedTraits: Array.isArray(leveragedTraits)
                ? leveragedTraits.map(t => t.trim().toLowerCase())
                : [],
            progressionPath: Array.isArray(progressionPath)
                ? progressionPath.map(p => p.trim().toLowerCase())
                : [],
            isActive: isActive !== undefined ? Boolean(isActive) : null,
        };
    }
}
export { ChallengeTypeDTO };
export { ChallengeTypeDTOMapper };
export default {
    ChallengeTypeDTO,
    ChallengeTypeDTOMapper
};
