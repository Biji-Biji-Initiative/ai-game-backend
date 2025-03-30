import UserJourneyEvent from "../models/UserJourneyEvent.js";
'use strict';
/**
 * UserJourneyEventMapper class
 * Responsible for mapping between UserJourneyEvent domain objects and database representation
 */
class UserJourneyEventMapper {
    /**
     * Convert a database record to a UserJourneyEvent domain entity
     * @param {Object} data - Database user journey event record
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
        // Convert metadata from string to object if needed
        let metadata = data.metadata || {};
        if (typeof metadata === 'string') {
            try {
                metadata = JSON.parse(metadata);
            }
            catch {
                metadata = {};
            }
        }
        // Convert from snake_case database format to camelCase domain format
        const eventRecord = {
            id: data.id,
            userId: data.user_id || data.userId,
            userEmail: data.user_email || data.userEmail,
            eventType: data.event_type || data.eventType,
            eventName: data.event_name || data.eventName,
            eventData,
            timestamp,
            journeyId: data.journey_id || data.journeyId,
            focusArea: data.focus_area || data.focusArea,
            challengeId: data.challenge_id || data.challengeId,
            sessionId: data.session_id || data.sessionId,
            deviceInfo: data.device_info || data.deviceInfo,
            metadata,
            clientVersion: data.client_version || data.clientVersion,
            createdAt,
        };
        // Create and return a new UserJourneyEvent domain entity
        return new UserJourneyEvent(eventRecord);
    }
    /**
     * Convert a UserJourneyEvent domain entity to database format
     * @param {UserJourneyEvent} event - UserJourneyEvent domain entity
     * @returns {Object} Database-ready object
     */
    toPersistence(event) {
        if (!event) {
            return null;
        }
        // Handle objects that need to be stored as strings or JSON
        const eventData = typeof event.eventData === 'object'
            ? event.eventData
            : event.eventData
                ? JSON.parse(event.eventData)
                : {};
        const metadata = typeof event.metadata === 'object'
            ? event.metadata
            : event.metadata
                ? JSON.parse(event.metadata)
                : {};
        // Convert from domain entity to database format (camelCase to snake_case)
        return {
            id: event.id,
            user_id: event.userId,
            user_email: event.userEmail,
            event_type: event.eventType,
            event_name: event.eventName,
            event_data: eventData,
            timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
            journey_id: event.journeyId,
            focus_area: event.focusArea,
            challenge_id: event.challengeId,
            session_id: event.sessionId,
            device_info: event.deviceInfo,
            metadata,
            client_version: event.clientVersion,
            created_at: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
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
     * @param {Array<UserJourneyEvent>} events - Array of UserJourneyEvent domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(events) {
        if (!Array.isArray(events)) {
            return [];
        }
        return events.map(event => this.toPersistence(event));
    }
}
export default new UserJourneyEventMapper();
