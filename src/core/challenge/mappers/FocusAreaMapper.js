import FocusArea from "../models/config/FocusArea.js";
'use strict';
/**
 * FocusAreaMapper class
 * Responsible for mapping between FocusArea domain objects and database representation
 */
class FocusAreaMapper {
    /**
     * Convert a database record to a FocusArea domain entity
     * @param {Object} data - Database focus area record
     * @returns {FocusArea} FocusArea domain entity
     */
    toDomain(data) {
        if (!data) {
            return null;
        }
        // Create FocusArea object from database record
        const focusArea = new FocusArea({
            id: data.id,
            code: data.code,
            name: data.name,
            description: data.description,
            categories: data.categories || data.categoriesArray || [],
            skills: data.skills || [],
            recommendedTraits: data.recommended_traits || data.recommendedTraits || [],
            relatedFocusAreas: data.related_focus_areas || data.relatedFocusAreas || [],
            difficulty: data.difficulty || 1,
            sortOrder: data.sort_order || data.sortOrder || 0,
            metadata: data.metadata || {},
            isActive: data.is_active !== undefined ? data.is_active : data.isActive,
            createdAt: data.created_at || data.createdAt,
            updatedAt: data.updated_at || data.updatedAt,
        });
        return focusArea;
    }
    /**
     * Convert a FocusArea domain entity to database format
     * @param {FocusArea} focusArea - FocusArea domain entity
     * @returns {Object} Database-ready object
     */
    toPersistence(focusArea) {
        if (!focusArea) {
            return null;
        }
        // Convert to database format (camelCase to snake_case)
        return {
            id: focusArea.id,
            code: focusArea.code,
            name: focusArea.name,
            description: focusArea.description,
            categories: focusArea.categories,
            skills: focusArea.skills,
            recommended_traits: focusArea.recommendedTraits,
            related_focus_areas: focusArea.relatedFocusAreas,
            difficulty: focusArea.difficulty,
            sort_order: focusArea.sortOrder,
            metadata: focusArea.metadata,
            is_active: focusArea.isActive,
            created_at: focusArea.createdAt instanceof Date
                ? focusArea.createdAt.toISOString()
                : focusArea.createdAt,
            updated_at: focusArea.updatedAt instanceof Date
                ? focusArea.updatedAt.toISOString()
                : focusArea.updatedAt,
        };
    }
    /**
     * Convert an array of database records to FocusArea domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<FocusArea>} Array of FocusArea domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            return [];
        }
        return dataArray.map(data => this.toDomain(data));
    }
    /**
     * Convert an array of FocusArea domain entities to database format
     * @param {Array<FocusArea>} focusAreas - Array of FocusArea domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(focusAreas) {
        if (!Array.isArray(focusAreas)) {
            return [];
        }
        return focusAreas.map(focusArea => this.toPersistence(focusArea));
    }
}
export default new FocusAreaMapper();
