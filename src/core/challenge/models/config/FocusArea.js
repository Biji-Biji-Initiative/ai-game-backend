'use strict';

/**
 * Focus Area Model
 *
 * Represents a focus area for challenges (e.g., AI Ethics, Human-AI Collaboration).
 * This is a configuration entity that helps categorize challenges by topic.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Focus Area domain entity
 */
class FocusArea {
  /**
   * Create a new FocusArea
   * @param {Object} data - Focus area data
   * @param {string} [data.id] - Unique identifier
   * @param {string} data.code - Unique code for this focus area (e.g., 'ai-ethics')
   * @param {string} data.name - Human-readable name
   * @param {string} data.description - Detailed description
   * @param {Array<string>} [data.relatedAreas] - Related focus areas
   * @param {Array<string>} [data.prerequisites] - Prerequisite focus areas
   * @param {Object} [data.learningOutcomes] - Learning outcomes for this focus area
   * @param {Object} [data.metadata] - Additional metadata
   * @param {boolean} [data.isActive] - Whether this focus area is active
   * @param {number} [data.displayOrder] - Order for display in UI
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
    this.relatedAreas = data.relatedAreas || [];
    this.prerequisites = data.prerequisites || [];
    this.learningOutcomes = data.learningOutcomes || {};
    this.metadata = data.metadata || {};
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.displayOrder = data.displayOrder || 0;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Check if this focus area is related to another
   * @param {string} areaCode - Focus area code to check
   * @returns {boolean} True if areas are related
   */
  /**
   * Method isRelatedTo
   */
  isRelatedTo(areaCode) {
    return this.relatedAreas.includes(areaCode);
  }

  /**
   * Check if this focus area has prerequisites
   * @returns {boolean} True if has prerequisites
   */
  /**
   * Method hasPrerequisites
   */
  hasPrerequisites() {
    return this.prerequisites.length > 0;
  }

  /**
   * Get prerequisite focus areas
   * @returns {Array<string>} Array of prerequisite area codes
   */
  /**
   * Method getPrerequisites
   */
  getPrerequisites() {
    return [...this.prerequisites];
  }

  /**
   * Get learning outcomes
   * @returns {Object} Learning outcomes
   */
  /**
   * Method getLearningOutcomes
   */
  getLearningOutcomes() {
    return { ...this.learningOutcomes };
  }

  /**
   * Update focus area data
   * @param {Object} updates - Fields to update
   * @returns {FocusArea} Updated focus area
   */
  /**
   * Method update
   */
  update(updates) {
    const allowedFields = [
      'name',
      'description',
      'relatedAreas',
      'prerequisites',
      'learningOutcomes',
      'metadata',
      'isActive',
      'displayOrder',
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

module.exports = FocusArea;
