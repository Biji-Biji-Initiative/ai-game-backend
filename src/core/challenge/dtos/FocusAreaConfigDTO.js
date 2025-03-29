'use strict';

/**
 * FocusAreaConfig Data Transfer Object (DTO)
 *
 * Represents the API representation of a FocusAreaConfig.
 * Decouples the domain model from the API contract.
 */

/**
 * FocusAreaConfig DTO
 * Used for sending focus area configuration data to clients
 */
class FocusAreaConfigDTO {
  /**
   * Create a new FocusAreaConfigDTO
   * @param {Object} data - DTO data
   */
  constructor(data = {}) {
    this.id = data.id || null;
    this.code = data.code || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.relatedAreas = data.relatedAreas || [];
    this.prerequisites = data.prerequisites || [];
    this.learningOutcomes = data.learningOutcomes || {};
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.displayOrder = data.displayOrder || 0;

    // Add only API-relevant fields, omitting internal implementation details
    this.hasPrerequisites = Array.isArray(data.prerequisites) && data.prerequisites.length > 0;
    this.relatedAreaCount = Array.isArray(data.relatedAreas) ? data.relatedAreas.length : 0;
    this.outcomeCount = Object.keys(data.learningOutcomes || {}).length;
    this.primaryOutcome = this._getPrimaryOutcome(data.learningOutcomes || {});
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
      relatedAreas: this.relatedAreas,
      prerequisites: this.prerequisites,
      learningOutcomes: this.learningOutcomes,
      isActive: this.isActive,
      displayOrder: this.displayOrder,
      hasPrerequisites: this.hasPrerequisites,
      relatedAreaCount: this.relatedAreaCount,
      outcomeCount: this.outcomeCount,
      primaryOutcome: this.primaryOutcome,
    };
  }

  /**
   * Get the primary learning outcome for this focus area
   * @param {Object} outcomes - Learning outcomes object
   * @returns {string|null} The primary outcome or null if none
   * @private
   */
  _getPrimaryOutcome(outcomes) {
    if (!outcomes || typeof outcomes !== 'object') {
      return null;
    }

    const keys = Object.keys(outcomes);
    if (keys.length === 0) {
      return null;
    }

    // Return the first outcome key as the primary one
    return keys[0];
  }
}

/**
 * FocusAreaConfig DTO Mapper
 * Converts between domain entities and DTOs
 */
class FocusAreaConfigDTOMapper {
  /**
   * Convert a domain FocusAreaConfig to a FocusAreaConfigDTO
   * @param {FocusAreaConfig} focusAreaConfig - Domain FocusAreaConfig entity
   * @returns {FocusAreaConfigDTO} FocusAreaConfig DTO for API consumption
   */
  static toDTO(focusAreaConfig) {
    if (!focusAreaConfig) {
      return null;
    }

    // Extract only the properties needed for the API
    const dto = new FocusAreaConfigDTO({
      id: focusAreaConfig.id,
      code: focusAreaConfig.code,
      name: focusAreaConfig.name,
      description: focusAreaConfig.description,
      relatedAreas: focusAreaConfig.relatedAreas,
      prerequisites: focusAreaConfig.prerequisites,
      learningOutcomes: focusAreaConfig.learningOutcomes,
      isActive: focusAreaConfig.isActive,
      displayOrder: focusAreaConfig.displayOrder,
    });

    return dto;
  }

  /**
   * Convert an array of domain FocusAreaConfigs to FocusAreaConfigDTOs
   * @param {Array<FocusAreaConfig>} focusAreaConfigs - Array of domain FocusAreaConfig entities
   * @returns {Array<FocusAreaConfigDTO>} Array of FocusAreaConfig DTOs
   */
  static toDTOCollection(focusAreaConfigs) {
    if (!Array.isArray(focusAreaConfigs)) {
      return [];
    }

    return focusAreaConfigs.map(focusAreaConfig => FocusAreaConfigDTOMapper.toDTO(focusAreaConfig));
  }

  /**
   * Convert a request body to parameters for domain operations
   * @param {Object} requestBody - API request body
   * @returns {Object} Parameters for domain operations
   */
  static fromRequest(requestBody) {
    // Extract and validate fields from request
    const {
      code,
      name,
      description,
      relatedAreas,
      prerequisites,
      learningOutcomes,
      isActive,
      displayOrder,
    } = requestBody;

    // Return an object with validated and sanitized properties
    return {
      code: code ? code.trim().toLowerCase() : null,
      name: name ? name.trim() : null,
      description: description ? description.trim() : null,
      relatedAreas: Array.isArray(relatedAreas)
        ? relatedAreas.map(area => area.trim().toLowerCase())
        : [],
      prerequisites: Array.isArray(prerequisites)
        ? prerequisites.map(pre => pre.trim().toLowerCase())
        : [],
      learningOutcomes:
        learningOutcomes && typeof learningOutcomes === 'object' ? learningOutcomes : {},
      isActive: isActive !== undefined ? Boolean(isActive) : null,
      displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : null,
    };
  }
}

module.exports = {
  FocusAreaConfigDTO,
  FocusAreaConfigDTOMapper,
};
