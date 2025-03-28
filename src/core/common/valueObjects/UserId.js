/**
 * UserId Value Object
 * 
 * Represents and validates user identifiers in the system.
 * A UserId can be a UUID or an email address.
 * Follows Value Object pattern - immutable and defined by its value.
 */

const Email = require('./Email');
const { validate: uuidValidate } = require('uuid');

class UserId {
  /**
   * Create a new UserId value object
   * @param {string} value - User identifier
   * @throws {Error} If the user ID is invalid
   */
  constructor(value) {
    if (!value) {
      throw new Error('UserId cannot be empty');
    }
    
    if (!UserId.isValid(value)) {
      throw new Error(`Invalid UserId format: ${value}`);
    }
    
    this._value = value;
    
    // Determine if this is an email or UUID type
    this._isEmail = Email.isValid(value);
    
    Object.freeze(this);
  }
  
  /**
   * Get the user ID value
   * @returns {string} User ID
   */
  get value() {
    return this._value;
  }
  
  /**
   * Check if the user ID is in email format
   * @returns {boolean} True if ID is an email
   */
  get isEmail() {
    return this._isEmail;
  }
  
  /**
   * Check if the user ID is in UUID format
   * @returns {boolean} True if ID is a UUID
   */
  get isUuid() {
    return !this._isEmail;
  }
  
  /**
   * Check if two UserId objects are equal
   * @param {UserId} other - Another UserId object to compare
   * @returns {boolean} True if IDs are equal
   */
  equals(other) {
    if (!(other instanceof UserId)) {
      return false;
    }
    return this.value === other.value;
  }
  
  /**
   * Validate user ID format (either valid email or UUID)
   * @param {string} userId - User ID to validate
   * @returns {boolean} True if the ID format is valid
   */
  static isValid(userId) {
    if (!userId || typeof userId !== 'string') {
      return false;
    }
    
    // Check if it's a valid email
    if (Email.isValid(userId)) {
      return true;
    }
    
    // Check if it's a valid UUID
    return uuidValidate(userId);
  }
  
  /**
   * Create a UserId object from a string
   * @param {string} userId - User ID string
   * @returns {UserId|null} UserId object or null if invalid
   */
  static create(userId) {
    try {
      return new UserId(userId);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Convert to string representation
   * @returns {string} String representation
   */
  toString() {
    return this._value;
  }
  
  /**
   * Convert to primitive value when serializing
   * @returns {string} The user ID value
   */
  toJSON() {
    return this._value;
  }
}

module.exports = UserId; 