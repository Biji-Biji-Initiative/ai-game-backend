'use strict';

/**
 * TraitScore Value Object
 *
 * Represents and validates personality trait scores in the system.
 * Ensures scores are within valid range and properly formatted.
 * Follows Value Object pattern - immutable and defined by its value.
 */

class TraitScore {
  // Constants for validation
  static MIN_SCORE = 0;
  static MAX_SCORE = 10;
  static DECIMAL_PRECISION = 1;

  /**
   * Create a new TraitScore value object
   * @param {string} traitCode - Personality trait code
   * @param {number} score - Score value (0-10)
   * @throws {Error} If the trait code or score is invalid
   */
  /**
   * Method constructor
   */
  constructor(traitCode, score) {
    if (!traitCode || typeof traitCode !== 'string') {
      throw new Error('Trait code cannot be empty and must be a string');
    }

    if (score === undefined || score === null) {
      throw new Error('Score is required');
    }

    // Normalize and validate the score
    const numericScore = Number(score);

    if (isNaN(numericScore)) {
      throw new Error(`Score must be a number, got ${score}`);
    }

    if (numericScore < TraitScore.MIN_SCORE || numericScore > TraitScore.MAX_SCORE) {
      throw new Error(
        `Score must be between ${TraitScore.MIN_SCORE} and ${TraitScore.MAX_SCORE}, got ${score}`
      );
    }

    // Round to specified decimal precision
    this._traitCode = traitCode;
    this._score = Number(numericScore.toFixed(TraitScore.DECIMAL_PRECISION));

    Object.freeze(this);
  }

  /**
   * Get the trait code
   * @returns {string} Trait code
   */
  get traitCode() {
    return this._traitCode;
  }

  /**
   * Get the score value
   * @returns {number} Score
   */
  get score() {
    return this._score;
  }

  /**
   * Get the normalized score (0-1)
   * @returns {number} Normalized score
   */
  get normalizedScore() {
    return this._score / TraitScore.MAX_SCORE;
  }

  /**
   * Get the intensity level of the score
   * @returns {string} Intensity level (low, moderate, high, very high)
   */
  get intensityLevel() {
    if (this._score <= 2.5) {
      return 'low';
    }
    if (this._score <= 5.0) {
      return 'moderate';
    }
    if (this._score <= 7.5) {
      return 'high';
    }
    return 'very high';
  }

  /**
   * Compare this score to another score
   * @param {TraitScore} other - Another TraitScore object to compare
   * @returns {number} Negative if less, positive if greater, 0 if equal
   */
  /**
   * Method compare
   */
  compare(other) {
    if (!(other instanceof TraitScore)) {
      throw new Error('Can only compare with another TraitScore');
    }

    return this.score - other.score;
  }

  /**
   * Check if this score is higher than another
   * @param {TraitScore} other - Another TraitScore to compare
   * @returns {boolean} True if this score is higher
   */
  /**
   * Method isHigherThan
   */
  isHigherThan(other) {
    return this.compare(other) > 0;
  }

  /**
   * Check if this score is lower than another
   * @param {TraitScore} other - Another TraitScore to compare
   * @returns {boolean} True if this score is lower
   */
  /**
   * Method isLowerThan
   */
  isLowerThan(other) {
    return this.compare(other) < 0;
  }

  /**
   * Check if two TraitScore objects are equal
   * @param {TraitScore} other - Another TraitScore object to compare
   * @returns {boolean} True if scores are equal
   */
  /**
   * Method equals
   */
  equals(other) {
    if (!(other instanceof TraitScore)) {
      return false;
    }
    return this.traitCode === other.traitCode && this.score === other.score;
  }

  /**
   * Create a TraitScore object
   * @param {string} traitCode - Trait code
   * @param {number} score - Score value
   * @returns {TraitScore|null} TraitScore object or null if invalid
   */
  static create(traitCode, score) {
    try {
      return new TraitScore(traitCode, score);
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert to object representation
   * @returns {Object} Object with trait code and score
   */
  /**
   * Method toObject
   */
  toObject() {
    return {
      traitCode: this._traitCode,
      score: this._score,
    };
  }

  /**
   * Convert to string representation
   * @returns {string} String representation
   */
  /**
   * Method toString
   */
  toString() {
    return `${this._traitCode}: ${this._score}`;
  }

  /**
   * Convert to primitive value when serializing
   * @returns {Object} Object representation
   */
  /**
   * Method toJSON
   */
  toJSON() {
    return this.toObject();
  }
}

module.exports = TraitScore;
