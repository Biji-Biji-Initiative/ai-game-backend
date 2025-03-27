/**
 * User Journey Event
 * 
 * Domain model for a user journey event that represents a significant action
 * or milestone in the user's journey through the platform.
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
  constructor({
    id,
    userEmail,
    eventType,
    eventData = {},
    challengeId = null,
    timestamp = new Date().toISOString()
  }) {
    this.id = id;
    this.userEmail = userEmail;
    this.eventType = eventType;
    this.eventData = eventData;
    this.challengeId = challengeId;
    this.timestamp = timestamp;
    
    this.validate();
  }
  
  /**
   * Validate the event data
   * @throws {Error} If validation fails
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
    } catch (error) {
      throw new Error('Invalid timestamp format');
    }
  }
  
  /**
   * Convert to database format (snake_case)
   * @returns {Object} Database-ready object
   */
  toDatabase() {
    return {
      id: this.id,
      user_email: this.userEmail,
      event_type: this.eventType,
      event_data: this.eventData,
      challenge_id: this.challengeId,
      timestamp: this.timestamp
    };
  }
  
  /**
   * Create an instance from database data
   * @param {Object} data - Database data
   * @returns {UserJourneyEvent} New instance
   */
  static fromDatabase(data) {
    return new UserJourneyEvent({
      id: data.id,
      userEmail: data.user_email,
      eventType: data.event_type,
      eventData: data.event_data,
      challengeId: data.challenge_id,
      timestamp: data.timestamp
    });
  }
  
  /**
   * Get the age of the event in milliseconds
   * @returns {number} Age in milliseconds
   */
  getAge() {
    return new Date() - new Date(this.timestamp);
  }
  
  /**
   * Check if the event is related to a specific challenge
   * @param {string} challengeId - Challenge ID to check
   * @returns {boolean} True if event is related to the challenge
   */
  isRelatedToChallenge(challengeId) {
    return this.challengeId === challengeId;
  }
  
  /**
   * Get a formatted representation of the event
   * @returns {string} Formatted event description
   */
  toString() {
    return `[${this.timestamp}] ${this.userEmail} - ${this.eventType}${this.challengeId ? ` (${this.challengeId})` : ''}`;
  }
}

module.exports = UserJourneyEvent; 