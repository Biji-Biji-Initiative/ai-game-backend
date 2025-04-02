import User from "#app/core/user/models/User.js";
import { userLogger } from "#app/core/infra/logging/domainLogger.js"; // Import logger
'use strict';
/**
 * UserMapper class
 * Responsible for mapping between User domain objects and database representation
 */
class UserMapper {
    constructor() {
        this.logger = userLogger.child({ component: 'UserMapper' });
    }
    /**
     * Convert a database record to a User domain entity
     * @param {Object} data - Database user record
     * @param {Object} options - Additional options to pass to the User constructor (e.g., { EventTypes })
     * @returns {User} User domain entity
     */
    toDomain(data, options = {}) {
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
            } catch {
                focusAreas = focusAreas.split(',').map(area => area.trim());
            }
        }
        // Convert preferences from string to object if needed
        let preferences = data.preferences || {};
        if (typeof preferences === 'string') {
            try {
                preferences = JSON.parse(preferences);
            } catch {
                preferences = {};
            }
        }
        
        // Convert roles from string if needed
        let roles = data.roles || ['user'];
        if (typeof roles === 'string') {
            try {
                roles = JSON.parse(roles);
                if (!Array.isArray(roles)) roles = ['user'];
            } catch {
                roles = roles.split(',').map(role => role.trim());
            }
        }
        
        // Prepare data for User constructor
        const userData = {
            id: data.id,
            email: data.email,
            // Use helper function or direct access for name fields
            fullName: data.full_name || data.fullName || `${data.first_name || ''} ${data.last_name || ''}`.trim(), 
            firstName: data.first_name || data.firstName || '',
            lastName: data.last_name || data.lastName || '',
            displayName: data.display_name || data.displayName || '',
            profileImageUrl: data.profile_image_url || data.profileImageUrl,
            professionalTitle: data.professional_title || data.professionalTitle || '',
            location: data.location || '',
            country: data.country || '',
            focusArea: data.focus_area || data.focusArea || '', // Let User model handle Value Object
            difficultyLevel: data.difficulty_level || data.difficultyLevel || null, // Map difficulty level
            focusAreaThreadId: data.focus_area_thread_id || data.focusAreaThreadId || '',
            challengeThreadId: data.challenge_thread_id || data.challengeThreadId || '',
            evaluationThreadId: data.evaluation_thread_id || data.evaluationThreadId || '',
            personalityThreadId: data.personality_thread_id || data.personalityThreadId || '',
            status: data.status || 'active',
            onboardingCompleted: data.onboarding_completed || data.onboardingCompleted || false,
            lastLoginAt: data.last_login_at || data.lastLoginAt || null,
            preferences, // Already converted
            focusAreas, // Already converted
            roles, // Already converted
            createdAt, // Already converted
            lastActive, // Already converted
            updatedAt: data.updated_at || data.updatedAt ? new Date(data.updated_at || data.updatedAt) : createdAt // Ensure updatedAt is Date
        };
        
        // Create and return a new User domain entity, passing options
        try {
            return new User(userData, options);
        } catch (validationError) {
             // Log the validation error that occurred during User construction
             this.logger.error('[UserMapper.toDomain] Error creating User instance:', { 
                 message: validationError.message, 
                 errors: validationError.validationErrors, // Assuming UserValidationError has validationErrors
                 data: userData 
                });
             // Depending on policy, you might return null or re-throw
             // return null;
             throw validationError; // Re-throw to signal the issue upstream
        }
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
        
        // Convert arrays/objects to JSON strings if needed by DB schema
        // Example: assuming DB stores these as JSONB or TEXT
        const preferences = typeof user.preferences === 'object' ? user.preferences : {};
        const focusAreas = Array.isArray(user.focusAreas) ? user.focusAreas : [];
        const roles = Array.isArray(user.roles) ? user.roles : ['user'];

        // Convert from domain entity to database format (camelCase to snake_case)
        return {
            id: user.id,
            email: user.email,
            // Split fullName back into first/last if your DB requires it
            // Or store fullName directly if DB schema allows
            full_name: user.fullName, 
            // first_name: user.firstName, // Uncomment if needed
            // last_name: user.lastName, // Uncomment if needed
            display_name: user.displayName,
            profile_image_url: user.profileImageUrl,
            professional_title: user.professionalTitle,
            location: user.location,
            country: user.country,
            focus_area: user.focusArea, 
            difficulty_level: user.difficultyLevel, // Map difficulty level
            focus_area_thread_id: user.focusAreaThreadId,
            challenge_thread_id: user.challengeThreadId,
            evaluation_thread_id: user.evaluationThreadId,
            personality_thread_id: user.personalityThreadId,
            status: user.status,
            onboarding_completed: user.onboardingCompleted,
            last_login_at: user.lastLoginAt instanceof Date ? user.lastLoginAt.toISOString() : user.lastLoginAt,
            preferences: preferences, // Store as JSONB/TEXT
            focus_areas: focusAreas, // Store as JSONB/TEXT
            roles: roles, // Store as JSONB/TEXT or array type
            created_at: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
            updated_at: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
            last_active: user.lastActive instanceof Date ? user.lastActive.toISOString() : user.lastActive,
        };
    }
    /**
     * Convert an array of database records to User domain entities
     * @param {Array<Object>} dataArray - Array of database records
     * @param {Object} options - Additional options to pass to each User constructor
     * @returns {Array<User>} Array of User domain entities
     */
    toDomainCollection(dataArray, options = {}) {
        if (!Array.isArray(dataArray)) {
            return [];
        }
        return dataArray.map(data => this.toDomain(data, options)).filter(user => user !== null);
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
        return users.map(user => this.toPersistence(user)).filter(data => data !== null);
    }
}
export default new UserMapper();
