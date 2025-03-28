/**
 * Challenge Type Model
 * 
 * Represents a type of challenge in the system (e.g., critical-analysis, creative-problem-solving).
 * This is a configuration entity that defines the structure and properties of challenges.
 */

const { v4: uuidv4 } = require('uuid');

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
  supportsFormat(formatType) {
    return this.formatTypes.includes(formatType);
  }

  /**
   * Check if this challenge type is related to a focus area
   * @param {string} focusArea - Focus area to check
   * @returns {boolean} True if related to focus area
   */
  relatedToFocusArea(focusArea) {
    return this.focusAreas.includes(focusArea);
  }

  /**
   * Check if this challenge type leverages a specific trait
   * @param {string} trait - Trait to check
   * @returns {boolean} True if trait is leveraged
   */
  leveragesTrait(trait) {
    return this.leveragedTraits.includes(trait);
  }

  /**
   * Get recommended next challenge types
   * @returns {Array<string>} Array of challenge type codes
   */
  getNextChallengeTypes() {
    return [...this.progressionPath];
  }

  /**
   * Update challenge type data
   * @param {Object} updates - Fields to update
   * @returns {ChallengeType} Updated challenge type
   */
  update(updates) {
    const allowedFields = [
      'name', 'description', 'formatTypes', 'focusAreas',
      'leveragedTraits', 'progressionPath', 'metadata', 'isActive'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        this[field] = updates[field];
      }
    }
    
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Convert to database format
   * @returns {Object} Database representation
   */
  toDatabase() {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      description: this.description,
      format_types: this.formatTypes,
      focus_areas: this.focusAreas,
      leveraged_traits: this.leveragedTraits,
      progression_path: this.progressionPath,
      metadata: this.metadata,
      is_active: this.isActive,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  /**
   * Create from database record
   * @param {Object} data - Database record
   * @returns {ChallengeType} ChallengeType instance
   */
  static fromDatabase(data) {
    return new ChallengeType({
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      formatTypes: data.format_types || data.formatTypes || [],
      focusAreas: data.focus_areas || data.focusAreas || [],
      leveragedTraits: data.leveraged_traits || data.leveragedTraits || [],
      progressionPath: data.progression_path || data.progressionPath || [],
      metadata: data.metadata || {},
      isActive: data.is_active !== undefined ? data.is_active : (data.isActive || true),
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt
    });
  }
}

module.exports = ChallengeType; 