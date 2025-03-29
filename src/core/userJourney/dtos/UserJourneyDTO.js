'use strict';

/**
 * UserJourney Data Transfer Object (DTO)
 *
 * Represents the API representation of UserJourney data.
 * Decouples the domain model from the API contract.
 */

/**
 * UserJourney DTO
 * Used for sending user journey data to clients
 */
class UserJourneyDTO {
  /**
   * Create a new UserJourneyDTO
   * @param {Object} data - DTO data
   */
  constructor(data = {}) {
    this.id = data.id || null;
    this.userId = data.userId || null;
    this.userEmail = data.userEmail || '';
    this.eventType = data.eventType || '';
    this.eventData = data.eventData || {};
    this.timestamp = data.timestamp || null;
    this.sessionId = data.sessionId || null;
    this.deviceInfo = data.deviceInfo || null;
    this.clientVersion = data.clientVersion || null;

    // Add only API-relevant fields, omitting internal implementation details
    this.isSignificant = this._isSignificantEvent(data.eventType);
    this.formattedTimestamp = data.timestamp ? new Date(data.timestamp).toLocaleString() : null;
  }

  /**
   * Convert to plain object format suitable for JSON serialization
   * @returns {Object} Plain object
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      userEmail: this.userEmail,
      eventType: this.eventType,
      eventData: this.eventData,
      timestamp: this.timestamp instanceof Date ? this.timestamp.toISOString() : this.timestamp,
      sessionId: this.sessionId,
      deviceInfo: this.deviceInfo,
      clientVersion: this.clientVersion,
      isSignificant: this.isSignificant,
      formattedTimestamp: this.formattedTimestamp,
    };
  }

  /**
   * Determine if an event is considered significant for UI display
   * @param {string} eventType - The type of event
   * @returns {boolean} Whether the event is significant
   * @private
   */
  _isSignificantEvent(eventType) {
    const significantEvents = [
      'user_registered',
      'challenge_completed',
      'level_up',
      'badge_earned',
      'focus_area_changed',
      'personal_best',
      'streak_milestone',
    ];

    return significantEvents.includes(eventType);
  }
}

/**
 * UserJourney Summary DTO
 * Used for sending summarized user journey data to clients
 */
class UserJourneySummaryDTO {
  /**
   * Create a new UserJourneySummaryDTO
   * @param {Object} data - DTO data
   */
  constructor(data = {}) {
    this.userId = data.userId || null;
    this.userEmail = data.userEmail || '';
    this.totalEvents = data.totalEvents || 0;
    this.significantEvents = data.significantEvents || 0;
    this.firstActivityDate = data.firstActivityDate || null;
    this.lastActivityDate = data.lastActivityDate || null;
    this.activeDays = data.activeDays || 0;
    this.mostFrequentEventType = data.mostFrequentEventType || null;
    this.eventTypeCounts = data.eventTypeCounts || {};
    this.milestones = data.milestones || [];
  }

  /**
   * Convert to plain object format suitable for JSON serialization
   * @returns {Object} Plain object
   */
  toJSON() {
    return {
      userId: this.userId,
      userEmail: this.userEmail,
      totalEvents: this.totalEvents,
      significantEvents: this.significantEvents,
      firstActivityDate:
        this.firstActivityDate instanceof Date
          ? this.firstActivityDate.toISOString()
          : this.firstActivityDate,
      lastActivityDate:
        this.lastActivityDate instanceof Date
          ? this.lastActivityDate.toISOString()
          : this.lastActivityDate,
      activeDays: this.activeDays,
      mostFrequentEventType: this.mostFrequentEventType,
      eventTypeCounts: this.eventTypeCounts,
      milestones: this.milestones,
    };
  }
}

/**
 * UserJourney DTO Mapper
 * Converts between domain entities and DTOs
 */
class UserJourneyDTOMapper {
  /**
   * Convert a domain UserJourney to a UserJourneyDTO
   * @param {UserJourney} userJourney - Domain UserJourney entity
   * @returns {UserJourneyDTO} UserJourney DTO for API consumption
   */
  static toDTO(userJourney) {
    if (!userJourney) {
      return null;
    }

    // Extract only the properties needed for the API
    const dto = new UserJourneyDTO({
      id: userJourney.id,
      userId: userJourney.userId,
      userEmail: userJourney.userEmail,
      eventType: userJourney.eventType,
      eventData: userJourney.eventData,
      timestamp: userJourney.timestamp,
      sessionId: userJourney.sessionId,
      deviceInfo: userJourney.deviceInfo,
      clientVersion: userJourney.clientVersion,
    });

    return dto;
  }

  /**
   * Convert an array of domain UserJourney objects to UserJourneyDTOs
   * @param {Array<UserJourney>} journeyEvents - Array of domain UserJourney entities
   * @returns {Array<UserJourneyDTO>} Array of UserJourney DTOs
   */
  static toDTOCollection(journeyEvents) {
    if (!Array.isArray(journeyEvents)) {
      return [];
    }

    return journeyEvents.map(event => UserJourneyDTOMapper.toDTO(event));
  }

  /**
   * Convert domain summary data to a UserJourneySummaryDTO
   * @param {Object} data - Summary data from domain
   * @returns {UserJourneySummaryDTO} UserJourneySummary DTO for API consumption
   */
  static toSummaryDTO(data) {
    if (!data) {
      return null;
    }

    const dto = new UserJourneySummaryDTO({
      userId: data.userId,
      userEmail: data.userEmail,
      totalEvents: data.totalEvents,
      significantEvents: data.significantEvents,
      firstActivityDate: data.firstActivityDate,
      lastActivityDate: data.lastActivityDate,
      activeDays: data.activeDays,
      mostFrequentEventType: data.mostFrequentEventType,
      eventTypeCounts: data.eventTypeCounts,
      milestones: data.milestones,
    });

    return dto;
  }

  /**
   * Convert a request body to parameters for domain operations
   * @param {Object} requestBody - API request body
   * @returns {Object} Parameters for domain operations
   */
  static fromRequest(requestBody) {
    // Extract and validate fields from request
    const { userId, userEmail, eventType, eventData, sessionId, deviceInfo, clientVersion } =
      requestBody;

    // Return an object with validated and sanitized properties
    return {
      userId: userId ? userId.trim() : null,
      userEmail: userEmail ? userEmail.trim().toLowerCase() : null,
      eventType: eventType ? eventType.trim() : null,
      eventData: eventData || {},
      sessionId: sessionId ? sessionId.trim() : null,
      deviceInfo: deviceInfo || null,
      clientVersion: clientVersion ? clientVersion.trim() : null,
    };
  }
}

module.exports = {
  UserJourneyDTO,
  UserJourneySummaryDTO,
  UserJourneyDTOMapper,
};
