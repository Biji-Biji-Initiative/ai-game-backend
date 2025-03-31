import { v4 as uuidv4 } from "uuid";
'use strict';

/**
 * Base Entity class with domain events
 * 
 * This class provides common functionality for all domain entities:
 * - Unique ID management
 * - Domain event collection with standardized structure
 * - Common entity operations
 */
class Entity {
    /**
     * Create a new entity instance
     * @param {string} id - Optional ID for the entity (generates UUID if not provided)
     */
    constructor(id = null) {
        this.id = id || uuidv4();
        this._domainEvents = [];
    }

    /**
     * Add a domain event to the list of pending events
     * @param {string} eventType - Type of event from EventTypes enum
     * @param {Object} eventData - Data to include with the event
     * @returns {Object} The created event object
     */
    addDomainEvent(eventType, eventData = {}) {
        if (!eventType) {
            throw new Error('Event type is required');
        }
        
        // Create standardized event structure
        const event = {
            type: eventType,
            data: {
                ...eventData,
                // Always include entity identifiers
                entityId: this.id,
                entityType: this.constructor.name,
            },
            metadata: {
                timestamp: new Date().toISOString(),
                correlationId: `${this.constructor.name.toLowerCase()}-${this.id}-${Date.now()}`
            }
        };
        
        this._domainEvents.push(event);
        return event;
    }

    /**
     * Get all pending domain events
     * @returns {Array} Array of pending domain events
     */
    getDomainEvents() {
        return [...this._domainEvents];
    }

    /**
     * Clear all pending domain events
     * This should be called after events have been published
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
    
    /**
     * Check if the entity has pending domain events
     * @returns {boolean} True if there are pending events
     */
    hasDomainEvents() {
        return this._domainEvents.length > 0;
    }
}

export default Entity;
