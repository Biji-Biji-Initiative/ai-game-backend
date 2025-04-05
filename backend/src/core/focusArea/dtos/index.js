/**
 * Focus Area DTOs
 * 
 * This module provides Data Transfer Objects for Focus Area entities
 * and mapper functions to convert between domain models and DTOs.
 */

/**
 * FocusAreaDTO class
 * 
 * A data transfer object representing a focus area for API responses
 */
export class FocusAreaDTO {
    /**
     * Create a new FocusAreaDTO
     * @param {Object} data - Focus area data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.userId = data.userId || data.user_id || null;
        this.name = data.name || '';
        this.description = data.description || '';
        this.skills = Array.isArray(data.skills) ? data.skills : [];
        this.priority = data.priority || 1;
        this.active = data.active !== undefined ? data.active : true;
        this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
        this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
        this.metadata = data.metadata || {};
    }

    /**
     * Convert to plain object
     * @returns {Object} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            name: this.name,
            description: this.description,
            skills: this.skills,
            priority: this.priority,
            active: this.active,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            metadata: this.metadata
        };
    }
}

/**
 * FocusAreaDTOMapper class
 * 
 * Handles conversion between focus area domain models and DTOs
 */
export class FocusAreaDTOMapper {
    /**
     * Convert a domain model to a DTO
     * @param {Object} domainModel - Focus area domain model
     * @returns {FocusAreaDTO} Focus area DTO
     */
    static toDTO(domainModel) {
        if (!domainModel) {
            return null;
        }
        
        return new FocusAreaDTO({
            id: domainModel.id,
            userId: domainModel.userId,
            name: domainModel.name,
            description: domainModel.description,
            skills: domainModel.skills || [],
            priority: domainModel.priority,
            active: domainModel.active,
            createdAt: domainModel.createdAt,
            updatedAt: domainModel.updatedAt,
            metadata: domainModel.metadata
        });
    }

    /**
     * Convert an array of domain models to DTOs
     * @param {Array} domainModels - Array of focus area domain models
     * @returns {Array<FocusAreaDTO>} Array of focus area DTOs
     */
    static toDTOList(domainModels) {
        if (!domainModels || !Array.isArray(domainModels)) {
            return [];
        }
        
        return domainModels.map(model => this.toDTO(model));
    }
}

// For backward compatibility
export default {
    FocusAreaDTO,
    FocusAreaDTOMapper
}; 