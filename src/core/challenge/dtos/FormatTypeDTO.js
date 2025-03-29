'use strict';

/**
 * FormatType Data Transfer Object (DTO)
 *
 * Represents the API representation of a FormatType.
 * Decouples the domain model from the API contract.
 */

/**
 * FormatType DTO
 * Used for sending format type data to clients
 */
class FormatTypeDTO {
  /**
   * Create a new FormatTypeDTO
   * @param {Object} data - DTO data
   */
  constructor(data = {}) {
    this.id = data.id || null;
    this.code = data.code || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.promptStructure = data.promptStructure || '';
    this.responseFormat = data.responseFormat || '';
    this.isActive = data.isActive !== undefined ? data.isActive : true;

    // Add only API-relevant fields, omitting internal implementation details
    this.hasEvaluationCriteria =
      Array.isArray(data.evaluationCriteria) && data.evaluationCriteria.length > 0;
    this.structureComponents = this._parseStructureComponents(data.promptStructure || '');
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
      promptStructure: this.promptStructure,
      responseFormat: this.responseFormat,
      isActive: this.isActive,
      hasEvaluationCriteria: this.hasEvaluationCriteria,
      structureComponents: this.structureComponents,
    };
  }

  /**
   * Parse the prompt structure components
   * @param {string} promptStructure - Prompt structure string (e.g. 'context-problem-solution')
   * @returns {Array<string>} Array of structure components
   * @private
   */
  _parseStructureComponents(promptStructure) {
    if (!promptStructure) {
      return [];
    }

    return promptStructure.split('-').map(component => component.trim());
  }
}

/**
 * FormatType DTO Mapper
 * Converts between domain entities and DTOs
 */
class FormatTypeDTOMapper {
  /**
   * Convert a domain FormatType to a FormatTypeDTO
   * @param {FormatType} formatType - Domain FormatType entity
   * @returns {FormatTypeDTO} FormatType DTO for API consumption
   */
  static toDTO(formatType) {
    if (!formatType) {
      return null;
    }

    // Extract only the properties needed for the API
    const dto = new FormatTypeDTO({
      id: formatType.id,
      code: formatType.code,
      name: formatType.name,
      description: formatType.description,
      promptStructure: formatType.promptStructure,
      responseFormat: formatType.responseFormat,
      evaluationCriteria: formatType.evaluationCriteria,
      isActive: formatType.isActive,
    });

    return dto;
  }

  /**
   * Convert an array of domain FormatTypes to FormatTypeDTOs
   * @param {Array<FormatType>} formatTypes - Array of domain FormatType entities
   * @returns {Array<FormatTypeDTO>} Array of FormatType DTOs
   */
  static toDTOCollection(formatTypes) {
    if (!Array.isArray(formatTypes)) {
      return [];
    }

    return formatTypes.map(formatType => FormatTypeDTOMapper.toDTO(formatType));
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
      promptStructure,
      responseFormat,
      evaluationCriteria,
      isActive,
    } = requestBody;

    // Return an object with validated and sanitized properties
    return {
      code: code ? code.trim().toLowerCase() : null,
      name: name ? name.trim() : null,
      description: description ? description.trim() : null,
      promptStructure: promptStructure ? promptStructure.trim() : null,
      responseFormat: responseFormat ? responseFormat.trim() : null,
      evaluationCriteria: Array.isArray(evaluationCriteria)
        ? evaluationCriteria.map(criterion => criterion.trim())
        : [],
      isActive: isActive !== undefined ? Boolean(isActive) : null,
    };
  }
}

module.exports = {
  FormatTypeDTO,
  FormatTypeDTOMapper,
};
