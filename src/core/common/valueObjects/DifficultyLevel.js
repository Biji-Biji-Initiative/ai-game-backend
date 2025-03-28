/**
 * DifficultyLevel Value Object
 * 
 * Represents and validates difficulty levels in the system.
 * Includes conversion between different formats (string, numeric).
 * Follows Value Object pattern - immutable and defined by its value.
 */

class DifficultyLevel {
  // Valid difficulty levels and their numeric equivalents
  static LEVELS = {
    'beginner': 1,
    'easy': 1,
    'intermediate': 2,
    'medium': 2,
    'advanced': 3,
    'hard': 3,
    'expert': 4
  };
  
  // Numeric to string mapping
  static NUMERIC_TO_STRING = {
    1: 'easy',
    2: 'medium',
    3: 'hard',
    4: 'expert'
  };
  
  /**
   * Create a new DifficultyLevel value object
   * @param {string|number} value - Difficulty level as string or number (1-4)
   * @throws {Error} If the difficulty level is invalid
   */
  constructor(value) {
    if (value === undefined || value === null) {
      throw new Error('DifficultyLevel cannot be empty');
    }
    
    // Normalize the value to a string
    if (typeof value === 'number') {
      if (value < 1 || value > 4 || !Number.isInteger(value)) {
        throw new Error(`Invalid numeric difficulty level: ${value}`);
      }
      this._numericValue = value;
      this._value = DifficultyLevel.NUMERIC_TO_STRING[value];
    } else if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      if (!DifficultyLevel.isValid(normalized)) {
        throw new Error(`Invalid difficulty level: ${value}`);
      }
      this._value = normalized;
      this._numericValue = DifficultyLevel.LEVELS[normalized];
    } else {
      throw new Error(`Invalid difficulty level type: ${typeof value}`);
    }
    
    Object.freeze(this);
  }
  
  /**
   * Get the difficulty level string value
   * @returns {string} Difficulty level (easy, medium, hard, expert)
   */
  get value() {
    return this._value;
  }
  
  /**
   * Get the numeric value of the difficulty (1-4)
   * @returns {number} Numeric difficulty level
   */
  get numericValue() {
    return this._numericValue;
  }
  
  /**
   * Check if this difficulty is higher than another
   * @param {DifficultyLevel} other - Another difficulty to compare
   * @returns {boolean} True if this difficulty is higher
   */
  isHigherThan(other) {
    if (!(other instanceof DifficultyLevel)) {
      throw new Error('Can only compare with another DifficultyLevel');
    }
    return this.numericValue > other.numericValue;
  }
  
  /**
   * Check if this difficulty is lower than another
   * @param {DifficultyLevel} other - Another difficulty to compare
   * @returns {boolean} True if this difficulty is lower
   */
  isLowerThan(other) {
    if (!(other instanceof DifficultyLevel)) {
      throw new Error('Can only compare with another DifficultyLevel');
    }
    return this.numericValue < other.numericValue;
  }
  
  /**
   * Check if two DifficultyLevel objects are equal
   * @param {DifficultyLevel} other - Another DifficultyLevel object to compare
   * @returns {boolean} True if levels are equal
   */
  equals(other) {
    if (!(other instanceof DifficultyLevel)) {
      return false;
    }
    return this.value === other.value;
  }
  
  /**
   * Validate difficulty level format
   * @param {string} level - Difficulty level to validate
   * @returns {boolean} True if the level is valid
   */
  static isValid(level) {
    if (typeof level === 'string') {
      return Object.keys(DifficultyLevel.LEVELS).includes(level.toLowerCase());
    } else if (typeof level === 'number') {
      return level >= 1 && level <= 4 && Number.isInteger(level);
    }
    return false;
  }
  
  /**
   * Create a DifficultyLevel object from a string or number
   * @param {string|number} level - Difficulty level
   * @returns {DifficultyLevel|null} DifficultyLevel object or null if invalid
   */
  static create(level) {
    try {
      return new DifficultyLevel(level);
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
   * @returns {string} The difficulty level value
   */
  toJSON() {
    return this._value;
  }
}

module.exports = DifficultyLevel; 