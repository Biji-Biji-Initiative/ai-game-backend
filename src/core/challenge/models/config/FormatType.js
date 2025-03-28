/**
 * Format Type Model
 * 
 * Represents a format type for challenges (e.g., scenario, case-study, debate).
 * This is a configuration entity that defines how challenges are structured.
 */

const { v4: uuidv4 } = require('uuid');

class FormatType {
  /**
   * Create a new FormatType
   * @param {Object} data - Format type data
   * @param {string} [data.id] - Unique identifier
   * @param {string} data.code - Unique code for this format type (e.g., 'scenario')
   * @param {string} data.name - Human-readable name
   * @param {string} data.description - Detailed description
   * @param {string} [data.promptStructure] - Structure for the prompts (e.g., 'context-problem-constraints')
   * @param {string} [data.responseFormat] - Expected response format (e.g., 'open-text')
   * @param {Array<string>} [data.evaluationCriteria] - Criteria for evaluating responses
   * @param {Object} [data.metadata] - Additional metadata
   * @param {boolean} [data.isActive] - Whether this format type is active
   * @param {string} [data.createdAt] - Creation timestamp
   * @param {string} [data.updatedAt] - Last update timestamp
   */
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.code = data.code || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.promptStructure = data.promptStructure || '';
    this.responseFormat = data.responseFormat || '';
    this.evaluationCriteria = data.evaluationCriteria || [];
    this.metadata = data.metadata || {};
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Check if this format type uses a specific evaluation criterion
   * @param {string} criterion - Criterion to check
   * @returns {boolean} True if criterion is used
   */
  usesCriterion(criterion) {
    return this.evaluationCriteria.includes(criterion);
  }

  /**
   * Get all evaluation criteria
   * @returns {Array<string>} Array of criteria
   */
  getAllCriteria() {
    return [...this.evaluationCriteria];
  }

  /**
   * Get prompt structure components
   * @returns {Array<string>} Array of structure components
   */
  getPromptStructureComponents() {
    return this.promptStructure.split('-');
  }

  /**
   * Update format type data
   * @param {Object} updates - Fields to update
   * @returns {FormatType} Updated format type
   */
  update(updates) {
    const allowedFields = [
      'name', 'description', 'promptStructure', 'responseFormat',
      'evaluationCriteria', 'metadata', 'isActive'
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
      prompt_structure: this.promptStructure,
      response_format: this.responseFormat,
      evaluation_criteria: this.evaluationCriteria,
      metadata: this.metadata,
      is_active: this.isActive,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  /**
   * Create from database record
   * @param {Object} data - Database record
   * @returns {FormatType} FormatType instance
   */
  static fromDatabase(data) {
    return new FormatType({
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      promptStructure: data.prompt_structure || data.promptStructure || '',
      responseFormat: data.response_format || data.responseFormat || '',
      evaluationCriteria: data.evaluation_criteria || data.evaluationCriteria || [],
      metadata: data.metadata || {},
      isActive: data.is_active !== undefined ? data.is_active : (data.isActive || true),
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt
    });
  }
}

module.exports = FormatType; 