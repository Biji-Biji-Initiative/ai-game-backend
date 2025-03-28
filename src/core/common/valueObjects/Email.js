/**
 * Email Value Object
 * 
 * Represents and validates email addresses in the system.
 * Follows Value Object pattern - immutable and defined by its value.
 */

class Email {
  /**
   * Create a new Email value object
   * @param {string} value - Email address
   * @throws {Error} If the email is invalid
   */
  constructor(value) {
    if (!value) {
      throw new Error('Email cannot be empty');
    }
    
    if (!Email.isValid(value)) {
      throw new Error(`Invalid email format: ${value}`);
    }
    
    this._value = value.toLowerCase().trim();
    Object.freeze(this);
  }
  
  /**
   * Get the email value
   * @returns {string} Email address
   */
  get value() {
    return this._value;
  }
  
  /**
   * Get the domain part of the email
   * @returns {string} Domain part of the email
   */
  get domain() {
    return this._value.split('@')[1];
  }
  
  /**
   * Get the local part of the email (before @)
   * @returns {string} Local part of the email
   */
  get localPart() {
    return this._value.split('@')[0];
  }
  
  /**
   * Check if two Email objects are equal
   * @param {Email} other - Another Email object to compare
   * @returns {boolean} True if emails are equal
   */
  equals(other) {
    if (!(other instanceof Email)) {
      return false;
    }
    return this.value === other.value;
  }
  
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if the email format is valid
   */
  static isValid(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    // Simple email validation regex
    // For production, consider using a more comprehensive solution
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Create an Email object from a string
   * @param {string} email - Email string
   * @returns {Email|null} Email object or null if invalid
   */
  static create(email) {
    try {
      return new Email(email);
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
   * @returns {string} The email value
   */
  toJSON() {
    return this._value;
  }
}

module.exports = Email; 