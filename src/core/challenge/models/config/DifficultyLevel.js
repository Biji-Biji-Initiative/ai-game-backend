/**
 * Difficulty Level Model
 * 
 * Represents a difficulty level for challenges (e.g., beginner, intermediate, advanced).
 * This is a configuration entity that defines the complexity of challenges.
 */

const { v4: uuidv4 } = require('uuid');

class DifficultyLevel {
  /**
   * Create a new DifficultyLevel
   * @param {Object} data - Difficulty level data
   * @param {string} [data.id] - Unique identifier
   * @param {string} data.code - Unique code for this difficulty level (e.g., 'beginner')
   * @param {string} data.name - Human-readable name
   * @param {string} data.description - Detailed description
   * @param {number} [data.questionCount] - Typical number of questions
   * @param {number} [data.contextComplexity] - Complexity level for context (0.0-1.0)
   * @param {number} [data.standardTime] - Standard time in seconds
   * @param {number} [data.sortOrder] - Order for sorting (lowest is easiest)
   * @param {Object} [data.requirements] - Requirements for this difficulty level
   * @param {Object} [data.metadata] - Additional metadata
   * @param {boolean} [data.isActive] - Whether this difficulty level is active
   * @param {string} [data.createdAt] - Creation timestamp
   * @param {string} [data.updatedAt] - Last update timestamp
   */
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.code = data.code || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.questionCount = data.questionCount || 1;
    this.contextComplexity = data.contextComplexity || 0.5;
    this.standardTime = data.standardTime || 300; // 5 minutes in seconds
    this.sortOrder = data.sortOrder || 0;
    this.requirements = data.requirements || {};
    this.metadata = data.metadata || {};
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Get standard time in minutes
   * @returns {number} Time in minutes
   */
  getStandardTimeInMinutes() {
    return Math.round(this.standardTime / 60);
  }

  /**
   * Check if this difficulty is harder than another
   * @param {DifficultyLevel} otherLevel - Other difficulty level
   * @returns {boolean} True if this is harder
   */
  isHarderThan(otherLevel) {
    return this.sortOrder > otherLevel.sortOrder;
  }

  /**
   * Get difficulty settings for AI generation
   * @returns {Object} Settings object
   */
  getGenerationSettings() {
    return {
      questionCount: this.questionCount,
      contextComplexity: this.contextComplexity,
      standardTime: this.standardTime
    };
  }

  /**
   * Update difficulty level data
   * @param {Object} updates - Fields to update
   * @returns {DifficultyLevel} Updated difficulty level
   */
  update(updates) {
    const allowedFields = [
      'name', 'description', 'questionCount', 'contextComplexity',
      'standardTime', 'sortOrder', 'requirements', 'metadata', 'isActive'
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
      question_count: this.questionCount,
      context_complexity: this.contextComplexity,
      standard_time: this.standardTime,
      sort_order: this.sortOrder,
      requirements: this.requirements,
      metadata: this.metadata,
      is_active: this.isActive,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  /**
   * Create from database record
   * @param {Object} data - Database record
   * @returns {DifficultyLevel} DifficultyLevel instance
   */
  static fromDatabase(data) {
    return new DifficultyLevel({
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      questionCount: data.question_count || data.questionCount || 1,
      contextComplexity: data.context_complexity || data.contextComplexity || 0.5,
      standardTime: data.standard_time || data.standardTime || 300,
      sortOrder: data.sort_order || data.sortOrder || 0,
      requirements: data.requirements || {},
      metadata: data.metadata || {},
      isActive: data.is_active !== undefined ? data.is_active : (data.isActive || true),
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt
    });
  }
}

module.exports = DifficultyLevel; 