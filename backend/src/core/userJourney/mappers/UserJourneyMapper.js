'use strict';

import { UserJourney, ENGAGEMENT_LEVELS } from "#app/core/userJourney/models/UserJourney.js";
import UserJourneyEvent from "#app/core/userJourney/models/UserJourneyEvent.js";
import { logger } from "#app/core/infra/logging/logger.js";

/**
 * UserJourneyMapper class
 * Maps between UserJourney domain aggregate and database representation.
 */
class UserJourneyMapper {
    constructor() {
        this.logger = logger.child({ component: 'UserJourneyMapper' });
    }
    /**
     * Convert database record to UserJourney domain aggregate.
     * NOTE: This typically does NOT load all events by default.
     * Events should be loaded separately if needed by specific use cases.
     * @param {Object} dbRecord - Database record from user_journeys table.
     * @param {Object} [options={}] - Additional options (e.g., EventTypes).
     * @returns {UserJourney|null} UserJourney domain aggregate.
     */
    toDomain(dbRecord, options = {}) {
        if (!dbRecord) {
            return null;
        }

        // Parse JSON fields
        let metrics = {};
        if (typeof dbRecord.metrics === 'string') {
            try { metrics = JSON.parse(dbRecord.metrics); } catch (e) { this.logger.error('Failed to parse metrics JSON', { error: e.message, recordId: dbRecord.id }); }
        } else if (typeof dbRecord.metrics === 'object' && dbRecord.metrics !== null) {
            metrics = dbRecord.metrics;
        }

        let metadata = {};
        if (typeof dbRecord.metadata === 'string') {
            try { metadata = JSON.parse(dbRecord.metadata); } catch (e) { this.logger.error('Failed to parse metadata JSON', { error: e.message, recordId: dbRecord.id }); }
        } else if (typeof dbRecord.metadata === 'object' && dbRecord.metadata !== null) {
            metadata = dbRecord.metadata;
        }
        
        const journeyData = {
            id: dbRecord.id,
            userId: dbRecord.user_id,
            lastActivity: dbRecord.last_activity,
            sessionCount: dbRecord.session_count,
            currentSessionStartedAt: dbRecord.current_session_started_at,
            engagementLevel: dbRecord.engagement_level || ENGAGEMENT_LEVELS.NEW,
            metrics: metrics,
            metadata: metadata,
            createdAt: dbRecord.created_at,
            updatedAt: dbRecord.updated_at,
            // IMPORTANT: Events are typically NOT loaded here by default for performance.
            // They would be fetched by the repository/service on demand if needed.
            events: [] 
        };
        
        try {
            return new UserJourney(journeyData, options);
        } catch (error) {
            this.logger.error('Error creating UserJourney instance in mapper', {
                 error: error.message, 
                 recordId: dbRecord.id,
                 userId: dbRecord.user_id 
            });
            return null; // Return null if mapping/instantiation fails
        }
    }

    /**
     * Convert UserJourney domain aggregate to database record format.
     * NOTE: This typically does NOT include the full events array.
     * @param {UserJourney} journey - UserJourney domain aggregate.
     * @returns {Object|null} Database-ready object for user_journeys table.
     */
    toPersistence(journey) {
        if (!journey || !(journey instanceof UserJourney)) {
            return null;
        }

        return {
            id: journey.id,
            user_id: journey.userId,
            last_activity: journey.lastActivity instanceof Date ? journey.lastActivity.toISOString() : journey.lastActivity,
            session_count: journey.sessionCount,
            current_session_started_at: journey.currentSessionStartedAt instanceof Date ? journey.currentSessionStartedAt.toISOString() : journey.currentSessionStartedAt,
            engagement_level: journey.engagementLevel,
            metrics: journey.metrics, // Assumes DB column is JSONB or similar
            metadata: journey.metadata, // Assumes DB column is JSONB or similar
            created_at: journey.createdAt instanceof Date ? journey.createdAt.toISOString() : journey.createdAt,
            updated_at: journey.updatedAt instanceof Date ? journey.updatedAt.toISOString() : journey.updatedAt,
        };
    }
    
    /**
     * Convert a collection of database records to UserJourney domain aggregates.
     * @param {Array<Object>} dbRecords - Array of database records.
     * @param {Object} [options={}] - Additional options.
     * @returns {Array<UserJourney>} Array of UserJourney aggregates.
     */
    toDomainCollection(dbRecords, options = {}) {
        if (!Array.isArray(dbRecords)) {
            return [];
        }
        return dbRecords.map(record => this.toDomain(record, options)).filter(Boolean);
    }
    
    /**
     * Convert an array of UserJourney domain entities to database format
     * @param {Array<UserJourney>} journeys - Array of UserJourney domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(journeys) {
        if (!Array.isArray(journeys)) {
            return [];
        }
        return journeys.map(journey => this.toPersistence(journey)).filter(data => data !== null);
    }
}

// Export singleton instance
const userJourneyMapper = new UserJourneyMapper();
export default userJourneyMapper;
