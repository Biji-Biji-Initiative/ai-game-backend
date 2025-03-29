'use strict';

/**
 * Challenge Domain Entity
 *
 * Represents a cognitive challenge in the system.
 * Contains challenge content, metadata, and core domain logic.
 * Following DDD principles, this entity is focused on domain behavior
 * and is decoupled from persistence concerns.
 *
 * @module Challenge
 */

const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * components:
 *   schemas:
 *     Challenge:
 *       type: object
 *       required:
 *         - id
 *         - content
 *         - userEmail
 *         - status
 *         - createdAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the challenge
 *         content:
 *           type: string
 *           description: The challenge content/question
 *         userEmail:
 *           type: string
 *           format: email
 *           description: Email of the user the challenge is for
 *         focusArea:
 *           type: string
 *           description: The focus area of the challenge
 *         challengeType:
 *           type: string
 *           description: The type of challenge
 *         formatType:
 *           type: string
 *           description: The format of the challenge
 *         difficulty:
 *           type: string
 *           enum: [beginner, intermediate, advanced, expert]
 *           description: Difficulty level of the challenge
 *         status:
 *           type: string
 *           enum: [pending, submitted, evaluated]
 *           description: Current status of the challenge
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the challenge was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the challenge was last updated
 *
 *     ChallengeResponse:
 *       type: object
 *       required:
 *         - id
 *         - challengeId
 *         - userEmail
 *         - response
 *         - submittedAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the response
 *         challengeId:
 *           type: string
 *           format: uuid
 *           description: ID of the challenge being responded to
 *         userEmail:
 *           type: string
 *           format: email
 *           description: Email of the user submitting the response
 *         response:
 *           type: string
 *           description: The user's response to the challenge
 *         evaluationId:
 *           type: string
 *           format: uuid
 *           description: ID of the evaluation for this response, if any
 *         submittedAt:
 *           type: string
 *           format: date-time
 *           description: When the response was submitted
 *
 *     Error:
 *       type: object
 *       required:
 *         - success
 *         - message
 *       properties:
 *         success:
 *           type: boolean
 *           default: false
 *         message:
 *           type: string
 *           description: Error message
 *         errorCode:
 *           type: string
 *           description: Error code for client-side error handling
 *         details:
 *           type: object
 *           description: Additional error details
 */

/**
 * Challenge domain entity
 */
class Challenge {
  /**
   * Create a new Challenge instance
   * @param {Object} data - Challenge data
   * @param {string} data.id - Unique identifier for the challenge
   * @param {string} data.content - The challenge content/question
   * @param {string} data.userEmail - Email of the user the challenge is for
   * @param {string} [data.focusArea] - Focus area of the challenge
   * @param {string} [data.challengeType] - Type of challenge
   * @param {string} [data.formatType] - Format type of the challenge
   * @param {string} [data.difficulty] - Difficulty level of the challenge
   * @param {string} [data.status='pending'] - Status of the challenge
   * @param {Date|string} [data.createdAt] - When the challenge was created
   * @param {Date|string} [data.updatedAt] - When the challenge was last updated
   */
  constructor({
    id,
    content,
    userEmail,
    userId,
    focusArea,
    focusAreaId,
    challengeType,
    formatType,
    difficulty,
    status = 'pending',
    createdAt = new Date(),
    updatedAt = new Date(),
    responses = [],
    evaluation = null,
    score = 0,
    title = '',
    description = '',
    instructions = '',
    evaluationCriteria = []
  }) {
    this.id = id || uuidv4();
    this.content = content;
    this.userEmail = userEmail;
    this.userId = userId;
    this.focusArea = focusArea;
    this.focusAreaId = focusAreaId;
    this.challengeType = challengeType;
    this.formatType = formatType;
    this.difficulty = difficulty;
    this.status = status;
    this.title = title;
    this.description = description;
    this.instructions = instructions;
    this.evaluationCriteria = evaluationCriteria;
    this.responses = responses || [];
    this.evaluation = evaluation;
    this.score = score || 0;

    // Handle date formats
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
    this.updatedAt = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

    // Domain events collection to track events raised by this entity
    this._domainEvents = [];
  }

  /**
   * Generate a new UUID for a challenge
   * @returns {string} A new UUID v4
   * @static
   */
  static createNewId() {
    return uuidv4();
  }

  /**
   * Create Challenge instance from database object
   * @param {Object} data - Challenge data from database
   * @returns {Challenge} Challenge instance
   * @deprecated Use ChallengeMapper.toDomain instead
   * @static
   */
  static fromDatabase(data) {
    if (!data) {
      throw new Error('Database data is required to create Challenge instance');
    }

    // Convert snake_case to camelCase if needed
    const challengeData = {
      id: data.id,
      content: data.content,
      userEmail: data.user_email || data.userEmail,
      userId: data.user_id || data.userId,
      focusArea: data.focus_area || data.focusArea,
      focusAreaId: data.focus_area_id || data.focusAreaId,
      challengeType: data.challenge_type || data.challengeType,
      formatType: data.format_type || data.formatType,
      difficulty: data.difficulty,
      status: data.status,
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      evaluationCriteria: data.evaluation_criteria || data.evaluationCriteria,
      responses: data.responses || [],
      evaluation: data.evaluation,
      score: data.score || 0,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt
    };

    return new Challenge(challengeData);
  }

  /**
   * Update the challenge status
   * @param {string} newStatus - New status for the challenge
   * @returns {void}
   */
  updateStatus(newStatus) {
    if (this.status === newStatus) {
      return;
    }

    // Could add validation of status transitions here
    const previousStatus = this.status;
    this.status = newStatus;
    this.updatedAt = new Date();

    // Add domain event for status change
    this.addDomainEvent('CHALLENGE_STATUS_CHANGED', {
      challengeId: this.id,
      previousStatus,
      newStatus,
    });
  }

  /**
   * Check if challenge is completed
   * @returns {boolean} True if challenge is completed
   */
  isCompleted() {
    return this.status === 'evaluated' || this.status === 'completed';
  }

  /**
   * Submit responses to the challenge
   * @param {Array} responses - Array of response objects
   */
  submitResponses(responses) {
    if (!Array.isArray(responses)) {
      responses = [responses];
    }
    
    this.responses = this.responses || [];
    this.responses = [...this.responses, ...responses];
    this.updateStatus('submitted');
    this.updatedAt = new Date();
    
    this.addDomainEvent('CHALLENGE_RESPONSES_SUBMITTED', {
      challengeId: this.id,
      responseCount: this.responses.length
    });
  }

  /**
   * Complete the challenge with evaluation
   * @param {Object} evaluation - Challenge evaluation
   */
  complete(evaluation) {
    this.evaluation = evaluation;
    this.score = evaluation.score || 0;
    this.updateStatus('evaluated');
    this.updatedAt = new Date();
    
    this.addDomainEvent('CHALLENGE_COMPLETED', {
      challengeId: this.id,
      score: this.score
    });
  }

  /**
   * Get the challenge score
   * @returns {number} Challenge score
   */
  getScore() {
    return this.score || 0;
  }

  /**
   * Add a domain event
   * @param {string} eventType - Type of the event
   * @param {Object} eventData - Event data
   */
  addDomainEvent(eventType, eventData) {
    if (!this._domainEvents) {
      this._domainEvents = [];
    }

    this._domainEvents.push({
      eventType,
      eventData,
      timestamp: new Date(),
    });
  }

  /**
   * Get all domain events
   * @returns {Array} Collection of domain events
   */
  getDomainEvents() {
    return this._domainEvents || [];
  }

  /**
   * Clear all domain events
   */
  clearDomainEvents() {
    this._domainEvents = [];
  }

  /**
   * Convert to a plain object for serialization
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      content: this.content,
      userEmail: this.userEmail,
      userId: this.userId,
      focusArea: this.focusArea,
      focusAreaId: this.focusAreaId,
      challengeType: this.challengeType,
      formatType: this.formatType,
      difficulty: this.difficulty,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      title: this.title,
      description: this.description,
      instructions: this.instructions,
      evaluationCriteria: this.evaluationCriteria,
      responses: this.responses,
      evaluation: this.evaluation,
      score: this.score
    };
  }

  /**
   * Update challenge with new data
   * @param {Object} updateData - Data to update
   * @returns {Challenge} Updated challenge instance
   */
  update(updateData) {
    // Create a new instance with updated data
    const updated = {
      ...this.toJSON(),
      ...updateData,
      updatedAt: new Date(),
    };

    return new Challenge(updated);
  }

  /**
   * Get object for database operations
   * @returns {Object} Database-ready object
   * @deprecated Use ChallengeMapper.toPersistence instead
   */
  toDatabase() {
    const json = this.toJSON();
    return {
      ...json,
      createdAt: json.createdAt instanceof Date ? json.createdAt.toISOString() : json.createdAt,
      updatedAt: json.updatedAt instanceof Date ? json.updatedAt.toISOString() : json.updatedAt
    };
  }
}

module.exports = Challenge;
