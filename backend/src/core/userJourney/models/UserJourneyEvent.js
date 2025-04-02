'use strict';
/**
 * User Journey Event
 *
 * Domain model for a user journey event that represents a significant action
 * or milestone in the user's journey through the platform.
 */
/**
 * User Journey Event domain entity
 */
import { v4 as uuidv4 } from "uuid";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { UserJourneyValidationError } from "#app/core/userJourney/errors/userJourneyErrors.js";

class UserJourneyEvent {
    /**
     * Create a new UserJourneyEvent instance
     * @param {Object} data - Event data
     * @param {Object} options - Additional options
     * @param {Object} options.EventTypes - Event type constants
     */
    constructor(data = {}, options = {}) {
        this.id = data.id || uuidv4();
        this.userId = data.userId;
        this.type = data.type;
        this.data = data.data || {};
        this.metadata = data.metadata || {};
        this.createdAt = data.createdAt || new Date().toISOString();
        this._domainEvents = [];
        
        // Store EventTypes from options
        this.EventTypes = options.EventTypes || EventTypes;
    }

    /**
     * Validate the event data
     * @throws {Error} If validation fails
     */
    /**
     * Method validate
     */
    validate() {
        if (!this.userEmail) {
            throw new UserJourneyValidationError('User email is required');
        }
        if (!this.eventType) {
            throw new UserJourneyValidationError('Event type is required');
        }
        if (typeof this.eventData !== 'object') {
            throw new UserJourneyValidationError('Event data must be an object');
        }
        if (this.challengeId !== null && typeof this.challengeId !== 'string') {
            throw new UserJourneyValidationError('Challenge ID must be a string or null');
        }
        // Validate timestamp format
        try {
            new Date(this.timestamp);
        }
        catch (error) {
            throw new UserJourneyValidationError('Invalid timestamp format');
        }
    }
    /**
     * Get the age of the event in milliseconds
     * @returns {number} Age in milliseconds
     */
    /**
     * Method getAge
     */
    getAge() {
        return new Date() - new Date(this.timestamp);
    }
    /**
     * Check if the event is related to a specific challenge
     * @param {string} challengeId - Challenge ID to check
     * @returns {boolean} True if event is related to the challenge
     */
    /**
     * Method isRelatedToChallenge
     */
    isRelatedToChallenge(challengeId) {
        return this.challengeId === challengeId;
    }
    /**
     * Get a formatted representation of the event
     * @returns {string} Formatted event description
     */
    /**
     * Method toString
     */
    toString() {
        return `[${this.timestamp}] ${this.userEmail} - ${this.eventType}${this.challengeId ? ` (${this.challengeId})` : ''}`;
    }
    /**
     * Add a domain event to the collection
     * @param {string} eventType - Event type from EventTypes
     * @param {Object} eventData - Event data
     */
    addDomainEvent(eventType, eventData = {}) {
        if (!eventType) {
            throw new UserJourneyValidationError('Event type is required when adding domain event');
        }

        // Create standardized event structure
        const event = {
            type: eventType,
            data: {
                ...eventData,
                entityId: this.id,
                entityType: 'UserJourneyEvent'
            },
            metadata: {
                timestamp: new Date().toISOString(),
                correlationId: `user-journey-event-${this.id}-${Date.now()}`
            }
        };
        
        this._domainEvents.push(event);
    }
    /**
     * Get all domain events
     * @returns {Array} Array of domain events
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
     * Check if the event is valid
     * @returns {boolean} True if valid
     */
    isValid() {
        return (this.id &&
            this.userEmail &&
            this.eventType &&
            this.timestamp);
    }
}
export default UserJourneyEvent;
