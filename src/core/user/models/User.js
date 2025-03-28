/**
 * User domain model
 * 
 * This model represents a user in the system and encapsulates user-specific behavior.
 * Uses Zod for data validation to ensure integrity.
 * Personality data is now managed by the personality domain.
 */

const { EventTypes, eventBus } = require('../../common/events/domainEvents');
const { userSchema, toDatabase } = require('../schemas/userSchema');

class User {
  /**
   * Create a user instance
   * @param {Object} data - User data
   */
  constructor(data = {}) {
    const userData = {
      id: data.id || null,
      email: data.email || '',
      fullName: data.full_name || data.fullName || '',
      professionalTitle: data.professional_title || data.professionalTitle || '',
      location: data.location || '',
      country: data.country || '',
      focusArea: data.focus_area || data.focusArea || '',
      lastActive: data.last_active || data.lastActive || null,
      createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      updatedAt: data.updated_at || data.updatedAt || new Date().toISOString(),
      focusAreaThreadId: data.focus_area_thread_id || data.focusAreaThreadId || '',
      challengeThreadId: data.challenge_thread_id || data.challengeThreadId || '',
      evaluationThreadId: data.evaluation_thread_id || data.evaluationThreadId || '',
      personalityThreadId: data.personality_thread_id || data.personalityThreadId || '',
      preferences: data.preferences || {},
      status: data.status || 'active',
      roles: data.roles || ['user'],
      onboardingCompleted: data.onboarding_completed || data.onboardingCompleted || false,
      lastLoginAt: data.last_login_at || data.lastLoginAt || null
    };

    // Parse and validate with zod, using safeParse to handle errors
    const result = userSchema.safeParse(userData);
    
    if (result.success) {
      Object.assign(this, result.data);
    } else {
      // Still assign the data but log validation issues
      Object.assign(this, userData);
      console.warn('User data validation warning:', result.error.message);
    }
    
    // Subscribe to relevant personality domain events
    this._subscribeToPersonalityEvents();
  }
  
  /**
   * Subscribe to personality domain events
   * @private
   */
  _subscribeToPersonalityEvents() {
    // No need to do anything here as the User service will handle the events
    // This method is kept as a placeholder for documentation purposes
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
        errors: []
      };
    } else {
      // Extract error messages from Zod validation result
      const errorMessages = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      
      return {
        isValid: false,
        errors: errorMessages
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
   */
  completeOnboarding() {
    this.onboardingCompleted = true;
    this.updatedAt = new Date().toISOString();
    
    // Publish domain event for onboarding completion
    if (this.id) {
      eventBus.publishEvent(EventTypes.USER_ONBOARDING_COMPLETED, {
        userId: this.id,
        timestamp: this.updatedAt
      });
    }
    
    return this;
  }

  /**
   * Check if the user has a specific role
   * @param {string} role - Role to check
   * @returns {boolean} True if the user has the role
   */
  hasRole(role) {
    return Array.isArray(this.roles) && this.roles.includes(role);
  }

  /**
   * Add a role to the user
   * @param {string} role - Role to add
   * @returns {User} This user instance for chaining
   */
  addRole(role) {
    if (!role || typeof role !== 'string') {
      throw new Error('Role must be a non-empty string');
    }
    
    if (!Array.isArray(this.roles)) {
      this.roles = [];
    }
    
    if (!this.roles.includes(role)) {
      this.roles.push(role);
      this.updatedAt = new Date().toISOString();
      
      // Publish domain event for role assignment
      if (this.id) {
        eventBus.publishEvent(EventTypes.USER_ROLE_ASSIGNED, {
          userId: this.id,
          role,
          timestamp: this.updatedAt
        });
      }
    }
    
    return this;
  }

  /**
   * Remove a role from the user
   * @param {string} role - Role to remove
   * @returns {User} This user instance for chaining
   */
  removeRole(role) {
    if (Array.isArray(this.roles) && this.roles.includes(role)) {
      this.roles = this.roles.filter(r => r !== role);
      this.updatedAt = new Date().toISOString();
      
      // Publish domain event for role removal
      if (this.id) {
        eventBus.publishEvent(EventTypes.USER_ROLE_REMOVED, {
          userId: this.id,
          role,
          timestamp: this.updatedAt
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
      
      // Publish domain event for account activation
      if (this.id) {
        eventBus.publishEvent(EventTypes.USER_ACTIVATED, {
          userId: this.id,
          previousStatus,
          timestamp: this.updatedAt
        });
      }
    }
    
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
      
      // Publish domain event for account deactivation
      if (this.id) {
        eventBus.publishEvent(EventTypes.USER_DEACTIVATED, {
          userId: this.id,
          previousStatus,
          timestamp: this.updatedAt
        });
      }
    }
    
    return this;
  }

  /**
   * Record a user login
   * @returns {User} This user instance for chaining
   */
  recordLogin() {
    this.lastLoginAt = new Date().toISOString();
    this.lastActive = this.lastLoginAt;
    this.updatedAt = this.lastLoginAt;
    
    // Publish domain event for user login
    if (this.id) {
      eventBus.publishEvent(EventTypes.USER_LOGGED_IN, {
        userId: this.id,
        timestamp: this.lastLoginAt
      });
    }
    
    return this;
  }

  /**
   * Update user preference
   * @param {string} key - Preference key
   * @param {any} value - Preference value
   * @returns {User} This user instance for chaining
   */
  setPreference(key, value) {
    if (!key || typeof key !== 'string') {
      throw new Error('Preference key must be a non-empty string');
    }
    
    if (!this.preferences) {
      this.preferences = {};
    }
    
    this.preferences[key] = value;
    this.updatedAt = new Date().toISOString();
    
    return this;
  }

  /**
   * Get user preference
   * @param {string} key - Preference key
   * @param {any} defaultValue - Default value if preference not found
   * @returns {any} Preference value or default
   */
  getPreference(key, defaultValue = null) {
    if (!this.preferences || !this.preferences[key]) {
      return defaultValue;
    }
    
    return this.preferences[key];
  }

  /**
   * Update AI interaction preferences
   * @param {Object} aiInteractionPreferences - The AI interaction preferences to set
   * @returns {User} This user instance for chaining
   */
  updateAIPreferences(aiInteractionPreferences) {
    if (!aiInteractionPreferences || typeof aiInteractionPreferences !== 'object') {
      throw new Error('AI interaction preferences must be a valid object');
    }
    
    // Initialize preferences object if it doesn't exist
    if (!this.preferences) {
      this.preferences = {};
    }
    
    // Initialize AI interaction preferences if they don't exist
    if (!this.preferences.aiInteraction) {
      this.preferences.aiInteraction = {};
    }
    
    // Update AI interaction preferences
    this.preferences.aiInteraction = {
      ...this.preferences.aiInteraction,
      ...aiInteractionPreferences
    };
    
    this.updatedAt = new Date().toISOString();
    
    // Publish domain event for preference update
    if (this.id) {
      eventBus.publishEvent(EventTypes.USER_PREFERENCES_UPDATED, {
        userId: this.id,
        preferencesUpdated: 'aiInteraction',
        timestamp: this.updatedAt
      });
    }
    
    return this;
  }

  /**
   * Convert user data to format suitable for database storage
   * @returns {Object} Database-formatted user data
   */
  toDatabase() {
    return toDatabase(this);
  }

  /**
   * Update user activity timestamp
   * @returns {User} This user instance for chaining
   */
  updateActivity() {
    this.lastActive = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Set user's focus area
   * @param {string} focusArea - The focus area to set
   * @param {string} threadId - Optional thread ID for the focus area generation
   * @returns {User} This user instance for chaining
   */
  setFocusArea(focusArea, threadId = null) {
    const previousFocusArea = this.focusArea;
    this.focusArea = focusArea;
    if (threadId) this.focusAreaThreadId = threadId;
    this.updatedAt = new Date().toISOString();
    
    // Publish domain event for focus area change
    if (this.id && this.focusArea !== previousFocusArea) {
      eventBus.publishEvent(EventTypes.USER_FOCUS_AREA_SET, {
        userId: this.id,
        previousFocusArea,
        newFocusArea: this.focusArea,
        threadId: this.focusAreaThreadId
      });
    }
    
    return this;
  }
  
  /**
   * Update user profile information
   * @param {Object} updates - The profile updates to apply
   * @returns {User} This user instance for chaining
   */
  updateProfile(updates = {}) {
    // Apply updates to user fields only
    const allowedFields = [
      'fullName', 'professionalTitle', 'location', 'country', 
      'focusArea', 'focusAreaThreadId', 'challengeThreadId',
      'evaluationThreadId', 'personalityThreadId',
      'preferences'
    ];
    
    const filteredUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });
    
    // Map API fields to domain model fields
    if (updates.name) filteredUpdates.fullName = updates.name;
      
    // Apply updates
    Object.assign(this, filteredUpdates);
    
    this.updatedAt = new Date().toISOString();
    
    // Publish domain event for profile update
    if (this.id) {
      eventBus.publishEvent(EventTypes.USER_UPDATED, {
        userId: this.id,
        updatedFields: Object.keys(filteredUpdates)
      });
    }
    
    return this;
  }
  
  /**
   * Create a User instance from database data
   * @param {Object} data - User data from database
   * @returns {User} User instance
   */
  static fromDatabase(data) {
    if (!data) {
      throw new Error('Database data is required to create User instance');
    }
    
    return new User(data);
  }
}

module.exports = User; 