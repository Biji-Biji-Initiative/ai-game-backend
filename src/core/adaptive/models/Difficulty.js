/**
 * Difficulty Domain Model
 * 
 * This model represents the difficulty settings for challenges,
 * with adaptive parameters based on user performance.
 */

class Difficulty {
  /**
   * Create a difficulty instance
   * @param {Object} data - Difficulty data
   */
  constructor(data = {}) {
    this.level = data.level || 'beginner';
    this.complexity = data.complexity !== undefined ? data.complexity : 0.5;
    this.depth = data.depth !== undefined ? data.depth : 0.5;
    this.timeAllocation = data.timeAllocation || 300; // seconds
    this.adaptiveFactor = data.adaptiveFactor !== undefined ? data.adaptiveFactor : 0.0;
  }

  /**
   * Validate the difficulty model
   * @returns {Object} Validation result with isValid and errors properties
   */
  validate() {
    const errors = [];

    // Validate level
    const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (!validLevels.includes(this.level)) {
      errors.push(`Level must be one of: ${validLevels.join(', ')}`);
    }

    // Validate complexity and depth ranges
    if (this.complexity < 0 || this.complexity > 1) {
      errors.push('Complexity must be between 0 and 1');
    }

    if (this.depth < 0 || this.depth > 1) {
      errors.push('Depth must be between 0 and 1');
    }

    // Validate time allocation
    if (this.timeAllocation < 60 || this.timeAllocation > 1800) {
      errors.push('Time allocation must be between 60 and 1800 seconds');
    }

    // Validate adaptive factor
    if (this.adaptiveFactor < -1 || this.adaptiveFactor > 1) {
      errors.push('Adaptive factor must be between -1 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Increase difficulty by a certain percentage
   * @param {number} percentage - Percentage to increase (0-100)
   */
  increase(percentage = 10) {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    const factor = percentage / 100;
    
    // Increase complexity and depth
    this.complexity = Math.min(1, this.complexity + (factor * 0.3));
    this.depth = Math.min(1, this.depth + (factor * 0.3));
    
    // Decrease time allocation (harder = less time)
    this.timeAllocation = Math.max(60, this.timeAllocation * (1 - (factor * 0.15)));
    
    // Update level based on new complexity and depth
    this.updateLevel();
  }

  /**
   * Decrease difficulty by a certain percentage
   * @param {number} percentage - Percentage to decrease (0-100)
   */
  decrease(percentage = 10) {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    const factor = percentage / 100;
    
    // Decrease complexity and depth
    this.complexity = Math.max(0.2, this.complexity - (factor * 0.2));
    this.depth = Math.max(0.2, this.depth - (factor * 0.2));
    
    // Increase time allocation (easier = more time)
    this.timeAllocation = Math.min(1800, this.timeAllocation * (1 + (factor * 0.2)));
    
    // Update level based on new complexity and depth
    this.updateLevel();
  }

  /**
   * Update the difficulty level based on complexity and depth
   */
  updateLevel() {
    const average = (this.complexity + this.depth) / 2;
    
    if (average >= 0.85) {
      this.level = 'expert';
    } else if (average >= 0.65) {
      this.level = 'advanced';
    } else if (average >= 0.4) {
      this.level = 'intermediate';
    } else {
      this.level = 'beginner';
    }
  }

  /**
   * Apply personality traits to modify difficulty
   * @param {Object} personalityTraits - User's personality traits
   */
  applyPersonalityModifiers(personalityTraits) {
    if (!personalityTraits) {
      return;
    }

    // Adjust complexity based on openness and conscientiousness
    if (personalityTraits.openness > 0.7) {
      this.complexity = Math.min(1.0, this.complexity + 0.1);
    }
    
    if (personalityTraits.conscientiousness > 0.7) {
      this.depth = Math.min(1.0, this.depth + 0.1);
    }
    
    // Adjust time allocation based on neuroticism
    if (personalityTraits.neuroticism > 0.7) {
      this.timeAllocation = Math.round(this.timeAllocation * 1.2);
    }

    // Update level after applying modifiers
    this.updateLevel();
  }

  /**
   * Apply score to adjust difficulty adaptively
   * @param {number} score - User's score (0-100)
   */
  adjustBasedOnScore(score) {
    if (score < 0 || score > 100) {
      throw new Error('Score must be between 0 and 100');
    }

    // Calculate adjustment percentage based on score
    let adjustmentPercentage = 0;
    
    if (score > 85) {
      // High score, increase difficulty
      adjustmentPercentage = (score - 85) / 15 * 20; // Up to 20% increase for perfect score
      this.increase(adjustmentPercentage);
    } else if (score < 60) {
      // Low score, decrease difficulty
      adjustmentPercentage = (60 - score) / 60 * 25; // Up to 25% decrease for 0 score
      this.decrease(adjustmentPercentage);
    }
    
    // Set adaptive factor based on score
    this.adaptiveFactor = (score - 70) / 30; // -1 to 1 range centered around 70
  }

  /**
   * Convert to difficulty settings for challenge generator
   * @returns {Object} Difficulty settings
   */
  toSettings() {
    return {
      level: this.level,
      complexity: this.complexity,
      depth: this.depth,
      timeAllocation: Math.round(this.timeAllocation),
      adaptiveFactor: this.adaptiveFactor
    };
  }
}

module.exports = Difficulty; 