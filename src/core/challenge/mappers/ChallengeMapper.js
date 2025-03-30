import Challenge from "../../challenge/models/Challenge.js";
import { logger } from "../../infra/logging/logger.js";
'use strict';

// Create a mapper-specific logger
const mapperLogger = logger.child({ component: 'ChallengeMapper' });

/**
 * ChallengeMapper class
 * Responsible for mapping between Challenge domain objects and database representation
 */
class ChallengeMapper {
    /**
     * Safely convert to a date or return null if invalid
     * @param {any} value - The value to convert to a date
     * @returns {Date|null} The converted Date or null if invalid
     * @private
     */
    _safeDate(value) {
        if (!value) return null;
        if (value instanceof Date) return value;
        
        try {
            const date = new Date(value);
            // Check if date is valid (not Invalid Date)
            return isNaN(date.getTime()) ? null : date;
        } catch (error) {
            mapperLogger.warn(`Failed to convert value to date: ${value}`, { error: error.message });
            return null;
        }
    }
    
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
            mapperLogger.warn(`Failed to parse JSON: ${value}`, { error: error.message });
            return defaultValue;
        }
    }
    
    /**
     * Convert a database record to a Challenge domain entity
     * @param {Object} data - Database challenge record
     * @returns {Challenge|null} Challenge domain entity or null if conversion fails
     */
    toDomain(data) {
        if (!data) {
            mapperLogger.debug('Attempted to convert null/undefined data to Challenge domain entity');
            return null;
        }
        
        try {
            // Safely convert dates
            const createdAt = this._safeDate(data.created_at || data.createdAt) || new Date();
            const updatedAt = this._safeDate(data.updated_at || data.updatedAt) || new Date();
            
            // Safely parse content if it's a string
            let content = data.content;
            if (typeof content === 'string') {
                content = this._safeJsonParse(content, { instructions: content });
            } else if (!content || typeof content !== 'object') {
                content = { instructions: String(content || '') };
            }
            
            // Safely handle responses array
            let responses = data.responses || [];
            if (typeof responses === 'string') {
                responses = this._safeJsonParse(responses, []);
            }
            if (!Array.isArray(responses)) {
                responses = responses ? [responses] : [];
            }
            
            // Safely handle evaluation data
            let evaluation = data.evaluation || null;
            if (typeof evaluation === 'string') {
                evaluation = this._safeJsonParse(evaluation, null);
            }
            
            // Safely parse evaluationCriteria if present
            let evaluationCriteria = data.evaluation_criteria || data.evaluationCriteria || [];
            if (typeof evaluationCriteria === 'string') {
                evaluationCriteria = this._safeJsonParse(evaluationCriteria, []);
            }
            if (!Array.isArray(evaluationCriteria)) {
                evaluationCriteria = evaluationCriteria ? [evaluationCriteria] : [];
            }
            
            // Convert from snake_case database format to camelCase domain format with safety checks
            const challengeData = {
                id: data.id || null,
                content: content,
                userEmail: data.user_email || data.userEmail || '',
                userId: data.user_id || data.userId || null,
                focusArea: data.focus_area || data.focusArea || '',
                focusAreaId: data.focus_area_id || data.focusAreaId || null,
                challengeType: data.challenge_type || data.challengeType || '',
                formatType: data.format_type || data.formatType || '',
                difficulty: data.difficulty || 'intermediate',
                status: data.status || 'pending',
                createdAt,
                updatedAt,
                title: data.title || '',
                description: data.description || '',
                evaluationCriteria: evaluationCriteria,
                responses: responses,
                evaluation: evaluation,
                score: typeof data.score === 'number' ? data.score : parseFloat(data.score) || 0
            };
            
            // Create and return a new Challenge domain entity
            return new Challenge(challengeData);
        } catch (error) {
            mapperLogger.error(`Failed to convert database record to Challenge domain entity`, {
                error: error.message,
                data: JSON.stringify(data).substring(0, 200),
                stack: error.stack
            });
            throw new Error(`ChallengeMapper.toDomain failed: ${error.message}`);
        }
    }
    
    /**
     * Convert a Challenge domain entity to database format
     * @param {Challenge} challenge - Challenge domain entity
     * @returns {Object|null} Database-ready object or null if conversion fails
     */
    toPersistence(challenge) {
        if (!challenge) {
            mapperLogger.debug('Attempted to convert null/undefined Challenge to database format');
            return null;
        }
        
        try {
            // Safely convert dates to ISO strings
            const createdAt = challenge.createdAt ? 
                (challenge.createdAt instanceof Date ? 
                    challenge.createdAt.toISOString() : 
                    String(challenge.createdAt)
                ) : 
                new Date().toISOString();
                
            const updatedAt = challenge.updatedAt ? 
                (challenge.updatedAt instanceof Date ? 
                    challenge.updatedAt.toISOString() : 
                    String(challenge.updatedAt)
                ) : 
                new Date().toISOString();
            
            // Ensure content is properly formatted
            let content = challenge.content;
            if (typeof content !== 'object' || content === null) {
                content = { instructions: String(content || '') };
            }
            
            // Ensure responses is an array
            const responses = Array.isArray(challenge.responses) ? 
                challenge.responses : 
                (challenge.responses ? [challenge.responses] : []);
            
            // Convert from domain entity to database format (camelCase to snake_case)
            return {
                id: challenge.id,
                content: content,
                user_email: challenge.userEmail || '',
                user_id: challenge.userId || null,
                focus_area: challenge.focusArea || '',
                focus_area_id: challenge.focusAreaId || null,
                challenge_type: challenge.challengeType || '',
                format_type: challenge.formatType || '',
                difficulty: challenge.difficulty || 'intermediate',
                status: challenge.status || 'pending',
                created_at: createdAt,
                updated_at: updatedAt,
                title: challenge.title || '',
                description: challenge.description || '',
                evaluation_criteria: Array.isArray(challenge.evaluationCriteria) ? 
                    challenge.evaluationCriteria : 
                    [],
                responses: responses,
                evaluation: challenge.evaluation || null,
                score: typeof challenge.score === 'number' ? 
                    challenge.score : 
                    (parseFloat(challenge.score) || 0)
            };
        } catch (error) {
            mapperLogger.error(`Failed to convert Challenge domain entity to database format`, {
                error: error.message,
                challengeId: challenge.id,
                stack: error.stack
            });
            throw new Error(`ChallengeMapper.toPersistence failed: ${error.message}`);
        }
    }
    
    /**
     * Convert an array of database records to Challenge domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<Challenge>} Array of Challenge domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            mapperLogger.debug('Attempted to convert non-array data to Challenge domain collection');
            return [];
        }
        
        const results = [];
        for (let i = 0; i < dataArray.length; i++) {
            try {
                const entity = this.toDomain(dataArray[i]);
                if (entity) {
                    results.push(entity);
                }
            } catch (error) {
                mapperLogger.warn(`Failed to convert item at index ${i} to Challenge domain entity, skipping`, {
                    error: error.message,
                    item: JSON.stringify(dataArray[i]).substring(0, 100),
                });
                // Continue processing other items
            }
        }
        return results;
    }
    
    /**
     * Convert an array of Challenge domain entities to database format
     * @param {Array<Challenge>} challenges - Array of Challenge domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(challenges) {
        if (!Array.isArray(challenges)) {
            mapperLogger.debug('Attempted to convert non-array Challenges to database format collection');
            return [];
        }
        
        const results = [];
        for (let i = 0; i < challenges.length; i++) {
            try {
                const record = this.toPersistence(challenges[i]);
                if (record) {
                    results.push(record);
                }
            } catch (error) {
                mapperLogger.warn(`Failed to convert Challenge at index ${i} to database format, skipping`, {
                    error: error.message,
                    challengeId: challenges[i]?.id,
                });
                // Continue processing other items
            }
        }
        return results;
    }
}

export default new ChallengeMapper();
