import { v4 as uuidv4 } from "uuid";
'use strict';
/**
 * Challenge Type domain entity
 */
class ChallengeType {
    /**
     * Create a new ChallengeType
     * @param {Object} data - Challenge type data
     * @param {string} [data.id] - Unique identifier
     * @param {string} data.code - Unique code for this challenge type (e.g., 'critical-analysis')
     * @param {string} data.name - Human-readable name
     * @param {string} data.description - Detailed description
     * @param {Array<string>} [data.formatTypes] - Compatible format types
     * @param {Array<string>} [data.focusAreas] - Related focus areas
     * @param {Array<string>} [data.leveragedTraits] - Personality traits leveraged in this challenge type
     * @param {Array<string>} [data.progressionPath] - Recommended next challenge types
     * @param {Object} [data.metadata] - Additional metadata
     * @param {boolean} [data.isActive] - Whether this challenge type is active
     * @param {string} [data.createdAt] - Creation timestamp
     * @param {string} [data.updatedAt] - Last update timestamp
     */
    /**
     * Method constructor
     */
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.code = data.code || '';
        this.name = data.name || '';
        this.description = data.description || '';
        this.formatTypes = data.formatTypes || [];
        this.focusAreas = data.focusAreas || [];
        this.leveragedTraits = data.leveragedTraits || [];
        this.progressionPath = data.progressionPath || [];
        this.metadata = data.metadata || {};
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }
    /**
     * Check if this challenge type supports a specific format
     * @param {string} formatType - Format type code to check
     * @returns {boolean} True if format is supported
     */
    /**
     * Method supportsFormat
     */
    supportsFormat(formatType) {
        return this.formatTypes.includes(formatType);
    }
    /**
     * Check if this challenge type is related to a focus area
     * @param {string} focusArea - Focus area to check
     * @returns {boolean} True if related to focus area
     */
    /**
     * Method relatedToFocusArea
     */
    relatedToFocusArea(focusArea) {
        return this.focusAreas.includes(focusArea);
    }
    /**
     * Check if this challenge type leverages a specific trait
     * @param {string} trait - Trait to check
     * @returns {boolean} True if trait is leveraged
     */
    /**
     * Method leveragesTrait
     */
    leveragesTrait(trait) {
        return this.leveragedTraits.includes(trait);
    }
    /**
     * Get recommended next challenge types
     * @returns {Array<string>} Array of challenge type codes
     */
    /**
     * Method getNextChallengeTypes
     */
    getNextChallengeTypes() {
        return [...this.progressionPath];
    }
    /**
     * Update challenge type data
     * @param {Object} updates - Fields to update
     * @returns {ChallengeType} Updated challenge type
     */
    /**
     * Method update
     */
    update(updates) {
        const allowedFields = [
            'name',
            'description',
            'formatTypes',
            'focusAreas',
            'leveragedTraits',
            'progressionPath',
            'metadata',
            'isActive',
        ];
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                this[field] = updates[field];
            }
        }
        this.updatedAt = new Date().toISOString();
        return this;
    }
}
export default ChallengeType;
