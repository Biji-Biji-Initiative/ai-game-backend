'use strict';

/**
 * Event Payload Structures
 * 
 * This module defines the structure of different event payloads
 * to ensure consistent event data across the application.
 */

/**
 * Personality event payload structures
 */
export const PersonalityEventPayloads = {
  /**
   * Personality profile updated event payload
   * @typedef {Object} PersonalityProfileUpdatedPayload
   * @property {string} userId - ID of the user whose profile was updated
   * @property {string} updateType - Type of update (e.g., 'attitudes', 'traits')
   * @property {Object} [aiAttitudes] - Updated AI attitudes (required for 'attitudes' updateType)
   * @property {Object} [personalityTraits] - Updated personality traits (required for 'traits' updateType)
   * @property {string} [profileId] - ID of the personality profile
   * @property {Date|string} timestamp - When the update occurred
   */
  
  /**
   * Validate a personality profile updated payload
   * @param {Object} payload - Payload to validate
   * @param {string} updateType - Expected update type
   * @returns {boolean} True if payload is valid for the specified update type
   */
  validateProfileUpdatedPayload(payload, updateType) {
    if (!payload || typeof payload !== 'object') return false;
    if (!payload.userId || typeof payload.userId !== 'string') return false;
    if (payload.updateType !== updateType) return false;
    
    // Update type specific validation
    switch (updateType) {
      case 'attitudes':
        return payload.aiAttitudes && typeof payload.aiAttitudes === 'object';
      case 'traits':
        return payload.personalityTraits && typeof payload.personalityTraits === 'object';
      default:
        return true; // Other update types may not have specific required fields
    }
  }
};

/**
 * User event payload structures
 */
export const UserEventPayloads = {
  /**
   * User preferences updated event payload
   * @typedef {Object} UserPreferencesUpdatedPayload
   * @property {string} userId - ID of the user whose preferences were updated
   * @property {Object} preferences - Updated user preferences
   * @property {string[]} [updatedFields] - List of fields that were updated
   * @property {Date|string} timestamp - When the update occurred
   */
  
  /**
   * Validate a user preferences updated payload
   * @param {Object} payload - Payload to validate
   * @returns {boolean} True if payload is valid
   */
  validatePreferencesUpdatedPayload(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (!payload.userId || typeof payload.userId !== 'string') return false;
    if (!payload.preferences || typeof payload.preferences !== 'object') return false;
    
    return true;
  }
};

export default {
  PersonalityEventPayloads,
  UserEventPayloads
}; 