import User from "../../user/models/User.js";
import { logger } from "../../infra/logging/logger.js";
'use strict';

// Create a mapper-specific logger
const mapperLogger = logger.child({ component: 'UserMapper' });

/**
 * UserMapper class
 * Responsible for mapping between User domain objects and database representation
 */
class UserMapper {
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
                return value.split(',').map(item => item.trim()).filter(item => item);
            }
        }
        
        // If it's an object or other type, wrap it in an array
        return [value];
    }

    /**
     * Convert a database record to a User domain entity
     * @param {Object} data - Database user record
     * @returns {User|null} User domain entity or null if conversion fails
     */
    toDomain(data) {
        if (!data) {
            mapperLogger.debug('Attempted to convert null/undefined data to User domain entity');
            return null;
        }

        try {
            // Safely convert dates
            const createdAt = this._safeDate(data.created_at || data.createdAt);
            const lastActive = this._safeDate(data.last_active || data.lastActive);
            const lastLoginAt = this._safeDate(data.last_login_at || data.lastLoginAt);
            const updatedAt = this._safeDate(data.updated_at || data.updatedAt);
            
            // Safely convert arrays and objects
            const focusAreas = this._safeArray(data.focus_areas || data.focusAreas);
            const preferences = this._safeJsonParse(data.preferences, {});
            const roles = this._safeArray(data.roles, ['user']);
            
            // Convert from snake_case database format to camelCase domain format with safety checks
            const userData = {
                id: data.id || null,
                email: data.email || '',
                fullName: data.full_name || data.fullName || '',
                professionalTitle: data.professional_title || data.professionalTitle || '',
                location: data.location || '',
                country: data.country || '',
                focusArea: data.focus_area || data.focusArea || '',
                lastActive: lastActive ? lastActive.toISOString() : null,
                createdAt: createdAt ? createdAt.toISOString() : new Date().toISOString(),
                updatedAt: updatedAt ? updatedAt.toISOString() : new Date().toISOString(),
                lastLoginAt: lastLoginAt ? lastLoginAt.toISOString() : null,
                focusAreaThreadId: data.focus_area_thread_id || data.focusAreaThreadId || '',
                challengeThreadId: data.challenge_thread_id || data.challengeThreadId || '',
                evaluationThreadId: data.evaluation_thread_id || data.evaluationThreadId || '',
                personalityThreadId: data.personality_thread_id || data.personalityThreadId || '',
                preferences: preferences,
                status: data.status || 'active',
                roles: roles,
                onboardingCompleted: Boolean(data.onboarding_completed || data.onboardingCompleted),
                focusAreas: focusAreas,
            };

            // Create and return a new User domain entity
            return new User(userData);
        } catch (error) {
            mapperLogger.error(`Failed to convert database record to User domain entity`, {
                error: error.message,
                data: JSON.stringify(data).substring(0, 200),
                stack: error.stack
            });
            throw new Error(`UserMapper.toDomain failed: ${error.message}`);
        }
    }

    /**
     * Convert a User domain entity to database format
     * @param {User} user - User domain entity
     * @returns {Object|null} Database-ready object or null if conversion fails
     */
    toPersistence(user) {
        if (!user) {
            mapperLogger.debug('Attempted to convert null/undefined User to database format');
            return null;
        }

        try {
            // Ensure arrays are properly handled
            const focusAreas = this._safeArray(user.focusAreas);
            const roles = this._safeArray(user.roles, ['user']);
            
            // Ensure preferences is an object
            const preferences = user.preferences && typeof user.preferences === 'object'
                ? user.preferences
                : this._safeJsonParse(user.preferences, {});
            
            // Safely handle dates
            const createdAt = user.createdAt ? this._safeDate(user.createdAt) : new Date();
            const updatedAt = user.updatedAt ? this._safeDate(user.updatedAt) : new Date();
            const lastActive = user.lastActive ? this._safeDate(user.lastActive) : null;
            const lastLoginAt = user.lastLoginAt ? this._safeDate(user.lastLoginAt) : null;

            // Convert from domain entity to database format (camelCase to snake_case)
            return {
                id: user.id,
                email: user.email || '',
                full_name: user.fullName || '',
                professional_title: user.professionalTitle || '',
                location: user.location || '',
                country: user.country || '',
                focus_area: user.focusArea || '',
                focus_areas: focusAreas,
                last_active: lastActive ? lastActive.toISOString() : null,
                created_at: createdAt ? createdAt.toISOString() : new Date().toISOString(),
                updated_at: updatedAt ? updatedAt.toISOString() : new Date().toISOString(),
                last_login_at: lastLoginAt ? lastLoginAt.toISOString() : null,
                focus_area_thread_id: user.focusAreaThreadId || '',
                challenge_thread_id: user.challengeThreadId || '',
                evaluation_thread_id: user.evaluationThreadId || '',
                personality_thread_id: user.personalityThreadId || '',
                preferences: preferences,
                status: user.status || 'active',
                roles: roles,
                onboarding_completed: Boolean(user.onboardingCompleted),
            };
        } catch (error) {
            mapperLogger.error(`Failed to convert User domain entity to database format`, {
                error: error.message,
                userId: user?.id,
                stack: error.stack
            });
            throw new Error(`UserMapper.toPersistence failed: ${error.message}`);
        }
    }

    /**
     * Convert an array of database records to User domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<User>} Array of User domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            mapperLogger.debug('Attempted to convert non-array data to User domain collection');
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
                mapperLogger.warn(`Failed to convert item at index ${i} to User domain entity, skipping`, {
                    error: error.message,
                    item: JSON.stringify(dataArray[i]).substring(0, 100),
                });
                // Continue processing other items
            }
        }
        return results;
    }

    /**
     * Convert an array of User domain entities to database format
     * @param {Array<User>} users - Array of User domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(users) {
        if (!Array.isArray(users)) {
            mapperLogger.debug('Attempted to convert non-array Users to database format collection');
            return [];
        }

        const results = [];
        for (let i = 0; i < users.length; i++) {
            try {
                const record = this.toPersistence(users[i]);
                if (record) {
                    results.push(record);
                }
            } catch (error) {
                mapperLogger.warn(`Failed to convert User at index ${i} to database format, skipping`, {
                    error: error.message,
                    userId: users[i]?.id,
                });
                // Continue processing other items
            }
        }
        return results;
    }
}

export default new UserMapper();
