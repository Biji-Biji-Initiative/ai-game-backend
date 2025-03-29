'use strict';

/**
 * Base Entity Class
 *
 * Provides common functionality for domain entities
 * Implements the 'collect events, dispatch after save' pattern
 *
 * @module Entity
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Base Entity class with domain events
 */
class Entity {
  /**
   *
   */
  /**
   * Method constructor
   */
  constructor(id = null) {
    this.id = id || uuidv4();
    this._domainEvents = [];
  }

  /**
   * Add a domain event to the list of pending events
   * @param {string} eventType - Type of event from EventTypes enum
   * @param {Object} eventData - Data to include with the event
   */
  /**
   * Method addDomainEvent
   */
  addDomainEvent(eventType, eventData = {}) {
    this._domainEvents.push({
      type: eventType,
      data: {
        ...eventData,
        entityId: this.id,
        entityType: this.constructor.name,
      },
    });
  }

  /**
   * Get all pending domain events
   * @returns {Array} Array of pending domain events
   */
  /**
   * Method getDomainEvents
   */
  getDomainEvents() {
    return [...this._domainEvents];
  }

  /**
   * Clear all pending domain events
   */
  /**
   * Method clearDomainEvents
   */
  clearDomainEvents() {
    this._domainEvents = [];
  }

  /**
   * Generate a new UUID
   * @returns {string} A new UUID
   */
  static generateId() {
    return uuidv4();
  }
}

module.exports = Entity;
