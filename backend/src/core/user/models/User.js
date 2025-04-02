import { userSchema, difficultyLevelSchema } from "#app/core/user/schemas/userSchema.js";
import { Email, FocusArea } from "#app/core/common/valueObjects/index.js";
import { UserValidationError, UserInvalidStateError } from "#app/core/user/errors/UserErrors.js";
import Entity from "#app/core/common/models/Entity.js";
import { v4 as uuidv4 } from 'uuid';
'use strict';
/**
 * User domain model
 *
 * This model represents a user in the system and encapsulates user-specific behavior.
 * Uses Zod for data validation to ensure integrity.
 * Personality data is now managed by the personality domain.
 */
/**
 * User domain entity
 */
class User extends Entity {
    /**
     * Create a user instance
     * @param {Object} data - User data including id, email, fullName, and other user properties
     * @param {Object} options - Additional options (e.g., injected eventBus)
     * @param {Object} options.eventBus - The event bus instance (optional for adding events)
     * @param {Object} options.EventTypes - The EventTypes constant (optional for adding events)
     * @throws {UserValidationError} If the provided data fails validation
     */
    constructor(data = {}, options = {}) {
        super(data.id || uuidv4());

        const userData = {
            id: this.id,
            email: data.email || '',
            fullName: data.fullName || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            displayName: data.displayName || '',
            profileImageUrl: data.profileImageUrl || null,
            professionalTitle: data.professionalTitle || '',
            location: data.location || '',
            country: data.country || '',
            focusArea: data.focusArea || '',
            focusAreaThreadId: data.focusAreaThreadId || '',
            challengeThreadId: data.challengeThreadId || '',
            evaluationThreadId: data.evaluationThreadId || '',
            personalityThreadId: data.personalityThreadId || '',
            lastActive: data.lastActive ? new Date(data.lastActive) : null,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
            preferences: data.preferences || {},
            status: data.status || 'active',
            roles: Array.isArray(data.roles) ? data.roles : ['user'],
            onboardingCompleted: data.onboardingCompleted || false,
            lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt) : null,
            difficultyLevel: data.difficultyLevel || null,
        };
        
        // Parse and validate with zod, using safeParse to handle errors
        const result = userSchema.safeParse(userData);
        if (result.success) {
            Object.assign(this, result.data);
        }
        else {
            // Throw validation error with details
            const errorMessage = `User data validation failed: ${result.error.message}`;
            throw new UserValidationError(errorMessage, {
                validationErrors: result.error.flatten(),
            });
        }
        
        // Convert email to Email value object if valid
        if (this.email && Email.isValid(this.email)) {
            this._emailVO = new Email(this.email);
        }
        // Convert focusArea to FocusArea value object if valid
        if (this.focusArea && FocusArea.isValid(this.focusArea)) {
            this._focusAreaVO = new FocusArea(this.focusArea);
        }
        // Store event bus instance if provided
        this.eventBus = options.eventBus;
        this.EventTypes = options.EventTypes;
        // Initialize domain events array
        this._domainEvents = [];
        // Enforce invariants on creation
        this._enforceInvariants();
    }
    /**
     * Add a domain event to be published later
     * @param {string} eventType - Event type string
     * @param {Object} eventData - Event data payload
     */
    addDomainEvent(eventType, eventData) {
        // Use EventTypes passed via constructor/options if available
        if (!this.EventTypes || !this.EventTypes[eventType]) {
            // Attempt to dynamically get EventTypes if not passed initially
            // This is a fallback and not ideal - better to ensure it's passed.
            try {
                const { EventTypes: dynamicEventTypes } = require("#app/core/common/events/eventTypes.js");
                this.EventTypes = dynamicEventTypes;
                if (!this.EventTypes || !this.EventTypes[eventType]) {
                   console.warn(`[User Model] Unknown eventType constant used: ${eventType}. Cannot validate.`);
                   // Proceed without validation if type constant unknown, or throw error?
                }
            } catch (err) {
                 console.error(`[User Model] Failed to dynamically load EventTypes for validation`, err);
            }
        }
        
        if (!this._domainEvents) {
            this._domainEvents = [];
        }
        
        // Create a standardized event structure
        const event = {
            type: eventType,
            data: {
                ...eventData,
                // Always include entity identifiers
                userId: this.id, // Include userId for user-related events
                entityId: this.id,
                entityType: 'User',
            },
            metadata: {
                timestamp: new Date().toISOString(),
                correlationId: `user-${this.id}-${Date.now()}`
            }
        };
        
        this._domainEvents.push(event);
    }
    /**
     * Get all collected domain events
     * @returns {Array} Array of domain events
     */
    getDomainEvents() {
        return this._domainEvents || [];
    }
    /**
     * Clear all collected domain events
     */
    clearDomainEvents() {
        this._domainEvents = [];
    }
    /**
     * Enforce domain invariants
     * @private
     */
    _enforceInvariants() {
        // Email is required and must be valid
        if (!this.email) {
            throw new UserValidationError('User must have an email address');
        }
        if (!this._emailVO) {
            try {
                this._emailVO = new Email(this.email);
            }
            catch (error) {
                throw new UserValidationError(`Invalid email address: ${this.email}`);
            }
        }
        // User must have a valid status
        const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
        if (!validStatuses.includes(this.status)) {
            throw new UserValidationError(`Invalid user status: ${this.status}`);
        }
        // User must have valid roles array
        if (!Array.isArray(this.roles) || this.roles.length === 0) {
            throw new UserValidationError('User must have at least one role');
        }
        // If onboarding is completed, focus area must be set
        if (this.onboardingCompleted && !this.focusArea) {
            throw new UserInvalidStateError('User with completed onboarding must have a focus area');
        }
        // User with inactive status should not have lastActive time in the future
        if (this.status === 'inactive' && this.lastActive) {
            const lastActiveDate = new Date(this.lastActive);
            const now = new Date();
            if (lastActiveDate > now) {
                throw new UserInvalidStateError('Inactive user cannot have future lastActive timestamp');
            }
        }
    }
    /**
     * Get email as a value object
     * @returns {Email|null} Email value object or null if invalid
     */
    get emailVO() {
        if (!this._emailVO && this.email && Email.isValid(this.email)) {
            this._emailVO = new Email(this.email);
        }
        return this._emailVO || null;
    }
    /**
     * Get focus area as a value object
     * @returns {FocusArea|null} FocusArea value object or null if invalid/not set
     */
    get focusAreaVO() {
        if (!this._focusAreaVO && this.focusArea) {
            try {
                this._focusAreaVO = new FocusArea(this.focusArea);
            }
            catch (error) {
                // If focus area is invalid, return null
                return null;
            }
        }
        return this._focusAreaVO || null;
    }
    /**
     * Validate the user model
     * @returns {Object} Validation result with isValid and errors properties
     */
    validate() {
        const result = userSchema.safeParse(this);
        if (result.success) {
            return {
                isValid: true,
                errors: [],
            };
        }
        else {
            // Extract error messages from Zod validation result
            const errorMessages = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
            return {
                isValid: false,
                errors: errorMessages,
            };
        }
    }
    /**
     * Check if this is a valid user with all required fields
     * @returns {boolean} True if the user is valid
     */
    isValid() {
        return this.validate().isValid;
    }
    /**
     * Check if the user has completed onboarding
     * @returns {boolean} True if onboarding is completed
     */
    hasCompletedOnboarding() {
        return this.onboardingCompleted === true;
    }
    /**
     * Mark onboarding as completed
     * @returns {User} This user instance for chaining
     * @throws {UserInvalidStateError} If user cannot complete onboarding
     */
    completeOnboarding() {
        // Check if we can set onboarding as completed
        if (!this.focusArea) {
            throw new UserInvalidStateError('Cannot complete onboarding without a focus area');
        }
        this.onboardingCompleted = true;
        this.updatedAt = new Date().toISOString();
        // Record domain event for onboarding completion
        if (this.id && this.EventTypes) {
            this.addDomainEvent(this.EventTypes.USER_ONBOARDING_COMPLETED, {
                userId: this.id,
                timestamp: this.updatedAt,
            });
        }
        return this;
    }
    /**
     * Check if user has a specific role
     * @param {string} role - Role to check
     * @returns {boolean} True if user has the role
     */
    hasRole(role) {
        return Array.isArray(this.roles) && this.roles.includes(role);
    }
    /**
     * Add a role to the user
     * @param {string} role - Role to add
     * @returns {User} This user instance for chaining
     * @throws {UserValidationError} If role is invalid
     */
    addRole(role) {
        if (!role || typeof role !== 'string') {
            throw new UserValidationError('Role must be a non-empty string');
        }
        if (!Array.isArray(this.roles)) {
            this.roles = [];
        }
        if (!this.roles.includes(role)) {
            this.roles.push(role);
            this.updatedAt = new Date().toISOString();
            // Record domain event for role assignment
            if (this.id && this.EventTypes) {
                this.addDomainEvent(this.EventTypes.USER_ROLE_ASSIGNED, {
                    userId: this.id,
                    role,
                    timestamp: this.updatedAt,
                });
            }
        }
        return this;
    }
    /**
     * Remove a role from the user
     * @param {string} role - Role to remove
     * @returns {User} This user instance for chaining
     * @throws {UserInvalidStateError} If removing the role would leave the user with no roles
     */
    removeRole(role) {
        if (!Array.isArray(this.roles)) {
            return this;
        }
        // Prevent removing the last role
        if (this.roles.length === 1 && this.roles.includes(role)) {
            throw new UserInvalidStateError('Cannot remove the only role from a user');
        }
        if (this.roles.includes(role)) {
            this.roles = this.roles.filter(r => r !== role);
            this.updatedAt = new Date().toISOString();
            // Record domain event for role removal
            if (this.id && this.EventTypes) {
                this.addDomainEvent(this.EventTypes.USER_ROLE_REMOVED, {
                    userId: this.id,
                    role,
                    timestamp: this.updatedAt,
                });
            }
        }
        return this;
    }
    /**
     * Check if the user account is active
     * @returns {boolean} True if the account is active
     */
    isActive() {
        return this.status === 'active';
    }
    /**
     * Activate the user account
     * @returns {User} This user instance for chaining
     */
    activate() {
        if (this.status !== 'active') {
            const previousStatus = this.status;
            this.status = 'active';
            this.updatedAt = new Date().toISOString();
            // Record domain event for account activation
            if (this.id && this.EventTypes) {
                this.addDomainEvent(this.EventTypes.USER_ACTIVATED, {
                    userId: this.id,
                    previousStatus,
                    timestamp: this.updatedAt,
                });
            }
        }
        // Enforce invariants after state change
        this._enforceInvariants();
        return this;
    }
    /**
     * Deactivate the user account
     * @returns {User} This user instance for chaining
     */
    deactivate() {
        if (this.status !== 'inactive') {
            const previousStatus = this.status;
            this.status = 'inactive';
            this.updatedAt = new Date().toISOString();
            // Record domain event for account deactivation
            if (this.id && this.EventTypes) {
                this.addDomainEvent(this.EventTypes.USER_DEACTIVATED, {
                    userId: this.id,
                    previousStatus,
                    timestamp: this.updatedAt,
                });
            }
        }
        // Enforce invariants after state change
        this._enforceInvariants();
        return this;
    }
    /**
     * Record a user login
     * @returns {User} This user instance for chaining
     * @throws {UserInvalidStateError} If user is not active
     */
    recordLogin() {
        // Only active users can log in
        if (!this.isActive()) {
            throw new UserInvalidStateError('Cannot record login for inactive user');
        }
        this.lastLoginAt = new Date().toISOString();
        this.lastActive = this.lastLoginAt;
        this.updatedAt = this.lastLoginAt;
        // Record domain event for user login
        if (this.id && this.EventTypes) {
            this.addDomainEvent(this.EventTypes.USER_LOGGED_IN, {
                userId: this.id,
                timestamp: this.lastLoginAt,
            });
        }
        return this;
    }
    /**
     * Update user preference
     * @param {string} key - Preference key
     * @param {any} value - Preference value
     * @returns {User} This user instance for chaining
     * @throws {UserValidationError} If preference key is invalid
     */
    setPreference(key, value) {
        if (!key || typeof key !== 'string') {
            throw new UserValidationError('Preference key must be a non-empty string');
        }
        if (!this.preferences) {
            this.preferences = {};
        }
        this.preferences[key] = value;
        this.updatedAt = new Date().toISOString();
        // Record domain event for preference update
        if (this.id && this.EventTypes) {
            this.addDomainEvent(this.EventTypes.USER_PREFERENCES_UPDATED, {
                userId: this.id,
                key,
                timestamp: this.updatedAt,
            });
        }
        return this;
    }
    /**
     * Get user preference
     * @param {string} key - Preference key
     * @param {any} defaultValue - Default value if preference not found
     * @returns {any} Preference value or defaultValue if not found
     */
    getPreference(key, defaultValue = null) {
        if (!key || !this.preferences) {
            return defaultValue;
        }
        return this.preferences[key] !== undefined ? this.preferences[key] : defaultValue;
    }
    /**
     * Update AI interaction preferences
     * @param {Object} aiInteractionPreferences - AI interaction preferences
     * @returns {User} This user instance for chaining
     */
    updateAIPreferences(aiInteractionPreferences) {
        if (!aiInteractionPreferences || typeof aiInteractionPreferences !== 'object') {
            return this;
        }
        if (!this.preferences) {
            this.preferences = {};
        }
        if (!this.preferences.ai) {
            this.preferences.ai = {};
        }
        // Update AI preferences
        this.preferences.ai = {
            ...this.preferences.ai,
            ...aiInteractionPreferences,
        };
        this.updatedAt = new Date().toISOString();
        // Record domain event for AI preferences update
        if (this.id && this.EventTypes) {
            this.addDomainEvent(this.EventTypes.USER_AI_PREFERENCES_UPDATED, {
                userId: this.id,
                timestamp: this.updatedAt,
            });
        }
        return this;
    }
    /**
     * Update user's last activity timestamp
     * @returns {User} This user instance for chaining
     */
    updateActivity() {
        this.lastActive = new Date().toISOString();
        this.updatedAt = this.lastActive;
        return this;
    }
    /**
     * Set user's focus area
     * @param {string} focusArea - Focus area code
     * @param {string} threadId - Thread ID for focus area conversation
     * @returns {User} This user instance for chaining
     */
    setFocusArea(focusArea, threadId = null) {
        if (!focusArea) {
            return this;
        }
        try {
            // Validate focus area using value object
            const focusAreaVO = new FocusArea(focusArea);
            const previousFocusArea = this.focusArea;
            this.focusArea = focusAreaVO.code;
            this._focusAreaVO = focusAreaVO;
            if (threadId) {
                this.focusAreaThreadId = threadId;
            }
            this.updatedAt = new Date().toISOString();
            // Record domain event for focus area change
            if (this.id && this.focusArea !== previousFocusArea && this.EventTypes) {
                this.addDomainEvent(this.EventTypes.USER_FOCUS_AREA_CHANGED, {
                    userId: this.id,
                    previousFocusArea,
                    newFocusArea: this.focusArea,
                    timestamp: this.updatedAt,
                });
            }
        }
        catch (error) {
            throw new UserValidationError(`Invalid focus area: ${error.message}`);
        }
        return this;
    }
    /**
     * Update user profile
     * @param {Object} updates - Profile updates
     * @returns {User} This user instance for chaining
     */
    updateProfile(updates = {}) {
        // Only allow updating specific fields
        const allowedUpdates = ['fullName', 'professionalTitle', 'location', 'country'];
        let hasChanges = false;
        // Apply allowed updates
        for (const field of allowedUpdates) {
            if (updates[field] !== undefined && updates[field] !== this[field]) {
                this[field] = updates[field];
                hasChanges = true;
            }
        }
        if (hasChanges) {
            this.updatedAt = new Date().toISOString();
            // Record domain event for profile update
            if (this.id && this.EventTypes) {
                this.addDomainEvent(this.EventTypes.USER_PROFILE_UPDATED, {
                    userId: this.id,
                    updatedFields: Object.keys(updates).filter(k => allowedUpdates.includes(k)),
                    timestamp: this.updatedAt,
                });
            }
        }
        return this;
    }
    /**
     * Set the user's difficulty level
     * @param {string} level - The new difficulty level code (e.g., 'beginner', 'intermediate', 'advanced')
     * @returns {User} This user instance for chaining
     * @throws {UserValidationError} If the level is invalid
     */
    setDifficultyLevel(level) {
        // Validate the level against the allowed schema
        const validationResult = difficultyLevelSchema.safeParse(level);
        if (!validationResult.success) {
            throw new UserValidationError(`Invalid difficulty level: ${level}. Must be one of ${difficultyLevelSchema.options.join(', ')}`);
        }

        const previousLevel = this.difficultyLevel;
        if (previousLevel !== level) {
            this.difficultyLevel = level;
            this.updatedAt = new Date().toISOString();
            // Record domain event for difficulty change
            if (this.id && this.EventTypes) {
                this.addDomainEvent(this.EventTypes.USER_DIFFICULTY_CHANGED, {
                    userId: this.id,
                    previousLevel: previousLevel,
                    newLevel: level,
                    timestamp: this.updatedAt,
                });
            }
        }
        return this;
    }
}
export default User;
