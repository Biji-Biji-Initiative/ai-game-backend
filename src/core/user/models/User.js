/**
 * User domain model
 * 
 * This model represents a user in the system and encapsulates user-specific behavior.
 * Uses Zod for data validation to ensure integrity.
 * Personality data is now managed by the personality domain.
 */

const domainEvents = require('../../shared/domainEvents');
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
      role: data.role || 'user',
      location: data.location || '',
      country: data.country || '',
      focusArea: data.focus_area || data.focusArea || '',
      lastActive: data.last_active || data.lastActive || null,
      createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      updatedAt: data.updated_at || data.updatedAt || new Date().toISOString(),
      focusAreaThreadId: data.focus_area_thread_id || data.focusAreaThreadId || '',
      challengeThreadId: data.challenge_thread_id || data.challengeThreadId || '',
      evaluationThreadId: data.evaluation_thread_id || data.evaluationThreadId || '',
      personalityThreadId: data.personality_thread_id || data.personalityThreadId || ''
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
   * Check if the user is an admin
   * @returns {boolean} True if the user is an admin
   */
  isAdmin() {
    return this.role === 'admin';
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
   * Convert user data to format suitable for database storage
   * @returns {Object} Database-formatted user data
   */
  toDatabase() {
    return toDatabase(this);
  }

  /**
   * Update user activity timestamp
   */
  updateActivity() {
    this.lastActive = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Set user's focus area
   * @param {string} focusArea - The focus area to set
   * @param {string} threadId - Optional thread ID for the focus area generation
   */
  setFocusArea(focusArea, threadId = null) {
    const previousFocusArea = this.focusArea;
    this.focusArea = focusArea;
    if (threadId) this.focusAreaThreadId = threadId;
    this.updatedAt = new Date().toISOString();
    
    // Publish domain event for focus area change
    if (this.id && this.focusArea !== previousFocusArea) {
      domainEvents.publish('UserFocusAreaChanged', {
        userId: this.id,
        previousFocusArea,
        newFocusArea: this.focusArea,
        threadId: this.focusAreaThreadId
      });
    }
  }
  
  /**
   * Update user profile information
   * @param {Object} updates - The profile updates to apply
   */
  updateProfile(updates = {}) {
    // Apply updates to user fields only
    const allowedFields = [
      'fullName', 'professionalTitle', 'location', 'country', 
      'role', 'focusArea', 'focusAreaThreadId', 'challengeThreadId',
      'evaluationThreadId', 'personalityThreadId'
    ];
    
    const filteredUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });
      
    // Apply updates
    Object.assign(this, filteredUpdates);
    
    this.updatedAt = new Date().toISOString();
    
    // Publish domain event for profile update
    if (this.id) {
      domainEvents.publish('UserProfileUpdated', {
        userId: this.id,
        updatedFields: Object.keys(filteredUpdates)
      });
    }
  }
}

module.exports = User; 