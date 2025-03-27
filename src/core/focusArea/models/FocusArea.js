/**
 * Focus Area Model
 * 
 * Represents a personalized focus area for AI communication training
 * Focus areas are specific communication skills or topics that users
 * can practice to improve their interaction with AI systems.
 * 
 * @module FocusArea
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Focus Area class representing a communication focus area
 */
class FocusArea {
  /**
   * Create a new focus area
   * @param {Object} params Focus area parameters
   * @param {string} params.id Unique identifier (optional, generated if not provided)
   * @param {string} params.userId User ID this focus area belongs to
   * @param {string} params.name Name/title of the focus area
   * @param {string} [params.description] Detailed description
   * @param {boolean} [params.active=true] Whether this focus area is active
   * @param {number} [params.priority=1] Priority level (1-5, where 1 is highest)
   * @param {Object} [params.metadata={}] Additional metadata
   */
  constructor({
    id = uuidv4(),
    userId,
    name,
    description = '',
    active = true,
    priority = 1,
    metadata = {}
  }) {
    this.validate({ userId, name, priority });

    this.id = id;
    this.userId = userId;
    this.name = name;
    this.description = description;
    this.active = active;
    this.priority = priority;
    this.metadata = metadata;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  /**
   * Validate focus area data
   * @param {Object} data Data to validate
   * @throws {Error} If validation fails
   * @private
   */
  validate({ userId, name, priority }) {
    if (!userId) {
      throw new Error('User ID is required for focus area');
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Focus area name is required and must be a non-empty string');
    }

    if (name.length > 200) {
      throw new Error('Focus area name must be 200 characters or less');
    }

    if (priority !== undefined && (isNaN(priority) || priority < 1 || priority > 5)) {
      throw new Error('Priority must be a number between 1 and 5');
    }
  }

  /**
   * Deactivate this focus area
   */
  deactivate() {
    this.active = false;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Activate this focus area
   */
  activate() {
    this.active = true;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Update focus area properties
   * @param {Object} updates Properties to update
   */
  update(updates) {
    const allowedUpdates = ['name', 'description', 'priority', 'metadata', 'active'];
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        this[key] = updates[key];
      }
    });
    
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Convert focus area to plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      description: this.description,
      active: this.active,
      priority: this.priority,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Create focus area from database record
   * @param {Object} record Database record
   * @returns {FocusArea} Focus area instance
   */
  static fromDatabase(record) {
    return new FocusArea({
      id: record.id,
      userId: record.user_id,
      name: record.name,
      description: record.description || '',
      active: record.active === undefined ? true : record.active,
      priority: record.priority || 1,
      metadata: record.metadata || {}
    });
  }
}

module.exports = FocusArea; 