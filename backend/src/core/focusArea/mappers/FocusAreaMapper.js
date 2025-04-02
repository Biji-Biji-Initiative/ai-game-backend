import FocusArea from "#app/core/focusArea/models/FocusArea.js";
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

        // Ensure we handle both snake_case and camelCase field names
        // for compatibility with different sources
        return new FocusArea({
            id: data.id,
            userId: data.user_id || data.userId,
            name: data.name,
            description: data.description || '',
            active: data.active !== undefined ? data.active : (data.isActive !== undefined ? data.isActive : true),
            priority: data.priority || 1,
            metadata: data.metadata || {},
        }, { 
            EventTypes: data.EventTypes || null 
        });
    }

    /**
     * Convert a FocusArea entity to database format
     * @param {FocusArea} focusArea - FocusArea domain entity
     * @returns {Object} Database-formatted focus area data
     */
    toPersistence(focusArea) {
        if (!focusArea) {
            throw new Error('Focus area is required');
        }

        if (!(focusArea instanceof FocusArea)) {
            throw new Error('Object must be a FocusArea instance');
        }

        return {
            id: focusArea.id,
            user_id: focusArea.userId,
            name: focusArea.name,
            description: focusArea.description,
            active: focusArea.active,
            priority: focusArea.priority,
            metadata: focusArea.metadata,
            created_at: focusArea.createdAt,
            updated_at: focusArea.updatedAt
        };
    }

    /**
     * Convert a collection of database records to domain entities
     * @param {Array<Object>} items - Array of database records
     * @returns {Array<FocusArea>} Array of FocusArea domain entities
     */
    toDomainCollection(items) {
        if (!items || !Array.isArray(items)) {
            return [];
        }
        
        return items.map(item => this.toDomain(item));
    }

    /**
     * Convert an array of FocusArea domain entities to database format
     * @param {Array<FocusArea>} focusAreas - Array of FocusArea domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(focusAreas) {
        if (!focusAreas || !Array.isArray(focusAreas)) {
            return [];
        }
        
        return focusAreas.map(focusArea => this.toPersistence(focusArea));
    }
}

// Export a singleton instance
const focusAreaMapper = new FocusAreaMapper();
export default focusAreaMapper; 