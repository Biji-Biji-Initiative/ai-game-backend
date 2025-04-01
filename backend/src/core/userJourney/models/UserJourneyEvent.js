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
class UserJourneyEvent {
    /**
     * Create a new user journey event
     * @param {Object} params - Event parameters
     * @param {string} params.id - Unique identifier for the event
     * @param {string} params.userEmail - User's email address
     * @param {string} params.eventType - Type of event (e.g., 'challenge_started', 'challenge_completed')
     * @param {Object} params.eventData - Additional data associated with the event
     * @param {string|null} params.challengeId - Optional associated challenge ID
     * @param {string} params.timestamp - ISO timestamp of when the event occurred
     */
    constructor({ id, userEmail, eventType, eventData = {}, challengeId = null, timestamp = new Date().toISOString(), }) {
        this.id = id;
        this.userEmail = userEmail;
        this.eventType = eventType;
        this.eventData = eventData;
        this.challengeId = challengeId;
        this.timestamp = timestamp;
        this.validate();
        // Initialize domain events collection
        this._domainEvents = [];
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
            throw new Error('User email is required');
        }
        if (!this.eventType) {
            throw new Error('Event type is required');
        }
        if (typeof this.eventData !== 'object') {
            throw new Error('Event data must be an object');
        }
        if (this.challengeId !== null && typeof this.challengeId !== 'string') {
            throw new Error('Challenge ID must be a string or null');
        }
        // Validate timestamp format
        try {
            new Date(this.timestamp);
        }
        catch (error) {
            throw new Error('Invalid timestamp format');
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
     * @param {string} type - Event type
     * @param {Object} data - Event data
     */
    addDomainEvent(type, data) {
        if (!type) {
            throw new Error('Event type is required');
        }
        this._domainEvents.push({ type, data });
    }
    /**
     * Get collected domain events
     * @returns {Array} Collection of domain events
     */
    getDomainEvents() {
        return this._domainEvents;
    }
    /**
     * Clear collected domain events
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
    /**
     * Convert to an object representation
     * @returns {Object} Object representation
     */
    toObject() {
        return {
            id: this.id,
            userEmail: this.userEmail,
            eventType: this.eventType,
            eventData: this.eventData,
            challengeId: this.challengeId,
            timestamp: this.timestamp
        };
    }
}
export default UserJourneyEvent;
