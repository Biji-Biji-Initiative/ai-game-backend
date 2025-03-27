/**
 * User domain model
 * 
 * This model represents a user in the system and encapsulates user-specific behavior.
 */

const domainEvents = require('../../shared/domainEvents');

class User {
  /**
   * Create a user instance
   * @param {Object} data - User data
   */
  constructor(data = {}) {
    this.id = data.id || null;
    this.email = data.email || '';
    this.fullName = data.full_name || data.fullName || '';
    this.professionalTitle = data.professional_title || data.professionalTitle || '';
    this.role = data.role || 'user';
    this.location = data.location || '';
    this.country = data.country || '';
    this.personalityTraits = data.personality_traits || data.personalityTraits || {};
    this.aiAttitudes = data.ai_attitudes || data.aiAttitudes || {};
    this.focusArea = data.focus_area || data.focusArea || '';
    this.lastActive = data.last_active || data.lastActive || null;
    this.createdAt = data.created_at || data.createdAt || new Date().toISOString();
    this.updatedAt = data.updated_at || data.updatedAt || new Date().toISOString();
    this.focusAreaThreadId = data.focus_area_thread_id || data.focusAreaThreadId || '';
    this.challengeThreadId = data.challenge_thread_id || data.challengeThreadId || '';
    this.evaluationThreadId = data.evaluation_thread_id || data.evaluationThreadId || '';
    this.personalityThreadId = data.personality_thread_id || data.personalityThreadId || '';
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
    const errors = [];

    // Required fields
    if (!this.email) errors.push('Email is required');
    if (!this.fullName) errors.push('Full name is required');

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.email && !emailRegex.test(this.email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert user data to format suitable for database storage
   * @returns {Object} Database-formatted user data
   */
  toDatabase() {
    return {
      id: this.id,
      email: this.email,
      full_name: this.fullName,
      professional_title: this.professionalTitle,
      role: this.role,
      location: this.location,
      country: this.country,
      personality_traits: this.personalityTraits,
      ai_attitudes: this.aiAttitudes,
      focus_area: this.focusArea,
      last_active: this.lastActive,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      focus_area_thread_id: this.focusAreaThreadId,
      challenge_thread_id: this.challengeThreadId,
      evaluation_thread_id: this.evaluationThreadId,
      personality_thread_id: this.personalityThreadId
    };
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
    // Track if personality traits were updated
    const personalityUpdated = updates.personalityTraits && 
      JSON.stringify(updates.personalityTraits) !== JSON.stringify(this.personalityTraits);
      
    // Apply updates
    Object.keys(updates).forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key] = updates[key];
      }
    });
    
    this.updatedAt = new Date().toISOString();
    
    // Publish domain event for profile update
    if (this.id) {
      domainEvents.publish('UserProfileUpdated', {
        userId: this.id,
        updatedFields: Object.keys(updates)
      });
      
      // If personality traits were updated, publish a specific event
      if (personalityUpdated) {
        domainEvents.publish('UserTraitsUpdated', {
          userId: this.id,
          traits: this.personalityTraits
        });
      }
    }
  }
}

module.exports = User; 