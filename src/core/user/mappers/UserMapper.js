import User from "@/core/user/models/User.js";
'use strict';
/**
 * UserMapper class
 * Responsible for mapping between User domain objects and database representation
 */
class UserMapper {
    /**
     * Convert a database record to a User domain entity
     * @param {Object} data - Database user record
     * @returns {User} User domain entity
     */
    toDomain(data) {
        if (!data) {
            return null;
        }
        // Convert string dates to Date objects if needed
        const createdAt = data.created_at instanceof Date
            ? data.created_at
            : new Date(data.created_at || data.createdAt);
        const lastActive = data.last_active instanceof Date
            ? data.last_active
            : data.last_active
                ? new Date(data.last_active || data.lastActive)
                : null;
        // Convert focus areas from string to array if needed
        let focusAreas = data.focus_areas || data.focusAreas || [];
        if (typeof focusAreas === 'string') {
            try {
                focusAreas = JSON.parse(focusAreas);
            }
            catch {
                focusAreas = focusAreas.split(',').map(area => area.trim());
            }
        }
        // Convert preferences from string to object if needed
        let preferences = data.preferences || {};
        if (typeof preferences === 'string') {
            try {
                preferences = JSON.parse(preferences);
            }
            catch {
                preferences = {};
            }
        }
        // Convert from snake_case database format to camelCase domain format
        const userData = {
            id: data.id,
            email: data.email,
            firstName: data.first_name || data.firstName || '',
            lastName: data.last_name || data.lastName || '',
            displayName: data.display_name || data.displayName || '',
            profileImageUrl: data.profile_image_url || data.profileImageUrl,
            preferences,
            focusAreas,
            createdAt,
            lastActive,
        };
        // Create and return a new User domain entity
        return new User(userData);
    }
    /**
     * Convert a User domain entity to database format
     * @param {User} user - User domain entity
     * @returns {Object} Database-ready object
     */
    toPersistence(user) {
        if (!user) {
            return null;
        }
        // Handle arrays and objects that need to be stored as strings or JSON
        const focusAreas = Array.isArray(user.focusAreas)
            ? user.focusAreas
            : user.focusAreas
                ? [user.focusAreas]
                : [];
        const preferences = typeof user.preferences === 'object'
            ? user.preferences
            : user.preferences
                ? JSON.parse(user.preferences)
                : {};
        // Convert from domain entity to database format (camelCase to snake_case)
        return {
            id: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            display_name: user.displayName,
            profile_image_url: user.profileImageUrl,
            preferences: preferences,
            focus_areas: focusAreas,
            created_at: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
            last_active: user.lastActive instanceof Date ? user.lastActive.toISOString() : user.lastActive,
        };
    }
    /**
     * Convert an array of database records to User domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @returns {Array<User>} Array of User domain entities
     */
    toDomainCollection(dataArray) {
        if (!Array.isArray(dataArray)) {
            return [];
        }
        return dataArray.map(data => this.toDomain(data));
    }
    /**
     * Convert an array of User domain entities to database format
     * @param {Array<User>} users - Array of User domain entities
     * @returns {Array<Object>} Array of database-ready objects
     */
    toPersistenceCollection(users) {
        if (!Array.isArray(users)) {
            return [];
        }
        return users.map(user => this.toPersistence(user));
    }
}
export default new UserMapper();
