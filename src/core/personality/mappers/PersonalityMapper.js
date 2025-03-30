import Personality from "../../personality/models/Personality.js";
import { personalityDatabaseSchema } from "../../personality/schemas/personalitySchema.js";
import { logger } from "../../infra/logging/logger.js";
'use strict';

// Create a mapper-specific logger
const mapperLogger = logger.child({ component: 'PersonalityMapper' });

/**
 * PersonalityMapper class
 * Provides methods to convert between domain entities and database representations
 */
class PersonalityMapper {
    /**
     * Safely parse JSON or return default value if invalid
     * @param {any} value - The value to parse as JSON
     * @param {any} defaultValue - Default value to return if parsing fails
     * @returns {any} The parsed object or the default value
     * @private
     */
    _safeJsonParse(value, defaultValue = {}) {
        if (!value) return defaultValue;
        if (typeof value !== 'string') return value;
        
        try {
            return JSON.parse(value);
        } catch (error) {
            mapperLogger.warn(`Failed to parse JSON: ${value.substring(0, 50)}...`, { error: error.message });
            return defaultValue;
        }
    }

    /**
     * Safely convert to a date or return null if invalid
     * @param {any} value - The value to convert to a date
     * @returns {Date|string|null} The converted Date, the original string, or null if invalid
     * @private
     */
    _safeDate(value) {
        if (!value) return null;
        if (value instanceof Date) return value;
        
        try {
            const date = new Date(value);
            // Check if date is valid (not Invalid Date)
            return isNaN(date.getTime()) ? value : date;
        } catch (error) {
            mapperLogger.warn(`Failed to convert value to date: ${value}`, { error: error.message });
            return value; // Return original value if conversion fails
        }
    }

    /**
     * Convert a Personality entity to database format
     * @param {Personality} personality - Personality domain entity
     * @returns {Object} Database-formatted personality data
     * @throws {Error} If conversion fails
     */
    toPersistence(personality) {
        if (!personality) {
            mapperLogger.debug('Attempted to convert null/undefined Personality to database format');
            throw new Error('Personality is required');
        }

        try {
            if (!(personality instanceof Personality)) {
                mapperLogger.warn('Object is not a Personality instance', { 
                    type: typeof personality, 
                    objectKeys: Object.keys(personality || {}).join(',') 
                });
                throw new Error('Object must be a Personality instance');
            }

            // Safely process complex objects
            const personalityTraits = typeof personality.personalityTraits === 'string' 
                ? this._safeJsonParse(personality.personalityTraits, {})
                : personality.personalityTraits || {};

            const aiAttitudes = typeof personality.aiAttitudes === 'string'
                ? this._safeJsonParse(personality.aiAttitudes, {})
                : personality.aiAttitudes || {};
                
            const dominantTraits = typeof personality.dominantTraits === 'string'
                ? this._safeJsonParse(personality.dominantTraits, [])
                : Array.isArray(personality.dominantTraits) 
                    ? personality.dominantTraits 
                    : [];
                    
            const traitClusters = typeof personality.traitClusters === 'string'
                ? this._safeJsonParse(personality.traitClusters, {})
                : personality.traitClusters || {};
                
            const aiAttitudeProfile = typeof personality.aiAttitudeProfile === 'string'
                ? this._safeJsonParse(personality.aiAttitudeProfile, {})
                : personality.aiAttitudeProfile || {};
                
            const insights = typeof personality.insights === 'string'
                ? this._safeJsonParse(personality.insights, {})
                : personality.insights || {};

            // Prepare data with default values for required fields
            const data = {
                id: personality.id,
                user_id: personality.userId || null,
                personality_traits: personalityTraits,
                ai_attitudes: aiAttitudes,
                dominant_traits: dominantTraits,
                trait_clusters: traitClusters,
                ai_attitude_profile: aiAttitudeProfile,
                insights: insights,
                thread_id: personality.threadId || null,
                created_at: personality.createdAt || new Date().toISOString(),
                updated_at: personality.updatedAt || new Date().toISOString(),
            };

            // Validate the data using the schema
            const validationResult = personalityDatabaseSchema.safeParse(data);
            
            if (!validationResult.success) {
                mapperLogger.warn('Invalid personality data for persistence', {
                    errors: validationResult.error.message,
                    personalityId: personality.id
                });
                throw new Error(`Invalid personality data: ${validationResult.error.message}`);
            }

            // Return the validated data
            return validationResult.data;
        } catch (error) {
            mapperLogger.error('Failed to convert Personality to database format', {
                error: error.message,
                personalityId: personality?.id,
                stack: error.stack
            });
            throw new Error(`PersonalityMapper.toPersistence failed: ${error.message}`);
        }
    }

    /**
     * Convert database data to a Personality domain entity
     * @param {Object} data - Database data
     * @returns {Personality|null} Personality domain entity or null if conversion fails
     */
    toDomain(data) {
        if (!data) {
            mapperLogger.debug('Attempted to convert null/undefined data to Personality domain entity');
            return null;
        }

        try {
            // Convert snake_case to camelCase and handle complex fields
            const domainData = {
                id: data.id,
                userId: data.user_id || null,
                personalityTraits: typeof data.personality_traits === 'string'
                    ? this._safeJsonParse(data.personality_traits, {})
                    : data.personality_traits || {},
                aiAttitudes: typeof data.ai_attitudes === 'string'
                    ? this._safeJsonParse(data.ai_attitudes, {})
                    : data.ai_attitudes || {},
                dominantTraits: typeof data.dominant_traits === 'string'
                    ? this._safeJsonParse(data.dominant_traits, [])
                    : Array.isArray(data.dominant_traits)
                        ? data.dominant_traits
                        : [],
                traitClusters: typeof data.trait_clusters === 'string'
                    ? this._safeJsonParse(data.trait_clusters, {})
                    : data.trait_clusters || {},
                aiAttitudeProfile: typeof data.ai_attitude_profile === 'string'
                    ? this._safeJsonParse(data.ai_attitude_profile, {})
                    : data.ai_attitude_profile || {},
                insights: typeof data.insights === 'string'
                    ? this._safeJsonParse(data.insights, {})
                    : data.insights || {},
                threadId: data.thread_id || null,
                createdAt: data.created_at || new Date().toISOString(),
                updatedAt: data.updated_at || new Date().toISOString(),
            };

            return new Personality(domainData);
        } catch (error) {
            mapperLogger.error('Failed to convert database record to Personality domain entity', {
                error: error.message,
                data: JSON.stringify(data).substring(0, 200),
                stack: error.stack
            });
            // Return null instead of throwing to allow graceful degradation
            return null;
        }
    }

    /**
     * Convert a collection of database records to domain entities
     * @param {Array<Object>} items - Array of database records
     * @returns {Array<Personality>} Array of Personality domain entities
     */
    toDomainCollection(items) {
        if (!items || !Array.isArray(items)) {
            mapperLogger.debug('Attempted to convert non-array data to Personality domain collection');
            return [];
        }

        const results = [];
        for (let i = 0; i < items.length; i++) {
            try {
                const entity = this.toDomain(items[i]);
                if (entity) {
                    results.push(entity);
                }
            } catch (error) {
                mapperLogger.warn(`Failed to convert item at index ${i} to Personality domain entity, skipping`, {
                    error: error.message,
                    item: JSON.stringify(items[i]).substring(0, 100),
                });
                // Continue processing other items
            }
        }
        return results;
    }

    /**
     * Convert a collection of domain entities to database records
     * @param {Array<Personality>} entities - Array of Personality domain entities
     * @returns {Array<Object>} Array of database records
     */
    toPersistenceCollection(entities) {
        if (!entities || !Array.isArray(entities)) {
            mapperLogger.debug('Attempted to convert non-array Personalities to database format collection');
            return [];
        }

        const results = [];
        for (let i = 0; i < entities.length; i++) {
            try {
                const record = this.toPersistence(entities[i]);
                if (record) {
                    results.push(record);
                }
            } catch (error) {
                mapperLogger.warn(`Failed to convert Personality at index ${i} to database format, skipping`, {
                    error: error.message,
                    personalityId: entities[i]?.id,
                });
                // Continue processing other items
            }
        }
        return results;
    }
}

// Create a singleton instance
const personalityMapper = new PersonalityMapper();
export default personalityMapper;
