import Progress from "../../progress/models/Progress.js";
import { logger } from "../../infra/logging/logger.js";
'use strict';

// Create a mapper-specific logger
const mapperLogger = logger.child({ component: 'ProgressMapper' });

/**
 * ProgressMapper class
 * Responsible for mapping between Progress domain objects and database representation
 */
class ProgressMapper {
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
            mapperLogger.warn(`Failed to parse JSON: ${value.substring(0, 50)}...`, { error: error.message });
            return defaultValue;
        }
    }
    
    /**
     * Safely convert a value to an array
     * @param {any} value - The value to convert to an array
     * @param {Array} defaultValue - Default value to return if conversion fails
     * @returns {Array} The resulting array or the default value
     * @private 
     */
    _safeArray(value, defaultValue = []) {
        if (!value) return defaultValue;
        if (Array.isArray(value)) return value;
        
        if (typeof value === 'string') {
            // Try JSON parse first
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [parsed];
            } catch (error) {
                // Fall back to comma-separated string splitting
                return value.split(',').map(item => item.trim()).filter(Boolean);
            }
        }
        
        // If it's an object or other type, wrap it in an array
        return [value];
    }

    /**
     * Convert a database record to a Progress domain entity
     * @param {Object} data - Database progress record
     * @returns {Progress|null} Progress domain entity or null if conversion fails
     */
    toDomain(data) {
        if (!data) {
            mapperLogger.debug('Attempted to convert null/undefined data to Progress domain entity');
            return null;
        }
        
        try {
            // Safely convert dates
            const createdAt = this._safeDate(data.created_at || data.createdAt) || new Date();
            const updatedAt = this._safeDate(data.updated_at || data.updatedAt) || new Date();
            
            // Safely convert complex objects
            const skillLevels = this._safeJsonParse(data.skill_levels || data.skillLevels, {});
            
            // Default statistics object structure
            const defaultStats = {
                totalChallenges: 0,
                averageScore: 0,
                highestScore: 0,
                averageCompletionTime: 0,
                streakDays: 0,
                lastActive: null
            };
            const statistics = this._safeJsonParse(data.statistics, defaultStats);
            
            // Convert arrays safely
            const completedChallenges = this._safeArray(data.completed_challenges || data.completedChallenges, []);
            const strengths = this._safeArray(data.strengths, []);
            const weaknesses = this._safeArray(data.weaknesses, []);
            
            // Convert from snake_case database format to camelCase domain format with safety checks
            const progressData = {
                id: data.id || null,
                userId: data.user_id || data.userId || null,
                focusArea: data.focus_area || data.focusArea || '',
                challengeId: data.challenge_id || data.challengeId || null,
                score: typeof data.score === 'number' ? data.score : parseFloat(data.score) || 0,
                completionTime: typeof data.completion_time === 'number' ? data.completion_time : 
                                (typeof data.completionTime === 'number' ? data.completionTime : 0),
                skillLevels,
                strengths,
                weaknesses,
                completedChallenges,
                statistics,
                status: data.status || 'active',
                createdAt: createdAt.toISOString(),
                updatedAt: updatedAt.toISOString(),
            };
            
            // Create and return a new Progress domain entity
            return new Progress(progressData);
        } catch (error) {
            mapperLogger.error(`Failed to convert database record to Progress domain entity`, {
                error: error.message,
                data: JSON.stringify(data).substring(0, 200),
                stack: error.stack
            });
            throw new Error(`ProgressMapper.toDomain failed: ${error.message}`);
        }
    }
    
    /**
     * Convert a Progress domain entity to database format
     * @param {Progress} progress - Progress domain entity
     * @returns {Object|null} Database-ready object or null if conversion fails
     */
    toPersistence(progress) {
        if (!progress) {
            mapperLogger.debug('Attempted to convert null/undefined Progress to database format');
            return null;
        }
        
        try {
            // Safely handle objects that may be strings or actual objects
            const skillLevels = typeof progress.skillLevels === 'string'
                ? this._safeJsonParse(progress.skillLevels, {})
                : progress.skillLevels || {};
                
            const statistics = typeof progress.statistics === 'string'
                ? this._safeJsonParse(progress.statistics, {})
                : progress.statistics || {};
                
            const completedChallenges = this._safeArray(progress.completedChallenges, []);
            const strengths = this._safeArray(progress.strengths, []);
            const weaknesses = this._safeArray(progress.weaknesses, []);
            
            // Safely convert dates to ISO strings
            const createdAt = progress.createdAt ? 
                (progress.createdAt instanceof Date ? 
                    progress.createdAt.toISOString() : 
                    String(progress.createdAt)
                ) : 
                new Date().toISOString();
                
            const updatedAt = progress.updatedAt ? 
                (progress.updatedAt instanceof Date ? 
                    progress.updatedAt.toISOString() : 
                    String(progress.updatedAt)
                ) : 
                new Date().toISOString();
            
            // Convert from domain entity to database format (camelCase to snake_case)
            return {
                id: progress.id,
                user_id: progress.userId || null,
                focus_area: progress.focusArea || '',
                challenge_id: progress.challengeId || null,
                score: typeof progress.score === 'number' ? progress.score : parseFloat(progress.score) || 0,
                completion_time: typeof progress.completionTime === 'number' ? 
                    progress.completionTime : parseFloat(progress.completionTime) || 0,
                skill_levels: skillLevels,
                strengths: strengths,
                weaknesses: weaknesses,
                completed_challenges: completedChallenges,
                statistics: statistics,
                status: progress.status || 'active',
                created_at: createdAt,
                updated_at: updatedAt,
            };
        } catch (error) {
            mapperLogger.error(`Failed to convert Progress domain entity to database format`, {
                error: error.message,
                progressId: progress.id,
                stack: error.stack
            });
            throw new Error(`ProgressMapper.toPersistence failed: ${error.message}`);
        }
    }
    
    /**
     * Convert an array of database records to Progress domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<Progress>} Array of Progress domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            mapperLogger.debug('Attempted to convert non-array data to Progress domain collection');
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
                mapperLogger.warn(`Failed to convert item at index ${i} to Progress domain entity, skipping`, {
                    error: error.message,
                    item: JSON.stringify(dataArray[i]).substring(0, 100),
                });
                // Continue processing other items
            }
        }
        return results;
    }
    
    /**
     * Convert an array of Progress domain entities to database format
     * @param {Array<Progress>} progressItems - Array of Progress domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(progressItems) {
        if (!Array.isArray(progressItems)) {
            mapperLogger.debug('Attempted to convert non-array Progresses to database format collection');
            return [];
        }
        
        const results = [];
        for (let i = 0; i < progressItems.length; i++) {
            try {
                const record = this.toPersistence(progressItems[i]);
                if (record) {
                    results.push(record);
                }
            } catch (error) {
                mapperLogger.warn(`Failed to convert Progress at index ${i} to database format, skipping`, {
                    error: error.message,
                    progressId: progressItems[i]?.id,
                });
                // Continue processing other items
            }
        }
        return results;
    }
}

export default new ProgressMapper();
