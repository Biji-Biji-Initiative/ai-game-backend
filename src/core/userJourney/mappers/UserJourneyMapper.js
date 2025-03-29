'use strict';

/**
 * UserJourney Mapper
 *
 * Handles conversion between UserJourney domain entities and persistence format.
 * This mapper decouples domain entities from persistence concerns following DDD principles.
 */

const UserJourney = require('../models/UserJourney');

/**
 * UserJourneyMapper class
 * Responsible for mapping between UserJourney domain objects and database representation
 */
class UserJourneyMapper {
  /**
   * Convert a database record to a UserJourney domain entity
   * @param {Object} data - Database user journey record
   * @returns {UserJourney} UserJourney domain entity
   */
  toDomain(data) {
    if (!data) {
      return null;
    }

    // Convert string dates to Date objects if needed
    const timestamp = data.timestamp instanceof Date ? data.timestamp : new Date(data.timestamp);

    const createdAt =
      data.created_at instanceof Date
        ? data.created_at
        : new Date(data.created_at || data.createdAt);

    // Convert event data from string to object if needed
    let eventData = data.event_data || data.eventData || {};
    if (typeof eventData === 'string') {
      try {
        eventData = JSON.parse(eventData);
      } catch (e) {
        eventData = {};
      }
    }

    // Convert from snake_case database format to camelCase domain format
    const journeyData = {
      id: data.id,
      userId: data.user_id || data.userId,
      userEmail: data.user_email || data.userEmail,
      eventType: data.event_type || data.eventType,
      eventData,
      timestamp,
      sessionId: data.session_id || data.sessionId,
      deviceInfo: data.device_info || data.deviceInfo,
      clientVersion: data.client_version || data.clientVersion,
      createdAt,
    };

    // Create and return a new UserJourney domain entity
    return new UserJourney(journeyData);
  }

  /**
   * Convert a UserJourney domain entity to database format
   * @param {UserJourney} userJourney - UserJourney domain entity
   * @returns {Object} Database-ready object
   */
  toPersistence(userJourney) {
    if (!userJourney) {
      return null;
    }

    // Handle objects that need to be stored as strings or JSON
    const eventData =
      typeof userJourney.eventData === 'object'
        ? userJourney.eventData
        : userJourney.eventData
          ? JSON.parse(userJourney.eventData)
          : {};

    // Convert from domain entity to database format (camelCase to snake_case)
    return {
      id: userJourney.id,
      user_id: userJourney.userId,
      user_email: userJourney.userEmail,
      event_type: userJourney.eventType,
      event_data: eventData,
      timestamp:
        userJourney.timestamp instanceof Date
          ? userJourney.timestamp.toISOString()
          : userJourney.timestamp,
      session_id: userJourney.sessionId,
      device_info: userJourney.deviceInfo,
      client_version: userJourney.clientVersion,
      created_at:
        userJourney.createdAt instanceof Date
          ? userJourney.createdAt.toISOString()
          : userJourney.createdAt,
    };
  }

  /**
   * Convert an array of database records to UserJourney domain entities
   * @param {Array<Object>} dataArray - Array of database records
   * @returns {Array<UserJourney>} Array of UserJourney domain entities
   */
  toDomainCollection(dataArray) {
    if (!Array.isArray(dataArray)) {
      return [];
    }
    return dataArray.map(data => this.toDomain(data));
  }

  /**
   * Convert an array of UserJourney domain entities to database format
   * @param {Array<UserJourney>} journeyItems - Array of UserJourney domain entities
   * @returns {Array<Object>} Array of database-ready objects
   */
  toPersistenceCollection(journeyItems) {
    if (!Array.isArray(journeyItems)) {
      return [];
    }
    return journeyItems.map(journey => this.toPersistence(journey));
  }
}

// Export singleton instance
module.exports = new UserJourneyMapper();
