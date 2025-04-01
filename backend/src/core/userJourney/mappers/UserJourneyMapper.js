import UserJourneyEvent from "#app/core/userJourney/models/UserJourneyEvent.js";
'use strict';
/**
 * UserJourneyMapper class
 * Responsible for mapping between UserJourney domain objects and database representation
 */
class UserJourneyMapper {
    /**
     * Convert a database record to a UserJourney domain entity
     * @param {Object} data - Database user journey record
     * @returns {UserJourneyEvent} UserJourneyEvent domain entity
     */
    toDomain(data) {
        if (!data) {
            return null;
        }
        // Convert string dates to Date objects if needed
        const timestamp = data.timestamp instanceof Date ? data.timestamp : new Date(data.timestamp);
        const createdAt = data.created_at instanceof Date
            ? data.created_at
            : new Date(data.created_at || data.createdAt);
        // Convert event data from string to object if needed
        let eventData = data.event_data || data.eventData || {};
        if (typeof eventData === 'string') {
            try {
                eventData = JSON.parse(eventData);
            }
            catch {
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
        // Create and return a new UserJourneyEvent domain entity
        return new UserJourneyEvent(journeyData);
    }
    /**
     * Convert a UserJourneyEvent domain entity to database format
     * @param {UserJourneyEvent} userJourney - UserJourneyEvent domain entity
     * @returns {Object} Database-ready object
     */
    toPersistence(userJourney) {
        if (!userJourney) {
            return null;
        }
        // Handle objects that need to be stored as strings or JSON
        const eventData = typeof userJourney.eventData === 'object'
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
            timestamp: userJourney.timestamp instanceof Date
                ? userJourney.timestamp.toISOString()
                : userJourney.timestamp,
            session_id: userJourney.sessionId,
            device_info: userJourney.deviceInfo,
            client_version: userJourney.clientVersion,
            created_at: userJourney.createdAt instanceof Date
                ? userJourney.createdAt.toISOString()
                : userJourney.createdAt,
        };
    }
    /**
     * Convert an array of database records to UserJourneyEvent domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<UserJourneyEvent>} Array of UserJourneyEvent domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            return [];
        }
        return dataArray.map(data => this.toDomain(data));
    }
    /**
     * Convert an array of UserJourneyEvent domain entities to database format
     * @param {Array<UserJourneyEvent>} journeyItems - Array of UserJourneyEvent domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(journeyItems) {
        if (!Array.isArray(journeyItems)) {
            return [];
        }
        return journeyItems.map(journey => this.toPersistence(journey));
    }
}
export default new UserJourneyMapper();
